# System Architecture Documentation

## Overview
The Curriculum Knowledge Planning system is a microservices-based application designed to automatically generate structured course content from various document formats using AI technology.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React + TypeScript + Ant Design Pro + Vite             │  │
│  │  - Knowledge Graph Visualization (vis-network)           │  │
│  │  - Course Generation Wizard                              │  │
│  │  - State Management (Zustand)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS/WebSocket
┌────────────────────────▼────────────────────────────────────────┐
│                      API Gateway Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               FastAPI Application Server                 │  │
│  │  - RESTful API Endpoints (v1)                           │  │
│  │  - WebSocket Support for Real-time Updates              │  │
│  │  - Authentication & Authorization                        │  │
│  │  - Request Validation (Pydantic)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Business Logic Layer                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Core Services                           │  │
│  │  - LLM Service (LangChain + OpenAI)                     │  │
│  │  - Document Processor (Multiple Format Support)          │  │
│  │  - Knowledge Graph Manager                              │  │
│  │  - Course Generator                                      │  │
│  │  - Export Service (PDF, DOCX, etc.)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      Data Layer                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ PostgreSQL │  │   Neo4j    │  │   Redis    │  │ Weaviate │ │
│  │  (RDBMS)   │  │   (Graph)  │  │  (Cache)   │  │ (Vector) │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Celery Task Queue                     │  │
│  │         (Background Processing & Async Tasks)            │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Frontend Architecture

#### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast HMR and optimized builds
- **UI Library**: Ant Design Pro for enterprise-grade components
- **State Management**: Zustand for lightweight global state
- **Visualization**: vis-network for interactive graph rendering
- **HTTP Client**: Axios with interceptors for API communication

#### Key Components
```
frontend/src/
├── pages/                      # Page components
│   ├── KnowledgeGraph.tsx     # Knowledge graph visualization
│   ├── CourseGeneration.tsx   # Course generation wizard
│   ├── DocumentUpload.tsx     # Document upload interface
│   └── Dashboard.tsx           # Main dashboard
├── components/                 # Reusable components
│   ├── GraphControls/         # Graph manipulation controls
│   ├── CourseOutline/         # Course structure display
│   └── ExportOptions/         # Export format selection
├── stores/                     # Zustand stores
│   ├── courseStore.ts         # Course management state
│   ├── graphStore.ts          # Graph data state
│   └── userStore.ts           # User session state
├── services/                   # API service layer
│   ├── api.ts                 # Base API configuration
│   ├── courseService.ts       # Course-related API calls
│   └── documentService.ts     # Document processing APIs
└── utils/                      # Utility functions
    ├── graphHelpers.ts        # Graph data transformations
    └── validators.ts          # Input validation utilities
```

### 2. Backend Architecture

#### Technology Stack
- **Framework**: FastAPI with async/await support
- **ORM**: SQLAlchemy 2.0 with async sessions
- **LLM Integration**: LangChain with OpenAI
- **Task Queue**: Celery with Redis broker
- **API Documentation**: Automatic OpenAPI/Swagger generation

#### Service Layer Architecture
```
backend/app/
├── api/                        # API endpoints
│   └── v1/                    # API version 1
│       ├── courses.py         # Course management endpoints
│       ├── documents.py       # Document processing endpoints
│       ├── knowledge.py       # Knowledge graph endpoints
│       └── websocket.py       # Real-time communication
├── services/                   # Business logic services
│   ├── llm_service.py         # LLM integration core
│   ├── document_processor.py  # Document parsing & extraction
│   ├── knowledge_service.py   # Knowledge graph operations
│   ├── course_generator.py    # Course content generation
│   └── export_service.py      # Export to various formats
├── models/                     # Data models
│   ├── sql/                   # SQLAlchemy models
│   │   ├── course.py         # Course entity
│   │   ├── document.py       # Document entity
│   │   └── user.py           # User entity
│   └── pydantic/              # Request/Response schemas
│       ├── course_schema.py  # Course DTOs
│       └── document_schema.py # Document DTOs
├── core/                       # Core functionality
│   ├── config.py              # Configuration management
│   ├── dependencies.py        # Dependency injection
│   ├── security.py            # Authentication/Authorization
│   └── exceptions.py          # Custom exceptions
└── tasks/                      # Celery background tasks
    ├── document_tasks.py      # Document processing tasks
    └── generation_tasks.py    # Content generation tasks
```

### 3. Data Architecture

#### PostgreSQL (Relational Data)
- User management and authentication
- Course metadata and structure
- Document references and metadata
- System configurations
- Audit logs and analytics

#### Neo4j (Knowledge Graph)
- Knowledge nodes and relationships
- Concept hierarchies
- Learning pathways
- Cross-reference mappings
- Semantic connections

#### Redis (Caching & Message Broker)
- Session management
- API response caching
- Real-time message pub/sub
- Celery task queue broker
- Rate limiting counters

#### Weaviate (Vector Database)
- Document embeddings
- Semantic search capabilities
- Similar content discovery
- Question-answer pairs
- Content recommendations

