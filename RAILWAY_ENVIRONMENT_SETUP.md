# Railway Environment Variables Setup

## 🚀 **Railway Backend Environment Variables**

### **Step 1: Access Railway Dashboard**
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project: `linuxversion-production`
3. Go to **"Variables"** tab

### **Step 2: Add Environment Variables**

Copy and paste these variables one by one:

```bash
# ========================================
# 💳 Stripe Configuration (TEST MODE)
# ========================================
STRIPE_SECRET_KEY=sk_test_51SKvgDALGEaGtPDYF5xl77MiS27VXeB70VVR15vK0tBQbyv5g8cTaNIicoArpsfH67eFl6em5CvuBIDL1i59c0z500CIfKkj6z
STRIPE_PUBLISHABLE_KEY=pk_test_51SKvgDALGEaGtPDYQjJzEQJilEg23btupuoQHNWPtuGazZOAdnQ7mHwYDFg5aTAbASJPfvrsqSZHZ6DyHiLF1AOx0077mYI0Bn
STRIPE_WEBHOOK_SECRET=whsec_4Cyt1ZmCUtNhouu7uzKsDEyHjXsPHgvv
STRIPE_CURRENCY=eur
STRIPE_MOCK_MODE=False

# ========================================
# 🌐 Django Configuration
# ========================================
DJANGO_ALLOWED_HOSTS=linuxversion-production.up.railway.app,linux-version.vercel.app
CORS_ALLOWED_ORIGINS=https://linux-version.vercel.app,https://*.vercel.app
CSRF_TRUSTED_ORIGINS=https://linux-version.vercel.app,https://*.vercel.app
FRONTEND_URL=https://linux-version.vercel.app

# ========================================
# 📧 Email Configuration
# ========================================
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=theostam1966@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=New Concierge <noreply@newconcierge.gr>
EMAIL_SUBJECT_PREFIX=[New Concierge] 

# ========================================
# 🔐 Internal API
# ========================================
INTERNAL_API_SECRET_KEY=Pf2irUXpdvZcAZ//DD8noS76BnSCLtwtINL8yqJM62Y=

# ========================================
# 🗄️ Database (if needed)
# ========================================
DATABASE_URL=postgresql://...
```

### **Step 3: Get Webhook Secret**

**IMPORTANT:** You need to get the webhook secret from Stripe Dashboard first:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. **Make sure you're in TEST MODE**
3. Create webhook endpoint: `https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/`
4. Select events: `checkout.session.completed`, `payment_intent.*`, `customer.subscription.*`
5. Copy the webhook secret (starts with `whsec_...`)
6. Add it to Railway: `STRIPE_WEBHOOK_SECRET=whsec_4Cyt1ZmCUtNhouu7uzKsDEyHjXsPHgvv`

### **Step 4: Email Password**

**IMPORTANT:** You need to set up Gmail App Password:

1. Go to [Google Account Settings](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication
3. Generate App Password for "Mail"
4. Use that password for `EMAIL_HOST_PASSWORD`

## 🔧 **Railway Commands**

### **Run Migrations**
```bash
# Connect to Railway CLI
railway login
railway link

# Run migrations
railway run python manage.py migrate_schemas --shared
```

### **Check Logs**
```bash
# View logs
railway logs --follow

# Look for webhook events
railway logs | grep "WEBHOOK"
```

### **Test Webhook Endpoint**
```bash
# Test if endpoint is accessible
curl -I https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/

# Expected response: 200 OK
```

## 📋 **Verification Checklist**

### **Environment Variables:**
- [ ] All Stripe keys added
- [ ] Webhook secret added
- [ ] Django settings configured
- [ ] Email settings configured
- [ ] CORS/CSRF origins set

### **Database:**
- [ ] Migrations applied
- [ ] Database accessible
- [ ] No migration errors

### **Webhook:**
- [ ] Endpoint accessible (200 OK)
- [ ] Stripe Dashboard configured
- [ ] Test webhook sent successfully
- [ ] Railway logs show webhook events

### **Email:**
- [ ] Gmail App Password set
- [ ] Email settings tested
- [ ] Welcome emails working

## 🚨 **Troubleshooting**

### **Common Issues:**

**Issue: 400 Bad Request on webhook**
```
Solution: Check STRIPE_WEBHOOK_SECRET is correct
```

**Issue: 500 Internal Server Error**
```
Solution: Check Railway logs for specific errors
```

**Issue: Email not sending**
```
Solution: Check EMAIL_HOST_PASSWORD (App Password)
```

**Issue: CORS errors**
```
Solution: Check CORS_ALLOWED_ORIGINS includes Vercel URL
```

### **Debug Commands:**
```bash
# Check environment variables
railway variables

# Check logs
railway logs --follow

# Test webhook
curl -X POST https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/ \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

## 🎯 **Next Steps**

After Railway setup:
1. **Configure Vercel** environment variables
2. **Test Stripe webhook** from Dashboard
3. **Run end-to-end test** (register → plans → checkout)
4. **Verify tenant provisioning** works
5. **Check email notifications** are sent

## 📞 **Support**

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Support**: [railway.app/support](https://railway.app/support)
- **Stripe Webhooks**: [stripe.com/docs/webhooks](https://stripe.com/docs/webhooks)

## 🎉 **Ready!**

Once all environment variables are set:
- ✅ Backend will be ready for webhook processing
- ✅ Email notifications will work
- ✅ Tenant provisioning will function
- ✅ Full subscription flow will be operational

**Railway backend is ready for deployment!** 🚀
