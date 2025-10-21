# 🚀 Deployment Guide - App Separation

## 📋 **Pre-Deployment Checklist**

### ✅ **Core App (Django)**
- [x] Internal API endpoint configured (`/api/internal/tenants/create/`)
- [x] API key authentication implemented
- [x] Public URLs removed
- [x] Tenant creation disabled from Stripe webhook
- [x] All permission classes added
- [x] Environment variables configured

### ✅ **Public App (Next.js)**
- [x] Landing page implemented
- [x] Signup page with Stripe integration
- [x] Webhook handler for tenant creation
- [x] Environment variables configured
- [x] API connectivity tested

## 🏗️ **Deployment Architecture**

### **Public App (Next.js)**
- **Platform**: Vercel, Netlify, or similar
- **Domain**: `yourdomain.com`
- **Features**: Global CDN, serverless functions, automatic scaling

### **Core App (Django)**
- **Platform**: Docker containers on DigitalOcean, AWS, or similar
- **Domain**: `api.yourdomain.com` or `core.yourdomain.com`
- **Features**: Database, Redis, Celery workers

## 🔧 **Environment Configuration**

### **Public App Environment Variables**
```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Core App API
CORE_API_URL=https://api.yourdomain.com/api/internal/tenants/create/
INTERNAL_API_SECRET_KEY=your_secure_random_key_32_chars_min

# App Configuration
NEXT_PUBLIC_APP_NAME=New Concierge
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### **Core App Environment Variables**
```bash
# Database
POSTGRES_DB=your_production_db
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Django
DJANGO_SECRET_KEY=your_production_secret_key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=api.yourdomain.com,core.yourdomain.com

# Internal API Security
INTERNAL_API_SECRET_KEY=your_secure_random_key_32_chars_min

# Stripe (if needed for other features)
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET
```

## 🚀 **Deployment Steps**

### **Step 1: Deploy Core App**

1. **Prepare Docker Environment**
   ```bash
   cd linux_version
   # Update docker-compose.yml for production
   # Set production environment variables
   ```

2. **Deploy to Server**
   ```bash
   # On your server
   git clone your-repo
   cd linux_version
   docker compose up -d
   ```

3. **Configure Domain**
   - Point `api.yourdomain.com` to your server
   - Configure SSL certificate
   - Update nginx configuration

### **Step 2: Deploy Public App**

1. **Deploy to Vercel/Netlify**
   ```bash
   cd public-app
   # Connect to Vercel/Netlify
   # Set environment variables
   # Deploy
   ```

2. **Configure Domain**
   - Point `yourdomain.com` to your deployment
   - Configure SSL certificate

### **Step 3: Configure Stripe**

1. **Create Live Products**
   - Go to Stripe Dashboard
   - Create products for your subscription plans
   - Copy price IDs

2. **Update Price IDs**
   - Update `create-checkout-session/route.ts` with live price IDs

3. **Configure Webhooks**
   - Set webhook URL to: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`
   - Copy webhook secret

## 🔒 **Security Considerations**

### **API Security**
- Use HTTPS for all communications
- Rotate `INTERNAL_API_SECRET_KEY` regularly
- Monitor API access logs
- Implement rate limiting

### **Database Security**
- Use strong passwords
- Enable SSL connections
- Regular backups
- Access restrictions

### **Stripe Security**
- Use live keys only in production
- Monitor webhook events
- Implement idempotency
- Handle failed payments gracefully

## 📊 **Monitoring & Maintenance**

### **Health Checks**
- Public App: `https://yourdomain.com/api/health`
- Core App: `https://api.yourdomain.com/api/health`

### **Logs**
- Public App: Vercel/Netlify logs
- Core App: Docker container logs
- Database: PostgreSQL logs

### **Backups**
- Database: Daily automated backups
- Code: Git repository
- Environment: Secure storage

## 🧪 **Testing in Production**

1. **Test Signup Flow**
   - Visit signup page
   - Fill form with test data
   - Complete Stripe checkout
   - Verify tenant creation

2. **Test API Connectivity**
   - Verify internal API access
   - Test webhook delivery
   - Check error handling

3. **Monitor Performance**
   - Page load times
   - API response times
   - Error rates

## 🆘 **Troubleshooting**

### **Common Issues**
- **API Connection Failed**: Check `CORE_API_URL` and `INTERNAL_API_SECRET_KEY`
- **Stripe Errors**: Verify API keys and webhook configuration
- **Tenant Creation Failed**: Check database connectivity and permissions
- **SSL Issues**: Verify certificate configuration

### **Rollback Plan**
- Keep previous deployment ready
- Database migration rollback scripts
- Environment variable backup
- DNS configuration backup

## 📞 **Support**

For issues:
1. Check logs first
2. Verify environment variables
3. Test API connectivity
4. Check Stripe dashboard
5. Contact support team
