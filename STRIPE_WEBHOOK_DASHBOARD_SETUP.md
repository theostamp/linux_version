# Stripe Dashboard Webhook Setup

## 🎯 **Στόχος**
Ρύθμιση webhook endpoint στο Stripe Dashboard για να λειτουργήσει η tenant provisioning ροή.

## 🔧 **Βήματα στο Stripe Dashboard**

### **Step 1: Πρόσβαση στο Webhook Section**

1. **Go to:** [Stripe Dashboard Webhooks](https://dashboard.stripe.com/acct_1SKvgDALGEaGtPDY/test/workbench/webhooks)
2. **Επιβεβαιώστε ότι είστε σε TEST MODE** (toggle στο top-left corner)
3. **Click:** "Add endpoint" button

### **Step 2: Create Webhook Endpoint**

**Endpoint URL:**
```
https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/
```

**Description (optional):**
```
New Concierge - Tenant Provisioning Webhook
```

### **Step 3: Select Events**

**ΚΡΙΣΙΜΑ EVENTS (πρέπει να επιλέξετε):**

✅ **`checkout.session.completed`** - **ΚΥΡΙΟΣ** για tenant provisioning
✅ **`payment_intent.succeeded`** - Payment confirmation
✅ **`payment_intent.payment_failed`** - Payment failure handling
✅ **`customer.subscription.created`** - New subscription tracking
✅ **`customer.subscription.updated`** - Subscription changes
✅ **`customer.subscription.deleted`** - Subscription cancellation

### **Step 4: Get Webhook Secret**

1. **After creating the endpoint**, click on it
2. **Go to:** "Signing secret" section
3. **Click:** "Reveal" to show the secret
4. **Copy the secret** (starts with `whsec_...`)
5. **Save it** - θα το χρειαστούμε για Railway environment variables

## 📋 **Webhook Configuration Summary**

| Setting | Value |
|---------|-------|
| **Endpoint URL** | `https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/` |
| **Mode** | Test Mode |
| **Events** | 6 events selected (see above) |
| **Secret** | `whsec_...` (copy from dashboard) |

## 🔧 **Next Steps After Dashboard Setup**

### **1. Add Webhook Secret to Railway**

```bash
# Add to Railway environment variables
STRIPE_WEBHOOK_SECRET=whsec_4Cyt1ZmCUtNhouu7uzKsDEyHjXsPHgvv
```

### **2. Test Webhook Endpoint**

```bash
# Test if endpoint is accessible
curl -I https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/

# Expected response: 200 OK
```

### **3. Send Test Webhook**

1. **Go to:** Stripe Dashboard → Webhooks → [Your Endpoint]
2. **Click:** "Send test webhook"
3. **Select event:** `checkout.session.completed`
4. **Click:** "Send test webhook"
5. **Check:** "Recent deliveries" for response

## 🧪 **Testing Webhook**

### **Test Card Numbers:**
```
# Successful payment
4242 4242 4242 4242

# Declined payment
4000 0000 0000 0002

# Any future expiry date (e.g., 12/25)
# Any 3-digit CVC (e.g., 123)
```

### **End-to-End Test:**
1. **Register** new user at `/register`
2. **Select plan** at `/plans`
3. **Complete payment** with test card `4242 4242 4242 4242`
4. **Check webhook** processing in Railway logs
5. **Verify tenant** creation and email notification

## 🚨 **Troubleshooting**

### **Common Issues:**

**Issue: 400 Bad Request**
```
Solution: Check STRIPE_WEBHOOK_SECRET is correct in Railway
```

**Issue: 500 Internal Server Error**
```
Solution: Check Railway logs for specific errors
```

**Issue: Webhook not triggered**
```
Solution: Verify endpoint URL and events in Stripe Dashboard
```

### **Debug Commands:**
```bash
# Check Railway logs
railway logs --follow

# Look for webhook events:
# [WEBHOOK] checkout.session.completed: cs_test_...
# [WEBHOOK] Provisioning complete for user@example.com → tenant-name
```

## 📊 **Webhook Monitoring**

### **Stripe Dashboard Metrics:**
- **Success Rate:** Should be > 95%
- **Response Time:** Should be < 5 seconds
- **Error Rate:** Should be < 5%

### **Railway Logs:**
```bash
# Monitor webhook processing
railway logs | grep "WEBHOOK"

# Look for:
# [WEBHOOK] checkout.session.completed: cs_test_...
# [WEBHOOK] Provisioning complete for user@example.com → tenant-name
```

## 🎯 **Verification Checklist**

### **Stripe Dashboard:**
- [ ] Webhook endpoint created
- [ ] Correct events selected
- [ ] Webhook secret copied
- [ ] Test webhook sent successfully

### **Railway:**
- [ ] Webhook secret added to environment variables
- [ ] Endpoint accessible (200 OK)
- [ ] Logs showing webhook events

### **Testing:**
- [ ] End-to-end flow working
- [ ] Tenant provisioning successful
- [ ] Email notifications sent
- [ ] No duplicate tenants created

## 🎉 **Ready!**

Once webhook is configured:
- ✅ Stripe will send events to Railway
- ✅ Tenant provisioning will work
- ✅ Email notifications will be sent
- ✅ Full subscription flow will be operational

**Webhook setup is complete!** 🚀
