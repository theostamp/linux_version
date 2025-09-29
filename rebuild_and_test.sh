#!/bin/bash

echo "🔨 Rebuilding Backend & Running Database Test..."
echo "==============================================="

# Rebuild backend container
echo "🏗️ Rebuilding backend container..."
docker-compose build backend

# Start backend container
echo "📦 Starting backend container..."
docker-compose up -d backend

# Wait for backend to initialize
echo "⏳ Waiting for backend to start..."
sleep 12

# Check container status
echo ""
echo "📋 Container Status:"
echo "-------------------"
docker ps --filter "name=linux_version-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check backend logs for any errors
echo ""
echo "📄 Backend Startup Logs (last 20 lines):"
echo "-----------------------------------------"
docker logs --tail 20 linux_version-backend-1 2>/dev/null || echo "❌ Backend container not found"

# Test basic connectivity
echo ""
echo "🔗 Testing Backend Connectivity:"
echo "--------------------------------"
sleep 5  # Extra time for Django to fully start

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health/ 2>/dev/null || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ Backend is responding (Status: $HEALTH_STATUS)"
    BACKEND_READY=true
else
    echo "❌ Backend not responding (Status: $HEALTH_STATUS)"
    BACKEND_READY=false
fi

# Test API root
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/ 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ] || [ "$API_STATUS" = "401" ] || [ "$API_STATUS" = "403" ]; then
    echo "✅ API root accessible (Status: $API_STATUS)"
else
    echo "❌ API root not accessible (Status: $API_STATUS)"
fi

echo ""
echo "🗄️ Running Database Connectivity Test:"
echo "======================================="

if [ "$BACKEND_READY" = true ]; then
    # Copy test script to container
    echo "📋 Copying test script to container..."
    docker cp backend/test_database_connectivity.py linux_version-backend-1:/app/
    
    # Run comprehensive database test
    echo "🔍 Executing database connectivity test..."
    echo ""
    docker exec -it linux_version-backend-1 python /app/test_database_connectivity.py
else
    echo "❌ Skipping database test - backend not ready"
    echo ""
    echo "🔧 Troubleshooting Steps:"
    echo "------------------------"
    echo "1. Check backend logs: docker logs linux_version-backend-1"
    echo "2. Check if all containers are running: docker ps"
    echo "3. Check for build errors: docker-compose build backend"
    echo "4. Try manual start: docker-compose up backend"
fi

echo ""
echo "🏁 Rebuild & Test Complete!"
echo "==========================="
