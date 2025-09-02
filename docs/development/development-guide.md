# Development Guide

## Prerequisites

### System Requirements
- **OS**: Windows 10/11, macOS 10.15+, Ubuntu 20.04+
- **RAM**: Minimum 8GB, Recommended 16GB
- **Storage**: 20GB free space
- **CPU**: Multi-core processor (4+ cores recommended)

### Software Requirements
- **Docker Desktop**: 4.0+
- **Python**: 3.11+
- **Node.js**: 18+ LTS
- **Git**: 2.30+
- **VS Code** (recommended) or any IDE

### Required Services (via Docker)
- PostgreSQL 15
- Neo4j 5 Enterprise
- Redis 7
- Weaviate (optional)

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/curriculum-knowledge-planning.git
cd curriculum-knowledge-planning
```

### 2. Backend Setup

#### Create Virtual Environment
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate
```

#### Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Install spaCy language model
python -m spacy download zh_core_web_sm
```

#### Environment Variables
Create `backend/.env`:
```env
# Application
APP_NAME=Curriculum Knowledge Planning
APP_VERSION=1.0.0
DEBUG=True
SECRET_KEY=your-secret-key-generate-with-openssl-rand-hex-32

# Database
DATABASE_URL=postgresql+asyncpg://curriculum_user:curriculum_pass@localhost:5432/curriculum_db
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=40

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=curriculum_pass

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_POOL_SIZE=10

# OpenAI
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7

# Weaviate (Optional)
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=optional-api-key

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]

# File Upload
MAX_UPLOAD_SIZE=52428800  # 50MB
ALLOWED_EXTENSIONS=pdf,docx,txt,md,pptx

# JWT
JWT_SECRET_KEY=another-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Logging
LOG_LEVEL=DEBUG
LOG_FILE=logs/app.log

# Rate Limiting
RATE_LIMIT_ENABLED=True
RATE_LIMIT_DEFAULT=100/minute
```

#### Database Setup
```bash
# Run migrations
alembic upgrade head

# Seed initial data (optional)
python scripts/seed_data.py
```

### 3. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Environment Variables
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
VITE_APP_NAME=Curriculum Knowledge Planning
VITE_APP_VERSION=1.0.0
```

### 4. Docker Setup

#### Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: curriculum_user
      POSTGRES_PASSWORD: curriculum_pass
      POSTGRES_DB: curriculum_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U curriculum_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  neo4j:
    image: neo4j:5-enterprise
    environment:
      NEO4J_AUTH: neo4j/curriculum_pass
      NEO4J_ACCEPT_LICENSE_AGREEMENT: yes
      NEO4J_dbms_memory_heap_max__size: 2G
    volumes:
      - neo4j_data:/data
    ports:
      - "7474:7474"  # Browser
      - "7687:7687"  # Bolt
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:7474 || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - uploads:/app/uploads
    environment:
      - DATABASE_URL=postgresql+asyncpg://curriculum_user:curriculum_pass@postgres:5432/curriculum_db
      - NEO4J_URI=bolt://neo4j:7687
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      neo4j:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  celery_worker:
    build: ./backend
    volumes:
      - ./backend:/app
      - uploads:/app/uploads
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/1
      - DATABASE_URL=postgresql+asyncpg://curriculum_user:curriculum_pass@postgres:5432/curriculum_db
    depends_on:
      - redis
      - postgres
    command: celery -A app.tasks.celery_app worker --loglevel=info

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://backend:8000/api/v1
    depends_on:
      - backend
    command: npm run dev -- --host 0.0.0.0 --port 3000

volumes:
  postgres_data:
  neo4j_data:
  redis_data:
  uploads:
```

#### Start Services
```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f [service_name]

# Stop services
docker-compose down

# Clean up everything
docker-compose down -v
```

## Development Workflow

### 1. Code Style and Formatting

#### Python (Backend)
```bash
# Format code with Black
black app/ tests/

# Sort imports with isort
isort app/ tests/

