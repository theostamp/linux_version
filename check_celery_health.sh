#!/bin/bash

echo "🏥 CELERY & FLOWER HEALTH CHECK"
echo "================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running or not accessible"
    echo "   Please start Docker Desktop and enable WSL2 integration"
    exit 1
fi

echo "✅ Docker is running"

# Check container status
echo ""
echo "📊 Container Status:"
docker-compose ps

# Check Redis connection
echo ""
echo "🔴 Redis Connection Test:"
if docker exec -it linux_version-redis-1 redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is responding"
else
    echo "❌ Redis is not responding"
fi

# Check Celery worker
echo ""
echo "🔄 Celery Worker Status:"
if docker exec -it linux_version-celery-1 celery -A new_concierge_backend status > /dev/null 2>&1; then
    echo "✅ Celery worker is running"
    docker exec -it linux_version-celery-1 celery -A new_concierge_backend status
else
    echo "❌ Celery worker is not responding"
fi

# Check Celery Beat
echo ""
echo "⏰ Celery Beat Status:"
if docker exec -it linux_version-celery-beat-1 ps aux | grep beat > /dev/null 2>&1; then
    echo "✅ Celery Beat is running"
else
    echo "❌ Celery Beat is not running"
fi

# Check Flower
echo ""
echo "🌸 Flower Status:"
if curl -s http://localhost:15555 > /dev/null 2>&1; then
    echo "✅ Flower is accessible at http://localhost:15555"
else
    echo "❌ Flower is not accessible"
fi

# Check port usage
echo ""
echo "🔌 Port Usage:"
echo "   Redis: 16379 (external) -> 6379 (internal)"
echo "   Flower: 15555 (external) -> 5555 (internal)"
echo "   Backend: 8000"
echo "   Frontend: 3001"

# Check logs for errors
echo ""
echo "📋 Recent Error Logs:"
echo "   Celery Worker:"
docker logs --tail=5 linux_version-celery-1 2>&1 | grep -i error || echo "   No recent errors"
echo "   Celery Beat:"
docker logs --tail=5 linux_version-celery-beat-1 2>&1 | grep -i error || echo "   No recent errors"
echo "   Flower:"
docker logs --tail=5 linux_version-flower-1 2>&1 | grep -i error || echo "   No recent errors"
