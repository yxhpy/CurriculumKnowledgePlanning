# Testing Guide

## Overview
Comprehensive testing strategy for the Curriculum Knowledge Planning system, covering unit tests, integration tests, end-to-end tests, and performance testing.

## Testing Philosophy

### Testing Pyramid
```
         /\
        /E2E\        <- End-to-End Tests (10%)
       /------\
      /  INT   \     <- Integration Tests (30%)
     /----------\
    /    UNIT    \   <- Unit Tests (60%)
   /--------------\
```

### Test Coverage Goals
- **Overall Coverage**: 90%+
- **Critical Paths**: 100%
- **Business Logic**: 95%+
- **API Endpoints**: 100%
- **UI Components**: 85%+

## Backend Testing

### 1. Unit Tests

#### Test Structure
```python
# tests/unit/test_course_service.py
import pytest
from unittest.mock import Mock, AsyncMock
from app.services.course_generator import CourseGeneratorService
from app.schemas.course_schema import CourseCreate

class TestCourseGeneratorService:
    @pytest.fixture
    def mock_llm_service(self):
        """Mock LLM service for testing"""
        mock = Mock()
        mock.generate_content = AsyncMock(return_value="Generated content")
        return mock
    
    @pytest.fixture
    def mock_repository(self):
        """Mock repository for testing"""
        mock = Mock()
        mock.create = AsyncMock()
        mock.get_by_id = AsyncMock()
        return mock
    
    @pytest.fixture
    def service(self, mock_llm_service, mock_repository):
        """Create service instance with mocks"""
        return CourseGeneratorService(mock_llm_service, mock_repository)
    
    @pytest.mark.asyncio
    async def test_generate_course_basic(self, service):
        """Test basic course generation"""
        course_data = CourseCreate(
            title="Test Course",
            duration_weeks=8,
            target_audience="beginner"
        )
        
        result = await service.generate_course(course_data)
        
        assert result is not None
        assert result.title == "Test Course"
        assert result.status == "completed"
    
    @pytest.mark.asyncio
    async def test_generate_course_with_prerequisites(self, service):
        """Test course generation with prerequisites"""
        course_data = CourseCreate(
            title="Advanced Course",
            prerequisites=["Basic Programming", "Mathematics"],
            duration_weeks=12
        )
        
        result = await service.generate_course(course_data)
        
        assert len(result.prerequisites) == 2
        assert "Basic Programming" in result.prerequisites
    
    @pytest.mark.asyncio
    async def test_generate_course_error_handling(self, service, mock_llm_service):
        """Test error handling in course generation"""
        mock_llm_service.generate_content.side_effect = Exception("LLM Error")
        
        with pytest.raises(Exception) as exc_info:
            await service.generate_course(CourseCreate(title="Test"))
        
        assert "LLM Error" in str(exc_info.value)
```

#### Fixtures and Factories
```python
# tests/conftest.py
import pytest
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.core.database import Base
from app.models.user import User
from app.models.course import Course

@pytest.fixture(scope="session")
async def test_db():
    """Create test database"""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest.fixture
async def db_session(test_db) -> AsyncGenerator[AsyncSession, None]:
    """Create database session for tests"""
    async with AsyncSession(test_db) as session:
        yield session
        await session.rollback()

@pytest.fixture
def user_factory():
    """Factory for creating user instances"""
    def _create_user(**kwargs):
        defaults = {
            "email": "test@example.com",
            "username": "testuser",
            "password_hash": "hashed_password"
        }
        defaults.update(kwargs)
        return User(**defaults)
    return _create_user

@pytest.fixture
def course_factory():
    """Factory for creating course instances"""
    def _create_course(**kwargs):
        defaults = {
            "title": "Test Course",
            "duration_weeks": 8,
            "difficulty_level": "intermediate"
        }
        defaults.update(kwargs)
        return Course(**defaults)
    return _create_course
```

### 2. Integration Tests

