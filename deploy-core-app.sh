#!/bin/bash

# 🚀 Core App Production Deployment Script
# Usage: ./deploy-core-app.sh [server-ip] [domain]

set -e

SERVER_IP=${1:-"your-server-ip"}
DOMAIN=${2:-"app.yourdomain.com"}
REPO_URL="https://github.com/yourusername/your-repo.git"

echo "🚀 Deploying Core App to production server..."
echo "Server: $SERVER_IP"
echo "Domain: $DOMAIN"

# Check if server IP is provided
if [ "$SERVER_IP" = "your-server-ip" ]; then
    echo "❌ Please provide server IP: ./deploy-core-app.sh YOUR_SERVER_IP yourdomain.com"
    exit 1
fi

# Create deployment script for remote server
cat > remote-deploy.sh << 'EOF'
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
EOF

# Copy deployment script to server
echo "📤 Uploading deployment script to server..."
scp remote-deploy.sh root@$SERVER_IP:/tmp/

# Execute deployment on remote server
echo "🚀 Executing deployment on remote server..."
ssh root@$SERVER_IP "chmod +x /tmp/remote-deploy.sh && /tmp/remote-deploy.sh"

# Clean up
rm remote-deploy.sh

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update DNS records to point to $SERVER_IP"
echo "2. Configure SSL certificate: ssh root@$SERVER_IP 'sudo certbot --nginx -d $DOMAIN'"
echo "3. Update Public App environment variables with the generated INTERNAL_API_SECRET_KEY"
echo "4. Test the complete signup flow"
