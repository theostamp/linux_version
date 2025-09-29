#!/bin/bash

echo "🔧 DOCKER TROUBLESHOOTING"
echo "========================="

# 1. Check Docker daemon status
echo "🐳 Docker Daemon Status:"
if docker info > /dev/null 2>&1; then
    echo "✅ Docker is running"
else
    echo "❌ Docker is not running"
    echo "   Please start Docker Desktop"
    exit 1
fi

# 2. Check network connectivity
echo ""
echo "🌐 Network Connectivity:"
if ping -c 1 registry-1.docker.io > /dev/null 2>&1; then
    echo "✅ Docker Hub is reachable"
else
    echo "❌ Docker Hub is not reachable"
    echo "   Check your internet connection"
fi

# 3. Check Docker Hub status
echo ""
echo "📊 Docker Hub Status:"
if curl -s https://status.docker.com/api/v2/status.json | grep -q "operational"; then
    echo "✅ Docker Hub is operational"
else
    echo "⚠️  Docker Hub may have issues"
fi

# 4. Check available disk space
echo ""
echo "💾 Disk Space:"
df -h / | tail -1 | awk '{print "Available: " $4 " (" $5 " used)"}'

# 5. Check Docker system info
echo ""
echo "📋 Docker System Info:"
docker system df

# 6. Check for running containers
echo ""
echo "📦 Running Containers:"
docker ps

# 7. Check Docker logs for errors
echo ""
echo "📋 Recent Docker Logs:"
if [ -f /var/log/docker.log ]; then
    tail -10 /var/log/docker.log | grep -i error || echo "No recent errors in Docker logs"
else
    echo "Docker logs not accessible"
fi

# 8. Suggest solutions
echo ""
echo "💡 Suggested Solutions:"
echo "   1. Try building with: ./build_minimal.sh"
echo "   2. Use simple frontend Dockerfile: mv frontend/Dockerfile.simple frontend/Dockerfile"
echo "   3. Build services individually: docker-compose build <service>"
echo "   4. Check Docker Desktop WSL2 integration"
echo "   5. Restart Docker Desktop if issues persist"
