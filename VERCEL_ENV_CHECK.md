# 🔍 Vercel Environment Variables - Quick Check

## 🐛 Current Error

```
POST https://newconcierge.app/api/create-checkout-session 500 (Internal Server Error)
Signup error: Error: Stripe configuration missing
```

**This means**: `STRIPE_SECRET_KEY` is not set in Vercel Production environment.

---

## ✅ Quick Fix Steps

### Step 1: Check Current Environment Variables

1. **Go to Vercel Dashboard**
   - https://vercel.com/theo-stams-projects/linux-version

2. **Settings → Environment Variables**

3. **Verify these variables exist for Production**:
   - ✅ `STRIPE_SECRET_KEY` (starts with `sk_`)
   - ✅ `STRIPE_WEBHOOK_SECRET` (starts with `whsec_`)
   - ✅ `NEXT_PUBLIC_APP_URL` = `https://newconcierge.app`

### Step 2: Add Missing Variables

**If `STRIPE_SECRET_KEY` is missing:**

1. **Get Stripe Secret Key**:
   - Go to: https://dashboard.stripe.com/apikeys
   - Copy **Secret key** (starts with `sk_`)
   - ⚠️ Use **Test mode** key for testing, **Live mode** for production

2. **Add to Vercel**:
   - Click **"Create new"**
   - Key: `STRIPE_SECRET_KEY`
   - Value: `sk_...` (your Stripe secret key)
   - Environment: ✅ **Production** (and Preview if needed)
   - Click **Save**

**If `STRIPE_WEBHOOK_SECRET` is missing:**

1. **Get Webhook Secret**:
   - Go to: https://dashboard.stripe.com/webhooks
   - Click on your webhook (or create one)
   - Click **"Reveal"** next to Signing secret
   - Copy the secret (starts with `whsec_`)

2. **Add to Vercel**:
   - Key: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...`
   - Environment: ✅ **Production**
   - Click **Save**

**If `NEXT_PUBLIC_APP_URL` is missing:**

1. **Add to Vercel**:
   - Key: `NEXT_PUBLIC_APP_URL`
   - Value: `https://newconcierge.app`
   - Environment: ✅ **Production**
   - Click **Save**

### Step 3: Redeploy

**CRITICAL**: After adding env vars, you MUST redeploy:

1. **Go to Deployments**
2. **Click "Redeploy"** on latest deployment
3. **Uncheck**: "Use existing Build Cache"
4. **Click**: "Redeploy"

**Why?** Environment variables are injected at build/runtime, not during code changes.

---

## 🔍 Verification

After redeploying:

1. **Test Signup**:
   - Go to: https://newconcierge.app/signup?plan=enterprise
   - Fill form and submit
   - Should redirect to Stripe Checkout (not show error)

2. **Check Deployment Logs**:
   - Vercel → Deployments → Latest → Functions → Logs
   - Should NOT see "Stripe configuration missing"

---

## 📋 Required Environment Variables Checklist

For Production environment:

- [ ] `STRIPE_SECRET_KEY` = `sk_...` ✅
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_...` ✅
- [ ] `NEXT_PUBLIC_APP_URL` = `https://newconcierge.app` ✅

Optional (for Core API integration):

- [ ] `CORE_API_URL` = Your backend URL
- [ ] `INTERNAL_API_SECRET_KEY` = Your internal API key

---

## ⚠️ Important Notes

- **Never commit** `.env` files with real keys to Git
- **Use Vercel Dashboard** for production secrets
- **After adding env vars**, redeploy is REQUIRED
- **Test mode vs Live mode**: Use test keys for testing, live keys for production

---

**After adding these variables and redeploying, Stripe checkout will work!** ✅

