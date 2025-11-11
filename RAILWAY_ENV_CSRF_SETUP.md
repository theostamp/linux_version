# 🔧 Railway CSRF_TRUSTED_ORIGINS Setup

## ⚠️ Current Issue

CSRF error persists because `CSRF_TRUSTED_ORIGINS` environment variable might not be set correctly in Railway.

## ✅ Solution: Add Environment Variable in Railway

### Step 1: Go to Railway Dashboard

1. **Railway Dashboard** → Backend Service → **Variables** tab

### Step 2: Add/Update CSRF_TRUSTED_ORIGINS

**Add this variable**:

```
Key: CSRF_TRUSTED_ORIGINS
Value: https://linuxversion-production.up.railway.app,https://newconcierge.app,https://*.vercel.app
```

**Make sure**:
- ✅ No spaces after commas
- ✅ All URLs start with `https://`
- ✅ Includes Railway domain
- ✅ Includes Vercel pattern

### Step 3: Add RAILWAY_PUBLIC_DOMAIN (Optional but Recommended)

```
Key: RAILWAY_PUBLIC_DOMAIN
Value: linuxversion-production.up.railway.app
```

### Step 4: Redeploy

1. After adding variables, go to **Deployments**
2. Click **"Redeploy"** on latest deployment
3. Wait for deployment to complete

---

## 🔍 Verification

After redeploy:

1. **Check Railway Logs**:
   - Look for: `[PROD SETTINGS] CSRF_TRUSTED_ORIGINS: ...`
   - Should show Railway domain in the list

2. **Test Admin Login**:
   - Go to: `https://linuxversion-production.up.railway.app/admin/`
   - Should NOT see CSRF error
   - Should be able to login

---

## 📋 Complete Railway Environment Variables

For full functionality, make sure these are set:

```
CSRF_TRUSTED_ORIGINS=https://linuxversion-production.up.railway.app,https://newconcierge.app,https://*.vercel.app
RAILWAY_PUBLIC_DOMAIN=linuxversion-production.up.railway.app
DJANGO_ALLOWED_HOSTS=linuxversion-production.up.railway.app,newconcierge.app
CORS_ALLOWED_ORIGINS=https://newconcierge.app,https://*.vercel.app
```

---

## 💡 Code Fallback

The code now has fallback defaults, so even if `CSRF_TRUSTED_ORIGINS` is not set, it will use:
- `https://linuxversion-production.up.railway.app`
- `https://newconcierge.app`

But it's **better to set it explicitly** in Railway for clarity.

---

**After adding CSRF_TRUSTED_ORIGINS and redeploying, the CSRF error should be resolved!** ✅

