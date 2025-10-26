# Stripe Production Webhook Setup

## 🚀 **Production Configuration**

### **1. Stripe Dashboard Configuration (TEST MODE)**

#### **Step 1: Create Webhook Endpoint**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks) 
2. **Make sure you're in TEST MODE** (toggle in top-left corner)
3. Click **"Add endpoint"**
4. Enter endpoint URL:
   ```
   https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/
   ```
5. Click **"Add endpoint"**

#### **Step 2: Select Events**
Select the following events:
- ✅ `checkout.session.completed` - **CRITICAL** for tenant provisioning
- ✅ `payment_intent.succeeded` - Payment confirmation
- ✅ `payment_intent.payment_failed` - Payment failure handling
- ✅ `customer.subscription.created` - New subscription tracking
- ✅ `customer.subscription.updated` - Subscription changes
- ✅ `customer.subscription.deleted` - Subscription cancellation

#### **Step 3: Get Webhook Secret**
1. After creating the endpoint, click on it
2. Go to **"Signing secret"** section
3. Click **"Reveal"** to show the secret
4. Copy the secret (starts with `whsec_...`)

### **2. Railway Environment Variables**

Add the following environment variables to Railway:

```bash
# Stripe Configuration (TEST MODE - even in production)
STRIPE_SECRET_KEY=sk_test_...  # Test secret key (for production deployment)
STRIPE_PUBLISHABLE_KEY=pk_test_...  # Test publishable key (for production deployment)
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook signing secret (from test mode)
STRIPE_CURRENCY=eur
STRIPE_MOCK_MODE=False  # Disable mock mode for production

# Django Configuration
DJANGO_ALLOWED_HOSTS=linuxversion-production.up.railway.app,linux-version.vercel.app
CORS_ALLOWED_ORIGINS=https://linux-version.vercel.app,https://*.vercel.app
CSRF_TRUSTED_ORIGINS=https://linux-version.vercel.app,https://*.vercel.app
FRONTEND_URL=https://linux-version.vercel.app

# Email Configuration (for welcome emails)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=theostam1966@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=New Concierge <noreply@newconcierge.gr>
EMAIL_SUBJECT_PREFIX=[New Concierge] 
```

### **3. Vercel Environment Variables**

Add the following environment variables to Vercel:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://linuxversion-production.up.railway.app
NEXT_PUBLIC_DEFAULT_API_URL=https://linuxversion-production.up.railway.app/api
NEXT_PUBLIC_DJANGO_API_URL=https://linuxversion-production.up.railway.app

# Stripe Configuration (TEST MODE - even in production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Test publishable key (for production deployment)

# App Configuration
NEXT_PUBLIC_APP_NAME=New Concierge
NEXT_PUBLIC_APP_URL=https://linux-version.vercel.app
NEXT_PUBLIC_ENV=production
```

## 🧪 **Testing Production Webhook**

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

### **3. Monitor Webhook Logs**

```bash
# Check Railway logs
railway logs --follow

# Look for webhook events:
# [WEBHOOK] checkout.session.completed: cs_test_...
# [WEBHOOK] Provisioning complete for user@example.com → tenant-name
```

## 🔍 **Webhook Monitoring & Debugging**

### **1. Stripe Dashboard Monitoring**

- **Success Rate**: Should be > 95%
- **Response Time**: Should be < 5 seconds
- **Error Rate**: Should be < 5%

### **2. Common Issues & Solutions**

#### **Issue: 400 Bad Request**
```
Error: Invalid signature
Solution: Check STRIPE_WEBHOOK_SECRET in Railway
```

#### **Issue: 500 Internal Server Error**
```
Error: Database connection failed
Solution: Check Railway database status
```

#### **Issue: Webhook not triggered**
```
Error: Endpoint not receiving events
Solution: Verify URL and event selection in Stripe Dashboard
```

### **3. Webhook Response Codes**

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | ✅ Webhook processed successfully |
| 400 | Bad Request | ❌ Check signature/payload |
| 500 | Internal Error | ❌ Check server logs |

## 📊 **Production Checklist**

### **Pre-Deployment**
- [ ] Stripe webhook endpoint created (in TEST MODE)
- [ ] Correct events selected
- [ ] Webhook secret obtained (from test mode)
- [ ] Railway environment variables set (with test keys)
- [ ] Vercel environment variables set (with test keys)
- [ ] Test webhook sent successfully

### **Post-Deployment**
- [ ] Webhook endpoint responding (200 OK)
- [ ] Test webhook processed successfully
- [ ] Railway logs showing webhook events
- [ ] End-to-end flow working
- [ ] Email notifications working
- [ ] Tenant provisioning working

### **Monitoring**
- [ ] Webhook success rate > 95%
- [ ] Response time < 5 seconds
- [ ] Error rate < 5%
- [ ] Logs monitored for issues
- [ ] Alerts configured for failures

## 🚨 **Emergency Procedures**

### **If Webhook Fails**

1. **Check Stripe Dashboard** for error details
2. **Check Railway logs** for server errors
3. **Verify environment variables** are correct
4. **Test webhook endpoint** manually
5. **Contact support** if issue persists

### **Rollback Plan**

1. **Disable webhook** in Stripe Dashboard
2. **Revert to mock mode** (STRIPE_MOCK_MODE=True)
3. **Manual tenant creation** via Django admin
4. **Process payments manually** if needed

## 📞 **Support Contacts**

- **Stripe Support**: [support.stripe.com](https://support.stripe.com)
- **Railway Support**: [railway.app/support](https://railway.app/support)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)

## 🔐 **Security Best Practices**

1. **Never commit webhook secrets** to version control
2. **Use HTTPS endpoints only**
3. **Verify webhook signatures** in production (even with test mode)
4. **Monitor webhook failures** regularly
5. **Implement proper error handling**
6. **Use idempotency keys** for critical operations
7. **Regular security audits** of webhook endpoints
8. **Test mode keys are still sensitive** - treat them securely

## 📈 **Performance Optimization**

1. **Optimize webhook processing** time
2. **Implement proper logging** for debugging
3. **Use database transactions** for consistency
4. **Handle webhook retries** gracefully
5. **Monitor resource usage** during webhook processing
