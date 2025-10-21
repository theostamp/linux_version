# 🔗 Stripe Webhook Configuration

## **Step 1: Create Webhook Endpoint**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Set endpoint URL to: `http://localhost:3000/api/webhooks/stripe`
4. Select events: `checkout.session.completed`
5. Click **"Add endpoint"**

## **Step 2: Get Webhook Secret**

1. Click on your new webhook endpoint
2. Click **"Reveal"** next to "Signing secret"
3. Copy the webhook secret (starts with `whsec_`)

## **Step 3: Update Environment**

Add the webhook secret to your `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_WEBHOOK_SECRET
```

## **Step 4: Test Webhook**

1. Visit: http://localhost:3000/signup
2. Fill the form with test data
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Check logs for webhook events

## **Test Cards for Live Mode**

⚠️ **WARNING**: You're using LIVE Stripe keys! Use real payment methods or test with small amounts.

For testing with live keys:
- Use real credit cards with small amounts
- Or switch to test keys for development

## **Production Webhook**

For production, update webhook URL to:
`https://yourdomain.com/api/webhooks/stripe`
