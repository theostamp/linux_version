# Stripe Webhook Configuration Guide

## Webhook Endpoint Setup

### 1. Access Stripe Dashboard
- Go to https://dashboard.stripe.com
- Navigate to "Developers" → "Webhooks"
- Click "Add endpoint"

### 2. Configure Endpoint
```
Endpoint URL: https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/
```

### 3. Select Events
Enable these events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 4. Get Webhook Secret
- After creating the endpoint, click on it
- Go to "Signing secret" section
- Click "Reveal" to get the webhook secret
- Copy the secret (starts with `whsec_`)

### 5. Add Secret to Railway
- Add `STRIPE_WEBHOOK_SECRET=whsec_...` to Railway environment variables

## Testing Webhooks

### 1. Test Mode
- Make sure you're in Test mode in Stripe Dashboard
- Use test API keys in Railway

### 2. Test Webhook Locally (Optional)
```bash
# Install Stripe CLI
stripe listen --forward-to http://localhost:8000/api/billing/webhook/stripe/

# In another terminal, trigger test event
stripe trigger checkout.session.completed
```

### 3. Test in Production
- Create a test checkout session
- Complete payment in Stripe test mode
- Check Railway logs for webhook events

## Webhook Event Handling

### checkout.session.completed
```python
# This event triggers tenant provisioning
# Check Railway logs for:
# [WEBHOOK] checkout.session.completed: cs_test_...
# [WEBHOOK] Provisioning complete for user@example.com → tenant_schema
```

### customer.subscription.updated
```python
# This event updates subscription status
# Check Railway logs for subscription updates
```

## Monitoring & Debugging

### 1. Stripe Dashboard
- Go to "Developers" → "Webhooks"
- Click on your endpoint
- View "Recent deliveries" to see webhook attempts
- Check response codes (should be 200)

### 2. Railway Logs
```bash
# Look for webhook-related logs:
# [WEBHOOK] checkout.session.completed: cs_test_...
# [WEBHOOK] User not found for session: cs_test_...
# [WEBHOOK] Provisioning complete for user@example.com → tenant_schema
```

### 3. Common Issues
- **404 errors**: Check webhook URL is correct
- **Signature verification failed**: Check STRIPE_WEBHOOK_SECRET
- **User not found**: Check user.stripe_checkout_session_id is saved

## Security Best Practices

1. **Always verify webhook signatures**
2. **Use HTTPS endpoints only**
3. **Keep webhook secrets secure**
4. **Monitor for failed webhook deliveries**
5. **Implement idempotency checks**

## Production Checklist

- [ ] Webhook endpoint created in Stripe
- [ ] Correct events selected
- [ ] Webhook secret added to Railway
- [ ] Test webhook delivery
- [ ] Monitor Railway logs
- [ ] Test complete flow: register → plans → checkout → webhook → tenant creation

## Troubleshooting

### Webhook Not Receiving Events
1. Check endpoint URL is correct
2. Verify events are selected
3. Check Railway logs for incoming requests
4. Test with Stripe CLI

### Signature Verification Failed
1. Check STRIPE_WEBHOOK_SECRET is correct
2. Verify webhook secret matches Stripe dashboard
3. Check for typos in environment variable

### User Not Found Errors
1. Check user.stripe_checkout_session_id is saved
2. Verify checkout session ID matches
3. Check user exists in database
