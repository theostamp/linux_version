#!/bin/bash

echo "🚀 OPTIMIZED DOCKER BUILD"
echo "========================="

# 1. Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    bash create_env.sh
fi

# 2. Stop existing containers
echo ""
echo "🛑 Stopping existing containers..."
docker-compose down

# 3. Build services one by one to avoid timeout
echo ""
echo "🔨 Building backend services first..."

# Build backend (most critical)
echo "   Building backend..."
docker-compose build backend

# Build Celery services
echo "   Building celery..."
docker-compose build celery

echo "   Building celery-beat..."
docker-compose build celery-beat

echo "   Building flower..."
docker-compose build flower

# 4. Build frontend separately (most likely to timeout)
echo ""
echo "🎨 Building frontend (this may take longer)..."
docker-compose build frontend

# 5. Start services
echo ""
echo "🚀 Starting services..."
docker-compose up -d

# 6. Wait and check status
echo ""
echo "⏳ Waiting for services to start..."
sleep 15

echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "✅ Build complete!"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3001"
echo "   Backend:  http://localhost:8000"
echo "   Flower:   http://localhost:15555"
echo "   Redis:    localhost:16379"
