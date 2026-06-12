#!/bin/bash
# Homeschool Learning Platform - Setup Script
# Run this script to set up the development environment

set -e

echo "================================================"
echo "  Homeschool Learning Platform - Setup"
echo "================================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

command -v python3 >/dev/null 2>&1 || { echo "ERROR: Python 3 required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker required"; exit 1; }

echo "✓ Python 3: $(python3 --version)"
echo "✓ Node: $(node --version)"
echo "✓ npm: $(npm --version)"
echo "✓ Docker: $(docker --version)"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PYTHON_BIN="/home/max/.local/bin/python3.11"
if [ ! -f "$PYTHON_BIN" ]; then
    PYTHON_BIN="python3"
fi

# 1. Set up PostgreSQL with Docker
echo "================================================"
echo "  Step 1: Setting up PostgreSQL"
echo "================================================"
if docker ps --format '{{.Names}}' | grep -q "homeschool-db"; then
    echo "✓ PostgreSQL already running"
else
    docker run -d --name homeschool-db \
        -e POSTGRES_DB=homeschool \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -p 5432:5432 \
        -v "$PROJECT_DIR/database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql" \
        postgres:16-alpine
    echo "✓ PostgreSQL started (port 5432)"
    echo "  Waiting for database to be ready..."
    sleep 3
fi
echo ""

# 2. Set up Python backend
echo "================================================"
echo "  Step 2: Setting up Python Backend"
echo "================================================"
cd "$PROJECT_DIR/backend"

if [ ! -d "venv" ]; then
    $PYTHON_BIN -m venv venv
    echo "✓ Virtual environment created (Python $($PYTHON_BIN --version))"
fi

source venv/bin/activate
pip install -q -r requirements.txt
echo "✓ Python dependencies installed"

# Create .env if not exists
if [ ! -f ".env" ]; then
    cat > .env << EOF
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/homeschool
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
CORS_ORIGINS=*
ENV=development
DEBUG=true
EOF
    echo "✓ .env file created with random secret key"
fi
echo ""

# 3. Set up Next.js frontend
echo "================================================"
echo "  Step 3: Setting up Next.js Frontend"
echo "================================================"
cd "$PROJECT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    npm install
    echo "✓ npm dependencies installed"
else
    echo "✓ npm dependencies already installed"
fi

echo ""
echo "================================================"
echo "  Setup Complete!"
echo "================================================"
echo ""
echo "  Start the platform:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd $PROJECT_DIR/backend"
echo "    source venv/bin/activate"
echo "    uvicorn app.main:app --reload --port 8000"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd $PROJECT_DIR/frontend"
echo "    npm run dev"
echo ""
echo "  Access the app:"
echo "    Frontend: http://localhost:3000"
echo "    Backend API: http://localhost:8000/api/v1"
echo "    API Docs: http://localhost:8000/docs"
echo ""
echo "================================================"