#### API Testing
```python
# tests/integration/test_api_courses.py
import pytest
from httpx import AsyncClient
from app.main import app

class TestCoursesAPI:
    @pytest.fixture
    async def client(self):
        """Create test client"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            yield client
    
    @pytest.fixture
    async def auth_headers(self, client):
        """Get authentication headers"""
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "test@example.com", "password": "testpass"}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.mark.asyncio
    async def test_create_course(self, client, auth_headers):
        """Test course creation endpoint"""
        course_data = {
            "title": "Integration Test Course",
            "duration_weeks": 10,
            "target_audience": "intermediate",
            "learning_objectives": [
                "Understand testing",
                "Write integration tests"
            ]
        }
        
        response = await client.post(
            "/api/v1/courses",
            json=course_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == course_data["title"]
        assert data["course_id"] is not None
    
    @pytest.mark.asyncio
    async def test_get_course(self, client, auth_headers, created_course):
        """Test getting course details"""
        response = await client.get(
            f"/api/v1/courses/{created_course.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["course_id"] == str(created_course.id)
    
    @pytest.mark.asyncio
    async def test_course_generation_workflow(self, client, auth_headers):
        """Test complete course generation workflow"""
        # Upload document
        with open("tests/fixtures/sample.pdf", "rb") as f:
            response = await client.post(
                "/api/v1/documents/upload",
                files={"file": ("sample.pdf", f, "application/pdf")},
                headers=auth_headers
            )
        assert response.status_code == 201
        doc_id = response.json()["document_id"]
        
        # Wait for processing
        import asyncio
        await asyncio.sleep(2)
        
        # Generate course
        response = await client.post(
            "/api/v1/courses/generate",
            json={
                "title": "Generated Course",
                "document_ids": [doc_id]
            },
            headers=auth_headers
        )
        assert response.status_code == 202
        course_id = response.json()["course_id"]
        
        # Check status
        response = await client.get(
            f"/api/v1/courses/{course_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
```

#### Database Integration Tests
```python
# tests/integration/test_database.py
import pytest
from app.repositories.course_repository import CourseRepository

class TestCourseRepository:
    @pytest.mark.asyncio
    async def test_create_and_retrieve(self, db_session):
        """Test creating and retrieving course from database"""
        repo = CourseRepository(db_session)
        
        # Create course
        course_data = {
            "title": "Database Test Course",
            "duration_weeks": 8,
            "user_id": "test-user-id"
        }
        created = await repo.create(course_data)
        
        # Retrieve course
        retrieved = await repo.get_by_id(created.id)
        
        assert retrieved is not None
        assert retrieved.title == course_data["title"]
        assert retrieved.duration_weeks == course_data["duration_weeks"]
    
    @pytest.mark.asyncio
    async def test_update_course(self, db_session, created_course):
        """Test updating course in database"""
        repo = CourseRepository(db_session)
        
        updates = {"title": "Updated Title", "status": "published"}
        updated = await repo.update(created_course.id, updates)
        
        assert updated.title == "Updated Title"
        assert updated.status == "published"
    
    @pytest.mark.asyncio
    async def test_delete_course(self, db_session, created_course):
        """Test deleting course from database"""
        repo = CourseRepository(db_session)
        
        result = await repo.delete(created_course.id)
        assert result is True
        
        retrieved = await repo.get_by_id(created_course.id)
        assert retrieved is None
```

### 3. Service Integration Tests

```python
# tests/integration/test_llm_integration.py
import pytest
from app.services.llm_service import LLMService

class TestLLMIntegration:
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_openai_connection(self):
        """Test actual OpenAI API connection"""
        service = LLMService()
        
        response = await service.generate_content(
            prompt="Generate a simple course outline for Python basics",
            max_tokens=100
        )
        
        assert response is not None
        assert len(response) > 0
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_document_extraction(self):
        """Test document content extraction with LLM"""
        service = LLMService()
        
        with open("tests/fixtures/sample_document.txt", "r") as f:
            content = f.read()
        
        extracted = await service.extract_concepts(content)
        
        assert extracted is not None
        assert "concepts" in extracted
        assert len(extracted["concepts"]) > 0
```

## Frontend Testing

### 1. Component Unit Tests

