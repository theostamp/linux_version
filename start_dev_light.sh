#!/bin/bash

# 🚀 New Concierge - Light Development Mode
# Εκκίνηση χωρίς Celery για γρηγορότερη development

echo "🚀 NEW CONCIERGE - LIGHT DEVELOPMENT MODE"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📦 Εκκίνηση μόνο βασικών services...${NC}"

# Stop all containers
echo -e "${YELLOW}🛑 Σταμάτημα όλων των containers...${NC}"
docker-compose down

# Start only essential services (no Celery)
echo -e "${BLUE}🚀 Εκκίνηση βασικών services...${NC}"
docker-compose up -d db redis backend frontend

# Wait for services
echo -e "${BLUE}⏳ Αναμονή για έτοιμα services...${NC}"
sleep 10

# Check status
echo -e "${GREEN}✅ Έλεγχος κατάστασης services...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}🎉 Light Development Mode έτοιμο!${NC}"
echo ""
echo -e "${BLUE}Διαθέσιμες διευθύνσεις:${NC}"
echo "  • Frontend: http://localhost:3001"
echo "  • Backend:  http://localhost:8000"
echo "  • Database: localhost:15432"
echo ""
echo -e "${YELLOW}⚠️  Celery services απενεργοποιημένα για γρηγορότερη development${NC}"
echo -e "${YELLOW}   Για πλήρη λειτουργία: ./startup.sh${NC}"
echo ""
