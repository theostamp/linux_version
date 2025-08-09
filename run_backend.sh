#!/bin/bash

# 🔧 Backend Server Startup

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Starting Django Backend Server...${NC}"

# Ensure virtual environment is active
if [ -z "$VIRTUAL_ENV" ]; then
    source .venv/bin/activate
fi

cd backend

# Quick migration check
python manage.py migrate --check --verbosity=0 &>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${BLUE}📊 Running pending migrations...${NC}"
    python manage.py migrate
fi

echo -e "${GREEN}✅ Starting server at http://localhost:8000${NC}"
echo -e "${BLUE}Admin panel: http://localhost:8000/admin/${NC}"
echo ""

python manage.py runserver
