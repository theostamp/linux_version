#!/bin/bash

echo "🔄 Restarting Backend & Running Database Test..."
echo "==============================================="

# Restart backend container
echo "📦 Restarting backend container..."
docker-compose restart backend

# Wait for backend to initialize
echo "⏳ Waiting for backend to restart..."
sleep 8

# Check container status
echo ""
echo "📋 Container Status:"
echo "-------------------"
docker ps --filter "name=linux_version-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check backend logs for any errors
echo ""
echo "📄 Backend Startup Logs (last 15 lines):"
echo "-----------------------------------------"
docker logs --tail 15 linux_version-backend-1 2>/dev/null || echo "❌ Backend container not found"

# Test basic connectivity
echo ""
echo "🔗 Testing Backend Connectivity:"
echo "--------------------------------"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health/ 2>/dev/null || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ Backend is responding (Status: $HEALTH_STATUS)"
    BACKEND_READY=true
else
    echo "❌ Backend not responding (Status: $HEALTH_STATUS)"
    BACKEND_READY=false
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
    echo "3. Try rebuilding: docker-compose build backend && docker-compose up -d backend"
fi

echo ""
echo "🏁 Test Complete!"
echo "=================="
