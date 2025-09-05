#!/bin/bash

echo "🔍 Checking System Status..."
echo "================================"

# Check Docker containers
echo "📦 Docker Containers Status:"
echo "----------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(linux_version|NAMES)"

echo ""
echo "🗄️ Database Container Logs (last 10 lines):"
echo "--------------------------------------------"
docker logs --tail 10 linux_version-db-1 2>/dev/null || echo "❌ Database container not found"

echo ""
echo "🖥️ Backend Container Logs (last 10 lines):"
echo "-------------------------------------------"
docker logs --tail 10 linux_version-backend-1 2>/dev/null || echo "❌ Backend container not found"

echo ""
echo "🌐 Frontend Container Logs (last 10 lines):"
echo "--------------------------------------------"
docker logs --tail 10 linux_version-frontend-1 2>/dev/null || echo "❌ Frontend container not found"

echo ""
echo "🔗 Network Connectivity Test:"
echo "-----------------------------"
# Test if backend is accessible
curl -s -o /dev/null -w "Backend (8000): %{http_code}\n" http://localhost:8000/health/ || echo "Backend (8000): Connection failed"

# Test if frontend is accessible  
curl -s -o /dev/null -w "Frontend (3000): %{http_code}\n" http://localhost:3000/ || echo "Frontend (3000): Connection failed"

echo ""
echo "💾 Database Connection Test:"
echo "----------------------------"
docker exec linux_version-backend-1 python -c "
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()
from django.db import connection
try:
    with connection.cursor() as cursor:
        cursor.execute('SELECT 1')
        print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
" 2>/dev/null || echo "❌ Cannot test database connection"

echo ""
echo "🏁 Quick Assessment:"
echo "-------------------"

# Count running containers
RUNNING_CONTAINERS=$(docker ps --filter "name=linux_version" --format "{{.Names}}" | wc -l)

if [ $RUNNING_CONTAINERS -ge 3 ]; then
    echo "🟢 System appears to be running ($RUNNING_CONTAINERS/3 containers up)"
    echo "💡 Ready to run database connectivity test"
elif [ $RUNNING_CONTAINERS -ge 1 ]; then
    echo "🟡 Partial system running ($RUNNING_CONTAINERS/3 containers up)"
    echo "💡 May need to start missing containers"
else
    echo "🔴 System not running (0/3 containers up)"
    echo "💡 Run: docker-compose up -d"
fi

echo ""
echo "🚀 Next Steps:"
echo "-------------"
echo "1. If system is running, execute database test:"
echo "   docker cp backend/test_database_connectivity.py linux_version-backend-1:/app/"
echo "   docker exec -it linux_version-backend-1 python /app/test_database_connectivity.py"
echo ""
echo "2. If system is not running:"
echo "   docker-compose up -d"
echo ""
echo "3. Check individual container logs if needed:"
echo "   docker logs linux_version-backend-1"
echo "   docker logs linux_version-db-1"
echo "   docker logs linux_version-frontend-1"
