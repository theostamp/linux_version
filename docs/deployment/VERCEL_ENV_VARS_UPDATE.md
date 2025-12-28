# 🔧 Vercel Environment Variables - Critical Update

## ⚠️ Important: Client-Side API Configuration

### Problem
The frontend is trying to access `CORE_API_URL` which is **NOT available in the browser**. Only environment variables prefixed with `NEXT_PUBLIC_` are exposed to the client-side code.

### Solution: Add `NEXT_PUBLIC_CORE_API_URL`

Go to **Vercel Dashboard** → **Project `linux-version`** → **Settings** → **Environment Variables**

Add this variable for **Production** environment:

1. **NEXT_PUBLIC_CORE_API_URL**
   - Value: Your backend API URL (e.g., `https://your-backend.railway.app`)
   - Environment: ✅ Production ✅ Preview ✅ Development
   - **Important**: This must be the full URL without trailing slash

### Example Values

**Production:**
```
NEXT_PUBLIC_CORE_API_URL=https://your-backend.railway.app
```

**Development (local):**
```
NEXT_PUBLIC_CORE_API_URL=http://localhost:18000
```

---

## 📋 Current Environment Variables Checklist

### Required for Frontend (Client-Side):
- [x] `NEXT_PUBLIC_CORE_API_URL` ← **NEW - MUST ADD**
- [x] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [x] `NEXT_PUBLIC_APP_URL`

### Required for Backend API Routes (Server-Side Only):
- [x] `CORE_API_URL` (used in API routes, not client-side)
- [x] `STRIPE_SECRET_KEY`
- [x] `STRIPE_WEBHOOK_SECRET`
- [x] `INTERNAL_API_SECRET_KEY`

---

## 🔍 How to Verify

After adding `NEXT_PUBLIC_CORE_API_URL`:

1. **Redeploy** your Vercel project (with "Use existing Build Cache" unchecked)
2. **Test Login**: Go to https://newconcierge.app/login
3. **Check Console**: Should NOT see "Backend API not configured" error
4. **Test Signup**: Should work without errors

---

## ⚠️ Important Notes

- **`NEXT_PUBLIC_*` variables** are exposed to the browser (public)
- **Non-prefixed variables** (like `CORE_API_URL`) are only available in server-side code (API routes)
- **Never put secrets** in `NEXT_PUBLIC_*` variables
- **After adding env vars**, you MUST redeploy for changes to take effect

---

**After adding `NEXT_PUBLIC_CORE_API_URL`, the login and signup should work!** ✅



