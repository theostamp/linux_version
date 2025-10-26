# 🧪 Stripe Checkout Testing Guide

## ✅ Prerequisites
- ✅ Stripe test keys configured in Railway
- ✅ Stripe prices created for all plans
- ✅ Frontend deployed on Vercel
- ✅ Backend deployed on Railway

## 🎯 Test Scenario: New User Subscription Flow

### Step 1: Create Test User (Option A - Via Frontend)

1. Go to: https://linux-version.vercel.app/register
2. Register with:
   - Email: `your-test-email@example.com`
   - Password: `YourPassword123!`
   - First Name: Test
   - Last Name: User

3. **Skip email verification** (for testing):
   - Go to Railway logs
   - Find the verification link in logs
   - OR manually verify in database (see below)

### Step 1: Create Test User (Option B - Use Existing Demo User)

**Use one of these verified demo users:**

| Email | Password | Has Tenant? |
|-------|----------|-------------|
| `manager@demo.localhost` | `manager123456` | ✅ Yes (demo) |
| `admin@demo.localhost` | `admin123456` | ✅ Yes (demo) |

**Note:** These users already have a tenant, so checkout will fail with "You already have a workspace" error.

### Step 1: Create Test User (Option C - Manual Database Entry)

```bash
# Connect to Railway database
railway connect

# In psql:
\c railway

# Verify user email
UPDATE users_customuser 
SET email_verified = true, is_active = true 
WHERE email = 'your-test-email@example.com';

# Verify it worked
SELECT email, email_verified, is_active, tenant_id 
FROM users_customuser 
WHERE email = 'your-test-email@example.com';
```

### Step 2: Login

1. Go to: https://linux-version.vercel.app/login
2. Login with your test credentials
3. You should be redirected to `/plans` (if no tenant)
   - OR to `/dashboard` (if already has tenant)

### Step 3: Select Plan

1. On `/plans` page, you should see 3 plans:
   - **Starter Plan** - €29/month
   - **Professional Plan** - €59/month
   - **Enterprise Plan** - €99/month

2. Click **"Επιλογή Πακέτου"** on any plan

3. You should be redirected to **Stripe Checkout** page

### Step 4: Complete Stripe Test Payment

**Stripe Test Card Details:**
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

**Other Test Cards:**
- **Decline**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`
- **3D Secure**: `4000 0025 0000 3155`

### Step 5: Verify Webhook Processing

After successful payment:

1. **Check Railway Logs:**
```bash
railway logs
```

Look for:
```
[WEBHOOK] checkout.session.completed: cs_test_...
[WEBHOOK] Provisioning complete for user@example.com → schema_name
```

2. **Check Frontend:**
   - You should be on `/payment/success`
   - Page should show "Processing..." then redirect to `/dashboard`
   - OR you'll receive a welcome email with tenant access link

### Step 6: Verify Tenant Creation

**Check Database:**
```sql
-- Check user has tenant
SELECT email, tenant_id, role, is_staff, is_superuser 
FROM users_customuser 
WHERE email = 'your-test-email@example.com';

-- Check tenant was created
SELECT id, name, schema_name, is_active, on_trial 
FROM tenants_client 
ORDER BY created_at DESC LIMIT 5;

-- Check subscription
SELECT user_id, plan_id, status, stripe_subscription_id 
FROM billing_usersubscription 
ORDER BY created_at DESC LIMIT 5;
```

**Expected Results:**
- ✅ User has `tenant_id` set
- ✅ User has `role='manager'`
- ✅ User has `is_staff=true` and `is_superuser=true`
- ✅ New tenant schema exists
- ✅ Subscription status is `active` or `trialing`

### Step 7: Access Tenant Dashboard

1. Go to: https://linux-version.vercel.app/dashboard
2. You should see your tenant's dashboard
3. Verify you can:
   - ✅ Create buildings
   - ✅ Add apartments
   - ✅ Manage users
   - ✅ View subscription details

## 🐛 Troubleshooting

### Issue: "You already have a workspace"
**Cause:** User already has a tenant
**Solution:** Use a different email or delete the existing tenant

### Issue: "Invalid API Key"
**Cause:** Stripe keys not configured correctly
**Solution:** Run `./FIX_STRIPE_KEY_NOW.sh`

### Issue: "Plan not found" or "No price ID"
**Cause:** Stripe prices not created
**Solution:** Run `./test_stripe_prices.sh`

### Issue: Webhook not firing
**Cause:** Stripe webhook secret incorrect
**Solution:** 
1. Go to Stripe Dashboard → Webhooks
2. Copy webhook secret
3. Update Railway: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Issue: Email verification required
**Cause:** User email not verified
**Solution:** Manually verify in database (see Step 1 Option C)

## 📊 Success Criteria

✅ User can register
✅ User can login
✅ User sees plans page
✅ User can click "Select Plan"
✅ Stripe Checkout opens
✅ Test payment succeeds
✅ Webhook processes successfully
✅ Tenant is created
✅ User is assigned as tenant admin
✅ User can access dashboard
✅ Welcome email is sent (optional)

## 🎉 Next Steps After Successful Test

1. Test with different plans
2. Test subscription cancellation
3. Test subscription upgrades/downgrades
4. Test trial period expiration
5. Test payment failures
6. Test webhook retry logic