```typescript
// src/components/__tests__/CourseCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseCard } from '../CourseCard';
import { Course } from '@/types/course';

describe('CourseCard', () => {
  const mockCourse: Course = {
    id: '1',
    title: 'Test Course',
    description: 'Test Description',
    duration_weeks: 8,
    difficulty: 'intermediate',
    status: 'published'
  };

  it('renders course information correctly', () => {
    render(<CourseCard course={mockCourse} />);
    
    expect(screen.getByText('Test Course')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('8 weeks')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<CourseCard course={mockCourse} onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('article'));
    
    expect(handleClick).toHaveBeenCalledWith(mockCourse);
  });

  it('displays correct status badge', () => {
    render(<CourseCard course={mockCourse} />);
    
    const badge = screen.getByText('published');
    expect(badge).toHaveClass('badge-success');
  });

  it('renders loading state', () => {
    render(<CourseCard loading />);
    
    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
  });
});
```

### 2. Store Testing

```typescript
// src/stores/__tests__/courseStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCourseStore } from '../courseStore';
import { mockApi } from '@/tests/mocks/api';

describe('CourseStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useCourseStore());
    act(() => {
      result.current.reset();
    });
  });

  it('fetches courses successfully', async () => {
    const { result } = renderHook(() => useCourseStore());
    
    mockApi.getCourses.mockResolvedValue({
      courses: [
        { id: '1', title: 'Course 1' },
        { id: '2', title: 'Course 2' }
      ]
    });

    await act(async () => {
      await result.current.fetchCourses();
    });

    expect(result.current.courses).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });

  it('handles error states', async () => {
    const { result } = renderHook(() => useCourseStore());
    
    mockApi.getCourses.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.fetchCourses();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.courses).toHaveLength(0);
  });

  it('updates course correctly', async () => {
    const { result } = renderHook(() => useCourseStore());
    
    act(() => {
      result.current.setCourses([
        { id: '1', title: 'Original Title' }
      ]);
    });

    await act(async () => {
      await result.current.updateCourse('1', { title: 'Updated Title' });
    });

    expect(result.current.courses[0].title).toBe('Updated Title');
  });
});
```

### 3. Hook Testing

```typescript
// src/hooks/__tests__/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  jest.useFakeTimers();

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    
    expect(result.current).toBe('initial');
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 500 });
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('cancels previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'first' } }
    );

    rerender({ value: 'second' });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    rerender({ value: 'third' });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('first');

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe('third');
  });
});
```

## End-to-End Testing

### 1. Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 2. E2E Test Examples

```typescript
// e2e/course-generation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Course Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('complete course generation workflow', async ({ page }) => {
    // Navigate to course generation
    await page.click('text=Generate Course');
    await expect(page).toHaveURL('/courses/generate');

    // Upload document
    await page.setInputFiles('input[type="file"]', 'e2e/fixtures/sample.pdf');
    await expect(page.locator('.upload-success')).toBeVisible();

    // Fill course details
    await page.fill('input[name="title"]', 'E2E Test Course');
    await page.selectOption('select[name="difficulty"]', 'intermediate');
    await page.fill('input[name="duration"]', '8');

    // Add learning objectives
    await page.click('text=Add Learning Objective');
    await page.fill('.objective-input', 'Understand E2E testing');

    // Generate course
    await page.click('button:has-text("Generate Course")');
    
    // Wait for generation
    await expect(page.locator('.generation-progress')).toBeVisible();
    await expect(page.locator('.generation-complete')).toBeVisible({
      timeout: 60000
    });

    // Verify course created
    await expect(page).toHaveURL(/\/courses\/[a-z0-9-]+/);
    await expect(page.locator('h1')).toContainText('E2E Test Course');
  });

  test('handles errors gracefully', async ({ page }) => {
    await page.goto('/courses/generate');
    
    // Try to generate without required fields
    await page.click('button:has-text("Generate Course")');
    
    // Verify error messages
    await expect(page.locator('.error-message')).toContainText('Title is required');
    await expect(page.locator('.error-message')).toContainText('Please upload at least one document');
  });
});
```

### 3. Visual Regression Testing

