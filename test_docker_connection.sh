#!/bin/bash

echo "🧪 TESTING DOCKER CONNECTION"
echo "============================"

# Test if Docker is available
if command -v docker > /dev/null 2>&1; then
    echo "✅ Docker command is available"
    
    # Test Docker daemon
    if docker info > /dev/null 2>&1; then
        echo "✅ Docker daemon is running"
        
        # Test docker-compose
        if command -v docker-compose > /dev/null 2>&1; then
            echo "✅ docker-compose is available"
            
            # Test connection to existing containers
            echo ""
            echo "📊 Current Container Status:"
            docker-compose ps
            
            echo ""
            echo "🚀 Ready to add frontend!"
            echo "   Run: docker-compose build frontend"
            
        else
            echo "❌ docker-compose not found"
            echo "   Try: docker compose (without hyphen)"
        fi
    else
        echo "❌ Docker daemon is not running"
        echo "   Please start Docker Desktop"
    fi
else
    echo "❌ Docker command not found"
    echo "   WSL2 integration may not be enabled"
    echo "   Run: ./enable_docker_wsl2.sh"
fi


