# Database Schema Documentation

## Overview
The system uses multiple database technologies for different data requirements:
- **PostgreSQL**: Relational data (users, courses, documents)
- **Neo4j**: Knowledge graph and relationships
- **Redis**: Caching and session management
- **Weaviate**: Vector embeddings for semantic search

## PostgreSQL Schema

### Database Configuration
```sql
-- Database: curriculum_db
-- Encoding: UTF8
-- Collation: en_US.UTF-8
```

### Tables

#### 1. users
Stores user account information and authentication details.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

#### 2. documents
Manages uploaded documents and their processing status.

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    language VARCHAR(10) DEFAULT 'zh-CN',
    page_count INTEGER,
    word_count INTEGER,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    processing_error TEXT,
    extracted_text TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_metadata ON documents USING GIN(metadata);
```

#### 3. courses
Stores generated course information and structure.

```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    target_audience VARCHAR(100),
    difficulty_level VARCHAR(50),
    duration_weeks INTEGER,
    hours_per_week INTEGER,
    language VARCHAR(10) DEFAULT 'zh-CN',
    status VARCHAR(50) DEFAULT 'draft',
    outline JSONB NOT NULL DEFAULT '{}',
    learning_objectives JSONB DEFAULT '[]',
    prerequisites JSONB DEFAULT '[]',
    assessment_methods JSONB DEFAULT '[]',
    resources JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_user_id ON courses(user_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_difficulty_level ON courses(difficulty_level);
CREATE INDEX idx_courses_created_at ON courses(created_at DESC);
CREATE INDEX idx_courses_outline ON courses USING GIN(outline);
```

#### 4. course_documents
Many-to-many relationship between courses and documents.

```sql
CREATE TABLE course_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3,2),
    usage_type VARCHAR(50), -- 'primary', 'reference', 'supplementary'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, document_id)
);

CREATE INDEX idx_course_documents_course_id ON course_documents(course_id);
CREATE INDEX idx_course_documents_document_id ON course_documents(document_id);
```

#### 5. knowledge_extractions
Stores extracted knowledge from documents.

```sql
CREATE TABLE knowledge_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    extraction_type VARCHAR(50), -- 'concept', 'definition', 'example', 'formula'
    content TEXT NOT NULL,
    context TEXT,
    page_number INTEGER,
    confidence_score DECIMAL(3,2),
    neo4j_node_id VARCHAR(100),
    embeddings VECTOR(1536), -- For pgvector extension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_knowledge_extractions_document_id ON knowledge_extractions(document_id);
CREATE INDEX idx_knowledge_extractions_type ON knowledge_extractions(extraction_type);
CREATE INDEX idx_knowledge_extractions_neo4j_node_id ON knowledge_extractions(neo4j_node_id);
CREATE INDEX idx_knowledge_extractions_embeddings ON knowledge_extractions 
    USING ivfflat (embeddings vector_cosine_ops)
    WITH (lists = 100);
```

#### 6. generation_tasks
Tracks background task execution for course generation.

```sql
CREATE TABLE generation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL, -- 'course_generation', 'document_processing', 'export'
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_generation_tasks_user_id ON generation_tasks(user_id);
CREATE INDEX idx_generation_tasks_status ON generation_tasks(status);
CREATE INDEX idx_generation_tasks_task_type ON generation_tasks(task_type);
CREATE INDEX idx_generation_tasks_created_at ON generation_tasks(created_at DESC);
```

#### 7. exports
Manages course export requests and generated files.

```sql
CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    format VARCHAR(20) NOT NULL, -- 'pdf', 'docx', 'html', 'markdown'
    status VARCHAR(50) DEFAULT 'pending',
    file_path TEXT,
    file_size BIGINT,
    download_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    options JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_exports_course_id ON exports(course_id);
CREATE INDEX idx_exports_user_id ON exports(user_id);
CREATE INDEX idx_exports_status ON exports(status);
CREATE INDEX idx_exports_expires_at ON exports(expires_at);
```

#### 8. api_keys
API key management for service authentication.

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100),
    permissions JSONB DEFAULT '[]',
    rate_limit INTEGER DEFAULT 100,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);
```

#### 9. audit_logs
Comprehensive audit trail for all system activities.

```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    request_body JSONB,
    response_status INTEGER,
    response_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### Views

#### active_courses_view
```sql
CREATE VIEW active_courses_view AS
SELECT 
    c.*,
    u.username,
    u.full_name as author_name,
    COUNT(DISTINCT cd.document_id) as document_count
