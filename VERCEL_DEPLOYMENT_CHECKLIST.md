# ✅ Vercel Deployment Checklist

## 🔴 Current Issues

1. **404 Error**: `/forgot-password` page not found
2. **Login Error**: "Backend API not configured"
3. **Performance Warning**: setTimeout handler (non-critical)

---

## ✅ Solutions Applied (in code)

### 1. Forgot Password Page
- ✅ Created `/forgot-password/page.tsx`
- ✅ Committed and pushed to `main` branch
- ⏳ **Waiting for Vercel deployment**

### 2. Backend API Configuration
- ✅ Updated all client-side code to use `NEXT_PUBLIC_CORE_API_URL`
- ✅ Added better error messages
- ⏳ **Need to add environment variable in Vercel**

---

## 🚀 Action Required: Vercel Configuration

### Step 1: Add Environment Variable

1. Go to **Vercel Dashboard**
   - https://vercel.com/theo-stams-projects/linux-version

2. Navigate to **Settings** → **Environment Variables**

3. Click **"Add New"**

4. Add this variable:
   ```
   Key: NEXT_PUBLIC_CORE_API_URL
   Value: https://your-backend.railway.app
   Environments: ✅ Production ✅ Preview ✅ Development
   ```

5. Click **"Save"**

### Step 2: Trigger New Deployment

After adding the environment variable:

1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. **Uncheck** "Use existing Build Cache"
4. Click **"Redeploy"**

---

## 🔍 Verification Steps

After redeployment:

1. **Check Forgot Password Page**:
   - Visit: https://newconcierge.app/forgot-password
   - Should NOT show 404 error
   - Should show password reset form

2. **Check Login Page**:
   - Visit: https://newconcierge.app/login
   - Open browser console (F12)
   - Should NOT see "Backend API not configured" error
   - Should be able to submit login form

3. **Check Environment Variable**:
   - In browser console, run:
     ```javascript
     console.log(process.env.NEXT_PUBLIC_CORE_API_URL)
     ```
   - Should show your backend URL (not undefined)

---

## 📋 Environment Variables Summary

### Required in Vercel (Production):

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_CORE_API_URL` | Backend API URL (client-side) | `https://backend.railway.app` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | `pk_live_...` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `https://newconcierge.app` |
| `STRIPE_SECRET_KEY` | Stripe secret (server-side) | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
| `CORE_API_URL` | Backend API (server-side) | `https://backend.railway.app` |
| `INTERNAL_API_SECRET_KEY` | Internal API key | `...` |

---

## ⚠️ Important Notes

- **`NEXT_PUBLIC_*` variables** are exposed to browser (public)
- **Non-prefixed variables** are server-side only
- **After adding env vars**, you MUST redeploy
- **Build cache** should be disabled on first deploy after adding env vars

---

## 🐛 If Still Getting Errors

1. **Check Vercel Deployment Logs**:
   - Go to Deployments → Latest → Functions → Logs
   - Look for build errors

2. **Verify Environment Variables**:
   - Settings → Environment Variables
   - Make sure `NEXT_PUBLIC_CORE_API_URL` is set for Production

3. **Clear Browser Cache**:
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

4. **Check Network Tab**:
   - Open DevTools → Network
   - Look for failed requests
   - Check if API calls are using correct URL

---

**After completing these steps, all errors should be resolved!** ✅

