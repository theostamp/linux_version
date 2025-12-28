# 🔧 Complete Vercel Environment Variables Guide

## ⚠️ Critical: Both Variables Needed

For **full functionality**, you need **BOTH** environment variables:

### 1. `NEXT_PUBLIC_CORE_API_URL` (Client-Side)
- **Required for**: Login, Signup, OAuth, Forgot Password (client-side code)
- **Visibility**: Exposed to browser (public)
- **Example**: `https://your-backend.railway.app`

### 2. `CORE_API_URL` (Server-Side)
- **Required for**: API routes (verify-email, verify-payment-status, webhooks)
- **Visibility**: Server-side only (not exposed to browser)
- **Example**: `https://your-backend.railway.app`

---

## 📋 Complete Environment Variables List

### Required in Vercel (Production):

| Variable | Type | Purpose | Example |
|----------|------|---------|---------|
| `NEXT_PUBLIC_CORE_API_URL` | Public | Client-side API calls | `https://backend.railway.app` |
| `CORE_API_URL` | Private | Server-side API routes | `https://backend.railway.app` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Stripe checkout (client) | `pk_live_...` |
| `STRIPE_SECRET_KEY` | Private | Stripe API (server) | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Private | Stripe webhooks | `whsec_...` |
| `INTERNAL_API_SECRET_KEY` | Private | Internal API auth | `...` |
| `NEXT_PUBLIC_APP_URL` | Public | Frontend URL | `https://newconcierge.app` |

---

## 🚀 Setup Instructions

### Step 1: Add Environment Variables

1. Go to **Vercel Dashboard**
   - https://vercel.com/theo-stams-projects/linux-version

2. Navigate to **Settings** → **Environment Variables**

3. Add **ALL** variables from the table above

4. For each variable:
   - Enter **Key** (e.g., `NEXT_PUBLIC_CORE_API_URL`)
   - Enter **Value** (your actual value)
   - Select **Environments**: ✅ Production ✅ Preview ✅ Development
   - Click **Save**

### Step 2: Redeploy

1. Go to **Deployments** tab
2. Click **"Redeploy"** on latest deployment
3. **Uncheck** "Use existing Build Cache"
4. Click **"Redeploy"**

---

## 🔍 Verification

After redeployment, test these pages:

1. **Login**: https://newconcierge.app/login
   - Should NOT show "Backend API not configured"
   - Should be able to submit form

2. **Signup**: https://newconcierge.app/signup
   - Should work without errors

3. **Forgot Password**: https://newconcierge.app/forgot-password
   - Should NOT show 404
   - Should show form

4. **Email Verification**: `/auth/verify-email?token=...`
   - Should NOT show "Backend API not configured"
   - Should verify email successfully

---

## 💡 Why Both Variables?

- **`NEXT_PUBLIC_CORE_API_URL`**: Used in client-side React components (login, signup pages)
- **`CORE_API_URL`**: Used in Next.js API routes (server-side only)

The code now has fallback logic:
- API routes try `CORE_API_URL` first, then fallback to `NEXT_PUBLIC_CORE_API_URL`
- Client-side code uses only `NEXT_PUBLIC_CORE_API_URL`

**Best Practice**: Set both to the same value for consistency.

---

## ⚠️ Important Notes

- **`NEXT_PUBLIC_*` variables** are exposed to browser (public)
- **Non-prefixed variables** are server-side only (private)
- **Never put secrets** in `NEXT_PUBLIC_*` variables
- **After adding env vars**, you MUST redeploy
- **Build cache** should be disabled on first deploy after adding env vars

---

**After adding both variables and redeploying, all errors should be resolved!** ✅



