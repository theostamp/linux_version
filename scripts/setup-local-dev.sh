#!/bin/bash

# Local Development Setup Script
# This script sets up a complete local development environment mirroring production

set -e  # Exit on error

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Setting up Local Development Environment"
echo "============================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker Desktop.${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed.${NC}"
    exit 1
fi

# Check Python 3.12+
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed.${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
if [ "$(printf '%s\n' "3.12" "$PYTHON_VERSION" | sort -V | head -n1)" != "3.12" ]; then
    echo -e "${YELLOW}⚠️  Python 3.12+ recommended. Current: $PYTHON_VERSION${NC}"
fi

# Check Node.js 20+
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${YELLOW}⚠️  Node.js 20+ recommended. Current: $(node --version)${NC}"
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Step 1: Start Docker containers
echo -e "\n${YELLOW}Step 1: Starting Docker containers (Postgres & Redis)...${NC}"
docker compose -f docker-compose.local.yml up -d db redis

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 5

# Check if services are running
if ! docker compose -f docker-compose.local.yml ps | grep -q "Up"; then
    echo -e "${RED}❌ Failed to start Docker containers${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker containers started${NC}"

# Step 2: Setup Backend Environment
echo -e "\n${YELLOW}Step 2: Setting up Backend Environment...${NC}"

cd "$PROJECT_ROOT/backend"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ backend/.env not found. Please create it first.${NC}"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip --quiet

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt -r requirements-ai.txt -r requirements_pdf.txt --quiet

echo -e "${GREEN}✅ Backend environment setup complete${NC}"

# Step 3: Run Migrations
echo -e "\n${YELLOW}Step 3: Running Database Migrations...${NC}"

# Run shared migrations
echo "Running shared schema migrations..."
python manage.py migrate_schemas --shared --noinput

# Run tenant migrations
echo "Running tenant schema migrations..."
python manage.py migrate_schemas --noinput

echo -e "${GREEN}✅ Migrations complete${NC}"

# Step 4: Create Demo Tenant
echo -e "\n${YELLOW}Step 4: Creating Demo Tenant...${NC}"

# Check if demo tenant already exists
if python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()
from django_tenants.utils import schema_exists
if schema_exists('demo'):
    exit(1)
else:
    exit(0)
" 2>/dev/null; then
    python scripts/create_tenant_and_migrate.py demo --password 123456
    echo -e "${GREEN}✅ Demo tenant created${NC}"
    echo -e "${YELLOW}📄 Credentials saved to: backend/logs/demo.log${NC}"
else
    echo -e "${YELLOW}⚠️  Demo tenant already exists. Skipping creation.${NC}"
fi

# Step 5: Setup Frontend Environment
echo -e "\n${YELLOW}Step 5: Setting up Frontend Environment...${NC}"

cd "$PROJECT_ROOT/public-app"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ public-app/.env.local not found. Please create it first.${NC}"
    exit 1
fi

# Install npm dependencies
echo "Installing npm dependencies..."
npm ci --silent

echo -e "${GREEN}✅ Frontend environment setup complete${NC}"

# Step 6: Setup /etc/hosts entry
echo -e "\n${YELLOW}Step 6: Setting up /etc/hosts entry...${NC}"

HOSTS_ENTRY="127.0.0.1 demo.localhost"

if grep -q "demo.localhost" /etc/hosts 2>/dev/null; then
    echo -e "${YELLOW}⚠️  demo.localhost already exists in /etc/hosts${NC}"
else
    echo "Adding demo.localhost to /etc/hosts..."
    echo "$HOSTS_ENTRY" | sudo tee -a /etc/hosts > /dev/null
    echo -e "${GREEN}✅ Added demo.localhost to /etc/hosts${NC}"
fi

# Summary
echo -e "\n${GREEN}============================================"
echo "✅ Local Development Environment Setup Complete!"
echo "============================================${NC}\n"

echo "Next steps:"
echo "1. Start the backend:"
echo "   cd backend && source .venv/bin/activate && python manage.py runserver 0.0.0.0:18000"
echo ""
echo "2. Start the frontend (in another terminal):"
echo "   cd public-app && npm run dev"
echo ""
echo "3. Access the application:"
echo "   Frontend: http://demo.localhost:3000"
echo "   Backend API: http://localhost:18000"
echo ""
echo "4. Demo tenant credentials:"
echo "   Check: backend/logs/demo.log"
echo ""
echo "Or use the start script:"
echo "   ./scripts/start-local-dev.sh"

