# 🚀 Complete Production Deployment Steps

## 📋 **Pre-Deployment Checklist**

### **Required:**
- [ ] Domain name purchased
- [ ] DigitalOcean account created
- [ ] Stripe live keys configured
- [ ] Git repository access

---

## **Step 1: Domain Purchase** ⏱️ 5 mins

### **1.1 Choose Domain Provider**
**Recommended: Namecheap**
1. Go to [namecheap.com](https://namecheap.com)
2. Search for your domain (e.g., `newconcierge.com`)
3. Add to cart and checkout
4. **Cost**: ~$8.88/year

### **1.2 Domain Configuration**
After purchase:
1. Go to Domain List → Manage
2. Set nameservers to:
   - `ns1.digitalocean.com`
   - `ns2.digitalocean.com`
   - `ns3.digitalocean.com`

---

## **Step 2: DigitalOcean Setup** ⏱️ 10 mins

### **2.1 Create Account**
1. Go to [digitalocean.com](https://digitalocean.com)
2. Sign up (get $200 credit)
3. Verify email

### **2.2 Create Droplet**
1. Click "Create" → "Droplets"
2. **Image**: Ubuntu 22.04 LTS
3. **Size**: Standard $12/month (2GB RAM, 1 CPU, 50GB SSD)
4. **Region**: Frankfurt (Europe)
5. **Authentication**: SSH Key (recommended)
6. **Hostname**: `newconcierge-core`
7. Click "Create Droplet"

### **2.3 Get Droplet IP**
After creation, note the **Public IPv4 address**

---

## **Step 3: Domain DNS Configuration** ⏱️ 5 mins

### **3.1 Add Domain to DigitalOcean**
1. Go to DigitalOcean → Networking → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `newconcierge.com`)
4. Select your Droplet
5. Click "Add Domain"

### **3.2 Configure DNS Records**
Add these records:
```
Type: A
Name: @
Value: YOUR_DROPLET_IP
TTL: 3600

Type: A
Name: app
Value: YOUR_DROPLET_IP
TTL: 3600

Type: CNAME
Name: www
Value: newconcierge.com
TTL: 3600
```

---

## **Step 4: Generate Production Environment** ⏱️ 2 mins

```bash
# Generate secure environment files
./production-env-template.sh

# Update domain names in both files
nano linux_version/.env.production
nano public-app/.env.production
```

**Update these values:**
- `yourdomain.com` → `newconcierge.com`
- `app.yourdomain.com` → `app.newconcierge.com`
- `your-server-ip` → `YOUR_DROPLET_IP`

---

## **Step 5: Deploy Core App** ⏱️ 15 mins

```bash
# Deploy to DigitalOcean
./deploy-core-app.sh YOUR_DROPLET_IP newconcierge.com

# Wait for deployment to complete
# Check logs: ssh root@YOUR_DROPLET_IP "cd newconcierge/linux_version && docker compose logs -f"
```

---

## **Step 6: Configure SSL Certificate** ⏱️ 5 mins

```bash
# SSH to your server
ssh root@YOUR_DROPLET_IP

# Install SSL certificate
sudo certbot --nginx -d newconcierge.com -d app.newconcierge.com -d www.newconcierge.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## **Step 7: Deploy Public App** ⏱️ 10 mins

```bash
# Deploy to Vercel
cd public-app
vercel --prod

# Configure custom domain in Vercel Dashboard
# Add: newconcierge.com and www.newconcierge.com
```

---

## **Step 8: Configure Stripe Webhook** ⏱️ 5 mins

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://newconcierge.com/api/webhooks/stripe`
3. Select event: `checkout.session.completed`
4. Copy webhook secret
5. Update environment variables

---

## **Step 9: Test Production Environment** ⏱️ 5 mins

```bash
# Test everything
node test-production.mjs https://newconcierge.com https://app.newconcierge.com

# Manual tests:
# 1. Visit: https://newconcierge.com
# 2. Visit: https://app.newconcierge.com/admin/
# 3. Test signup flow
```

---

## **Step 10: Final Verification** ⏱️ 5 mins

### **Checklist:**
- [ ] Public App: `https://newconcierge.com` ✅
- [ ] Core App: `https://app.newconcierge.com` ✅
- [ ] SSL certificates working ✅
- [ ] Stripe checkout working ✅
- [ ] Tenant creation working ✅
- [ ] Admin panel accessible ✅

---

## 🎉 **You're Live!**

**Your production URLs:**
- **Public App**: `https://newconcierge.com`
- **Core App**: `https://app.newconcierge.com`
- **Admin Panel**: `https://app.newconcierge.com/admin/`

**Total Cost:**
- Domain: ~$9/year
- Server: $12/month
- **Total**: ~$153/year

---

## 🆘 **Troubleshooting**

### **Common Issues:**
1. **DNS not propagating**: Wait 24-48 hours
2. **SSL certificate failed**: Check domain DNS
3. **Docker containers not starting**: Check logs
4. **Stripe webhook failing**: Verify URL and secret

### **Support:**
- Check logs: `ssh root@YOUR_DROPLET_IP "cd newconcierge/linux_version && docker compose logs -f"`
- Vercel logs: `vercel logs`
- Stripe webhook logs: Stripe Dashboard

---

## 📊 **Monitoring**

### **Health Checks:**
```bash
# Core App
curl -I https://app.newconcierge.com/admin/

# Public App
curl -I https://newconcierge.com/

# API
curl -I https://app.newconcierge.com/api/
```

### **Backup:**
```bash
# Database backup
ssh root@YOUR_DROPLET_IP "cd newconcierge/linux_version && docker compose exec db pg_dump -U postgres newconcierge_prod > backup_$(date +%Y%m%d).sql"
```

---

## 🔄 **Updates**

### **Core App Updates:**
```bash
ssh root@YOUR_DROPLET_IP "cd newconcierge && git pull && docker compose up -d"
```

### **Public App Updates:**
```bash
cd public-app && vercel --prod
```

---

**Ready to start? Let's go! 🚀**









