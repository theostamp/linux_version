#!/bin/bash

# Create .env file from env.example
if [ ! -f .env ]; then
    echo "Creating .env file from env.example..."
    cp env.example .env
    
    # Add Celery and Redis configuration
    cat >> .env << 'EOF'

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Celery Configuration
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
EOF
    
    echo "✅ .env file created successfully!"
    echo "📝 Please edit .env file and set your DJANGO_SECRET_KEY"
else
    echo "⚠️  .env file already exists"
fi
