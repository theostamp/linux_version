# 🚀 New Concierge - Complete Deployment Guide
## Production-Ready Installation & Setup

### **Overview**
This guide provides step-by-step instructions for deploying the complete New Concierge platform, including all features: Authentication, Authorization, Billing, Analytics, and Admin Portal.

---

## **📋 Prerequisites**

### **System Requirements**
- **OS**: Linux (Ubuntu 20.04+ recommended) or macOS
- **Docker**: Docker Engine 20.10+
- **Docker Compose**: Docker Compose 2.0+
- **Memory**: Minimum 4GB RAM, Recommended 8GB+
- **Storage**: Minimum 20GB free space
- **Network**: Internet connection for Docker images

### **External Services**
- **PostgreSQL**: Database (included in Docker setup)
- **Redis**: Caching and sessions (included in Docker setup)
- **SMTP Server**: Email notifications (Gmail, SendGrid, etc.)
- **Stripe Account**: Payment processing

---

## **🔧 Installation Steps**

### **Step 1: Clone Repository**
```bash
# Clone the repository
git clone https://github.com/your-org/new-concierge.git
cd new-concierge

# Or if you have the files locally
cd /path/to/your/new-concierge
```

### **Step 2: Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

#### **Required Environment Variables**
```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:password@db:5432/new_concierge
POSTGRES_DB=new_concierge
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# Django Configuration
SECRET_KEY=your-very-secure-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,localhost

# Email Configuration (Gmail Example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=your-email@gmail.com

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_live_...  # Use pk_test_... for testing
STRIPE_SECRET_KEY=sk_live_...       # Use sk_test_... for testing
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=eur
FRONTEND_URL=https://yourdomain.com

# Security
SECRET_KEY=your-very-secure-secret-key-here
```

### **Step 3: Docker Setup**
```bash
# Build and start all services
docker compose up -d

# Check service status
docker compose ps

# View logs if needed
docker compose logs -f
```

### **Step 4: Database Setup**
```bash
# Wait for database to be ready (30 seconds)
sleep 30

# Run database migrations
docker compose exec backend python manage.py migrate

# Create superuser account
docker compose exec backend python manage.py createsuperuser

# Load initial data (subscription plans)
docker compose exec backend python manage.py shell
>>> from billing.models import SubscriptionPlan
>>> # Plans will be created automatically by migration
```

### **Step 5: Static Files**
```bash
# Collect static files
docker compose exec backend python manage.py collectstatic --noinput

# Create logs directory
docker compose exec backend mkdir -p /app/logs
```

### **Step 6: Verify Installation**
```bash
# Test API endpoints
curl http://localhost:8000/api/billing/plans/

# Test admin panel
curl http://localhost:8000/admin/

# Check system health
curl http://localhost:8000/api/admin/system-health/
```

---

## **🌐 Production Deployment**

### **Nginx Configuration**
```nginx
# /etc/nginx/sites-available/new-concierge
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /path/to/your/static/files/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /path/to/your/media/files/;
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

### **SSL Certificate Setup**
```bash
# Using Let's Encrypt (Certbot)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### **Production Docker Compose**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build: .
    restart: unless-stopped
    environment:
      - DEBUG=False
      - ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
    volumes:
      - ./logs:/app/logs
      - ./media:/app/media
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_DB: new_concierge
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## **🔐 Security Configuration**

### **Firewall Setup**
```bash
# UFW Firewall Configuration
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### **Docker Security**
```bash
# Run containers as non-root user
docker compose exec backend adduser --disabled-password --gecos '' appuser
docker compose exec backend chown -R appuser:appuser /app
```

### **Database Security**
```bash
# Change default PostgreSQL password
docker compose exec db psql -U postgres -c "ALTER USER postgres PASSWORD 'your_secure_password';"
```

---

## **📊 Monitoring Setup**

### **System Monitoring**
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor system resources
htop
iotop
nethogs
```

### **Application Monitoring**
```bash
# Monitor Docker containers
docker stats

# Monitor application logs
docker compose logs -f backend

# Monitor database performance
docker compose exec db psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

### **Log Management**
```bash
# Set up log rotation
sudo nano /etc/logrotate.d/new-concierge

# Log rotation configuration
/path/to/your/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
```

---

## **🔄 Backup & Recovery**

### **Automated Backup Script**
```bash
#!/bin/bash
# backup.sh - Automated backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"
APP_DIR="/path/to/your/app"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
docker compose exec -T db pg_dump -U postgres new_concierge > "$BACKUP_DIR/db_backup_$DATE.sql"
gzip "$BACKUP_DIR/db_backup_$DATE.sql"

# File backup
tar -czf "$BACKUP_DIR/files_backup_$DATE.tar.gz" -C $APP_DIR media/ logs/

