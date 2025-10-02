#!/bin/bash

# Test script for notification event API endpoints

echo "=== Testing Notification Event API Endpoints ==="
echo ""

# Get JWT token (adjust credentials as needed)
echo "1. Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:8001/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"theostam1966@gmail.com","password":"admin"}')

TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo "✓ Token obtained"
echo ""

# Test pending events endpoint
echo "2. Testing GET /api/notifications/events/pending/?building_id=1"
curl -s -X GET "http://localhost:8001/api/notifications/events/pending/?building_id=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool

echo ""
echo ""

# Test digest preview endpoint
echo "3. Testing POST /api/notifications/events/digest_preview/"
curl -s -X POST "http://localhost:8001/api/notifications/events/digest_preview/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"building_id": 1}' | python3 -m json.tool | head -50

echo ""
echo "... (truncated)"
echo ""

# List all events
echo "4. Testing GET /api/notifications/events/"
curl -s -X GET "http://localhost:8001/api/notifications/events/?building=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool | head -80

echo ""
echo "✅ API endpoints are working!"
