# 🚀 Production Deployment Guide

## 📋 **Deployment Checklist**

### **Phase 1: Server Setup**
- [ ] **Core App Server** (DigitalOcean/AWS EC2)
  - Ubuntu 22.04 LTS
  - Docker & Docker Compose
  - Nginx reverse proxy
  - SSL certificates (Let's Encrypt)
  - Domain: `app.yourdomain.com` or `*.yourdomain.com`

- [ ] **Public App Deployment** (Vercel/Netlify)
  - Connect Git repository
  - Configure environment variables
  - Custom domain: `yourdomain.com`
  - Automatic SSL

### **Phase 2: Environment Configuration**
- [ ] **Core App Environment Variables**
- [ ] **Public App Environment Variables** 
- [ ] **Database Setup** (PostgreSQL)
- [ ] **Redis Setup** (for Celery)
- [ ] **Stripe Webhook Configuration**

### **Phase 3: Domain & SSL Setup**
- [ ] **DNS Configuration**
- [ ] **SSL Certificates**
- [ ] **Nginx Configuration**

### **Phase 4: Testing & Monitoring**
- [ ] **End-to-End Testing**
- [ ] **Performance Monitoring**
- [ ] **Error Tracking**

---

## 🖥️ **Core App Server Setup**

### **1. Server Requirements**
```bash
# Minimum specs
- 2 CPU cores
- 4GB RAM
- 50GB SSD storage
- Ubuntu 22.04 LTS
```

### **2. Install Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### **3. Deploy Core App**
```bash
# Clone repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo/linux_version

# Copy environment file
cp env.example .env

# Edit environment variables
nano .env
```

### **4. Production Environment Variables**
```bash
# Core App (.env)
DJANGO_SECRET_KEY=your-super-secret-key-here
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=app.yourdomain.com,*.yourdomain.com,your-server-ip

# Database
DATABASE_URL=postgresql://user:password@db:5432/newconcierge_prod

# Redis
REDIS_URL=redis://redis:6379/0

# Internal API Security
INTERNAL_API_SECRET_KEY=your-internal-api-secret-key

# Stripe (if needed)
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
```

---

## 🌐 **Public App Deployment (Vercel)**

### **1. Vercel Setup**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from public-app directory
cd public-app
vercel --prod
```

### **2. Environment Variables in Vercel**
```bash
# Add these in Vercel Dashboard → Settings → Environment Variables
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
INTERNAL_API_SECRET_KEY=your-internal-api-secret-key
CORE_API_URL=https://app.yourdomain.com/api/internal/tenants/create/
NEXT_PUBLIC_APP_NAME=New Concierge
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### **3. Custom Domain**
- Add custom domain in Vercel Dashboard
- Update DNS records as instructed
- SSL will be automatically configured

---

## 🔧 **Nginx Configuration**

### **1. Core App Nginx Config**
```nginx
# /etc/nginx/sites-available/newconcierge
server {
    listen 80;
    server_name app.yourdomain.com *.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com *.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Proxy to Django backend
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static/ {
        alias /vol/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /media/ {
        alias /vol/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
}
```

### **2. Enable Site**
```bash
sudo ln -s /etc/nginx/sites-available/newconcierge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔐 **SSL Certificate Setup**

```bash
# Get SSL certificate
sudo certbot --nginx -d app.yourdomain.com -d *.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 🧪 **Production Testing**

### **1. Health Checks**
```bash
# Test Core App
curl -I https://app.yourdomain.com/admin/
curl -I https://app.yourdomain.com/api/

# Test Public App
curl -I https://yourdomain.com/
curl -I https://yourdomain.com/signup
```

### **2. End-to-End Test**
1. Visit: `https://yourdomain.com/signup`
2. Fill form with test data
3. Complete Stripe checkout
4. Verify tenant creation
5. Login to Core App

---

## 📊 **Monitoring & Maintenance**

### **1. Log Monitoring**
```bash
# Core App logs
docker compose logs -f backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### **2. Backup Strategy**
```bash
# Database backup
docker compose exec db pg_dump -U postgres newconcierge_prod > backup_$(date +%Y%m%d).sql

# Media files backup
tar -czf media_backup_$(date +%Y%m%d).tar.gz /vol/media/
```

### **3. Updates**
```bash
# Update Core App
git pull origin main
docker compose build
docker compose up -d

# Update Public App (automatic via Vercel)
# Or manually: vercel --prod
```

---

## 🚨 **Troubleshooting**

### **Common Issues**
1. **SSL Certificate Issues**: Check domain DNS and certbot logs
2. **Database Connection**: Verify DATABASE_URL and container status
3. **Stripe Webhook**: Check webhook URL and secret in Stripe Dashboard
4. **Internal API**: Verify INTERNAL_API_SECRET_KEY matches between apps

### **Emergency Rollback**
```bash
# Rollback Core App
git checkout previous-stable-commit
docker compose up -d

# Rollback Public App
vercel rollback
```









