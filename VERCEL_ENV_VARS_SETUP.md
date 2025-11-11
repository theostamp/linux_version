# 🔧 Vercel Environment Variables Setup

## 🐛 Problem

Stripe API returns 500 error: "Stripe configuration missing"

**Error**: `Failed to load resource: the server responded with a status of 500`  
**Message**: `Signup error: Error: Stripe configuration missing`

---

## ✅ Solution: Add Environment Variables to Vercel

### Required Environment Variables

Go to **Vercel Dashboard** → **Project `linux-version`** → **Settings** → **Environment Variables**

Add these variables for **Production** environment:

1. **STRIPE_SECRET_KEY**
   - Value: Your Stripe Secret Key (starts with `sk_`)
   - Environment: ✅ Production
   - Get it from: https://dashboard.stripe.com/apikeys

2. **STRIPE_WEBHOOK_SECRET**
   - Value: Your Stripe Webhook Secret (starts with `whsec_`)
   - Environment: ✅ Production
   - Get it from: Stripe Dashboard → Developers → Webhooks → Your webhook → Signing secret

3. **NEXT_PUBLIC_APP_URL**
   - Value: `https://newconcierge.app`
   - Environment: ✅ Production
   - Used for: Stripe checkout success/cancel URLs

### Optional (for Core API integration)

4. **CORE_API_URL**
   - Value: Your backend API URL (e.g., `https://your-backend.railway.app`)
   - Environment: ✅ Production

5. **INTERNAL_API_SECRET_KEY**
   - Value: Your internal API secret key
   - Environment: ✅ Production

---

## 📋 Steps to Add Variables

1. **Go to Vercel Dashboard**
   - https://vercel.com/theo-stams-projects/linux-version

2. **Settings → Environment Variables**

3. **Click "Create new"**

4. **For each variable**:
   - Enter **Key** (e.g., `STRIPE_SECRET_KEY`)
   - Enter **Value** (your actual key)
   - Select **Environment**: ✅ Production (and Preview if needed)
   - Click **Save**

5. **After adding all variables**:
   - Go to **Deployments**
   - Click **Redeploy** on latest deployment
   - Uncheck **"Use existing Build Cache"**
   - Click **Redeploy**

---

## 🔍 Verification

After adding env vars and redeploying:

1. **Test Signup Flow**:
   - Go to: https://newconcierge.app/signup
   - Fill form and submit
   - Should redirect to Stripe Checkout (not show error)

2. **Check Deployment Logs**:
   - Vercel → Deployments → Latest → Functions → Logs
   - Should NOT see "Stripe configuration missing" errors

---

## ⚠️ Important Notes

- **Never commit** `.env` files with real keys to Git
- **Use Vercel Dashboard** for production secrets
- **Preview deployments** also need env vars if you want to test there
- **After adding env vars**, you MUST redeploy for changes to take effect

---

**After adding these variables, the Stripe checkout should work!** ✅