# Lint with flake8
flake8 app/ tests/

# Type checking with mypy
mypy app/

# All-in-one check
make lint
```

#### TypeScript/React (Frontend)
```bash
# Format with Prettier
npm run format

# Lint with ESLint
npm run lint

# Type checking
npm run type-check

# All checks
npm run check
```

### 2. Git Workflow

#### Branch Naming
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation
- `refactor/component-name` - Code refactoring
- `test/test-description` - Test additions
- `chore/task-description` - Maintenance tasks

#### Commit Messages
```bash
# Format: <type>(<scope>): <subject>

feat(api): add course export endpoint
fix(frontend): resolve navigation bug
docs(readme): update installation steps
refactor(services): optimize LLM service
test(api): add course generation tests
chore(deps): update dependencies
```

#### Pull Request Process
1. Create feature branch from `develop`
2. Make changes and commit
3. Write/update tests
4. Run linting and tests
5. Push branch and create PR
6. Request code review
7. Address feedback
8. Merge after approval

### 3. Testing

#### Backend Testing
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_api/test_courses.py

# Run specific test
pytest tests/test_api/test_courses.py::test_create_course

# Run with verbose output
pytest -v

# Run only marked tests
pytest -m "unit"
pytest -m "integration"
pytest -m "not slow"
```

#### Frontend Testing
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run e2e

# Run E2E with UI
npm run e2e:ui
```

### 4. Database Management

#### Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history

# Show current revision
alembic current
```

#### Database Access
```bash
# PostgreSQL
docker-compose exec postgres psql -U curriculum_user -d curriculum_db

# Neo4j Browser
# Open: http://localhost:7474
# Credentials: neo4j/curriculum_pass

# Redis CLI
docker-compose exec redis redis-cli
```

### 5. API Development

#### FastAPI Development Server
```bash
# Run with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# With custom log level
uvicorn app.main:app --reload --log-level debug

# API Documentation
# Swagger UI: http://localhost:8000/docs
# ReDoc: http://localhost:8000/redoc
```

#### API Testing with HTTPie
```bash
# Install HTTPie
pip install httpie

# Test endpoints
http GET localhost:8000/api/v1/health
http POST localhost:8000/api/v1/auth/login username=test password=test
http GET localhost:8000/api/v1/courses "Authorization: Bearer $TOKEN"
```

### 6. Frontend Development

#### Development Server
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Analyze bundle size
npm run analyze
```

#### Component Development
```bash
# Generate new component
npm run generate:component ComponentName

# Generate new page
npm run generate:page PageName

# Generate new store
npm run generate:store StoreName
```

## Project Structure

### Backend Structure
```
backend/
├── app/
│   ├── api/              # API endpoints
│   │   └── v1/          # API version 1
│   ├── core/            # Core functionality
│   ├── models/          # Database models
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   ├── tasks/           # Celery tasks
│   └── utils/           # Utilities
├── tests/               # Test files
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── fixtures/       # Test fixtures
├── migrations/          # Alembic migrations
├── scripts/            # Utility scripts
├── logs/               # Application logs
└── requirements.txt    # Dependencies
```

### Frontend Structure
```
frontend/
├── src/
│   ├── assets/         # Static assets
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── stores/         # State management
│   ├── services/       # API services
│   ├── hooks/          # Custom hooks
│   ├── utils/          # Utilities
│   └── types/          # TypeScript types
├── public/             # Public assets
├── tests/              # Test files
│   ├── unit/          # Unit tests
│   └── e2e/           # E2E tests
└── package.json       # Dependencies
```

## Common Development Tasks

### 1. Adding a New API Endpoint

1. Create schema in `app/schemas/`
2. Add endpoint in `app/api/v1/`
3. Implement service in `app/services/`
4. Add tests in `tests/test_api/`
5. Update API documentation

Example:
```python
# app/schemas/course_schema.py
from pydantic import BaseModel

class CourseCreate(BaseModel):
    title: str
    description: str
    duration_weeks: int

