# Deployment Guide

## Overview
This guide covers deployment strategies for the Curriculum Knowledge Planning system across different environments.

## Deployment Architectures

### Development Environment
- Local Docker Compose setup
- Hot-reload enabled
- Debug logging
- Mock services available

### Staging Environment
- Docker Swarm or Kubernetes
- Production-like configuration
- Integration testing enabled
- Performance monitoring

### Production Environment
- Kubernetes cluster
- High availability configuration
- Auto-scaling enabled
- Full monitoring and alerting

## Docker Deployment

### 1. Building Production Images

#### Backend Dockerfile
```dockerfile
# backend/Dockerfile.prod
FROM python:3.11-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

#### Frontend Dockerfile
```dockerfile
# frontend/Dockerfile.prod
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. Docker Compose Production
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEO4J_URI=${NEO4J_URI}
    depends_on:
      - postgres
      - redis
      - neo4j
    restart: unless-stopped

  celery_worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: celery -A app.tasks.celery_app worker --loglevel=info --concurrency=4
    environment:
      - CELERY_BROKER_URL=${REDIS_URL}
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - redis
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backup:/backup
    restart: unless-stopped

  neo4j:
    image: neo4j:5-enterprise
    environment:
      - NEO4J_AUTH=${NEO4J_AUTH}
      - NEO4J_ACCEPT_LICENSE_AGREEMENT=yes
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  neo4j_data:
  neo4j_logs:
  redis_data:
```

## Kubernetes Deployment

### 1. Namespace and ConfigMap
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: curriculum-planning

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: curriculum-planning
data:
  APP_NAME: "Curriculum Knowledge Planning"
  APP_VERSION: "1.0.0"
  LOG_LEVEL: "INFO"
  CORS_ORIGINS: '["https://curriculum.example.com"]'
```

### 2. Secrets
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: curriculum-planning
type: Opaque
stringData:
  DATABASE_URL: "postgresql+asyncpg://user:pass@postgres:5432/curriculum_db"
  REDIS_URL: "redis://:password@redis:6379/0"
  NEO4J_URI: "bolt://neo4j:7687"
  NEO4J_PASSWORD: "secure_password"
  OPENAI_API_KEY: "sk-..."
  JWT_SECRET_KEY: "your-jwt-secret"
```

### 3. Backend Deployment
```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: curriculum-planning
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: curriculum-planning/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: REDIS_URL
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 20
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: curriculum-planning
spec:
  selector:
    app: backend
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP
```

### 4. Frontend Deployment
```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: curriculum-planning
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: curriculum-planning/frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: curriculum-planning
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

### 5. Ingress Configuration
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: curriculum-planning
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  tls:
  - hosts:
    - curriculum.example.com
    secretName: curriculum-tls
  rules:
  - host: curriculum.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 8000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

