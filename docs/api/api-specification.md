# API Specification

## API Overview
The Curriculum Knowledge Planning API is a RESTful service that provides endpoints for document processing, knowledge graph management, and course generation.

## Base URL
```
Development: http://localhost:8000/api/v1
Production: https://api.curriculum-planning.com/v1
```

## Authentication
All API requests require authentication using JWT tokens.

### Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Getting a Token
```http
POST /auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "secure_password"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

## API Endpoints

### 1. Document Management

#### Upload Document
```http
POST /documents/upload
Content-Type: multipart/form-data

Parameters:
- file: binary (required) - Document file (PDF, DOCX, TXT, MD)
- metadata: object (optional) - Additional document metadata

Response: 201 Created
{
  "document_id": "doc_123abc",
  "filename": "course_material.pdf",
  "status": "processing",
  "created_at": "2024-01-15T10:30:00Z",
  "processing_eta": 120
}
```

#### Get Document Status
```http
GET /documents/{document_id}/status

Response: 200 OK
{
  "document_id": "doc_123abc",
  "status": "completed",
  "pages": 45,
  "extracted_concepts": 128,
  "processing_time": 85.3,
  "metadata": {
    "title": "Introduction to AI",
    "author": "John Doe",
    "language": "zh-CN"
  }
}
```

#### List Documents
```http
GET /documents?page=1&limit=20&status=completed

Query Parameters:
- page: integer (default: 1)
- limit: integer (default: 20, max: 100)
- status: string (enum: processing, completed, failed)
- created_after: datetime
- created_before: datetime

