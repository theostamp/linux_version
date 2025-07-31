#!/bin/bash

echo "🧹 DIGITAL CONCIERGE - COMPLETE RESET & START"
echo "============================================="

# 1. Stop and remove all containers
echo ""
echo "🛑 Stopping and removing containers..."
docker compose down --volumes --remove-orphans

# 2. Remove all images (optional - uncomment if you want fresh images)
# echo ""
# echo "🗑️ Removing images..."
# docker rmi $(docker images -q) 2>/dev/null || true

# 3. Clean up any remaining volumes
echo ""
echo "🧹 Cleaning up volumes..."
docker volume prune -f

# 4. Clean up any remaining networks
echo ""
echo "🌐 Cleaning up networks..."
docker network prune -f

# 5. Start fresh
echo ""
echo "🚀 Starting fresh containers..."
docker compose up --build -d

# 6. Wait for containers to be ready
echo ""
echo "⏳ Waiting for containers to be ready..."
sleep 10

# 7. Show status
echo ""
echo "📊 Container status:"
docker compose ps

# 8. Show logs
echo ""
echo "📋 Recent logs:"
docker compose logs --tail=20

echo ""
echo "✅ RESET COMPLETE!"
echo "=================="
echo "🌐 Frontend: http://demo.localhost:8080"
echo "🔧 Backend: http://demo.localhost:8000"
echo "👨‍💼 Admin: http://demo.localhost:8000/admin/"
echo ""
echo "👥 Demo users:"
echo "   Admin: admin@demo.localhost / admin123456"
echo "   Manager: manager@demo.localhost / manager123456"
echo "   Resident: resident1@demo.localhost / resident123456"
echo ""
echo "📄 Credentials file: backend/logs/demo_credentials.log"