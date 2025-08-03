# 🚀 Production Deployment Guide

## 📋 Επισκόπηση

Αυτός ο οδηγός περιγράφει το πλήρες process για την ανάπτυξη του Financial Management System σε production environment. Το σύστημα είναι σχεδιασμένο για υψηλή διαθεσιμότητα, ασφάλεια και performance.

## 🏗️ Αρχιτεκτονική Production

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   SSL/TLS       │    │   CDN           │
│   (Nginx)       │    │   Termination   │    │   (Optional)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Static Files  │
│   (Next.js)     │    │   (Django)      │    │   (Nginx)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │   Database      │
                    │   (PostgreSQL)  │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Cache         │
                    │   (Redis)       │
                    └─────────────────┘
```

## 🔧 Προαπαιτούμενα

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recommended)
- **Storage**: 100GB+ SSD
- **Network**: Stable internet connection

### Software Requirements
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: Latest version
- **SSL Certificate**: Valid SSL certificate for your domain

## 📦 Εγκατάσταση

### 1. Clone Repository
```bash
git clone <repository-url>
cd linux_version
```

### 2. Setup Environment
```bash
# Copy production environment template
cp env.production .env.production

# Edit environment variables
nano .env.production
```

### 3. Configure SSL Certificates
```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your SSL certificates
cp your-certificate.pem nginx/ssl/cert.pem
cp your-private-key.pem nginx/ssl/key.pem