# Configuration backup
cp $APP_DIR/.env "$BACKUP_DIR/env_backup_$DATE"

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### **Cron Job Setup**
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh
```

### **Recovery Procedures**
```bash
# Database recovery
gunzip /path/to/backups/db_backup_20240115_120000.sql.gz
docker compose exec -T db psql -U postgres new_concierge < /path/to/backups/db_backup_20240115_120000.sql

# File recovery
tar -xzf /path/to/backups/files_backup_20240115_120000.tar.gz -C /path/to/your/app/
```

---

## **🚀 Initial Configuration**

### **Super User Setup**
```bash
# Create superuser
docker compose exec backend python manage.py createsuperuser

# Login to admin panel
# Visit: https://yourdomain.com/admin/
```

### **Subscription Plans Setup**
```bash
# Plans are created automatically by migration
# Verify plans exist
docker compose exec backend python manage.py shell
>>> from billing.models import SubscriptionPlan
>>> SubscriptionPlan.objects.all()
```

### **Email Configuration Test**
```bash
# Test email configuration
docker compose exec backend python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test Subject', 'Test Message', 'from@example.com', ['to@example.com'])
```

### **Stripe Webhook Setup**
```bash
# Configure webhook endpoint in Stripe Dashboard
# URL: https://yourdomain.com/api/billing/webhooks/stripe/
# Events: invoice.payment_succeeded, invoice.payment_failed, customer.subscription.updated
```

---

## **📈 Performance Optimization**

### **Database Optimization**
```bash
# Optimize PostgreSQL settings
docker compose exec db psql -U postgres -c "
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
"
```

### **Redis Optimization**
```bash
# Optimize Redis settings
docker compose exec redis redis-cli CONFIG SET maxmemory 256mb
docker compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### **Application Optimization**
```bash
# Enable Django caching
# Add to settings.py:
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/1',
    }
}
```

---

## **🧪 Testing & Validation**

### **System Health Check**
```bash
# Run comprehensive health check
curl -s https://yourdomain.com/api/admin/system-health/ | jq

# Check database connectivity
docker compose exec backend python manage.py dbshell -c "SELECT 1;"

# Check Redis connectivity
docker compose exec backend python manage.py shell -c "from django.core.cache import cache; cache.set('test', 'value'); print(cache.get('test'))"
```

### **API Testing**
```bash
# Test authentication
curl -X POST https://yourdomain.com/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!", "first_name": "Test", "last_name": "User"}'

# Test billing endpoints
curl -X GET https://yourdomain.com/api/billing/plans/

# Test admin endpoints (with superuser token)
curl -X GET https://yourdomain.com/api/admin/system-health/ \
  -H "Authorization: Bearer <superuser_token>"
```

---

## **📞 Support & Maintenance**

### **Regular Maintenance Tasks**
```bash
# Daily tasks
docker compose logs --tail=100 backend
curl -s https://yourdomain.com/api/admin/system-health/

# Weekly tasks
docker compose exec backend python manage.py dbshell -c "VACUUM ANALYZE;"
docker compose restart backend

# Monthly tasks
docker compose exec backend python manage.py shell -c "from billing.services import BillingService; BillingService.generate_monthly_invoices()"
```

### **Troubleshooting**
```bash
# Check service status
docker compose ps

# View logs
docker compose logs backend
docker compose logs db
docker compose logs redis

# Restart services
docker compose restart backend
docker compose restart db
docker compose restart redis

# Check disk space
df -h

# Check memory usage
free -h
```

---

## **🎯 Go-Live Checklist**

### **Pre-Deployment**
- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Stripe account configured
- [ ] Email service configured
- [ ] Database migrations applied
- [ ] Superuser account created
- [ ] Static files collected

### **Post-Deployment**
- [ ] System health check passed
- [ ] API endpoints responding
- [ ] Admin panel accessible
- [ ] Email notifications working
- [ ] Stripe webhooks configured
- [ ] Backup procedures tested
- [ ] Monitoring setup verified
- [ ] Security measures implemented

### **User Onboarding**
- [ ] Manager accounts created
- [ ] Building data imported
- [ ] User training completed
- [ ] Documentation provided
- [ ] Support procedures established

---

## **🚀 Success!**

Your New Concierge platform is now fully deployed and ready for production use!

### **Next Steps:**
1. **User Training**: Train managers and residents on system usage
2. **Data Migration**: Import existing building and user data
3. **Go-Live**: Start onboarding customers
4. **Monitor**: Use built-in analytics to monitor system performance
5. **Optimize**: Continuously improve based on usage analytics

### **Support Resources:**
- **User Guides**: Complete user documentation
- **API Documentation**: Comprehensive API reference
- **System Administration Guide**: System management procedures
- **API Testing Guide**: Testing and validation procedures

**Welcome to the New Concierge platform!** 🎉🏢