FROM courses c
JOIN users u ON c.user_id = u.id
LEFT JOIN course_documents cd ON c.id = cd.course_id
WHERE c.status = 'published'
GROUP BY c.id, u.username, u.full_name;
```

#### document_processing_stats_view
```sql
CREATE VIEW document_processing_stats_view AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_documents,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    AVG(EXTRACT(EPOCH FROM (processing_completed_at - processing_started_at))) as avg_processing_time
FROM documents
GROUP BY DATE(created_at);
```

## Neo4j Graph Schema

### Node Types

#### 1. Concept
Represents a knowledge concept or topic.
```cypher
(:Concept {
    id: String,           // UUID
    title: String,        // Concept name
    description: String,  // Detailed description
    difficulty: String,   // 'beginner', 'intermediate', 'advanced'
    category: String,     // Classification
    tags: [String],       // Associated tags
    created_at: DateTime,
    updated_at: DateTime
})
```

#### 2. Course
Represents a course in the graph.
```cypher
(:Course {
    id: String,           // UUID from PostgreSQL
    title: String,
    difficulty: String,
    duration_hours: Integer,
    created_at: DateTime
})
```

#### 3. Document
Represents a source document.
```cypher
(:Document {
    id: String,           // UUID from PostgreSQL
    title: String,
    type: String,         // 'textbook', 'paper', 'slides'
    language: String,
    created_at: DateTime
})
```

#### 4. LearningObjective
Represents specific learning goals.
```cypher
(:LearningObjective {
    id: String,
    description: String,
    bloom_level: String,  // 'remember', 'understand', 'apply', etc.
    measurable: Boolean
})
```

### Relationship Types

#### 1. PREREQUISITE
Indicates prerequisite relationships between concepts.
```cypher
(:Concept)-[:PREREQUISITE {
    mandatory: Boolean,
    weight: Float         // 0.0 to 1.0
}]->(:Concept)
```

#### 2. CONTAINS
Links courses to concepts they cover.
```cypher
(:Course)-[:CONTAINS {
    week: Integer,
    order: Integer,
    duration_minutes: Integer
}]->(:Concept)
```

#### 3. EXTRACTED_FROM
Links concepts to source documents.
```cypher
(:Concept)-[:EXTRACTED_FROM {
    page: Integer,
    confidence: Float,
    context: String
}]->(:Document)
```

#### 4. RELATES_TO
General relationship between concepts.
```cypher
(:Concept)-[:RELATES_TO {
    type: String,         // 'similar', 'opposite', 'example'
    strength: Float
}]->(:Concept)
```

#### 5. ACHIEVES
Links courses to learning objectives.
```cypher
(:Course)-[:ACHIEVES {
    priority: Integer
}]->(:LearningObjective)
```

### Graph Indexes

```cypher
// Node indexes
CREATE INDEX concept_title FOR (c:Concept) ON (c.title);
CREATE INDEX concept_difficulty FOR (c:Concept) ON (c.difficulty);
CREATE INDEX course_id FOR (c:Course) ON (c.id);
CREATE INDEX document_id FOR (d:Document) ON (d.id);

// Full-text search indexes
CALL db.index.fulltext.createNodeIndex(
    'conceptSearch', 
    ['Concept'], 
    ['title', 'description', 'tags']
);
```

## Redis Schema

### Key Patterns

#### 1. Session Management
```
session:{session_id}
    - user_id: UUID
    - created_at: timestamp
    - last_accessed: timestamp
    - data: JSON

TTL: 24 hours
```

#### 2. Rate Limiting
```
rate_limit:{user_id}:{endpoint}:{window}
    - count: integer
    - reset_at: timestamp

TTL: 1 minute (sliding window)
```

#### 3. Cache Keys
```
cache:courses:{course_id}
    - data: JSON (course details)
    TTL: 1 hour

cache:documents:{document_id}:extracted
    - data: JSON (extracted content)
    TTL: 6 hours

cache:search:{query_hash}
    - results: JSON array
    TTL: 15 minutes
```

#### 4. Task Queue
```
celery:queue:default
    - Celery task queue (list)

celery:task:{task_id}
    - status: string
    - result: JSON
    TTL: 24 hours
```

#### 5. Real-time Updates
```
pubsub:course_generation:{course_id}
    - Channel for course generation updates

pubsub:document_processing:{document_id}
    - Channel for document processing updates
