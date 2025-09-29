#!/bin/bash

# 🔍 Document Parser Health Check
# Έλεγχος αν το Document Parser λειτουργεί σωστά

echo "🔍 DOCUMENT PARSER HEALTH CHECK"
echo "================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Celery Worker is running
echo -e "${BLUE}1. Έλεγχος Celery Worker...${NC}"
if docker ps | grep -q "linux_version-celery-1"; then
    echo -e "${GREEN}✅ Celery Worker τρέχει${NC}"
    CELERY_RUNNING=true
else
    echo -e "${RED}❌ Celery Worker δεν τρέχει${NC}"
    CELERY_RUNNING=false
fi

# Check if Document Parser API is accessible
echo -e "${BLUE}2. Έλεγχος Document Parser API...${NC}"
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/parser/documents/)
if [ "$API_RESPONSE" = "200" ] || [ "$API_RESPONSE" = "401" ]; then
    echo -e "${GREEN}✅ Document Parser API προσβάσιμο (HTTP $API_RESPONSE)${NC}"
    API_ACCESSIBLE=true
else
    echo -e "${RED}❌ Document Parser API δεν προσβάσιμο (HTTP $API_RESPONSE)${NC}"
    API_ACCESSIBLE=false
fi

# Check if Document Parser models exist
echo -e "${BLUE}3. Έλεγχος Document Parser models...${NC}"
if docker exec linux_version-backend-1 python -c "
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()
from document_parser.models import DocumentUpload
print('Document Parser models OK')
" 2>/dev/null; then
    echo -e "${GREEN}✅ Document Parser models OK${NC}"
    MODELS_OK=true
else
    echo -e "${RED}❌ Document Parser models προβλημα${NC}"
    MODELS_OK=false
fi

# Summary
echo ""
echo -e "${BLUE}📊 ΣΥΝΟΨΗ:${NC}"
echo "=================="

if [ "$CELERY_RUNNING" = true ] && [ "$API_ACCESSIBLE" = true ] && [ "$MODELS_OK" = true ]; then
    echo -e "${GREEN}🎉 Document Parser λειτουργεί πλήρως!${NC}"
    echo -e "${GREEN}✅ Μπορείς να ανεβάσεις και να επεξεργαστείς έγγραφα${NC}"
    exit 0
elif [ "$CELERY_RUNNING" = false ]; then
    echo -e "${RED}❌ Document Parser ΔΕΝ λειτουργεί - Celery Worker απενεργοποιημένο${NC}"
    echo -e "${YELLOW}💡 Λύση: Χρησιμοποίησε ./startup.sh αντί για ./start_dev_light.sh${NC}"
    exit 1
else
    echo -e "${YELLOW}⚠️ Document Parser μερικώς λειτουργικό${NC}"
    echo -e "${YELLOW}💡 Έλεγξε τα logs: docker logs linux_version-celery-1${NC}"
    exit 2
fi
