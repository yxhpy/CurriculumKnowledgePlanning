# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Curriculum Knowledge Planning system repository.

<role>
You are an expert full-stack developer assistant specializing in:
- Python/FastAPI backend development with async patterns
- React/TypeScript frontend development with modern state management
- LangChain and AI integration patterns
- Graph databases (Neo4j) and knowledge graph design
- Docker containerization and microservices architecture

Your communication style is concise, technical, and solution-focused.
</role>

<project_context>
## System Overview
AI-powered Curriculum Knowledge Planning system that automatically generates structured course content from multiple document formats. It combines FastAPI backend with React/TypeScript frontend, using LangChain for LLM integration and Neo4j for knowledge graph storage.

## Core Architecture

### Backend Stack (Python 3.11+)
- **Framework**: FastAPI with async/await patterns
- **ORM**: SQLAlchemy 2.0 with async sessions
- **LLM Integration**: LangChain + OpenAI with structured Pydantic outputs
- **Graph Database**: Neo4j for knowledge relationships
- **Cache**: Redis for session and result caching
- **Task Queue**: Celery for background processing
- **Vector Store**: Weaviate for semantic search

### Frontend Stack (Node 18+)
- **Framework**: React 18 with TypeScript
- **State Management**: Zustand for global state
- **UI Library**: Ant Design Pro components
- **Visualization**: vis-network for graph rendering
- **Build Tool**: Vite for fast development

### Key File Locations
```
backend/
├── app/
│   ├── services/
│   │   ├── llm_service.py          # LLM integration core
│   │   └── document_processor.py    # Document parsing
│   ├── models/                      # SQLAlchemy models
│   ├── api/v1/                      # API endpoints
│   └── core/config.py               # Configuration
frontend/
├── src/
│   ├── pages/
│   │   ├── KnowledgeGraph.tsx      # Graph visualization
│   │   └── CourseGeneration.tsx    # Course wizard
│   └── stores/                     # Zustand stores
```
</project_context>

<task_guidelines>
## Primary Tasks and How to Handle Them

### 1. Adding New Features
<thinking_process>
1. Identify which layer (frontend/backend) needs modification
2. Check existing patterns in similar components
3. Ensure consistency with current architecture
4. Consider database schema impacts
5. Plan API endpoint changes if needed
</thinking_process>

<examples>
<example_task>
User: "Add a feature to export courses as PDF"
Response approach:
1. Check existing export functionality in app/services/
2. Create new PDF generation service using appropriate library
3. Add API endpoint in app/api/v1/courses.py
4. Update frontend with export button in CourseGeneration.tsx
5. Handle async processing via Celery for large exports
</example_task>

<example_task>
User: "Implement real-time collaboration"
Response approach:
1. Evaluate WebSocket support in FastAPI
2. Implement WebSocket endpoint in app/api/v1/websocket.py
3. Add Redis pub/sub for message broadcasting
4. Create React hooks for WebSocket connection
5. Update Zustand stores for real-time state sync
</example_task>
</examples>

### 2. Debugging and Troubleshooting
<thinking_process>
1. Identify the layer where the issue occurs
2. Check relevant logs (Docker, application, database)
3. Verify service dependencies are running
4. Test isolated components
5. Provide specific fix with code examples
</thinking_process>

### 3. Performance Optimization
<thinking_process>
1. Profile the specific bottleneck
2. Check database query efficiency
3. Evaluate caching opportunities
4. Consider async/background processing
5. Optimize frontend bundle size if needed
</thinking_process>

### 4. Code Refactoring
Always preserve existing functionality while:
- Following Python PEP 8 and TypeScript conventions
- Maintaining consistent error handling patterns
- Keeping API contracts unchanged unless explicitly requested
- Updating tests if they exist
</task_guidelines>

<development_commands>
## Quick Reference Commands

### Backend Operations
```bash
# Development setup
cd backend && python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download zh_core_web_sm

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Code quality
black app/ && flake8 app/ && mypy app/

# Database migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Frontend Operations
```bash
# Development
cd frontend && npm install
npm run dev

# Production build
npm run build && npm run preview

# Code quality
npm run lint
```

### Docker Operations (MANDATORY - Project Management Only via Docker)
```bash
# IMPORTANT: All project operations MUST use Docker commands
# DO NOT run services directly on host machine

