#!/bin/bash

echo "⚡ MINIMAL DOCKER BUILD (Backend Only)"
echo "====================================="

# 1. Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    bash create_env.sh
fi

# 2. Stop existing containers
echo ""
echo "🛑 Stopping existing containers..."
docker-compose down

# 3. Build only essential services (skip frontend for now)
echo ""
echo "🔨 Building essential services..."

# Build database and Redis first
echo "   Building database and Redis..."
docker-compose build db redis

# Build backend services
echo "   Building backend..."
docker-compose build backend

echo "   Building celery..."
docker-compose build celery

echo "   Building celery-beat..."
docker-compose build celery-beat

echo "   Building flower..."
docker-compose build flower

# 4. Start essential services
echo ""
echo "🚀 Starting essential services..."
docker-compose up -d db redis backend celery celery-beat flower

# 5. Wait and check status
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "✅ Essential services are running!"
echo ""
echo "🌐 Access URLs:"
echo "   Backend:  http://localhost:8000"
echo "   Flower:   http://localhost:15555"
echo "   Redis:    localhost:16379"
echo ""
echo "📝 To add frontend later:"
echo "   docker-compose build frontend"
echo "   docker-compose up -d frontend"
