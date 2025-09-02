# Error Tracking and Solutions

## Purpose
This document tracks all encountered errors, their solutions, and preventive measures to ensure the same issues never occur twice.

## Error Log Format
Each error entry should include:
- **Date**: When the error was encountered
- **Error Type**: Category of the error
- **Description**: Detailed error description
- **Root Cause**: Why the error occurred
- **Solution**: How it was fixed
- **Prevention**: Steps taken to prevent recurrence
- **Related Files**: Files that were modified

---

## Encountered Errors and Solutions

### 1. Docker Memory Issues on Windows
**Date**: 2024-01-15  
**Error Type**: Infrastructure  
**Description**: Docker containers crash with OOM (Out of Memory) errors  
**Root Cause**: Default Docker Desktop memory allocation (2GB) insufficient for running all services  
**Solution**: 
```bash
# Increase Docker Desktop memory to 4GB minimum
# Settings -> Resources -> Advanced -> Memory: 4096 MB
```
**Prevention**: 
- Added memory requirements to `docs/deployment/deployment-guide.md`
- Added check script in `scripts/check-docker-resources.sh`
- Updated CLAUDE.md common issues section

### 2. spaCy Model Not Found
**Date**: 2024-01-16  
**Error Type**: Dependency  
**Description**: `OSError: [E050] Can't find model 'zh_core_web_sm'`  
**Root Cause**: spaCy language model not downloaded after package installation  
**Solution**:
```bash
python -m spacy download zh_core_web_sm
```
**Prevention**:
- Added to `backend/Dockerfile`
- Added to setup scripts
- Documented in development guide

### 3. Async Context Errors in SQLAlchemy
**Date**: 2024-01-17  
**Error Type**: Code Pattern  
**Description**: `RuntimeError: Cannot use AsyncSession outside of async context`  
**Root Cause**: Mixing sync and async database operations  
**Solution**: Ensure all database operations use async/await pattern consistently
```python
# Wrong
def get_course(db: AsyncSession, course_id: str):
    return db.query(Course).filter(Course.id == course_id).first()

# Correct
async def get_course(db: AsyncSession, course_id: str):
    result = await db.execute(
        select(Course).where(Course.id == course_id)
    )
    return result.scalar_one_or_none()
```
**Prevention**:
- Created linting rule for async functions
- Added to code review checklist
- Updated all repository methods

### 4. CORS Issues in Development
**Date**: 2024-01-18  
**Error Type**: Configuration  
**Description**: Frontend cannot connect to backend API due to CORS policy  
**Root Cause**: Missing localhost:3000 in CORS origins  
**Solution**:
```python
# backend/app/core/config.py
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
]
```
**Prevention**:
- Added all possible local origins to default config
- Created environment-specific CORS configurations
- Added validation in startup checks

### 5. Neo4j Connection Pool Exhaustion
**Date**: 2024-01-19  
**Error Type**: Performance  
**Description**: `neo4j.exceptions.ServiceUnavailable: Unable to acquire connection from pool`  
**Root Cause**: Not closing Neo4j sessions properly  
**Solution**:
```python
# Use context manager for automatic cleanup
async def get_knowledge_graph():
    async with neo4j_driver.session() as session:
        result = await session.run(query)
        return result
```
**Prevention**:
- Implemented connection pool monitoring
- Added health checks for Neo4j connections
- Created wrapper class with automatic session management

### 6. Frontend Build Failures with Node Modules
**Date**: 2024-01-20  
**Error Type**: Build  
**Description**: `Module not found: Can't resolve '@/components/...'`  
**Root Cause**: Path alias not configured in both TypeScript and Vite  
**Solution**:
```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
**Prevention**:
- Created project template with correct configurations
- Added to frontend setup checklist
- Documented in development guide

### 7. Celery Task Serialization Errors
**Date**: 2024-01-21  
**Error Type**: Configuration  
**Description**: `kombu.exceptions.EncodeError: Object of type UUID is not JSON serializable`  
**Root Cause**: Default JSON serializer cannot handle UUID objects  
**Solution**:
```python
# backend/app/core/celery_config.py
from kombu import serialization
import json
from uuid import UUID

