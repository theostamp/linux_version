#!/bin/bash

# Local Development Start Script
# Starts all services for local development

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Local Development Environment${NC}"
echo "============================================"

# Check if Docker containers are running
if ! docker compose -f docker-compose.local.yml ps | grep -q "Up"; then
    echo -e "${YELLOW}Starting Docker containers...${NC}"
    docker compose -f docker-compose.local.yml up -d db redis
    echo "Waiting for services to be ready..."
    sleep 5
fi

echo -e "\n${GREEN}✅ Infrastructure services running${NC}"
echo ""
echo "Services:"
echo "  - Postgres: localhost:5433"
echo "  - Redis: localhost:6379"
echo ""
echo -e "${YELLOW}Starting application servers...${NC}"
echo ""
echo "To start the backend, run in a new terminal:"
echo "  cd backend"
echo "  source .venv/bin/activate"
echo "  python manage.py runserver 0.0.0.0:18000"
echo ""
echo "To start the frontend, run in another terminal:"
echo "  cd public-app"
echo "  npm run dev"
echo ""
echo "Access:"
echo "  Frontend: http://demo.localhost:3000"
echo "  Backend API: http://localhost:18000"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop Docker containers${NC}"

# Keep script running and show logs
docker compose -f docker-compose.local.yml logs -f db redis

