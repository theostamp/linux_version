# Railway Stripe Keys Configuration Fix

## Problem
The Railway backend is using **LIVE** Stripe keys (`sk_live_...`) instead of **TEST** keys (`sk_test_...`).

This causes the error:
```
Invalid API Key provided: sk_live_...
```

## Solution
Update Railway environment variables to use **TEST** keys:

### 1. Go to Railway Dashboard
https://railway.app/project/linuxversion-production

### 2. Navigate to Environment Variables
- Click on your backend service
- Go to "Variables" tab

### 3. Update These Variables

```bash
STRIPE_SECRET_KEY=sk_test_51SKvcFRpRJxSaTlvZIyUVuXoD5acYJBGN4gQSRuesBPSSbhLA2W7rfxfuuwR7HhFkN7FbZIJqdokC7rxpmNAf8iw00uriBspiH
STRIPE_PUBLISHABLE_KEY=pk_test_51SKvcFRpRJxSaTlvMhLj0vC2j37lnAusNRTzA9fAPEABTEGQmv9AgWu0gKcyi6a30QWvGe9S7sK1omr66ENs1YY7006C9TYSn9
STRIPE_WEBHOOK_SECRET=whsec_8b2e7c5f3a1d9e4b6c8a7f5d3e1b9c4a  # Get this from Stripe Dashboard
```

### 4. Redeploy
After updating, Railway will automatically redeploy.

### 5. Test Stripe Prices Creation
Once redeployed, call the initialization endpoint:

```bash
# 1. Get admin token
ADMIN_TOKEN=$(curl -s -X POST "https://linuxversion-production.up.railway.app/api/users/login/" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.localhost","password":"admin123456"}' | jq -r '.access')

# 2. Initialize Stripe prices
curl -X POST "https://linuxversion-production.up.railway.app/api/billing/initialize-stripe-prices" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

### 6. Verify Prices Were Created
```bash
curl -s "https://linuxversion-production.up.railway.app/api/billing/plans/" | jq '.results[] | {name, stripe_product_id, stripe_price_id_monthly}'
```

You should see Stripe IDs populated for all plans.

## Alternative: Use Railway CLI
```bash
railway variables set STRIPE_SECRET_KEY=sk_test_51SKvcFRpRJxSaTlvZIyUVuXoD5acYJBGN4gQSRuesBPSSbhLA2W7rfxfuuwR7HhFkN7FbZIJqdokC7rxpmNAf8iw00uriBspiH
railway variables set STRIPE_PUBLISHABLE_KEY=pk_test_51SKvcFRpRJxSaTlvMhLj0vC2j37lnAusNRTzA9fAPEABTEGQmv9AgWu0gKcyi6a30QWvGe9S7sK1omr66ENs1YY7006C9TYSn9
```

## Notes
- We're using **TEST MODE** even in production for now
- This allows testing without real payments
- When ready for production, switch to LIVE keys and create new prices