# Set proper permissions
chmod 600 nginx/ssl/*
```

### 4. Update Domain Configuration
```bash
# Update nginx configuration
sed -i 's/yourdomain.com/your-actual-domain.com/g' nginx/nginx.prod.conf

# Update docker-compose configuration
sed -i 's/yourdomain.com/your-actual-domain.com/g' docker-compose.prod.yml
```

## 🚀 Deployment

### Automated Deployment
```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

### Manual Deployment
```bash
# 1. Build images
docker-compose -f docker-compose.prod.yml build

# 2. Start services
docker-compose -f docker-compose.prod.yml up -d

# 3. Run migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# 4. Collect static files
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# 5. Create superuser
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

## 🔍 Health Checks

### Automated Health Checks
Το σύστημα περιλαμβάνει automated health checks για όλα τα services:

```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Check specific service logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs nginx
```

### Manual Health Checks
```bash
# Backend health
curl -f http://localhost:8000/api/health/

# Frontend health
curl -f http://localhost:3000/api/health

# Nginx health
curl -f http://localhost/health

# Database health
docker-compose -f docker-compose.prod.yml exec db pg_isready -U postgres

# Redis health
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

## 📊 Monitoring

### Prometheus Metrics
- **URL**: http://localhost:9090
- **Metrics**: System, application, and custom financial metrics
- **Alerts**: Pre-configured alerts for critical issues

### Grafana Dashboards
- **URL**: http://localhost:3001
- **Username**: admin
- **Password**: admin (change on first login)
- **Dashboards**: Pre-configured dashboards for financial system

### Log Monitoring
```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f backend

# View nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx

# View database logs
docker-compose -f docker-compose.prod.yml logs -f db
```

## 🔄 Backup & Recovery

### Automated Backups
```bash
# Run backup manually
docker-compose -f docker-compose.prod.yml run --rm backup

# Schedule daily backups (cron)
0 2 * * * cd /path/to/project && docker-compose -f docker-compose.prod.yml run --rm backup
```

### Backup Contents
- **Database**: Complete PostgreSQL dump
- **Files**: Media and static files
- **Configuration**: Application settings
- **Logs**: Application and system logs

### Recovery Process
```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Restore database
gunzip -c /backups/database_YYYYMMDD_HHMMSS.sql.gz | \
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres

# Restore files
tar -xzf /backups/files_YYYYMMDD_HHMMSS.tar.gz -C /vol/

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## 🔒 Security

### Security Features
- **SSL/TLS**: Full encryption in transit
- **Security Headers**: HSTS, CSP, XSS protection
- **Rate Limiting**: API and login rate limiting
- **Authentication**: JWT with token rotation
- **Authorization**: Role-based access control
- **Audit Logging**: Complete audit trail for financial operations

### Security Checklist
- [ ] SSL certificates installed and valid
- [ ] Environment variables secured
- [ ] Database passwords strong and unique
- [ ] Firewall configured
- [ ] Regular security updates
- [ ] Backup encryption enabled
- [ ] Access logs monitored

## 📈 Performance Optimization

### Database Optimization
```sql
-- Create indexes for financial tables
CREATE INDEX CONCURRENTLY idx_expense_date ON financial_expense(date);
CREATE INDEX CONCURRENTLY idx_payment_date ON financial_payment(date);
CREATE INDEX CONCURRENTLY idx_meter_reading_date ON financial_meterreading(date);

-- Analyze tables
ANALYZE financial_expense;
ANALYZE financial_payment;
ANALYZE financial_meterreading;
```

### Caching Strategy
- **Redis**: Session storage and application cache
- **Nginx**: Static file caching
- **Browser**: Asset caching with versioning
- **Database**: Query result caching

### Performance Monitoring
```bash
# Check system resources
docker stats

# Monitor database performance
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -c "
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;
"
```

## 🔧 Maintenance

### Regular Maintenance Tasks
```bash
# Weekly tasks
docker system prune -f
docker image prune -a --filter "until=168h" -f

# Monthly tasks
docker-compose -f docker-compose.prod.yml exec backend python manage.py clearsessions
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Quarterly tasks
docker-compose -f docker-compose.prod.yml exec db vacuumdb --all --analyze
```

### Update Process
```bash
# 1. Backup current system
./scripts/backup.sh

# 2. Pull latest code
git pull origin main

# 3. Update environment if needed
# Edit .env.production if new variables added

# 4. Deploy updates
./scripts/deploy.sh

# 5. Verify deployment
./scripts/health-check.sh
```

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs service_name

# Check resource usage
docker stats

# Restart service
docker-compose -f docker-compose.prod.yml restart service_name
```

#### Database Connection Issues
```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec db pg_isready -U postgres

# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Restart database
docker-compose -f docker-compose.prod.yml restart db
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Test nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Reload nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Emergency Procedures

#### Complete System Restart
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Start services in order
docker-compose -f docker-compose.prod.yml up -d db redis
sleep 30
docker-compose -f docker-compose.prod.yml up -d backend
sleep 30
docker-compose -f docker-compose.prod.yml up -d frontend nginx
```

#### Rollback to Previous Version
```bash
# Rollback deployment
./scripts/deploy.sh --rollback

# Or manually restore from backup
# (See Backup & Recovery section)
```

## 📞 Support

### Contact Information
- **System Administrator**: sysadmin@yourdomain.com
- **Developer**: dev@yourdomain.com
- **Emergency**: emergency@yourdomain.com

### Documentation
- **API Documentation**: https://api.yourdomain.com/docs/
- **User Guide**: `FINANCIAL_USER_GUIDE.md`
- **Technical Documentation**: `FINANCIAL_API_DOCUMENTATION.md`

### Monitoring URLs
- **Application**: https://yourdomain.com
- **API**: https://api.yourdomain.com
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Domain configuration updated
- [ ] Database backup created
- [ ] System resources verified
- [ ] Security checklist completed

### Deployment
- [ ] Services deployed successfully
- [ ] Health checks passed
- [ ] Database migrations completed
- [ ] Static files collected
- [ ] Cache cleared
- [ ] Monitoring configured

### Post-Deployment
- [ ] Application accessible
- [ ] SSL working correctly
- [ ] Monitoring dashboards active
- [ ] Backup system tested
- [ ] Performance baseline established
- [ ] Documentation updated

---

**Σημείωση**: Αυτός ο οδηγός πρέπει να ενημερώνεται με κάθε νέα έκδοση του συστήματος. Πάντα ελέγξτε την τελευταία έκδοση πριν από κάθε deployment. 