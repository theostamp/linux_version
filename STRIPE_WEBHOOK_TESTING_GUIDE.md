# Stripe Webhook Testing Guide

## 🧪 **Local Testing με Stripe CLI**

### **1. Εγκατάσταση Stripe CLI**

```bash
# Ubuntu/Debian
sudo apt-get install stripe/stripe-cli

# macOS
brew install stripe/stripe-cli/stripe

# Windows
# Download from: https://github.com/stripe/stripe-cli/releases
```

### **2. Login στο Stripe**

```bash
stripe login
# Follow the instructions to authenticate
```

### **3. Forward Webhooks Locally**

```bash
# Start local webhook forwarding
stripe listen --forward-to http://localhost:8000/api/billing/webhook/stripe/

# Output will show:
# > Ready! Your webhook signing secret is whsec_1234567890abcdef...
```

### **4. Test Webhook Events**

```bash
# Test checkout.session.completed event
stripe trigger checkout.session.completed

# Test payment_intent.succeeded
stripe trigger payment_intent.succeeded

# Test subscription events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
```

### **5. Monitor Webhook Logs**

```bash
# In another terminal, monitor webhook events
stripe listen --print-json

# Or check Django logs
tail -f /path/to/django/logs/webhook.log
```

## 🔧 **Manual Webhook Testing**

### **1. Create Test Checkout Session**

```bash
curl -X POST http://localhost:8000/api/billing/create-checkout-session/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "plan_id": 1,
    "building_name": "Test Building"
  }'
```

### **2. Simulate Webhook Payload**

```bash
curl -X POST http://localhost:8000/api/billing/webhook/stripe/ \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=test_signature" \
  -d '{
    "id": "evt_test_webhook",
    "object": "event",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_1234567890",
        "customer": "cus_test_1234567890",
        "subscription": "sub_test_1234567890",
        "metadata": {
          "plan_id": "1",
          "tenant_subdomain": "test-tenant"
        }
      }
    }
  }'
```

## 🚀 **Production Testing**

### **1. Stripe Dashboard Setup**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. **Make sure you're in TEST MODE** (toggle in top-left corner)
3. Click "Add endpoint"
4. Enter URL: `https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/`
5. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### **2. Test Webhook Endpoint**

```bash
# Test with Stripe CLI (production)
stripe listen --forward-to https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/

# Or use Stripe Dashboard "Send test webhook" (make sure you're in TEST MODE)
```

### **3. Verify Webhook Secret**

```bash
# Get webhook secret from Stripe Dashboard (TEST MODE)
# Add to Railway environment variables:
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

## 🔍 **Debugging Webhook Issues**

### **1. Check Webhook Logs**

```bash
# Railway logs
railway logs --follow

# Or check Django logs for webhook events
grep "WEBHOOK" /path/to/logs/django.log
```

### **2. Common Issues**

**Issue: 400 Bad Request**
- Check webhook signature
- Verify STRIPE_WEBHOOK_SECRET
- Check payload format

**Issue: 500 Internal Server Error**
- Check Django logs
- Verify database connection
- Check tenant provisioning logic

**Issue: Webhook not triggered**
- Verify endpoint URL
- Check event types in Stripe Dashboard
- Test with Stripe CLI

### **3. Webhook Response Codes**

- `200`: Success
- `400`: Bad Request (invalid signature/payload)
- `500`: Internal Server Error (check logs)

## 📋 **Testing Checklist**

### **Local Testing**
- [ ] Stripe CLI installed and authenticated
- [ ] Webhook forwarding working
- [ ] Test events triggering correctly
- [ ] Django logs showing webhook processing
- [ ] Tenant provisioning working

### **Production Testing**
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Correct events selected
- [ ] Webhook secret added to Railway
- [ ] Test webhook sending successfully
- [ ] Production logs showing webhook events
- [ ] End-to-end flow working

## 🛠 **Troubleshooting Commands**

```bash
# Check webhook endpoint status
curl -I https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/

# Test webhook with minimal payload
curl -X POST https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/ \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'

# Check Railway environment variables
railway variables

# View recent webhook events in Stripe Dashboard
# Go to: Dashboard > Webhooks > [Your Endpoint] > Recent deliveries
```

## 🔐 **Security Notes**

1. **Always verify webhook signatures in production**
2. **Use HTTPS endpoints only**
3. **Keep webhook secrets secure**
4. **Monitor webhook failures**
5. **Implement proper error handling**
6. **Use idempotency keys for critical operations**

## 📊 **Webhook Monitoring**

### **Stripe Dashboard Metrics**
- Success rate
- Response times
- Error rates
- Event volume

### **Django Logging**
```python
# Add to webhook handler for monitoring
logger.info(f"Webhook received: {event['type']}")
logger.info(f"Webhook processed successfully: {event['id']}")
logger.error(f"Webhook failed: {error}")
```

### **Alerts Setup**
- Webhook failure rate > 5%
- Response time > 10 seconds
- Critical events failing (checkout.session.completed)
