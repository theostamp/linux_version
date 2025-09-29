#!/bin/bash

echo "🐳 DOCKER WSL2 INTEGRATION SETUP"
echo "================================"

echo ""
echo "📋 Current Status:"
echo "   Docker command not found in WSL2"
echo "   This means WSL2 integration is not enabled"

echo ""
echo "🔧 To Enable Docker WSL2 Integration:"
echo ""
echo "   1. Open Docker Desktop"
echo "   2. Go to Settings (gear icon)"
echo "   3. Navigate to 'Resources' → 'WSL Integration'"
echo "   4. Enable 'Use the WSL 2 based engine'"
echo "   5. Enable integration for your WSL2 distro:"
echo "      - Ubuntu (or your current distro)"
echo "   6. Click 'Apply & Restart'"
echo ""
echo "   7. Wait for Docker Desktop to restart"
echo "   8. Come back to this terminal and run:"
echo "      ./test_docker_connection.sh"

echo ""
echo "⚠️  Alternative: If Docker Desktop is not installed:"
echo "   1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop"
echo "   2. Install it on Windows"
echo "   3. Follow the steps above"

echo ""
echo "🔄 After enabling WSL2 integration, you can:"
echo "   - Run: docker-compose build frontend"
echo "   - Run: docker-compose up -d frontend"
echo "   - Access: http://localhost:3001"


