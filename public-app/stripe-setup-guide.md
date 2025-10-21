# Stripe Setup Guide

## 🔑 **Step 1: Get Stripe API Keys**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create account or login
3. Go to **Developers > API Keys**
4. Copy your **Publishable key** (starts with `pk_test_`)
5. Copy your **Secret key** (starts with `sk_test_`)

## 📝 **Step 2: Update Environment Variables**

Update your `.env.local` file:

```bash
# Replace with your actual Stripe keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

## 🛍️ **Step 3: Create Products and Prices**

Run the setup script after updating your keys:

```bash
node setup-stripe.js
```

This will create:
- **Basic Plan**: €29.00/month
- **Professional Plan**: €59.00/month  
- **Enterprise Plan**: €99.00/month

## 🔗 **Step 4: Update Price IDs**

After running the setup script, update the price IDs in:
`src/app/api/create-checkout-session/route.ts`

Replace the placeholder price IDs with the actual ones from Stripe.

## 🪝 **Step 5: Configure Webhooks**

1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Set URL to: `http://localhost:3000/api/webhooks/stripe`
4. Select events: `checkout.session.completed`
5. Copy the webhook secret to your `.env.local`

## ✅ **Step 6: Test**

1. Start both applications:
   ```bash
   # Terminal 1: Core App
   cd linux_version && docker compose up -d
   
   # Terminal 2: Public App  
   cd public-app && npm run dev
   ```

2. Visit: http://localhost:3000/signup
3. Fill the form and test the Stripe checkout flow

## 🚀 **Production Setup**

For production:
1. Use live Stripe keys (starts with `pk_live_` and `sk_live_`)
2. Update webhook URL to your production domain
3. Update `CORE_API_URL` to your production Core App URL
4. Set `INTERNAL_API_SECRET_KEY` to a secure random key
