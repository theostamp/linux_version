#!/bin/bash

# 🎨 Frontend Server Startup

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🎨 Starting React Frontend Server...${NC}"

cd frontend

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✅ Starting server at http://localhost:3000${NC}"
echo ""

npm run dev
