# ⚙️ System Administration Guide
## New Concierge Platform Management

### **Overview**
This guide provides comprehensive instructions for system administrators managing the New Concierge platform, including deployment, maintenance, monitoring, and troubleshooting.

---

## **🚀 System Deployment**

### **Environment Setup**
#### **Prerequisites**
- Docker and Docker Compose
- PostgreSQL database
- Redis (for caching and sessions)
- SMTP server for email notifications
- Stripe account for payment processing

#### **Environment Variables**
```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/new_concierge

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=eur

# Security
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

### **Docker Deployment**
#### **Production Deployment**
```bash
# Clone repository
git clone https://github.com/your-org/new-concierge.git
cd new-concierge

# Set environment variables
cp .env.example .env
# Edit .env with production values

# Build and start services
docker compose -f docker-compose.prod.yml up -d

# Run initial setup
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py collectstatic --noinput
docker compose exec backend python manage.py createsuperuser
```

#### **Development Deployment**
```bash
# Start development environment
docker compose up -d

# Run migrations
docker compose exec backend python manage.py migrate

# Create superuser
docker compose exec backend python manage.py createsuperuser

# Load sample data (optional)
docker compose exec backend python manage.py loaddata sample_data.json
```

---

## **🔧 System Configuration**

### **Database Management**
#### **Migrations**
```bash
# Create new migrations
docker compose exec backend python manage.py makemigrations

# Apply migrations
docker compose exec backend python manage.py migrate

# Check migration status
docker compose exec backend python manage.py showmigrations
```

#### **Database Backup**
```bash
# Create backup
docker compose exec db pg_dump -U postgres new_concierge > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker compose exec -T db psql -U postgres new_concierge < backup_file.sql
```

#### **Database Maintenance**
```bash
# Optimize database
docker compose exec backend python manage.py dbshell
# Run VACUUM ANALYZE in PostgreSQL

# Check database size
docker compose exec backend python manage.py dbshell
# Run \l+ to see database sizes
```

### **Static Files Management**
```bash
# Collect static files
docker compose exec backend python manage.py collectstatic --noinput

# Clear static files cache
docker compose exec backend python manage.py collectstatic --clear --noinput
```

### **Cache Management**
```bash
# Clear cache
docker compose exec backend python manage.py clear_cache

# Warm cache
docker compose exec backend python manage.py warm_cache
```

---

## **👥 User Management**

### **Super User Operations**
#### **Create Super User**
```bash
docker compose exec backend python manage.py createsuperuser
```

#### **User Management Commands**
```bash
# List all users
docker compose exec backend python manage.py shell
>>> from users.models import CustomUser
>>> CustomUser.objects.all()

# Create user programmatically
>>> user = CustomUser.objects.create_user(
...     email='manager@example.com',
...     password='secure_password',
...     first_name='John',
...     last_name='Doe'
... )
>>> user.groups.add(Group.objects.get(name='Manager'))
```

#### **Role Management**
```bash
# Assign roles
docker compose exec backend python manage.py shell
>>> from django.contrib.auth.models import Group
>>> from users.models import CustomUser
>>> user = CustomUser.objects.get(email='user@example.com')
>>> user.groups.add(Group.objects.get(name='Manager'))
```

### **User Data Management**
#### **Export User Data**
```bash
docker compose exec backend python manage.py dumpdata users.CustomUser --indent 2 > users_export.json
```

#### **Import User Data**
```bash
docker compose exec backend python manage.py loaddata users_export.json
```

---

## **💳 Billing System Management**

### **Stripe Integration**
#### **Webhook Configuration**
```bash
# Test webhook endpoint
curl -X POST http://localhost:8000/api/billing/webhooks/stripe/ \
  -H "Content-Type: application/json" \
  -d '{"type": "test", "data": {}}'
```

#### **Payment Processing**
```bash
# Check payment status
docker compose exec backend python manage.py shell
>>> from billing.models import UserSubscription
>>> subscription = UserSubscription.objects.get(id=1)
>>> print(f"Status: {subscription.status}")
>>> print(f"Stripe ID: {subscription.stripe_subscription_id}")
```

#### **Invoice Management**
```bash
# Generate manual invoice
docker compose exec backend python manage.py shell
>>> from billing.services import BillingService
>>> BillingService.generate_invoice(billing_cycle_id=1)

# Process failed payments
>>> BillingService.handle_failed_payment(subscription_id=1)
```

### **Subscription Plans**
#### **Manage Plans**
```bash
# Create new plan
docker compose exec backend python manage.py shell
>>> from billing.models import SubscriptionPlan
>>> plan = SubscriptionPlan.objects.create(
...     name='Premium',
...     plan_type='premium',
...     price=99.99,
...     billing_interval='month',
...     features={
...         'max_buildings': 10,
...         'max_apartments': 100,
...         'max_users': 50
...     }
... )
```

---

## **📊 Monitoring & Analytics**

### **System Health Monitoring**
#### **Health Check Endpoints**
```bash
# Check system health
curl http://localhost:8000/api/admin/system-health/

