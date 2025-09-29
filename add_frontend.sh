#!/bin/bash

echo "🎨 ADDING FRONTEND TO EXISTING SETUP"
echo "===================================="

# Check if Docker is available
if ! command -v docker > /dev/null 2>&1; then
    echo "❌ Docker not available. Please enable WSL2 integration first:"
    echo "   ./enable_docker_wsl2.sh"
    exit 1
fi

# Check if containers are running
echo "📊 Checking current container status..."
docker-compose ps

echo ""
echo "🔨 Building frontend with simple Dockerfile..."

# Build frontend
if docker-compose build frontend; then
    echo "✅ Frontend built successfully!"
    
    echo ""
    echo "🚀 Starting frontend service..."
    docker-compose up -d frontend
    
    echo ""
    echo "⏳ Waiting for frontend to start..."
    sleep 10
    
    echo ""
    echo "📊 Final service status:"
    docker-compose ps
    
    echo ""
    echo "🌐 Access URLs:"
    echo "   Frontend: http://localhost:3001"
    echo "   Backend:  http://localhost:8000"
    echo "   Flower:   http://localhost:15555"
    echo "   Redis:    localhost:16379"
    
    echo ""
    echo "🔍 To check frontend logs:"
    echo "   docker-compose logs frontend"
    
else
    echo "❌ Frontend build failed"
    echo ""
    echo "💡 Troubleshooting options:"
    echo "   1. Check network connection"
    echo "   2. Try: docker system prune -f"
    echo "   3. Try: docker-compose build --no-cache frontend"
    echo "   4. Check: ./troubleshoot_docker.sh"
fi


