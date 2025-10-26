# 🚀 Deployment Guide με Stripe Test Keys

## 📋 **Stripe Keys Configuration**

### **Test Keys (για Production Deployment):**
```
Publishable Key: pk_test_51SKvgDALGEaGtPDYQjJzEQJilEg23btupuoQHNWPtuGazZOAdnQ7mHwYDFg5aTAbASJPfvrsqSZHZ6DyHiLF1AOx0077mYI0Bn
Secret Key: sk_test_51SKvgDALGEaGtPDYF5xl77MiS27VXeB70VVR15vK0tBQbyv5g8cTaNIicoArpsfH67eFl6em5CvuBIDL1i59c0z500CIfKkj6z
```

## 🔧 **Railway Environment Variables**

### **Backend Configuration:**

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
```

## 🌐 **Vercel Environment Variables**

### **Frontend Configuration:**

```bash
# ========================================
# 🔗 API Configuration
# ========================================
NEXT_PUBLIC_API_URL=https://linuxversion-production.up.railway.app/api
NEXT_PUBLIC_DEFAULT_API_URL=https://linuxversion-production.up.railway.app/api
NEXT_PUBLIC_DJANGO_API_URL=https://linuxversion-production.up.railway.app

# ========================================
# 💳 Stripe Configuration (TEST MODE)
# ========================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SKvgDALGEaGtPDYQjJzEQJilEg23btupuoQHNWPtuGazZOAdnQ7mHwYDFg5aTAbASJPfvrsqSZHZ6DyHiLF1AOx0077mYI0Bn

# ========================================
# 🌐 App Configuration
# ========================================
NEXT_PUBLIC_APP_NAME=New Concierge
NEXT_PUBLIC_APP_URL=https://linux-version.vercel.app
NEXT_PUBLIC_APP_URL_CUSTOM=https://linux-version.vercel.app
NEXT_PUBLIC_ENV=production

# ========================================
# 🔐 Google OAuth
# ========================================
NEXT_PUBLIC_GOOGLE_CLIENT_ID=590666847148-a2e037ah9q9f1vogsl6b34mk944bug5g.apps.googleusercontent.com

# ========================================
# 🔗 Internal API
# ========================================
CORE_API_URL=https://linuxversion-production.up.railway.app/api/tenants/internal/create/
INTERNAL_API_SECRET_KEY=Pf2irUXpdvZcAZ//DD8noS76BnSCLtwtINL8yqJM62Y=
```

## 🎯 **Stripe Dashboard Setup**

### **Step 1: Create Webhook Endpoint**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. **Επιβεβαιώστε ότι είστε σε TEST MODE** (toggle στο top-left corner)
3. Click **"Add endpoint"**
4. Enter endpoint URL:
   ```
   https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/
   ```
5. Click **"Add endpoint"**

### **Step 2: Select Events**

Select the following events:
- ✅ `checkout.session.completed` - **CRITICAL** for tenant provisioning
- ✅ `payment_intent.succeeded` - Payment confirmation
- ✅ `payment_intent.payment_failed` - Payment failure handling
- ✅ `customer.subscription.created` - New subscription tracking
- ✅ `customer.subscription.updated` - Subscription changes
- ✅ `customer.subscription.deleted` - Subscription cancellation

### **Step 3: Get Webhook Secret**

1. After creating the endpoint, click on it
2. Go to **"Signing secret"** section
3. Click **"Reveal"** to show the secret
4. Copy the secret (starts with `whsec_...`)
5. **Add it to Railway environment variables:**
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## 🧪 **Test Card Numbers**

Για testing, χρησιμοποιήστε αυτούς τους test card numbers:

```
# Successful payment
4242 4242 4242 4242

# Declined payment
4000 0000 0000 0002

# Requires authentication
4000 0025 0000 3155

# Any future expiry date (e.g., 12/25)
# Any 3-digit CVC (e.g., 123)
```

## 📋 **Deployment Checklist**

### **Railway Backend:**
- [ ] Add all environment variables (Stripe keys, Django settings, Email)
- [ ] Run migration: `python manage.py migrate_schemas --shared`
- [ ] Verify webhook endpoint is accessible
- [ ] Test webhook with Stripe Dashboard

### **Vercel Frontend:**
- [ ] Add all environment variables (API URLs, Stripe publishable key)
- [ ] Deploy and verify build success
- [ ] Test registration → plans → checkout flow

### **Stripe Dashboard:**
- [ ] Create webhook endpoint (TEST MODE)
- [ ] Select required events
- [ ] Get webhook secret and add to Railway
- [ ] Test webhook endpoint

## 🔍 **Testing Steps**

### **1. Test Webhook Endpoint**
```bash
# Test if endpoint is accessible
curl -I https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/

# Expected response: 200 OK
```

### **2. Send Test Webhook**
1. Go to Stripe Dashboard → Webhooks → [Your Endpoint]
2. Click **"Send test webhook"**
3. Select event: `checkout.session.completed`
4. Click **"Send test webhook"**
5. Check **"Recent deliveries"** for response

### **3. End-to-End Testing**
1. **Register** new user at `/register`
2. **Select plan** at `/plans`
3. **Complete payment** with test card `4242 4242 4242 4242`
4. **Check webhook** processing in Railway logs
5. **Verify tenant** creation and email notification
6. **Test access** via email link

## 🚨 **Important Notes**

### **✅ Test Mode Benefits:**
- No real charges will be made
- Safe testing environment
- Full functionality testing
- Real webhook testing

### **⚠️ Security:**
- Test keys are still sensitive - don't commit to version control
- Use HTTPS endpoints only
- Verify webhook signatures
- Monitor webhook failures

### **🔄 When Ready for Live:**
- Switch to live keys (`sk_live_...`, `pk_live_...`)
- Update webhook endpoint to live mode
- Test with real cards (small amounts)
- Monitor for real transactions

## 📞 **Support & Troubleshooting**

### **Common Issues:**
- **400 Bad Request**: Check webhook signature and secret
- **500 Internal Error**: Check Railway logs and database
- **Webhook not triggered**: Verify endpoint URL and events

### **Logs to Monitor:**
```bash
# Railway logs
railway logs --follow

# Look for:
# [WEBHOOK] checkout.session.completed: cs_test_...
# [WEBHOOK] Provisioning complete for user@example.com → tenant-name
```

## 🎉 **Ready for Deployment!**

Με τα Stripe test keys, το σύστημα είναι έτοιμο για:
- ✅ Safe production deployment
- ✅ Full functionality testing
- ✅ Real webhook testing
- ✅ Complete tenant provisioning
- ✅ Email notifications
- ✅ End-to-end flow verification

**No financial risk, full testing capability!** 🚀
