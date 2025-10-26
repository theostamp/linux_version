# Stripe Test Mode για Production Deployment

## 🎯 **Σημαντική Σημείωση**

**Ακόμα και σε production deployment, θα χρησιμοποιούμε Stripe TEST MODE!**

Αυτό σημαίνει:
- ✅ **Test keys** (`sk_test_...`, `pk_test_...`) ακόμα και σε production
- ✅ **Test webhook secrets** (`whsec_...`) από test mode
- ✅ **Test mode στο Stripe Dashboard** για όλες τις ρυθμίσεις
- ✅ **Δεν θα γίνουν πραγματικές χρεώσεις** - μόνο test transactions

## 🚀 **Production Setup με Test Mode**

### **1. Stripe Dashboard Configuration**

#### **Step 1: Επιβεβαίωση Test Mode**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. **Επιβεβαιώστε ότι είστε σε TEST MODE** (toggle στο top-left corner)
3. Το toggle πρέπει να δείχνει "Test mode" (όχι "Live mode")

#### **Step 2: Create Webhook Endpoint**
1. Click **"Add endpoint"**
2. Enter endpoint URL:
   ```
   https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/
   ```
3. Click **"Add endpoint"**

#### **Step 3: Select Events**
Select the following events:
- ✅ `checkout.session.completed` - **CRITICAL** for tenant provisioning
- ✅ `payment_intent.succeeded` - Payment confirmation
- ✅ `payment_intent.payment_failed` - Payment failure handling
- ✅ `customer.subscription.created` - New subscription tracking
- ✅ `customer.subscription.updated` - Subscription changes
- ✅ `customer.subscription.deleted` - Subscription cancellation

#### **Step 4: Get Test Webhook Secret**
1. After creating the endpoint, click on it
2. Go to **"Signing secret"** section
3. Click **"Reveal"** to show the secret
4. Copy the secret (starts with `whsec_...`)

### **2. Railway Environment Variables**

Add the following environment variables to Railway:

```bash
# Stripe Configuration (TEST MODE - even in production)
STRIPE_SECRET_KEY=sk_test_...  # Test secret key
STRIPE_PUBLISHABLE_KEY=pk_test_...  # Test publishable key
STRIPE_WEBHOOK_SECRET=whsec_...  # Test webhook signing secret
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
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Test publishable key

# App Configuration
NEXT_PUBLIC_APP_NAME=New Concierge
NEXT_PUBLIC_APP_URL=https://linux-version.vercel.app
NEXT_PUBLIC_ENV=production
```

## 🧪 **Testing με Test Mode**

### **1. Test Webhook Endpoint**

```bash
# Test if endpoint is accessible
curl -I https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/

# Expected response: 200 OK
```

### **2. Send Test Webhook**

1. Go to Stripe Dashboard → Webhooks → [Your Endpoint]
2. **Επιβεβαιώστε ότι είστε σε TEST MODE**
3. Click **"Send test webhook"**
4. Select event: `checkout.session.completed`
5. Click **"Send test webhook"**
6. Check **"Recent deliveries"** for response

### **3. Monitor Webhook Logs**

```bash
# Check Railway logs
railway logs --follow

# Look for webhook events:
# [WEBHOOK] checkout.session.completed: cs_test_...
# [WEBHOOK] Provisioning complete for user@example.com → tenant-name
```

## 🔍 **Test Mode vs Live Mode**

| Aspect | Test Mode | Live Mode |
|--------|-----------|-----------|
| **Keys** | `sk_test_...`, `pk_test_...` | `sk_live_...`, `pk_live_...` |
| **Webhook Secret** | `whsec_...` (test) | `whsec_...` (live) |
| **Charges** | ❌ No real charges | ✅ Real charges |
| **Dashboard** | Test mode toggle | Live mode toggle |
| **Cards** | Test card numbers | Real card numbers |

## 📋 **Test Mode Checklist**

### **Pre-Deployment**
- [ ] Stripe Dashboard σε TEST MODE
- [ ] Webhook endpoint created (test mode)
- [ ] Test events selected
- [ ] Test webhook secret obtained
- [ ] Railway environment variables set (test keys)
- [ ] Vercel environment variables set (test keys)
- [ ] Test webhook sent successfully

### **Post-Deployment**
- [ ] Webhook endpoint responding (200 OK)
- [ ] Test webhook processed successfully
- [ ] Railway logs showing webhook events
- [ ] End-to-end flow working
- [ ] Email notifications working
- [ ] Tenant provisioning working
- [ ] **No real charges made** (test mode confirmed)

## 🎯 **Test Card Numbers**

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

## 🔐 **Security Notes**

1. **Test keys are still sensitive** - don't commit them to version control
2. **Use HTTPS endpoints only**
3. **Verify webhook signatures** (even with test mode)
4. **Monitor webhook failures** regularly
5. **Test mode keys can be regenerated** if compromised

## 🚨 **Important Reminders**

### **✅ Advantages of Test Mode in Production:**
- No accidental real charges
- Safe testing environment
- Easy debugging
- No financial risk

### **⚠️ Things to Remember:**
- Users will see "TEST MODE" in Stripe checkout
- No real money will be charged
- Test data only
- Perfect for development and testing

### **🔄 When to Switch to Live Mode:**
- When ready for real customers
- After thorough testing
- When business is ready for real transactions
- After getting proper business verification

## 📞 **Support**

- **Stripe Test Mode Docs**: [stripe.com/docs/testing](https://stripe.com/docs/testing)
- **Test Card Numbers**: [stripe.com/docs/testing#cards](https://stripe.com/docs/testing#cards)
- **Webhook Testing**: [stripe.com/docs/webhooks/test](https://stripe.com/docs/webhooks/test)

## 🎉 **Ready for Deployment!**

Με test mode, μπορείτε να deploy με ασφάλεια:
- ✅ No financial risk
- ✅ Full functionality testing
- ✅ Real webhook testing
- ✅ Complete tenant provisioning
- ✅ Email notifications
- ✅ End-to-end flow verification

**Το σύστημα είναι έτοιμο για production deployment με Stripe Test Mode!** 🚀
