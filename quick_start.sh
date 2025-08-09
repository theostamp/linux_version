#!/bin/bash

# 🚀 New Concierge - Quick Start Script
# Γρήγορη εκκίνηση για καθημερινή χρήση

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 NEW CONCIERGE - QUICK START${NC}\n"

# Activate virtual environment
echo -e "${BLUE}📁 Ενεργοποίηση environment...${NC}"
source .venv/bin/activate

# Quick Docker check
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Docker services τρέχουν${NC}"
else
    echo -e "${BLUE}🔧 Εκκίνηση Docker services...${NC}"
    docker-compose up -d
    sleep 5
fi

echo -e "\n${GREEN}✅ Έτοιμο για εργασία!${NC}"
echo -e "\n${BLUE}Διαθέσιμες εντολές:${NC}"
echo "  • ./run_backend.sh   - Εκκίνηση Backend (Django)"
echo "  • ./run_frontend.sh  - Εκκίνηση Frontend (React)"
echo "  • ./startup.sh       - Πλήρης setup (αν χρειάζεται)"
echo ""
