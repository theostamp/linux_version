#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    sudo apt install nginx -y
fi

# Install Certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    sudo apt install certbot python3-certbot-nginx -y
fi

# Clone or update repository
if [ -d "newconcierge" ]; then
    echo "🔄 Updating existing repository..."
    cd newconcierge
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/yourusername/your-repo.git newconcierge
    cd newconcierge
fi

# Navigate to linux_version directory
cd linux_version

# Create production environment file
if [ ! -f ".env" ]; then
    echo "⚙️ Creating production environment file..."
    cp env.example .env
    
    # Generate secure secret key
    SECRET_KEY=$(openssl rand -base64 32)
    INTERNAL_API_KEY=$(openssl rand -base64 32)
    
    # Update environment variables
    sed -i "s/DJANGO_SECRET_KEY=.*/DJANGO_SECRET_KEY=$SECRET_KEY/" .env
    sed -i "s/DJANGO_DEBUG=True/DJANGO_DEBUG=False/" .env
    sed -i "s/DJANGO_ALLOWED_HOSTS=.*/DJANGO_ALLOWED_HOSTS=app.yourdomain.com,*.yourdomain.com,localhost/" .env
    sed -i "s/INTERNAL_API_SECRET_KEY=.*/INTERNAL_API_SECRET_KEY=$INTERNAL_API_KEY/" .env
    
    echo "✅ Environment file created with secure keys"
    echo "🔑 Generated INTERNAL_API_SECRET_KEY: $INTERNAL_API_KEY"
    echo "📝 Please update other environment variables in .env file"
fi

# Build and start containers
echo "🐳 Building and starting Docker containers..."
docker compose build
docker compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo "🗄️ Running database migrations..."
docker compose exec -T backend python manage.py migrate

# Create superuser if not exists
echo "👤 Creating superuser..."
docker compose exec -T backend python manage.py shell << 'PYTHON'
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
PYTHON

# Collect static files
echo "📁 Collecting static files..."
docker compose exec -T backend python manage.py collectstatic --noinput

echo "✅ Core App deployment completed!"
echo "🌐 Access your app at: https://app.yourdomain.com"
echo "👤 Admin panel: https://app.yourdomain.com/admin/ (admin/admin123)"
