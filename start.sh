#!/bin/bash

echo "🚀 Starting Curriculum Knowledge Planning System..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating .env file from example..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env and add your OpenAI API key"
fi

# Start services
echo "🔧 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service status..."
docker-compose ps

echo "✅ System started successfully!"
echo ""
echo "📌 Access points:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo "   Neo4j Browser: http://localhost:7474"
echo ""
echo "📝 Default credentials:"
echo "   Neo4j: neo4j/curriculum_pass"
echo ""
echo "💡 To stop the system, run: docker-compose down"
echo "📊 To view logs, run: docker-compose logs -f"