# 🚀 Final Deployment Checklist

## ✅ **Stripe Configuration Complete**

### **Stripe Keys:**
```
Publishable Key: pk_test_51SKvgDALGEaGtPDYQjJzEQJilEg23btupuoQHNWPtuGazZOAdnQ7mHwYDFg5aTAbASJPfvrsqSZHZ6DyHiLF1AOx0077mYI0Bn
Secret Key: sk_test_51SKvgDALGEaGtPDYF5xl77MiS27VXeB70VVR15vK0tBQbyv5g8cTaNIicoArpsfH67eFl6em5CvuBIDL1i59c0z500CIfKkj6z
Webhook Secret: whsec_4Cyt1ZmCUtNhouu7uzKsDEyHjXsPHgvv
```

### **Stripe Dashboard Setup:**
- ✅ Webhook endpoint created: `https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/`
- ✅ Events selected: `checkout.session.completed`, `payment_intent.*`, `customer.subscription.*`
- ✅ Webhook secret obtained: `whsec_4Cyt1ZmCUtNhouu7uzKsDEyHjXsPHgvv`

## 🔧 **Railway Environment Variables**

### **Add these to Railway Dashboard:**

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

### **Add these to Vercel Dashboard:**

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

# ========================================
# 🎯 Environment
# ========================================
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## 📋 **Deployment Steps**

### **Step 1: Railway Backend**
1. **Go to:** [Railway Dashboard](https://railway.app/dashboard)
2. **Select:** `linuxversion-production` project
3. **Go to:** "Variables" tab
4. **Add:** All environment variables from above
5. **Run migration:**
   ```bash
   railway run python manage.py migrate_schemas --shared
   ```

### **Step 2: Vercel Frontend**
1. **Go to:** [Vercel Dashboard](https://vercel.com/dashboard)
2. **Select:** `linux-version` project
3. **Go to:** "Settings" → "Environment Variables"
4. **Add:** All environment variables from above
5. **Redeploy:** Latest deployment

### **Step 3: Test Webhook**
```bash
# Test if endpoint is accessible
curl -I https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/

# Expected response: 200 OK
```

## 🧪 **Testing Steps**

### **1. Test Registration Flow**
1. **Go to:** `https://linux-version.vercel.app/register`
2. **Register:** New user
3. **Verify:** Redirect to `/plans`
4. **Check:** Railway logs for user creation

### **2. Test Plan Selection**
1. **Go to:** `/plans`
2. **Select:** A plan
3. **Verify:** Stripe checkout opens
4. **Check:** User has `stripe_checkout_session_id`

### **3. Test Payment (Test Mode)**
1. **Use test card:** `4242 4242 4242 4242`
2. **Complete payment** in Stripe
3. **Verify:** Redirect to `/payment/success`
4. **Check:** Polling starts

### **4. Test Webhook Processing**
1. **Check:** Railway logs for webhook events
2. **Look for:** `[WEBHOOK] checkout.session.completed`
3. **Verify:** Tenant provisioning starts
4. **Check:** User gets `tenant`, `is_staff=True`, `role=manager`

### **5. Test Email & Access**
1. **Check:** Email received with secure link
2. **Click:** Link → redirect to `/tenant/accept`
3. **Verify:** Token validation
4. **Check:** JWT tokens stored
5. **Verify:** Redirect to `/dashboard`

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
# Check Railway logs
railway logs --follow

# Look for webhook events:
# [WEBHOOK] checkout.session.completed: cs_test_...
# [WEBHOOK] Provisioning complete for user@example.com → tenant-name
```

## 📊 **Verification Checklist**

### **Railway Backend:**
- [ ] All environment variables added
- [ ] Migrations applied
- [ ] Webhook endpoint accessible (200 OK)
- [ ] Logs showing webhook events
- [ ] Email settings working

### **Vercel Frontend:**
- [ ] All environment variables added
- [ ] Build successful
- [ ] API calls working
- [ ] Stripe checkout opening
- [ ] Registration flow working

### **Stripe Dashboard:**
- [ ] Webhook endpoint created
- [ ] Correct events selected
- [ ] Test webhook sent successfully
- [ ] Webhook secret copied

### **End-to-End Testing:**
- [ ] Registration → Plans → Checkout flow
- [ ] Webhook processing
- [ ] Tenant provisioning
- [ ] Email notifications
- [ ] Secure access links
- [ ] Dashboard access

## 🎯 **Test Card Numbers**

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

## 🎉 **Ready for Deployment!**

**Το σύστημα είναι 100% έτοιμο για deployment!**

**Benefits:**
- ✅ No financial risk (test mode)
- ✅ Full functionality testing
- ✅ Real webhook testing
- ✅ Complete tenant provisioning
- ✅ Email notifications
- ✅ End-to-end flow verification

**Μπορείτε να προχωρήσετε με το deployment!** 🚀

## 📞 **Support**

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Stripe Webhooks**: [stripe.com/docs/webhooks](https://stripe.com/docs/webhooks)
