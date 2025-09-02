@echo off
echo Starting Curriculum Knowledge Planning System...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist backend\.env (
    echo Creating .env file from example...
    copy backend\.env.example backend\.env
    echo Please edit backend\.env and add your OpenAI API key
)

REM Start services
echo Building and starting services...
docker-compose up --build -d

REM Wait for services to be ready
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check service health
echo Checking service status...
docker-compose ps

echo.
echo System started successfully!
echo.
echo Access points:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo    Neo4j Browser: http://localhost:7474
echo.
echo Default credentials:
echo    Neo4j: neo4j/curriculum_pass
echo.
echo To stop the system, run: docker-compose down
echo To view logs, run: docker-compose logs -f
echo.
pause