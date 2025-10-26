# Subscription Flow Guide

## Complete Flow for New Users

### Step 1: Register
1. Go to: https://linux-version.vercel.app/register
2. Fill in:
   - Email: your-email@example.com
   - Password: YourPassword123!
   - First Name: Your Name
   - Last Name: Your Surname
3. Click "Εγγραφή"
4. You'll receive a verification email

### Step 2: Verify Email (Optional for testing)
- Check your email for verification link
- Click the link to verify
- OR use demo user (already verified)

### Step 3: Login
1. Go to: https://linux-version.vercel.app/login
2. Login with:
   - **Demo User**: `manager@demo.localhost` / `manager123456`
   - **OR your registered email** (if verified)

### Step 4: Select Plan
1. After login, go to: https://linux-version.vercel.app/plans
2. Click "Επιλογή Πακέτου" on any plan
3. You'll be redirected to Stripe Checkout

### Step 5: Stripe Checkout (Test Mode)
1. Fill in test card details:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - Name: Any name
   - Email: Your email
2. Click "Subscribe"

### Step 6: Payment Success & Polling
1. You'll be redirected to: `/payment/success?session_id=...`
2. Frontend will poll: `/api/billing/subscription-status/{session_id}/`
3. Wait for status to become 'completed' (usually 5-10 seconds)
4. You'll be redirected to `/dashboard`

### Step 7: Webhook Processing (Backend)
1. Stripe sends webhook to: `/api/billing/webhook/stripe/`
2. Backend processes `checkout.session.completed` event
3. Creates tenant with schema
4. Creates subscription record
5. Sends welcome email with tenant access link

### Step 8: Access Your Tenant
1. Check email for welcome message
2. Click the secure link
3. OR go directly to `/dashboard`

## Quick Test with Demo User

```bash
# 1. Login
Email: manager@demo.localhost
Password: manager123456

# 2. Go to plans
https://linux-version.vercel.app/plans

# 3. Select any plan
Click "Επιλογή Πακέτου"

# 4. Use test card
4242 4242 4242 4242
12/25
123

# 5. Complete payment
Wait for redirect to dashboard
```

## Troubleshooting

### Error: 401 Unauthorized on checkout
**Problem**: Not logged in
**Solution**: Login first, then select plan

### Error: 404 Not Found on checkout
**Problem**: API endpoint not found
**Solution**: Check Vercel deployment, ensure latest code is deployed

### Error: Email not verified
**Problem**: User account not activated
**Solution**: Use demo user OR verify email

### Polling timeout
**Problem**: Webhook not processed in time
**Solution**: Check Railway logs for webhook errors

## API Endpoints

- **Plans**: `GET /api/billing/plans/`
- **Create Checkout**: `POST /api/billing/create-checkout-session/`
- **Subscription Status**: `GET /api/billing/subscription-status/{session_id}/`
- **Webhook**: `POST /api/billing/webhook/stripe/`

## Environment Variables

### Railway (Backend)
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your webhook signing secret
- `FRONTEND_URL`: https://linux-version.vercel.app

### Vercel (Frontend)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `NEXT_PUBLIC_API_URL`: https://linuxversion-production.up.railway.app

## Notes

- All users must be logged in to create checkout sessions
- Demo users already have subscriptions (for testing)
- New users will get 14-day free trial
- Stripe test mode is active (use test cards only)

