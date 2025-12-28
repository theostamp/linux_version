# 🔧 Fix CSRF Error for Django Admin

## ⚠️ Problem

```
403 Forbidden - CSRF verification failed
Origin checking failed - https://linuxversion-production.up.railway.app does not match any trusted origins.
```

## ✅ Solution: Add Railway Domain to CSRF_TRUSTED_ORIGINS

### Option 1: Railway Environment Variable (Recommended)

1. **Go to Railway Dashboard** → Backend Service → **Variables**

2. **Add or Update** `CSRF_TRUSTED_ORIGINS`:
   ```
   https://linuxversion-production.up.railway.app,https://newconcierge.app,https://*.vercel.app
   ```

3. **Add** `RAILWAY_PUBLIC_DOMAIN`:
   ```
   linuxversion-production.up.railway.app
   ```

4. **Redeploy** the backend service

### Option 2: Code Fix (Already Applied)

The code now automatically adds `https://linuxversion-production.up.railway.app` to `CSRF_TRUSTED_ORIGINS` in production.

**After redeploy**, the CSRF error should be fixed.

---

## 🔍 Verification

After redeploy:

1. **Go to**: `https://linuxversion-production.up.railway.app/admin/`
2. **Login** with:
   - Email: `theostam1966@gmail.com`
   - Password: `theo123!@#`
3. **Should NOT see** CSRF error anymore

---

## 📋 Required Railway Environment Variables

Make sure these are set in Railway:

```
CSRF_TRUSTED_ORIGINS=https://linuxversion-production.up.railway.app,https://newconcierge.app,https://*.vercel.app
RAILWAY_PUBLIC_DOMAIN=linuxversion-production.up.railway.app
DJANGO_ALLOWED_HOSTS=linuxversion-production.up.railway.app,newconcierge.app
CORS_ALLOWED_ORIGINS=https://newconcierge.app,https://*.vercel.app
```

---

**After adding CSRF_TRUSTED_ORIGINS and redeploying, Django Admin should work!** ✅