# Check database connection
curl http://localhost:8000/api/health/database/

# Check Redis connection
curl http://localhost:8000/api/health/redis/

# Check email service
curl http://localhost:8000/api/health/email/
```

#### **Performance Monitoring**
```bash
# Monitor API performance
docker compose logs -f backend | grep "API Response Time"

# Check database queries
docker compose exec backend python manage.py shell
>>> from django.db import connection
>>> print(len(connection.queries))
```

### **Log Analysis**
#### **Application Logs**
```bash
# View application logs
docker compose logs -f backend

# View specific service logs
docker compose logs -f db
docker compose logs -f redis
```

#### **Security Audit Logs**
```bash
# Check security logs
tail -f logs/security_audit.log

# Analyze failed login attempts
grep "LOGIN_FAILED" logs/security_audit.log | tail -20
```

### **Analytics & Reporting**
#### **Generate Reports**
```bash
# Revenue report
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:8000/api/billing/api/analytics/revenue/?period_days=30

# User analytics
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:8000/api/billing/api/analytics/customers/?period_days=30
```

---

## **🔐 Security Management**

### **Access Control**
#### **Permission Management**
```bash
# Check user permissions
docker compose exec backend python manage.py shell
>>> from django.contrib.auth.models import User
>>> user = User.objects.get(email='user@example.com')
>>> print(user.get_all_permissions())
```

#### **Role Assignment**
```bash
# Assign roles to users
docker compose exec backend python manage.py shell
>>> from django.contrib.auth.models import Group
>>> from users.models import CustomUser
>>> user = CustomUser.objects.get(email='user@example.com')
>>> manager_group = Group.objects.get(name='Manager')
>>> user.groups.add(manager_group)
```

### **Security Audit**
#### **Audit Log Analysis**
```bash
# Check login attempts
grep "LOGIN_SUCCESS\|LOGIN_FAILED" logs/security_audit.log | tail -50

# Check permission changes
grep "PERMISSION_CHANGE" logs/security_audit.log

# Check data modifications
grep "DATA_MODIFICATION" logs/security_audit.log
```

#### **Security Monitoring**
```bash
# Monitor failed login attempts
watch -n 5 'grep "LOGIN_FAILED" logs/security_audit.log | tail -10'

# Check for suspicious activity
grep -E "(MULTIPLE_FAILED_ATTEMPTS|ACCOUNT_LOCKED)" logs/security_audit.log
```

---

## **📧 Email System Management**

### **Email Configuration**
#### **SMTP Settings**
```bash
# Test email configuration
docker compose exec backend python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test Subject', 'Test Message', 'from@example.com', ['to@example.com'])
```

#### **Email Templates**
```bash
# Check email templates
ls -la backend/templates/emails/

# Test email templates
docker compose exec backend python manage.py shell
>>> from users.services import EmailService
>>> EmailService.send_test_email('test@example.com')
```

### **Email Monitoring**
#### **Delivery Status**
```bash
# Check email delivery logs
grep "EMAIL_SENT" logs/application.log

# Monitor failed deliveries
grep "EMAIL_FAILED" logs/application.log
```

---

## **🔄 Backup & Recovery**

### **Data Backup**
#### **Database Backup**
```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker compose exec -T db pg_dump -U postgres new_concierge > "backups/db_backup_$DATE.sql"
gzip "backups/db_backup_$DATE.sql"

# Keep only last 30 days of backups
find backups/ -name "db_backup_*.sql.gz" -mtime +30 -delete
```

#### **File Backup**
```bash
# Backup uploaded files
tar -czf "backups/files_backup_$DATE.tar.gz" media/

# Backup configuration files
cp .env "backups/env_backup_$DATE"
```

### **Recovery Procedures**
#### **Database Recovery**
```bash
# Restore from backup
gunzip backups/db_backup_20240115_120000.sql.gz
docker compose exec -T db psql -U postgres new_concierge < backups/db_backup_20240115_120000.sql
```

#### **System Recovery**
```bash
# Full system recovery
docker compose down
docker compose up -d
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py collectstatic --noinput
```

---

## **🚨 Troubleshooting**

### **Common Issues**

#### **Database Connection Issues**
```bash
# Check database status
docker compose ps db

# Check database logs
docker compose logs db

# Restart database
docker compose restart db
```

#### **Application Errors**
```bash
# Check application logs
docker compose logs backend | tail -100

# Check error logs
tail -f logs/error.log

# Restart application
docker compose restart backend
```

#### **Payment Processing Issues**
```bash
# Check Stripe webhook logs
grep "STRIPE_WEBHOOK" logs/application.log