```

## Weaviate Vector Schema

### Classes

#### 1. DocumentChunk
```json
{
  "class": "DocumentChunk",
  "properties": [
    {
      "name": "content",
      "dataType": ["text"],
      "description": "The text content of the chunk"
    },
    {
      "name": "documentId",
      "dataType": ["string"],
      "description": "Reference to PostgreSQL document"
    },
    {
      "name": "pageNumber",
      "dataType": ["int"],
      "description": "Page number in the original document"
    },
    {
      "name": "chunkIndex",
      "dataType": ["int"],
      "description": "Order of chunk within the document"
    },
    {
      "name": "metadata",
      "dataType": ["object"],
      "description": "Additional metadata"
    }
  ],
  "vectorizer": "text2vec-openai",
  "moduleConfig": {
    "text2vec-openai": {
      "model": "text-embedding-ada-002",
      "type": "text"
    }
  }
}
```

#### 2. ConceptEmbedding
```json
{
  "class": "ConceptEmbedding",
  "properties": [
    {
      "name": "title",
      "dataType": ["string"]
    },
    {
      "name": "description",
      "dataType": ["text"]
    },
    {
      "name": "neo4jNodeId",
      "dataType": ["string"]
    },
    {
      "name": "category",
      "dataType": ["string"]
    },
    {
      "name": "tags",
      "dataType": ["string[]"]
    }
  ],
  "vectorizer": "text2vec-openai"
}
```

#### 3. QuestionAnswer
```json
{
  "class": "QuestionAnswer",
  "properties": [
    {
      "name": "question",
      "dataType": ["text"]
    },
    {
      "name": "answer",
      "dataType": ["text"]
    },
    {
      "name": "courseId",
      "dataType": ["string"]
    },
    {
      "name": "difficulty",
      "dataType": ["string"]
    },
    {
      "name": "topic",
      "dataType": ["string"]
    }
  ],
  "vectorizer": "text2vec-openai"
}
```

## Database Migrations

### Alembic Configuration
```python
# alembic.ini
[alembic]
script_location = migrations
prepend_sys_path = .
version_path_separator = os
sqlalchemy.url = postgresql+asyncpg://user:pass@localhost/curriculum_db

# migrations/env.py
from app.models import Base
target_metadata = Base.metadata
```

### Migration Commands
```bash
# Create new migration
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1

# View migration history
alembic history
```

## Data Retention Policies

### PostgreSQL
- **User data**: Retained indefinitely
- **Documents**: 1 year after deletion
- **Audit logs**: 2 years
- **Generation tasks**: 30 days
- **Exports**: 7 days after expiration

### Redis
- **Sessions**: 24 hours
- **Cache**: 15 minutes to 6 hours
- **Task results**: 24 hours

### Neo4j
- **Knowledge graph**: Retained indefinitely
- **Orphaned nodes**: Cleaned up weekly

### Weaviate
- **Vector embeddings**: Retained with source documents
- **Unused embeddings**: Cleaned up monthly

## Backup Strategy

### PostgreSQL
```bash
# Daily backup
pg_dump curriculum_db > backup_$(date +%Y%m%d).sql

# Point-in-time recovery with WAL archiving
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

### Neo4j
```bash
# Online backup
neo4j-admin backup --from=localhost:6362 --to=/backup/neo4j/

# Dump for migration
neo4j-admin dump --to=/backup/neo4j/curriculum.dump
```

### Redis
```bash
# RDB snapshots
save 900 1    # After 900 sec if at least 1 key changed
save 300 10   # After 300 sec if at least 10 keys changed
save 60 10000 # After 60 sec if at least 10000 keys changed

# AOF persistence
appendonly yes
appendfsync everysec
```

## Performance Optimization

### PostgreSQL
- Proper indexing on foreign keys and frequently queried columns
- Partitioning for audit_logs table by month
- Connection pooling with PgBouncer
- Query optimization with EXPLAIN ANALYZE
- Vacuum and analyze scheduling

### Neo4j
- Composite indexes for complex queries
- Query result caching
- Batch operations for bulk updates
- Proper relationship direction modeling
- Memory configuration tuning

### Redis
- Key expiration policies
- Memory eviction strategy (allkeys-lru)
- Pipeline operations for bulk operations
- Lua scripts for atomic operations

### Weaviate
- Appropriate vector dimensions
- HNSW index parameters tuning
- Batch import for large datasets
- Proper sharding configuration