# app/api/v1/courses.py
from fastapi import APIRouter, Depends
from app.schemas.course_schema import CourseCreate

router = APIRouter()

@router.post("/courses")
async def create_course(
    course: CourseCreate,
    service: CourseService = Depends(get_course_service)
):
    return await service.create_course(course)
```

### 2. Adding a New Frontend Component

1. Create component file
2. Add TypeScript types
3. Implement component logic
4. Add styles
5. Write tests
6. Update exports

Example:
```typescript
// src/components/CourseCard.tsx
import React from 'react';
import { Card } from 'antd';
import { Course } from '@/types/course';

interface CourseCardProps {
  course: Course;
  onClick?: (course: Course) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  onClick 
}) => {
  return (
    <Card 
      title={course.title}
      onClick={() => onClick?.(course)}
    >
      <p>{course.description}</p>
    </Card>
  );
};
```

### 3. Adding a Background Task

1. Define task in `app/tasks/`
2. Configure Celery
3. Call from API endpoint
4. Monitor with Flower

Example:
```python
# app/tasks/generation_tasks.py
from celery import shared_task

@shared_task
def generate_course_async(course_id: str):
    # Long-running task
    return {"status": "completed"}

# app/api/v1/courses.py
from app.tasks.generation_tasks import generate_course_async

@router.post("/courses/generate")
async def generate_course(request: GenerateRequest):
    task = generate_course_async.delay(request.course_id)
    return {"task_id": task.id}
```

## Debugging

### Backend Debugging

#### VS Code Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["app.main:app", "--reload"],
      "jinja": true,
      "justMyCode": false
    }
  ]
}
```

#### Debugging with IPython
```python
# Add breakpoint in code
import IPython; IPython.embed()

# Or use debugger
import pdb; pdb.set_trace()
```

### Frontend Debugging

#### Browser DevTools
- React Developer Tools
- Redux DevTools (if using Redux)
- Network tab for API calls
- Console for errors

#### VS Code Debugging
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Frontend",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ]
}
```

## Performance Optimization

### Backend Optimization
- Use async/await for I/O operations
- Implement connection pooling
- Add caching with Redis
- Optimize database queries
- Use pagination for large datasets
- Profile with cProfile

### Frontend Optimization
- Lazy load components
- Memoize expensive computations
- Virtualize long lists
- Optimize bundle size
- Use React.memo for pure components
- Implement code splitting

## Security Best Practices

### Backend Security
- Always validate input with Pydantic
- Use parameterized queries
- Implement rate limiting
- Store secrets in environment variables
- Use HTTPS in production
- Implement CORS properly
- Regular dependency updates

### Frontend Security
- Sanitize user input
- Avoid innerHTML with user content
- Implement CSP headers
- Use HTTPS for API calls
- Store tokens securely
- Validate data from API
- Regular dependency audits

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :8000  # Linux/macOS
netstat -ano | findstr :8000  # Windows

# Kill process
kill -9 <PID>  # Linux/macOS
taskkill /F /PID <PID>  # Windows
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose ps postgres
docker-compose logs postgres

# Check Neo4j status
docker-compose ps neo4j
docker-compose logs neo4j

# Restart services
docker-compose restart postgres neo4j
```

#### Module Import Errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Clear Python cache
find . -type d -name __pycache__ -exec rm -r {} +
```

#### Frontend Build Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Resources

### Documentation
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Neo4j Documentation](https://neo4j.com/docs/)
- [Docker Documentation](https://docs.docker.com/)

### Tools
- [Postman](https://www.postman.com/) - API testing
- [TablePlus](https://tableplus.com/) - Database GUI
- [Redis Insight](https://redis.com/redis-enterprise/redis-insight/) - Redis GUI
- [Neo4j Browser](http://localhost:7474) - Neo4j GUI

### Learning Resources
- Project Wiki: `/docs/wiki/`
- API Examples: `/docs/examples/`
- Video Tutorials: [YouTube Channel]
- Community Forum: [Discord/Slack]