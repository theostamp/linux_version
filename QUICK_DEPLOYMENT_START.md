# ⚡ Quick Deployment Start Guide

## 🚀 **5-Minute Production Deployment**

### **Prerequisites**
- ✅ Stripe account with live keys
- ✅ Server (DigitalOcean/AWS) with Ubuntu 22.04
- ✅ Domain name
- ✅ Git repository access

---

## **Step 1: Generate Production Environment** ⏱️ 1 min

```bash
# Generate secure environment files
./production-env-template.sh

# Update Stripe keys in both .env.production files
nano linux_version/.env.production
nano public-app/.env.production
```

---

## **Step 2: Deploy Core App** ⏱️ 3 mins

```bash
# Deploy to your server
./deploy-core-app.sh YOUR_SERVER_IP yourdomain.com

# Configure SSL
ssh root@YOUR_SERVER_IP "sudo certbot --nginx -d app.yourdomain.com"
```

---

## **Step 3: Deploy Public App** ⏱️ 1 min

```bash
# Deploy to Vercel
./deploy-public-app.sh

# Configure custom domain in Vercel Dashboard
```

---

## **Step 4: Configure Stripe Webhook** ⏱️ 1 min

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select event: `checkout.session.completed`
4. Copy webhook secret to environment variables

---

## **Step 5: Test Everything** ⏱️ 1 min

```bash
# Test production environment
node test-production.mjs https://yourdomain.com https://app.yourdomain.com

# Test signup flow
# Visit: https://yourdomain.com/signup
```

---

## 🎯 **Expected Results**

After deployment:
- ✅ **Public App**: `https://yourdomain.com` (marketing, signup, payments)
- ✅ **Core App**: `https://app.yourdomain.com` (tenant management)
- ✅ **SSL**: Automatic HTTPS for both apps
- ✅ **Stripe**: Live payments and webhooks
- ✅ **Multi-tenancy**: `https://tenant1.app.yourdomain.com`

---

## 🆘 **Quick Troubleshooting**

### **Core App Issues**
```bash
# Check logs
ssh root@YOUR_SERVER_IP "cd newconcierge/linux_version && docker compose logs -f"

# Restart services
ssh root@YOUR_SERVER_IP "cd newconcierge/linux_version && docker compose restart"
```

### **Public App Issues**
```bash
# Check Vercel logs
vercel logs

# Redeploy
cd public-app && vercel --prod
```

### **Stripe Issues**
- Check webhook URL in Stripe Dashboard
- Verify webhook secret matches environment variable
- Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## 📊 **Production Monitoring**

### **Health Checks**
- **Public App**: `curl -I https://yourdomain.com/`
- **Core App**: `curl -I https://app.yourdomain.com/admin/`
- **API**: `curl -I https://app.yourdomain.com/api/`

### **Log Monitoring**
```bash
# Core App logs
ssh root@YOUR_SERVER_IP "tail -f /var/log/nginx/access.log"

# Public App logs (Vercel Dashboard)
```

---

## 🔄 **Updates & Maintenance**

### **Core App Updates**
```bash
ssh root@YOUR_SERVER_IP "cd newconcierge && git pull && docker compose up -d"
```

### **Public App Updates**
```bash
cd public-app && vercel --prod
```

### **Backup**
```bash
# Database backup
ssh root@YOUR_SERVER_IP "cd newconcierge/linux_version && docker compose exec db pg_dump -U postgres newconcierge_prod > backup_$(date +%Y%m%d).sql"
```

---

## 🎉 **You're Live!**

Your separated application is now running in production with:
- **Public App** handling marketing and payments
- **Core App** managing multi-tenant operations
- **Secure communication** between apps
- **Scalable architecture** ready for growth

**Next**: Monitor usage, optimize performance, and scale as needed!