### 6. HorizontalPodAutoscaler
```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: curriculum-planning
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Cloud Platform Deployments

### AWS Deployment

#### 1. Infrastructure with Terraform
```hcl
# terraform/main.tf
provider "aws" {
  region = "us-west-2"
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  name = "curriculum-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-west-2a", "us-west-2b", "us-west-2c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = true
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  cluster_name    = "curriculum-cluster"
  cluster_version = "1.27"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  node_groups = {
    main = {
      desired_capacity = 3
      max_capacity     = 10
      min_capacity     = 2
      
      instance_types = ["t3.medium"]
    }
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier = "curriculum-postgres"
  engine     = "postgres"
  engine_version = "15.3"
  instance_class = "db.t3.medium"
  
  allocated_storage = 100
  storage_encrypted = true
  
  db_name  = "curriculum_db"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "curriculum-final-snapshot-${timestamp()}"
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "curriculum-redis"
  engine              = "redis"
  node_type           = "cache.t3.medium"
  num_cache_nodes     = 1
  parameter_group_name = "default.redis7"
  port                = 6379
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
}

# S3 Bucket for uploads
resource "aws_s3_bucket" "uploads" {
  bucket = "curriculum-uploads"
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    enabled = true
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "S3-static"
  }
  
  enabled             = true
  is_ipv6_enabled    = true
  default_root_object = "index.html"
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-static"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }
  
  price_class = "PriceClass_100"
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

#### 2. Deploy with AWS CLI
```bash
# Build and push Docker images to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin $ECR_REGISTRY

docker build -t curriculum-backend ./backend
docker tag curriculum-backend:latest $ECR_REGISTRY/curriculum-backend:latest
docker push $ECR_REGISTRY/curriculum-backend:latest

# Deploy to EKS
aws eks update-kubeconfig --name curriculum-cluster --region us-west-2
kubectl apply -f k8s/
```

### Google Cloud Platform Deployment

#### 1. GKE Setup
```bash
# Create GKE cluster
gcloud container clusters create curriculum-cluster \
    --zone us-central1-a \
    --num-nodes 3 \
    --machine-type n1-standard-2 \
    --enable-autoscaling \
    --min-nodes 2 \
    --max-nodes 10

# Get credentials
gcloud container clusters get-credentials curriculum-cluster \
    --zone us-central1-a

# Deploy application
kubectl apply -f k8s/
```

#### 2. Cloud SQL Setup
```bash
# Create PostgreSQL instance
gcloud sql instances create curriculum-postgres \
    --database-version=POSTGRES_15 \
    --tier=db-n1-standard-2 \
    --region=us-central1 \
    --network=default \
    --backup \
    --backup-start-time=03:00

# Create database
gcloud sql databases create curriculum_db \
    --instance=curriculum-postgres
```

### Azure Deployment

#### 1. AKS Setup
```bash
# Create resource group
az group create --name curriculum-rg --location eastus

# Create AKS cluster
az aks create \
    --resource-group curriculum-rg \
    --name curriculum-cluster \
    --node-count 3 \
    --node-vm-size Standard_DS2_v2 \
    --enable-cluster-autoscaler \
    --min-count 2 \
    --max-count 10

# Get credentials
az aks get-credentials \
    --resource-group curriculum-rg \
    --name curriculum-cluster

# Deploy application
kubectl apply -f k8s/
```

## CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    
    - name: Run tests
      run: |
        cd backend
        pytest --cov=app --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push Backend
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        file: ./backend/Dockerfile.prod
        push: true
        tags: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:latest
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:${{ github.sha }}
    
    - name: Build and push Frontend
      uses: docker/build-push-action@v4
      with:
        context: ./frontend
        file: ./frontend/Dockerfile.prod
        push: true
        tags: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:latest
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Kubernetes
      env:
        KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
      run: |
        echo "$KUBE_CONFIG" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
        
        # Update image tags
        kubectl set image deployment/backend backend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:${{ github.sha }} -n curriculum-planning
        kubectl set image deployment/frontend frontend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:${{ github.sha }} -n curriculum-planning
        
        # Wait for rollout
        kubectl rollout status deployment/backend -n curriculum-planning
        kubectl rollout status deployment/frontend -n curriculum-planning
```

## Monitoring and Logging

### 1. Prometheus Configuration
```yaml
# monitoring/prometheus-values.yaml
prometheus:
  prometheusSpec:
    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false
    ruleSelectorNilUsesHelmValues: false
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi

grafana:
  enabled: true
  adminPassword: secure_password
  persistence:
    enabled: true
    size: 10Gi
```

### 2. Application Metrics
```python
# backend/app/core/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
request_count = Counter(
    'app_requests_total',
    'Total request count',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'app_request_duration_seconds',
    'Request duration',
    ['method', 'endpoint']
)

# Business metrics
courses_generated = Counter(
    'courses_generated_total',
    'Total courses generated'
)

active_users = Gauge(
    'active_users',
    'Number of active users'
)
```

### 3. Logging with ELK Stack
```yaml
# k8s/elasticsearch.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: elasticsearch
  namespace: elastic-system
spec:
  version: 8.8.0
  nodeSets:
  - name: default
    count: 3
    config:
      node.store.allow_mmap: false
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 100Gi
```

## Health Checks

### Backend Health Check
```python
# backend/app/api/health.py
from fastapi import APIRouter
from app.core.database import database
from app.core.redis import redis_client
from app.core.neo4j import neo4j_driver

router = APIRouter()

@router.get("/health")
async def health_check():
    """Basic health check"""
    return {"status": "healthy"}

@router.get("/ready")
async def readiness_check():
    """Readiness check with dependency validation"""
    checks = {}
    
    # Check PostgreSQL
    try:
        await database.execute("SELECT 1")
        checks["postgres"] = "healthy"
    except Exception as e:
        checks["postgres"] = f"unhealthy: {str(e)}"
    
    # Check Redis
    try:
        await redis_client.ping()
        checks["redis"] = "healthy"
    except Exception as e:
        checks["redis"] = f"unhealthy: {str(e)}"
    
    # Check Neo4j
    try:
        with neo4j_driver.session() as session:
            session.run("RETURN 1")
        checks["neo4j"] = "healthy"
    except Exception as e:
        checks["neo4j"] = f"unhealthy: {str(e)}"
    
    # Overall status
    all_healthy = all(v == "healthy" for v in checks.values())
    
    return {
        "status": "ready" if all_healthy else "not ready",
        "checks": checks
    }
```

## Security Hardening

### 1. Network Policies
```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: curriculum-planning
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    - podSelector:
        matchLabels:
          app: nginx
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    - podSelector:
        matchLabels:
          app: redis
    - podSelector:
        matchLabels:
          app: neo4j
```

### 2. Secrets Management
```bash
# Using Sealed Secrets
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml

# Encrypt secrets
echo -n "mypassword" | kubectl create secret generic app-secret \
    --dry-run=client \
    --from-file=password=/dev/stdin \
    -o yaml | kubeseal -o yaml > sealed-secret.yaml
```

## Backup and Recovery

### Database Backup Script
```bash
#!/bin/bash
# backup.sh

# PostgreSQL backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/postgres"
DB_NAME="curriculum_db"

pg_dump -h localhost -U curriculum_user -d $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Neo4j backup
neo4j-admin backup --from=localhost:6362 --to=/backup/neo4j/backup_$TIMESTAMP

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$TIMESTAMP.sql.gz s3://curriculum-backups/postgres/
aws s3 cp /backup/neo4j/backup_$TIMESTAMP s3://curriculum-backups/neo4j/

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete
```

### Disaster Recovery Plan
1. **RPO (Recovery Point Objective)**: 1 hour
2. **RTO (Recovery Time Objective)**: 4 hours
3. **Backup Schedule**: 
   - Full backup: Daily
   - Incremental: Every hour
   - Transaction logs: Continuous
4. **Recovery Steps**:
   - Provision new infrastructure
   - Restore databases from backups
   - Deploy application
   - Verify data integrity
   - Switch DNS

## Performance Tuning

### PostgreSQL Optimization
```sql
-- postgresql.conf
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2MB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Redis Optimization
```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
tcp-keepalive 300
timeout 300
tcp-backlog 511
```

### Application Optimization
```python
# Async connection pooling
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

## Rollback Strategy

### Blue-Green Deployment
```bash
# Deploy to green environment
kubectl apply -f k8s/green/

# Test green environment
./scripts/smoke_tests.sh green

# Switch traffic to green
kubectl patch service frontend-service -p '{"spec":{"selector":{"version":"green"}}}'
kubectl patch service backend-service -p '{"spec":{"selector":{"version":"green"}}}'

# If issues, rollback to blue
kubectl patch service frontend-service -p '{"spec":{"selector":{"version":"blue"}}}'
kubectl patch service backend-service -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Canary Deployment
```yaml
# k8s/canary-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-canary
spec:
  selector:
    app: backend
    version: canary
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  rules:
  - host: api.curriculum.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-canary
            port:
              number: 8000
```

## Post-Deployment Checklist

- [ ] Health checks passing
- [ ] Metrics being collected
- [ ] Logs aggregating properly
- [ ] SSL certificates valid
- [ ] Database connections stable
- [ ] Redis cache working
- [ ] Background tasks processing
- [ ] File uploads working
- [ ] API response times acceptable
- [ ] Frontend loading correctly
- [ ] Authentication working
- [ ] Monitoring alerts configured
- [ ] Backup jobs scheduled
- [ ] Documentation updated
- [ ] Team notified