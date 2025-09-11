#!/bin/bash

echo "🔧 FIXING CELERY & FLOWER SETUP"
echo "================================"

# 1. Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    bash create_env.sh
else
    echo "✅ .env file already exists"
fi

# 2. Stop all containers
echo ""
echo "🛑 Stopping all containers..."
docker-compose down

# 3. Remove old containers and volumes (optional - uncomment if needed)
# echo "🗑️  Removing old containers and volumes..."
# docker-compose down -v --remove-orphans

# 4. Rebuild containers with new dependencies
echo ""
echo "🔨 Rebuilding containers with Celery dependencies..."
docker-compose build --no-cache

# 5. Start services
echo ""
echo "🚀 Starting services..."
docker-compose up -d

# 6. Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# 7. Run migrations for Celery Beat
echo ""
echo "🔄 Running Celery Beat migrations..."
docker exec -it linux_version-backend-1 python manage.py migrate django_celery_beat
docker exec -it linux_version-backend-1 python manage.py migrate django_celery_results

# 8. Check service status
echo ""
echo "📊 Checking service status..."
docker-compose ps

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3001"
echo "   Backend:  http://localhost:8000"
echo "   Flower:   http://localhost:15555"
echo "   Redis:    localhost:16379"
echo ""
echo "🔍 To check Celery workers:"
echo "   docker exec -it linux_version-celery-1 celery -A new_concierge_backend status"
echo ""
echo "🔍 To check Celery Beat:"
echo "   docker exec -it linux_version-celery-beat-1 celery -A new_concierge_backend beat --loglevel=info"
