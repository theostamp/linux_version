# ✅ Production Deployment Checklist

## 🎯 **Complete Production Setup**

### **Phase 1: Domain & Server** ⏱️ 20 mins

#### **Domain Purchase**
- [ ] **Choose domain provider** (Namecheap recommended)
- [ ] **Search domain availability** (e.g., `newconcierge.com`)
- [ ] **Purchase domain** (~$9/year)
- [ ] **Set nameservers** to DigitalOcean

#### **DigitalOcean Setup**
- [ ] **Create account** (get $200 credit)
- [ ] **Create Droplet** (Ubuntu 22.04, $12/month)
- [ ] **Note Droplet IP** address
- [ ] **Add domain** to DigitalOcean
- [ ] **Configure DNS records** (A, CNAME)

---

### **Phase 2: Environment Setup** ⏱️ 5 mins

#### **Generate Environment Files**
- [ ] **Run**: `./production-env-template.sh`
- [ ] **Update domain names** in `.env.production` files
- [ ] **Update server IP** in Core App environment
- [ ] **Verify Stripe keys** are correct

---

### **Phase 3: Core App Deployment** ⏱️ 15 mins

#### **Deploy to DigitalOcean**
- [ ] **Run**: `./deploy-core-app.sh YOUR_IP yourdomain.com`
- [ ] **Wait for deployment** to complete
- [ ] **Check logs** for errors
- [ ] **Verify containers** are running

#### **SSL Certificate**
- [ ] **SSH to server**: `ssh root@YOUR_IP`
- [ ] **Install SSL**: `sudo certbot --nginx -d yourdomain.com -d app.yourdomain.com`
- [ ] **Test auto-renewal**: `sudo certbot renew --dry-run`

---

### **Phase 4: Public App Deployment** ⏱️ 10 mins

#### **Deploy to Vercel**
- [ ] **Navigate**: `cd public-app`
- [ ] **Deploy**: `vercel --prod`
- [ ] **Add custom domain** in Vercel Dashboard
- [ ] **Configure environment variables** in Vercel

---

### **Phase 5: Stripe Configuration** ⏱️ 5 mins

#### **Webhook Setup**
- [ ] **Go to Stripe Dashboard** → Webhooks
- [ ] **Add endpoint**: `https://yourdomain.com/api/webhooks/stripe`
- [ ] **Select event**: `checkout.session.completed`
- [ ] **Copy webhook secret**
- [ ] **Update environment variables**

---

### **Phase 6: Testing & Verification** ⏱️ 10 mins

#### **Health Checks**
- [ ] **Public App**: `https://yourdomain.com` ✅
- [ ] **Core App**: `https://app.yourdomain.com` ✅
- [ ] **Admin Panel**: `https://app.yourdomain.com/admin/` ✅
- [ ] **API**: `https://app.yourdomain.com/api/` ✅

#### **End-to-End Testing**
- [ ] **Visit signup page**
- [ ] **Fill form** with test data
- [ ] **Complete Stripe checkout**
- [ ] **Verify tenant creation**
- [ ] **Login to Core App**

---

### **Phase 7: Monitoring & Maintenance** ⏱️ 5 mins

#### **Monitoring Setup**
- [ ] **Check logs**: `ssh root@YOUR_IP "cd newconcierge/linux_version && docker compose logs -f"`
- [ ] **Monitor Vercel** logs
- [ ] **Check Stripe** webhook logs
- [ ] **Set up alerts** (optional)

#### **Backup Strategy**
- [ ] **Database backup** script
- [ ] **Media files backup**
- [ ] **Environment variables** backup
- [ ] **SSL certificates** backup

---

## 🎉 **Production URLs**

After successful deployment:

- **Public App**: `https://yourdomain.com`
- **Core App**: `https://app.yourdomain.com`
- **Admin Panel**: `https://app.yourdomain.com/admin/`
- **API**: `https://app.yourdomain.com/api/`

---

## 💰 **Total Cost**

- **Domain**: ~$9/year
- **DigitalOcean**: $12/month
- **Vercel**: Free (for personal use)
- **Stripe**: 2.9% + 30¢ per transaction
- **Total**: ~$153/year + transaction fees

---

## 🆘 **Troubleshooting**

### **Common Issues:**

#### **DNS Not Working**
```bash
# Check DNS propagation
nslookup yourdomain.com
nslookup app.yourdomain.com

# Wait 24-48 hours for full propagation
```

#### **SSL Certificate Failed**
```bash
# Check domain DNS
dig yourdomain.com
dig app.yourdomain.com

# Re-run certbot
sudo certbot --nginx -d yourdomain.com -d app.yourdomain.com
```

#### **Docker Containers Not Starting**
```bash
# Check logs
ssh root@YOUR_IP "cd newconcierge/linux_version && docker compose logs -f"

# Restart containers
ssh root@YOUR_IP "cd newconcierge/linux_version && docker compose restart"
```

#### **Stripe Webhook Failing**
- Check webhook URL in Stripe Dashboard
- Verify webhook secret matches environment variable
- Check Vercel function logs

---

## 🔄 **Updates & Maintenance**

### **Core App Updates**
```bash
ssh root@YOUR_IP "cd newconcierge && git pull && docker compose up -d"
```

### **Public App Updates**
```bash
cd public-app && vercel --prod
```

### **Backup**
```bash
# Database backup
ssh root@YOUR_IP "cd newconcierge/linux_version && docker compose exec db pg_dump -U postgres newconcierge_prod > backup_$(date +%Y%m%d).sql"
```

---

## 📊 **Performance Monitoring**

### **Health Checks**
```bash
# Core App
curl -I https://app.yourdomain.com/admin/

# Public App
curl -I https://yourdomain.com/

# API
curl -I https://app.yourdomain.com/api/
```

### **Log Monitoring**
```bash
# Core App logs
ssh root@YOUR_IP "tail -f /var/log/nginx/access.log"

# Vercel logs
vercel logs
```

---

## 🎯 **Success Criteria**

- [ ] All URLs accessible with HTTPS
- [ ] Stripe checkout working
- [ ] Tenant creation working
- [ ] Admin panel accessible
- [ ] SSL certificates valid
- [ ] DNS propagation complete
- [ ] No errors in logs

---

**🚀 Ready to deploy? Let's go!**









