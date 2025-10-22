# 🚀 Manual Deployment Guide

## 🖥️ **Your Droplet Information:**
- **IPv4**: `164.92.139.229`
- **Domain**: `newconcierge.app`
- **Provider**: DigitalOcean

---

## 🌐 **Step 1: Configure DNS (Namecheap)**

### **In Namecheap Dashboard:**
1. Go to: Domain List → Manage → Advanced DNS
2. **Delete** the current redirect record
3. **Add these records**:

**Record 1:**
- Type: `A Record`
- Host: `@`
- Value: `164.92.139.229`
- TTL: `300`

**Record 2:**
- Type: `A Record`
- Host: `app`
- Value: `164.92.139.229`
- TTL: `300`

**Record 3:**
- Type: `CNAME Record`
- Host: `www`
- Value: `newconcierge.app`
- TTL: `300`

4. **Save All Changes**

---

## 🚀 **Step 2: Deploy Core App**

### **Option A: Using DigitalOcean Console**
1. Go to DigitalOcean Dashboard
2. Click on your Droplet
3. Click "Console" button
4. Login as `root`

### **Option B: Using SSH (if you have key)**
```bash
ssh root@164.92.139.229
```

### **Option C: Reset Password**
1. In DigitalOcean Dashboard
2. Click "Reset root password"
3. Wait for email with new password
4. Use password to login

---

## 📋 **Step 3: Manual Deployment Commands**

Once logged in to your server, run these commands:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker $USER

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Nginx
apt install nginx -y

# Install Certbot
apt install certbot python3-certbot-nginx -y

# Clone repository
git clone https://github.com/theo6936868236/your-repo.git newconcierge
cd newconcierge/linux_version

# Create production environment
cp env.example .env

# Generate secure keys
SECRET_KEY=$(openssl rand -base64 32)
INTERNAL_API_KEY=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 16)

# Update environment variables
sed -i "s/DJANGO_SECRET_KEY=.*/DJANGO_SECRET_KEY=$SECRET_KEY/" .env
sed -i "s/DJANGO_DEBUG=True/DJANGO_DEBUG=False/" .env
sed -i "s/DJANGO_ALLOWED_HOSTS=.*/DJANGO_ALLOWED_HOSTS=newconcierge.app,app.newconcierge.app,164.92.139.229/" .env
sed -i "s/INTERNAL_API_SECRET_KEY=.*/INTERNAL_API_SECRET_KEY=$INTERNAL_API_KEY/" .env

# Build and start containers
docker compose build
docker compose up -d

# Wait for database
sleep 10

# Run migrations
docker compose exec -T backend python manage.py migrate

# Create superuser
docker compose exec -T backend python manage.py shell << 'PYTHON'
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@newconcierge.app', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
PYTHON

# Collect static files
docker compose exec -T backend python manage.py collectstatic --noinput

echo "✅ Core App deployment completed!"
echo "🌐 Access your app at: https://app.newconcierge.app"
echo "👤 Admin panel: https://app.newconcierge.app/admin/ (admin/admin123)"
echo "🔑 Generated INTERNAL_API_SECRET_KEY: $INTERNAL_API_KEY"
```

---

## 🔐 **Step 4: Configure SSL Certificate**

```bash
# Install SSL certificate
certbot --nginx -d newconcierge.app -d app.newconcierge.app -d www.newconcierge.app

# Test auto-renewal
certbot renew --dry-run
```

---

## 🌐 **Step 5: Deploy Public App**

### **Update Environment Variables:**
```bash
# In your local machine
cd public-app

# Update .env.local with:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
INTERNAL_API_SECRET_KEY=YOUR_GENERATED_INTERNAL_API_KEY
CORE_API_URL=https://app.newconcierge.app/api/internal/tenants/create/
NEXT_PUBLIC_APP_NAME=New Concierge
NEXT_PUBLIC_APP_URL=https://newconcierge.app
```

### **Deploy to Vercel:**
```bash
# Deploy to Vercel
vercel --prod

# Add custom domain in Vercel Dashboard
# Add: newconcierge.app and www.newconcierge.app
```

---

## 🧪 **Step 6: Test Everything**

```bash
# Test Core App
curl -I https://app.newconcierge.app/admin/

# Test Public App
curl -I https://newconcierge.app/

# Test API
curl -I https://app.newconcierge.app/api/
```

---

## 🎉 **Expected Results**

After successful deployment:
- **Public App**: `https://newconcierge.app`
- **Core App**: `https://app.newconcierge.app`
- **Admin Panel**: `https://app.newconcierge.app/admin/`
- **API**: `https://app.newconcierge.app/api/`

---

## 🆘 **Troubleshooting**

### **Common Issues:**

#### **DNS Not Working**
```bash
# Check DNS propagation
nslookup newconcierge.app
nslookup app.newconcierge.app
```

#### **SSL Certificate Failed**
```bash
# Check domain DNS
dig newconcierge.app
dig app.newconcierge.app

# Re-run certbot
certbot --nginx -d newconcierge.app -d app.newconcierge.app
```

#### **Docker Containers Not Starting**
```bash
# Check logs
cd newconcierge/linux_version
docker compose logs -f

# Restart containers
docker compose restart
```

---

## 📊 **Monitoring**

### **Check Logs:**
```bash
# Core App logs
cd newconcierge/linux_version
docker compose logs -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### **Health Checks:**
```bash
# Core App
curl -I https://app.newconcierge.app/admin/

# Public App
curl -I https://newconcierge.app/

# API
curl -I https://app.newconcierge.app/api/
```

---

## 🔄 **Updates**

### **Core App Updates:**
```bash
cd newconcierge
git pull
cd linux_version
docker compose up -d
```

### **Public App Updates:**
```bash
cd public-app
vercel --prod
```

---

**🚀 Ready to deploy manually!**