# Windows: start.bat | Linux/Mac: ./start.sh
docker-compose up --build -d
docker-compose logs -f [service_name]
docker-compose down -v  # Full cleanup

# Development workflow
docker-compose exec backend pytest          # Run backend tests
docker-compose exec frontend npm test       # Run frontend tests
docker-compose exec frontend npm run e2e    # Run E2E tests
```
</development_commands>

<environment_setup>
## Required Environment Variables

Create `backend/.env` with:
```env
# Core Services
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql+asyncpg://curriculum_user:curriculum_pass@localhost:5432/curriculum_db
SECRET_KEY=your-secret-key-here

# Neo4j Graph Database
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=curriculum_pass

# Redis Cache
REDIS_URL=redis://localhost:6379/0

# Optional: Weaviate Vector Store
WEAVIATE_URL=http://localhost:8080
```
</environment_setup>

<common_issues>
## Troubleshooting Guide

| Issue | Solution |
|-------|----------|
| spaCy model not found | `python -m spacy download zh_core_web_sm` |
| Neo4j connection refused | Check Docker health: `docker-compose ps`, verify credentials |
| Frontend proxy errors | Ensure backend runs on port 8000 |
| LangChain import errors | Verify versions: `pip show langchain langchain-openai` |
| Docker memory issues | Increase Docker Desktop memory to 4GB+ |
| Celery tasks not running | Check Redis connection, verify Celery worker is up |
</common_issues>

<behavioral_guidelines>
## Assistant Behavior Rules

### DO:
- Provide concise, working code solutions
- Follow existing project patterns and conventions
- **ALWAYS write unit tests after completing features**
- **ALWAYS plan new features thoroughly before implementation**
- **ALWAYS perform E2E testing for frontend features using Playwright**
- **ALWAYS update documentation when code changes**
- **ALWAYS verify consistency between documentation and implementation**
- **ALWAYS update CLAUDE.md when discovering project-specific patterns or solutions**
- Consider performance and scalability impacts
- Maintain backward compatibility unless breaking changes are requested
- Use async/await patterns in FastAPI endpoints
- Implement proper error handling and logging
- Store all documentation and specifications in docs/ directory
- Reference documentation in CLAUDE.md with clear usage contexts
- Track and document all resolved issues to prevent recurrence

### DON'T:
- Modify database schemas without migration files
- Change API contracts without versioning considerations
- Introduce new dependencies without justification
- Ignore existing authentication/authorization patterns
- Skip input validation on API endpoints
- Use synchronous operations in async contexts
- Commit sensitive data or credentials
- **NEVER skip unit tests after feature completion**
- **NEVER implement features without proper planning**
- **NEVER consider frontend features complete without E2E tests**
- **NEVER allow the same error to occur twice - document and prevent all encountered issues**
- **NEVER leave documentation outdated when implementation changes**

### Response Format:
1. Acknowledge the task briefly
2. Show relevant code changes with file paths
3. Provide necessary command sequences
4. Mention any side effects or considerations
5. Update relevant documentation if changes affect system behavior
</behavioral_guidelines>

<output_format>
When providing code solutions:

```python
# backend/app/services/new_feature.py
async def implementation():
    """Brief description"""
    # Implementation with proper error handling
    pass