class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        return super().default(obj)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)
```
**Prevention**:
- Created custom JSON encoder for all serialization
- Added type conversion utilities
- Documented in task creation guidelines

### 8. Database Migration Conflicts
**Date**: 2024-01-22  
**Error Type**: Database  
**Description**: `alembic.util.exc.CommandError: Multiple head revisions`  
**Root Cause**: Parallel development creating conflicting migrations  
**Solution**:
```bash
# Merge migration heads
alembic merge -m "merge heads"
alembic upgrade head
```
**Prevention**:
- Added pre-commit hook to check for migration conflicts
- Created migration guidelines
- Implemented migration testing in CI/CD

### 9. Redis Memory Leak with Large Cache Objects
**Date**: 2024-01-23  
**Error Type**: Performance  
**Description**: Redis memory usage continuously growing  
**Root Cause**: No expiration set on cached large objects  
**Solution**:
```python
# Set appropriate TTL for all cache entries
await redis_client.setex(
    key=cache_key,
    time=3600,  # 1 hour TTL
    value=json.dumps(data)
)
```
**Prevention**:
- Implemented cache size monitoring
- Added automatic expiration for all cache entries
- Created cache management utilities

### 10. WebSocket Connection Drops
**Date**: 2024-01-24  
**Error Type**: Network  
**Description**: WebSocket connections dropping after 60 seconds  
**Root Cause**: Nginx proxy timeout default is 60 seconds  
**Solution**:
```nginx
# nginx.conf
location /ws {
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;  # 1 hour
    proxy_send_timeout 3600s;
}
```
**Prevention**:
- Added heartbeat mechanism
- Implemented automatic reconnection
- Documented in deployment guide

---

## Preventive Measures Checklist

### Code Review Checklist
- [ ] All async functions use async/await consistently
- [ ] Database sessions are properly closed
- [ ] Error handling is comprehensive
- [ ] Tests cover the new functionality
- [ ] Documentation is updated

### Deployment Checklist
- [ ] Environment variables are set correctly
- [ ] Database migrations are applied
- [ ] Redis is configured with appropriate memory limits
- [ ] Docker has sufficient resources
- [ ] Health checks are passing

### Testing Checklist
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Performance tests show no regression
- [ ] Error scenarios are tested

---

## Best Practices Discovered

### 1. Connection Pool Management
Always use connection pooling with appropriate limits:
```python
# PostgreSQL
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    pool_recycle=3600
)

# Redis
redis_pool = await aioredis.create_pool(
    REDIS_URL,
    minsize=5,
    maxsize=20
)
```

### 2. Graceful Shutdown
Implement proper cleanup on application shutdown:
```python
@app.on_event("shutdown")
async def shutdown_event():
    await database.disconnect()
    await redis_client.close()
    neo4j_driver.close()
```

### 3. Structured Logging
Use structured logging for better debugging:
```python
import structlog

logger = structlog.get_logger()

logger.info(
    "api_request",
    method=request.method,
    path=request.url.path,
    user_id=user.id,
    duration=elapsed_time
)
```

### 4. Feature Flags
Use feature flags for safe rollouts:
```python
if await feature_flags.is_enabled("new_generation_algorithm", user_id):
    result = await new_algorithm()
else:
    result = await legacy_algorithm()
```

### 5. Circuit Breakers
Implement circuit breakers for external services:
```python
from pybreaker import CircuitBreaker

openai_breaker = CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    expected_exception=OpenAIError
)

@openai_breaker
async def call_openai_api():
    # API call implementation
    pass
```

---

## Update Protocol

When encountering a new error:

1. **Immediate Actions**:
   - Fix the error
   - Test the fix thoroughly
   - Update relevant code

2. **Documentation**:
   - Add entry to this document
   - Update relevant guides
   - Update CLAUDE.md if needed

3. **Prevention**:
   - Add tests to prevent regression
   - Update checklists
   - Add monitoring if applicable

4. **Review**:
   - Code review the fix
   - Verify documentation updates
   - Ensure CI/CD catches similar issues

---

## Monitoring and Alerts

### Key Metrics to Monitor
- API response times > 1s
- Database connection pool usage > 80%
- Redis memory usage > 75%
- Error rate > 1%
- WebSocket disconnection rate > 5%

### Alert Configurations
```yaml
# prometheus-alerts.yml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(app_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: SlowAPIResponse
        expr: histogram_quantile(0.95, app_request_duration_seconds) > 1
        for: 10m
        annotations:
          summary: "API response time is slow"
```

---

**Last Updated**: 2024-01-24  
**Next Review**: 2024-02-01