# Verify webhook endpoint
curl -X POST http://localhost:8000/api/billing/webhooks/stripe/ \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'
```

#### **Email Delivery Issues**
```bash
# Test email configuration
docker compose exec backend python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Test message', 'from@example.com', ['to@example.com'])

# Check email logs
grep "EMAIL" logs/application.log
```

### **Performance Issues**
#### **Slow Database Queries**
```bash
# Enable query logging
# Add to settings.py: LOGGING['loggers']['django.db.backends'] = {'level': 'DEBUG'}

# Analyze slow queries
docker compose exec backend python manage.py shell
>>> from django.db import connection
>>> for query in connection.queries:
...     print(f"Time: {query['time']} - SQL: {query['sql']}")
```

#### **Memory Usage**
```bash
# Check container memory usage
docker stats

# Monitor application memory
docker compose exec backend python manage.py shell
>>> import psutil
>>> print(f"Memory usage: {psutil.virtual_memory().percent}%")
```

---

## **📈 Performance Optimization**

### **Database Optimization**
#### **Query Optimization**
```bash
# Analyze slow queries
docker compose exec backend python manage.py shell
>>> from django.db import connection
>>> connection.queries
>>> # Review and optimize queries

# Add database indexes
docker compose exec backend python manage.py shell
>>> from django.db import connection
>>> cursor = connection.cursor()
>>> cursor.execute("CREATE INDEX CONCURRENTLY idx_user_email ON users_customuser(email);")
```

#### **Connection Pooling**
```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'OPTIONS': {
            'MAX_CONNS': 20,
            'MIN_CONNS': 5,
        }
    }
}
```

### **Caching Optimization**
#### **Redis Configuration**
```bash
# Optimize Redis settings
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

#### **Application Caching**
```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

---

## **🔧 Maintenance Procedures**

### **Regular Maintenance**
#### **Daily Tasks**
```bash
# Check system health
curl http://localhost:8000/api/admin/system-health/

# Monitor logs for errors
tail -f logs/error.log

# Check disk space
df -h
```

#### **Weekly Tasks**
```bash
# Database maintenance
docker compose exec backend python manage.py dbshell
# Run VACUUM ANALYZE;

# Clean up old logs
find logs/ -name "*.log" -mtime +7 -delete

# Update system packages
docker compose exec backend apt update && apt upgrade
```

#### **Monthly Tasks**
```bash
# Comprehensive system review
docker compose exec backend python manage.py shell
>>> from billing.services import BillingService
>>> BillingService.generate_monthly_invoices()

# Security audit
grep -E "(SECURITY|AUTH|PERMISSION)" logs/security_audit.log | tail -100

# Performance analysis
docker compose exec backend python manage.py shell
>>> from billing.advanced_analytics import AdvancedAnalyticsService
>>> AdvancedAnalyticsService.get_system_health_metrics()
```

### **Update Procedures**
#### **Application Updates**
```bash
# Pull latest changes
git pull origin main

# Update dependencies
docker compose exec backend pip install -r requirements.txt

# Run migrations
docker compose exec backend python manage.py migrate

# Restart services
docker compose restart backend
```

#### **Security Updates**
```bash
# Update system packages
docker compose exec backend apt update && apt upgrade

# Update Python packages
docker compose exec backend pip install --upgrade -r requirements.txt

# Check for security vulnerabilities
docker compose exec backend pip audit
```

---

## **📞 Emergency Procedures**

### **System Downtime**
#### **Immediate Response**
1. **Check Service Status**
   ```bash
   docker compose ps
   ```

2. **Restart Services**
   ```bash
   docker compose restart
   ```

3. **Check Logs**
   ```bash
   docker compose logs --tail=100
   ```

4. **Notify Users**
   - Send system status email
   - Update status page
   - Post on social media

#### **Extended Downtime**
1. **Activate Backup Systems**
2. **Communicate with Users**
3. **Work with Development Team**
4. **Document Incident**

### **Data Loss Prevention**
#### **Immediate Actions**
1. **Stop All Write Operations**
2. **Assess Data Loss Scope**
3. **Restore from Latest Backup**
4. **Verify Data Integrity**

#### **Recovery Process**
1. **Restore Database**
2. **Restore File System**
3. **Verify Application Functionality**
4. **Monitor System Stability**

---

## **📋 System Documentation**

### **Configuration Documentation**
- **Environment Variables**: Document all required environment variables
- **Database Schema**: Maintain up-to-date database documentation
- **API Documentation**: Keep API documentation current
- **User Guides**: Update user guides with new features

### **Operational Procedures**
- **Deployment Procedures**: Document deployment steps
- **Backup Procedures**: Document backup and recovery processes
- **Monitoring Procedures**: Document monitoring and alerting
- **Troubleshooting Guides**: Maintain troubleshooting documentation

---

**This System Administration Guide provides comprehensive instructions for managing the New Concierge platform. Regular review and updates of this guide ensure effective system management and maintenance.** ⚙️🔧