```typescript
// e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('dashboard layout', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('course card appearance', async ({ page }) => {
    await page.goto('/courses');
    const courseCard = page.locator('.course-card').first();
    await expect(courseCard).toHaveScreenshot('course-card.png');
  });

  test('knowledge graph visualization', async ({ page }) => {
    await page.goto('/knowledge-graph');
    await page.waitForSelector('.vis-network');
    await expect(page.locator('.graph-container')).toHaveScreenshot('knowledge-graph.png');
  });
});
```

## Performance Testing

### 1. Load Testing with Locust

```python
# tests/performance/locustfile.py
from locust import HttpUser, task, between
import json

class CurriculumUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login before testing"""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "loadtest@example.com",
            "password": "loadtestpass"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def view_courses(self):
        """View course list"""
        self.client.get("/api/v1/courses", headers=self.headers)
    
    @task(2)
    def view_course_detail(self):
        """View specific course"""
        course_id = "test-course-id"
        self.client.get(f"/api/v1/courses/{course_id}", headers=self.headers)
    
    @task(1)
    def generate_course(self):
        """Generate new course"""
        course_data = {
            "title": f"Load Test Course",
            "duration_weeks": 8,
            "target_audience": "intermediate"
        }
        self.client.post(
            "/api/v1/courses/generate",
            json=course_data,
            headers=self.headers
        )
    
    @task(2)
    def search_courses(self):
        """Search for courses"""
        self.client.get(
            "/api/v1/search/courses?q=python",
            headers=self.headers
        )
```

### 2. API Performance Tests

```python
# tests/performance/test_api_performance.py
import pytest
import time
import asyncio
from httpx import AsyncClient

class TestAPIPerformance:
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_concurrent_requests(self, client, auth_headers):
        """Test API under concurrent load"""
        async def make_request():
            response = await client.get("/api/v1/courses", headers=auth_headers)
            return response.status_code, response.elapsed.total_seconds()
        
        # Make 100 concurrent requests
        tasks = [make_request() for _ in range(100)]
        results = await asyncio.gather(*tasks)
        
        # Analyze results
        status_codes = [r[0] for r in results]
        response_times = [r[1] for r in results]
        
        assert all(code == 200 for code in status_codes)
        assert max(response_times) < 2.0  # Max 2 seconds
        assert sum(response_times) / len(response_times) < 0.5  # Avg < 500ms
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_large_payload_handling(self, client, auth_headers):
        """Test handling of large payloads"""
        large_content = "x" * 1000000  # 1MB of text
        
        start_time = time.time()
        response = await client.post(
            "/api/v1/documents/process",
            json={"content": large_content},
            headers=auth_headers
        )
        elapsed = time.time() - start_time
        
        assert response.status_code == 200
        assert elapsed < 5.0  # Should process within 5 seconds
```

## Test Data Management

### 1. Test Fixtures

```python
# tests/fixtures/data.py
import json
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent

def load_fixture(name: str) -> dict:
    """Load JSON fixture file"""
    with open(FIXTURES_DIR / f"{name}.json") as f:
        return json.load(f)

# Sample fixtures
SAMPLE_COURSE = {
    "title": "Sample Course",
    "duration_weeks": 8,
    "difficulty": "intermediate",
    "outline": {
        "weeks": [
            {
                "week": 1,
                "title": "Introduction",
                "topics": ["Overview", "Prerequisites"]
            }
        ]
    }
}

SAMPLE_DOCUMENT = {
    "filename": "sample.pdf",
    "content": "Sample document content for testing",
    "metadata": {
        "pages": 10,
        "author": "Test Author"
    }
}
```

### 2. Database Seeding

```python
# scripts/seed_test_data.py
import asyncio
from app.core.database import get_db
from app.models import User, Course, Document

async def seed_test_data():
    """Seed database with test data"""
    async with get_db() as db:
        # Create test users
        users = [
            User(email=f"user{i}@test.com", username=f"user{i}")
            for i in range(10)
        ]
        db.add_all(users)
        
        # Create test courses
        courses = [
            Course(
                title=f"Test Course {i}",
                user_id=users[i % len(users)].id,
                duration_weeks=8 + i,
                status="published" if i % 2 == 0 else "draft"
            )
            for i in range(50)
        ]
        db.add_all(courses)
        
        await db.commit()
        print(f"Seeded {len(users)} users and {len(courses)} courses")

if __name__ == "__main__":
    asyncio.run(seed_test_data())
```