## Design Patterns

### 1. Repository Pattern
Used for data access abstraction, separating business logic from data persistence.

```python
class CourseRepository:
    async def create(self, course_data: CourseCreate) -> Course
    async def get_by_id(self, course_id: int) -> Optional[Course]
    async def update(self, course_id: int, updates: CourseUpdate) -> Course
    async def delete(self, course_id: int) -> bool
```

### 2. Service Layer Pattern
Business logic encapsulation with clear separation of concerns.

```python
class CourseGeneratorService:
    def __init__(self, llm_service: LLMService, repo: CourseRepository):
        self.llm = llm_service
        self.repo = repo
    
    async def generate_course(self, requirements: CourseRequirements) -> Course
```

### 3. Dependency Injection
FastAPI's dependency injection for clean, testable code.

```python
async def get_course_service(
    db: AsyncSession = Depends(get_db),
    llm: LLMService = Depends(get_llm_service)
) -> CourseGeneratorService:
    return CourseGeneratorService(llm, CourseRepository(db))
```

### 4. Event-Driven Architecture
Celery tasks for asynchronous processing and event handling.

```python
@celery_app.task
def process_document_async(document_id: str):
    # Long-running document processing
    pass
```

## Security Architecture

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with refresh tokens
- **OAuth2 Support**: Integration with external identity providers
- **Role-Based Access Control (RBAC)**: Fine-grained permissions
- **API Key Management**: For service-to-service communication

### Data Security
- **Encryption at Rest**: Database encryption for sensitive data
- **Encryption in Transit**: TLS/SSL for all communications
- **Input Validation**: Pydantic models for strict validation
- **SQL Injection Prevention**: Parameterized queries via SQLAlchemy
- **XSS Protection**: Content sanitization and CSP headers

### Infrastructure Security
- **Container Isolation**: Docker containers with minimal privileges
- **Secret Management**: Environment variables and Docker secrets
- **Rate Limiting**: Redis-based rate limiting per endpoint
- **CORS Configuration**: Strict origin validation
- **Audit Logging**: Comprehensive activity tracking

## Scalability Considerations

### Horizontal Scaling
- **Stateless Services**: All services designed for horizontal scaling
- **Load Balancing**: Nginx/HAProxy for request distribution
- **Database Replication**: Read replicas for PostgreSQL
- **Neo4j Clustering**: Causal clustering for graph database
- **Redis Sentinel**: High availability for cache layer

### Performance Optimization
- **Async Operations**: Non-blocking I/O throughout the stack
- **Connection Pooling**: Efficient database connection management
- **Lazy Loading**: On-demand data fetching strategies
- **Query Optimization**: Indexed queries and query planning
- **CDN Integration**: Static asset delivery optimization

### Caching Strategy
- **Multi-Level Caching**: Browser, CDN, Application, Database
- **Cache Invalidation**: Event-driven cache updates
- **Partial Caching**: Component-level caching in frontend
- **Result Caching**: LLM response caching for similar queries

## Monitoring and Observability

### Application Monitoring
- **Prometheus Metrics**: Custom metrics for business KPIs
- **Grafana Dashboards**: Real-time visualization
- **ELK Stack**: Centralized logging (Elasticsearch, Logstash, Kibana)
- **Distributed Tracing**: OpenTelemetry integration

### Health Checks
- **Liveness Probes**: Container health verification
- **Readiness Probes**: Service availability checks
- **Database Health**: Connection pool monitoring
- **External Service Status**: Third-party API availability

## Deployment Architecture

### Container Orchestration
```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]
  
  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [postgres, neo4j, redis]
  
  celery_worker:
    build: ./backend
    command: celery worker
    depends_on: [redis]
  
  postgres:
    image: postgres:15-alpine
    volumes: ["postgres_data:/var/lib/postgresql/data"]
  
  neo4j:
    image: neo4j:5-enterprise
    volumes: ["neo4j_data:/data"]
  
  redis:
    image: redis:7-alpine
    volumes: ["redis_data:/data"]
```

### CI/CD Pipeline
1. **Code Commit**: Git push triggers pipeline
2. **Build Stage**: Docker image creation
3. **Test Stage**: Unit, integration, and E2E tests
4. **Security Scan**: Vulnerability assessment
5. **Deploy Stage**: Rolling deployment to production
6. **Health Check**: Verify deployment success
7. **Rollback**: Automatic rollback on failure

## Future Architecture Considerations

### Planned Enhancements
1. **GraphQL API**: Alternative to REST for flexible queries
2. **Microservices Split**: Further service decomposition
3. **Event Sourcing**: Complete audit trail with event store
4. **CQRS Pattern**: Separate read and write models
5. **Service Mesh**: Istio/Linkerd for service communication

### Technology Evaluations
- **Alternative LLMs**: Support for Claude, Gemini, local models
- **Streaming Responses**: Server-sent events for real-time generation
- **Edge Computing**: CDN-based compute for global distribution
- **Kubernetes Migration**: Container orchestration at scale
- **Multi-Cloud Support**: Provider-agnostic deployment