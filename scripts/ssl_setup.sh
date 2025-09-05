#!/bin/bash
# SSL Certificate Setup Script for Production
# Supports both Let's Encrypt and self-signed certificates

set -e

# Configuration
DOMAIN="${1:-yourdomain.com}"
EMAIL="${2:-admin@yourdomain.com}"
SSL_DIR="./nginx/ssl"
CERT_TYPE="${3:-letsencrypt}"  # letsencrypt or self-signed

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔒 SSL Certificate Setup for ${DOMAIN}${NC}"
echo "========================================"

# Create SSL directory
mkdir -p "${SSL_DIR}"

if [ "$CERT_TYPE" = "letsencrypt" ]; then
    echo -e "${YELLOW}📜 Setting up Let's Encrypt certificate...${NC}"
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        echo -e "${RED}❌ Certbot not found. Installing...${NC}"
        
        # Install certbot based on OS
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y certbot python3-certbot-nginx
            elif command -v yum &> /dev/null; then
                sudo yum install -y certbot python3-certbot-nginx
            else
                echo -e "${RED}❌ Unsupported Linux distribution${NC}"
                exit 1
            fi
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew &> /dev/null; then
                brew install certbot
            else
                echo -e "${RED}❌ Homebrew not found. Please install certbot manually${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Unsupported operating system${NC}"
            exit 1
        fi
    fi
    
    # Generate Let's Encrypt certificate
    echo -e "${YELLOW}🔄 Generating Let's Encrypt certificate...${NC}"
    
    # Use standalone mode for initial certificate generation
    sudo certbot certonly \
        --standalone \
        --email "${EMAIL}" \
        --agree-tos \
        --no-eff-email \
        --domains "${DOMAIN},www.${DOMAIN}" \
        --non-interactive
    
    # Copy certificates to nginx directory
    sudo cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${SSL_DIR}/cert.pem"
    sudo cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "${SSL_DIR}/key.pem"
    
    # Set proper permissions
    sudo chown $(whoami):$(whoami) "${SSL_DIR}/cert.pem" "${SSL_DIR}/key.pem"
    chmod 644 "${SSL_DIR}/cert.pem"
    chmod 600 "${SSL_DIR}/key.pem"
    
    echo -e "${GREEN}✅ Let's Encrypt certificate generated successfully!${NC}"
    
    # Create renewal script
    cat > "./scripts/renew_ssl.sh" << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script

set -e

DOMAIN="${1:-yourdomain.com}"
SSL_DIR="./nginx/ssl"

echo "🔄 Renewing SSL certificate for ${DOMAIN}..."

# Renew certificate
sudo certbot renew --quiet

# Copy renewed certificates
sudo cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${SSL_DIR}/cert.pem"
sudo cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "${SSL_DIR}/key.pem"

# Set permissions
sudo chown $(whoami):$(whoami) "${SSL_DIR}/cert.pem" "${SSL_DIR}/key.pem"
chmod 644 "${SSL_DIR}/cert.pem"
chmod 600 "${SSL_DIR}/key.pem"

# Reload nginx if running in Docker
if docker ps | grep -q nginx; then
    docker exec $(docker ps --filter "name=nginx" --format "{{.Names}}") nginx -s reload
    echo "✅ Nginx reloaded with new certificate"
fi

echo "✅ SSL certificate renewed successfully!"
EOF
    
    chmod +x "./scripts/renew_ssl.sh"
    
    # Add cron job for automatic renewal
    echo -e "${YELLOW}📅 Setting up automatic renewal...${NC}"
    (crontab -l 2>/dev/null; echo "0 3 * * * $(pwd)/scripts/renew_ssl.sh ${DOMAIN}") | crontab -
    
    echo -e "${GREEN}✅ Automatic renewal configured (daily at 3 AM)${NC}"

else
    echo -e "${YELLOW}🔧 Generating self-signed certificate...${NC}"
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
        -keyout "${SSL_DIR}/key.pem" \
        -out "${SSL_DIR}/cert.pem" \
        -subj "/C=GR/ST=Attica/L=Athens/O=New Concierge/OU=IT Department/CN=${DOMAIN}/emailAddress=${EMAIL}" \
        -addext "subjectAltName=DNS:${DOMAIN},DNS:www.${DOMAIN}"
    
    # Set proper permissions
    chmod 644 "${SSL_DIR}/cert.pem"
    chmod 600 "${SSL_DIR}/key.pem"
    
    echo -e "${GREEN}✅ Self-signed certificate generated successfully!${NC}"
    echo -e "${YELLOW}⚠️  Note: Self-signed certificates will show security warnings in browsers${NC}"
fi

# Verify certificate
echo -e "${YELLOW}🔍 Verifying certificate...${NC}"
openssl x509 -in "${SSL_DIR}/cert.pem" -text -noout | grep -E "(Subject:|DNS:|Not After)"

# Create DH parameters for enhanced security
echo -e "${YELLOW}🔐 Generating DH parameters (this may take a while)...${NC}"
openssl dhparam -out "${SSL_DIR}/dhparam.pem" 2048

echo -e "${GREEN}🎉 SSL setup completed successfully!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Update your domain in docker-compose.prod.yml"
echo "2. Update DJANGO_ALLOWED_HOSTS in .env.production"
echo "3. Start your production stack: docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "📁 Certificate files created:"
echo "   - ${SSL_DIR}/cert.pem (certificate)"
echo "   - ${SSL_DIR}/key.pem (private key)"
echo "   - ${SSL_DIR}/dhparam.pem (DH parameters)"

if [ "$CERT_TYPE" = "letsencrypt" ]; then
    echo ""
    echo "🔄 Renewal:"
    echo "   - Automatic renewal configured via cron"
    echo "   - Manual renewal: ./scripts/renew_ssl.sh ${DOMAIN}"
fi