## Test Automation

### 1. CI/CD Test Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
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
    
    - name: Run unit tests
      run: |
        cd backend
        pytest tests/unit -v --cov=app --cov-report=xml
    
    - name: Run integration tests
      run: |
        cd backend
        pytest tests/integration -v -m "not slow"
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run unit tests
      run: |
        cd frontend
        npm run test:coverage
    
    - name: Run linting
      run: |
        cd frontend
        npm run lint
    
    - name: Type checking
      run: |
        cd frontend
        npm run type-check

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Start services
      run: |
        docker-compose -f docker-compose.test.yml up -d
        ./scripts/wait-for-services.sh
    
    - name: Run E2E tests
      run: |
        cd frontend
        npx playwright install
        npm run e2e
    
    - name: Upload test artifacts
      if: failure()
      uses: actions/upload-artifact@v3
      with:
        name: playwright-report
        path: frontend/playwright-report/
```

### 2. Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black
        language_version: python3.11
        files: ^backend/

  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
        files: ^backend/

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.3.0
    hooks:
      - id: mypy
        files: ^backend/

  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.42.0
    hooks:
      - id: eslint
        files: ^frontend/.*\.[jt]sx?$
```

## Test Reporting

### 1. Coverage Reports

```bash
# Backend coverage
cd backend
pytest --cov=app --cov-report=html --cov-report=term
open htmlcov/index.html

# Frontend coverage
cd frontend
npm run test:coverage
open coverage/lcov-report/index.html
```

### 2. Test Results Dashboard

```python
# scripts/generate_test_report.py
import json
from pathlib import Path
import matplotlib.pyplot as plt

def generate_test_report():
    """Generate test report dashboard"""
    # Load test results
    with open("test-results.json") as f:
        results = json.load(f)
    
    # Create visualizations
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    
    # Test coverage by module
    modules = list(results["coverage"].keys())
    coverage = list(results["coverage"].values())
    axes[0, 0].bar(modules, coverage)
    axes[0, 0].set_title("Test Coverage by Module")
    axes[0, 0].set_ylabel("Coverage %")
    
    # Test execution time
    test_types = ["Unit", "Integration", "E2E"]
    times = [results["execution_time"][t] for t in test_types]
    axes[0, 1].pie(times, labels=test_types, autopct='%1.1f%%')
    axes[0, 1].set_title("Test Execution Time Distribution")
    
    # Test success rate over time
    dates = results["history"]["dates"]
    success_rates = results["history"]["success_rates"]
    axes[1, 0].plot(dates, success_rates)
    axes[1, 0].set_title("Test Success Rate Trend")
    axes[1, 0].set_ylabel("Success Rate %")
    
    # Failed tests by category
    categories = list(results["failures"].keys())
    failures = list(results["failures"].values())
    axes[1, 1].barh(categories, failures)
    axes[1, 1].set_title("Failed Tests by Category")
    axes[1, 1].set_xlabel("Number of Failures")
    
    plt.tight_layout()
    plt.savefig("test-report.png")
    print("Test report generated: test-report.png")

if __name__ == "__main__":
    generate_test_report()
```

## Best Practices

### 1. Test Organization
- Group related tests in classes
- Use descriptive test names
- Keep tests focused and atomic
- Avoid test interdependencies
- Use appropriate markers (@pytest.mark.slow, @pytest.mark.integration)

### 2. Mocking and Stubbing
- Mock external dependencies
- Use dependency injection for testability
- Create reusable mock factories
- Verify mock interactions
- Don't over-mock

### 3. Test Data
- Use factories for test data creation
- Avoid hardcoded values
- Clean up test data after tests
- Use transactions for database tests
- Consider using faker for realistic data

### 4. Performance
- Run tests in parallel when possible
- Use test database fixtures wisely
- Cache expensive operations
- Profile slow tests
- Set appropriate timeouts

### 5. Maintenance
- Keep tests up-to-date with code
- Refactor tests regularly
- Remove obsolete tests
- Document complex test scenarios
- Review test coverage regularly