Response: 200 OK
{
  "documents": [
    {
      "document_id": "doc_123abc",
      "filename": "course_material.pdf",
      "status": "completed",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### Delete Document
```http
DELETE /documents/{document_id}

Response: 204 No Content
```

### 2. Knowledge Graph

#### Create Knowledge Node
```http
POST /knowledge/nodes
Content-Type: application/json

{
  "title": "Machine Learning Basics",
  "type": "concept",
  "description": "Fundamental concepts of machine learning",
  "properties": {
    "difficulty": "beginner",
    "duration": "2 hours",
    "prerequisites": ["mathematics", "programming"]
  }
}

Response: 201 Created
{
  "node_id": "node_456def",
  "title": "Machine Learning Basics",
  "type": "concept",
  "created_at": "2024-01-15T11:00:00Z"
}
```

#### Create Relationship
```http
POST /knowledge/relationships
Content-Type: application/json

{
  "source_id": "node_456def",
  "target_id": "node_789ghi",
  "type": "prerequisite",
  "properties": {
    "weight": 0.8,
    "mandatory": true
  }
}

Response: 201 Created
{
  "relationship_id": "rel_123xyz",
  "source_id": "node_456def",
  "target_id": "node_789ghi",
  "type": "prerequisite"
}
```

#### Query Knowledge Graph
```http
POST /knowledge/query
Content-Type: application/json

{
  "query": "MATCH (n:Concept)-[:PREREQUISITE]->(m:Concept) WHERE n.difficulty = 'beginner' RETURN n, m LIMIT 10",
  "format": "cypher"
}

Response: 200 OK
{
  "nodes": [...],
  "relationships": [...],
  "execution_time": 15.2
}
```

#### Get Learning Path
```http
GET /knowledge/learning-path?from={start_node_id}&to={end_node_id}

Response: 200 OK
{
  "path": [
    {
      "node_id": "node_123",
      "title": "Basic Programming",
      "estimated_duration": "3 hours"
    },
    {
      "node_id": "node_456",
      "title": "Data Structures",
      "estimated_duration": "5 hours"
    }
  ],
  "total_duration": "8 hours",
  "difficulty": "progressive"
}
```

### 3. Course Generation

#### Generate Course
```http
POST /courses/generate
Content-Type: application/json

{
  "title": "Introduction to Machine Learning",
  "target_audience": "undergraduate",
  "duration_weeks": 12,
  "hours_per_week": 3,
  "document_ids": ["doc_123abc", "doc_456def"],
  "learning_objectives": [
    "Understand ML fundamentals",
    "Implement basic algorithms",
    "Evaluate model performance"
  ],
  "prerequisites": ["Linear Algebra", "Python Programming"],
  "generation_options": {
    "include_exercises": true,
    "include_projects": true,
    "language": "zh-CN",
    "difficulty_level": "intermediate"
  }
}

Response: 202 Accepted
{
  "course_id": "course_789xyz",
  "status": "generating",
  "estimated_completion": "2024-01-15T12:00:00Z",
  "task_id": "task_abc123"
}
```

#### Get Course Details
```http
GET /courses/{course_id}

Response: 200 OK
{
  "course_id": "course_789xyz",
  "title": "Introduction to Machine Learning",
  "status": "completed",
  "outline": {
    "weeks": [
      {
        "week": 1,
        "title": "Introduction and Prerequisites",
        "topics": [...],
        "assignments": [...],
        "readings": [...]
      }
    ]
  },
  "metadata": {
    "total_hours": 36,
    "difficulty": "intermediate",
    "language": "zh-CN"
  }
}
```

#### Update Course
```http
PATCH /courses/{course_id}
Content-Type: application/json

{
  "title": "Advanced Machine Learning",
  "outline": {
    "weeks": [...]
  }
}

Response: 200 OK
{
  "course_id": "course_789xyz",
  "updated_at": "2024-01-15T13:00:00Z"
}
```

#### Export Course
```http
POST /courses/{course_id}/export
Content-Type: application/json

{
  "format": "pdf",
  "options": {
    "include_solutions": false,
    "include_references": true,
    "template": "academic"
  }
}

Response: 202 Accepted
{
  "export_id": "export_123",
  "status": "processing",
  "format": "pdf",
  "download_url": null,
  "expires_at": null
}
```

#### Get Export Status
```http
GET /courses/exports/{export_id}

Response: 200 OK
{
  "export_id": "export_123",
  "status": "completed",
  "format": "pdf",
  "download_url": "https://storage.example.com/exports/course_789xyz.pdf",
  "expires_at": "2024-01-16T12:00:00Z",
  "file_size": 2457600
}
```

### 4. Real-time Updates (WebSocket)

#### WebSocket Connection
```javascript
ws://localhost:8000/ws/updates

// Client sends:
{
  "type": "subscribe",
  "channels": ["course_generation", "document_processing"],
  "auth_token": "eyJhbGciOiJIUzI1NiIs..."
}

// Server sends:
{
  "type": "update",
  "channel": "course_generation",
  "data": {
    "course_id": "course_789xyz",
    "status": "processing",
    "progress": 45,
    "current_step": "Generating week 6 content"
  }
}
```

### 5. Search and Discovery

#### Search Courses
```http
GET /search/courses?q=machine+learning&language=zh-CN

Query Parameters:
- q: string (required) - Search query
- language: string - Filter by language
- difficulty: string - Filter by difficulty
- min_duration: integer - Minimum duration in hours
- max_duration: integer - Maximum duration in hours

Response: 200 OK
{
  "results": [
    {
      "course_id": "course_789xyz",
      "title": "Introduction to Machine Learning",
      "relevance_score": 0.95,
      "highlights": [
        "...fundamental concepts of <em>machine learning</em>..."
      ]
    }
  ],
  "total_results": 15,
  "facets": {
    "difficulty": {
      "beginner": 5,
      "intermediate": 8,
      "advanced": 2
    }
  }
}
```

#### Semantic Search
```http
POST /search/semantic
Content-Type: application/json

{
  "query": "How do neural networks learn from data?",
  "limit": 10,
  "filters": {
    "document_ids": ["doc_123abc"],
    "min_similarity": 0.7
  }
}

Response: 200 OK
{
  "results": [
    {
      "content": "Neural networks learn through backpropagation...",
      "source": "doc_123abc",
      "page": 15,
      "similarity_score": 0.89
    }
  ]
}
```

### 6. Analytics

#### Get Usage Statistics
```http
GET /analytics/usage?start_date=2024-01-01&end_date=2024-01-31

Response: 200 OK
{
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "statistics": {
    "documents_processed": 145,
    "courses_generated": 23,
    "total_processing_time": 3456.7,
    "api_calls": 5678,
    "unique_users": 45
  },
  "trends": {
    "daily_usage": [...],
    "popular_topics": [...]
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "duration_weeks",
      "reason": "Must be between 1 and 52"
    },
    "request_id": "req_123abc",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Codes
| HTTP Status | Error Code | Description |
|-------------|-----------|-------------|
| 400 | VALIDATION_ERROR | Invalid request parameters |
| 401 | AUTHENTICATION_FAILED | Invalid or missing authentication |
| 403 | PERMISSION_DENIED | Insufficient permissions |
| 404 | RESOURCE_NOT_FOUND | Requested resource doesn't exist |
| 409 | CONFLICT | Resource conflict (e.g., duplicate) |
| 422 | UNPROCESSABLE_ENTITY | Request understood but cannot process |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable |

## Rate Limiting

API rate limits are enforced per user:
- **Standard tier**: 100 requests per minute
- **Premium tier**: 1000 requests per minute
- **Enterprise tier**: Custom limits

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642248900
```

## Pagination

All list endpoints support pagination:
```http
GET /endpoint?page=2&limit=50

Response headers:
Link: <https://api.example.com/endpoint?page=3&limit=50>; rel="next",
      <https://api.example.com/endpoint?page=1&limit=50>; rel="prev",
      <https://api.example.com/endpoint?page=10&limit=50>; rel="last"
X-Total-Count: 500
```

## Versioning

API versioning is handled through the URL path:
- Current version: `/api/v1/`
- Previous version: `/api/v0/` (deprecated)

Version sunset dates are announced 6 months in advance.

## SDK Support

Official SDKs available:
- Python: `pip install curriculum-planning-sdk`
- JavaScript/TypeScript: `npm install @curriculum-planning/sdk`
- Java: Maven package available
- Go: `go get github.com/curriculum-planning/go-sdk`

## Webhook Events

Configure webhooks to receive real-time notifications:

### Event Types
- `document.processed`: Document processing completed
- `course.generated`: Course generation completed
- `export.ready`: Export file ready for download
- `task.failed`: Background task failed

### Webhook Payload
```json
{
  "event": "course.generated",
  "timestamp": "2024-01-15T12:00:00Z",
  "data": {
    "course_id": "course_789xyz",
    "title": "Introduction to Machine Learning"
  },
  "signature": "sha256=abc123..."
}
```

## Testing

### Sandbox Environment
Test API endpoint: `https://sandbox.api.curriculum-planning.com/v1/`

Test credentials:
- Username: `test@example.com`
- Password: `test123`
- API Key: `test_key_abc123`

### Postman Collection
Import the Postman collection for easy testing:
[Download Collection](https://api.curriculum-planning.com/postman-collection.json)

## Support

- API Status: https://status.curriculum-planning.com
- Documentation: https://docs.curriculum-planning.com
- Support Email: api-support@curriculum-planning.com
- Developer Forum: https://forum.curriculum-planning.com