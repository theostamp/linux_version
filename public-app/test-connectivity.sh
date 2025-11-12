#!/bin/bash

# Connectivity Test Script
# Tests API connectivity and environment setup

echo "🔍 Testing Connectivity..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local file exists${NC}"
    source .env.local
else
    echo -e "${YELLOW}⚠️  .env.local file not found${NC}"
fi

# Check API_BASE_URL
if [ -z "$API_BASE_URL" ]; then
    echo -e "${YELLOW}⚠️  API_BASE_URL not set in environment${NC}"
    echo "   Default will be used: https://linuxversion-production.up.railway.app"
else
    echo -e "${GREEN}✅ API_BASE_URL is set: $API_BASE_URL${NC}"
fi

# Check NEXT_PUBLIC_API_URL
if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_API_URL not set (optional)${NC}"
else
    echo -e "${GREEN}✅ NEXT_PUBLIC_API_URL is set: $NEXT_PUBLIC_API_URL${NC}"
fi

echo ""
echo "Testing Railway Backend Connectivity..."

# Test Railway backend
RAILWAY_URL="https://linuxversion-production.up.railway.app"
API_URL="${API_BASE_URL:-$RAILWAY_URL}"

echo "Testing: $API_URL"

# Test health endpoint (if exists)
if curl -s -f -o /dev/null -w "%{http_code}" "$API_URL/api/health/" | grep -q "200\|404"; then
    echo -e "${GREEN}✅ Backend is reachable${NC}"
else
    echo -e "${RED}❌ Backend is not reachable${NC}"
    echo "   Check if Railway backend is running"
fi

echo ""
echo "Testing Next.js API Proxy..."

# Test local Next.js proxy (if running)
if curl -s -f -o /dev/null -w "%{http_code}" "http://localhost:3000/api/health" 2>/dev/null | grep -q "200\|404\|502"; then
    echo -e "${GREEN}✅ Next.js proxy is reachable${NC}"
else
    echo -e "${YELLOW}⚠️  Next.js proxy not reachable (may not be running)${NC}"
    echo "   Start with: npm run dev"
fi

echo ""
echo "📋 Summary:"
echo "1. Set API_BASE_URL in Vercel environment variables"
echo "2. Verify Railway backend is running"
echo "3. Test production URL after deployment"
echo ""
echo "For more details, see: VERCEL_DEPLOYMENT.md"