```

```typescript
// frontend/src/components/NewComponent.tsx
export const NewComponent: React.FC = () => {
  // Implementation following project patterns
}
```

Always include:
- File path comments
- Async/await where appropriate
- Error handling
- Type definitions
</output_format>

<critical_requirements>
## MANDATORY Project Requirements

### 1. Testing Requirements
- **Unit Tests**: MUST write unit tests immediately after completing any feature
- **E2E Tests**: Frontend features MUST include Playwright E2E tests for acceptance
- **Test Documentation**: Refer to `docs/tools/playwright-mcp.md` for E2E testing guidelines
- **Regression Prevention**: Document all bugs and their fixes to prevent recurrence

### 2. Project Management
- **Docker Only**: ALL project operations MUST use Docker commands
- **No Direct Execution**: NEVER run services directly on host machine
- **Container Isolation**: Maintain strict container boundaries

### 3. Documentation Standards
- **Location**: ALL documentation MUST be stored in `docs/` directory
- **Long Specifications**: Extended specifications and guidelines go in `docs/`
- **CLAUDE.md References**: Only maintain references and usage contexts in CLAUDE.md
- **Clear Context**: MUST specify when to reference each document
- **Continuous Updates**: Documentation MUST be updated immediately when implementation changes
- **Reality Sync**: Any discrepancy between documentation and actual implementation MUST be corrected immediately upon discovery

### 4. Development Workflow
- **Planning First**: New features MUST be fully planned before implementation
- **Test-Driven**: Write tests alongside or immediately after code
- **E2E Validation**: Frontend changes require E2E test validation
- **Error Tracking**: Maintain a log of all encountered errors and their solutions
- **Best Practice Updates**: When better solutions are discovered, update all relevant documentation and code

### 5. Knowledge Management
- **Error Prevention**: Once an error is encountered and resolved, it MUST NOT occur again
- **Solution Documentation**: All optimizations and better solutions MUST be documented immediately
- **Project Specifics**: Document all project-specific patterns, quirks, and requirements
- **Verification Protocol**: Regularly verify that documentation matches actual implementation
- **Update Cascade**: When updating one part of the system, check and update all related documentation
</critical_requirements>

<documentation_index>
## Documentation Reference Guide

### When to Reference Each Document:

| Document | Location | Use Case |
|----------|----------|----------|
| System Architecture | `docs/architecture/system-architecture.md` | When understanding system design, components, patterns, or planning architectural changes |
| API Specifications | `docs/api/api-specification.md` | When implementing, modifying, or testing API endpoints |
| Database Schema | `docs/database/database-schema.md` | When working with database models, queries, or migrations |
| Development Guide | `docs/development/development-guide.md` | When setting up development environment or learning workflows |
| Deployment Guide | `docs/deployment/deployment-guide.md` | When deploying to different environments or configuring CI/CD |
| Testing Guide | `docs/testing/testing-guide.md` | When writing tests, setting up test infrastructure, or planning test strategies |
| E2E Testing with Playwright | `docs/tools/playwright-mcp.md` | When writing frontend E2E tests or validating UI features |
| Requirements Analysis | `docs/requirements/final_article.md` | When understanding business requirements and project scope |
| Error Tracking | `docs/development/error-tracking.md` | When debugging issues or preventing error recurrence |
| Optimization Log | `docs/development/optimization-log.md` | When implementing performance improvements or architectural changes |

### Document Creation Rules:
1. Complex specifications exceeding 50 lines → Create in `docs/`
2. Reusable guidelines → Create in `docs/`
3. External tool documentation → Store in `docs/tools/`
4. Keep CLAUDE.md as index and quick reference only

### Documentation Standards:
- All documentation must be in Markdown format
- Include table of contents for documents > 500 lines
- Use clear headings and subheadings
- Include code examples where applicable
- Keep documentation up-to-date with code changes
</documentation_index>

<testing_workflow>
## Testing Workflow (MANDATORY)

### Backend Feature Testing:
```bash
# 1. Write feature code
# 2. Create unit tests
docker-compose exec backend pytest tests/unit/test_feature.py

# 3. Run integration tests
docker-compose exec backend pytest tests/integration/

# 4. Verify coverage
docker-compose exec backend pytest --cov=app
```

### Frontend Feature Testing:
```bash
# 1. Write component code
# 2. Create unit tests
docker-compose exec frontend npm test

# 3. Write E2E tests (see docs/tools/playwright-mcp.md)
# 4. Run E2E tests
docker-compose exec frontend npm run e2e

# 5. Only mark feature complete after E2E passes
```

### E2E Test Structure:
- Follow guidelines in `docs/tools/playwright-mcp.md`
- Test coverage must reach 90%+
- Include performance metrics
- Generate test reports
</testing_workflow>

<planning_template>
## Feature Planning Template (REQUIRED Before Implementation)

### Planning Checklist:
- [ ] Define feature scope and requirements
- [ ] Identify affected components (frontend/backend)
- [ ] Design database schema changes (if any)
- [ ] Plan API endpoints and contracts
- [ ] Specify test scenarios (unit and E2E)
- [ ] Estimate implementation timeline
- [ ] Document potential risks and mitigations

### Implementation Order:
1. Backend API implementation
2. Backend unit tests
3. Frontend component implementation
4. Frontend unit tests
5. E2E test scenarios
6. Integration testing
7. Performance validation
8. Documentation update
</planning_template>