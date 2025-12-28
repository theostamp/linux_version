# 🔧 Vercel Environment Variable URL Format

## ⚠️ Critical: URL Format Requirements

### Problem
If `NEXT_PUBLIC_CORE_API_URL` is set incorrectly (without `https://`), it causes errors like:
```
POST https://thodoris.newconcierge.app/linuxversion-production.up.railway.app/api/users/login
```

### Solution: Always Use Full URL with Protocol

## ✅ Correct Format

```
NEXT_PUBLIC_CORE_API_URL=https://linuxversion-production.up.railway.app
```

**OR**

```
NEXT_PUBLIC_CORE_API_URL=https://your-backend.railway.app
```

## ❌ Incorrect Formats (Will Cause Errors)

```
# Missing https://
NEXT_PUBLIC_CORE_API_URL=linuxversion-production.up.railway.app

# With trailing slash (will be auto-removed, but better to avoid)
NEXT_PUBLIC_CORE_API_URL=https://linuxversion-production.up.railway.app/

# With path (should be just domain)
NEXT_PUBLIC_CORE_API_URL=https://linuxversion-production.up.railway.app/api
```

---

## 📋 Vercel Environment Variables Setup

### Step 1: Add/Update Variable

1. Go to **Vercel Dashboard** → **Settings** → **Environment Variables**

2. Find or create `NEXT_PUBLIC_CORE_API_URL`

3. Set value to:
   ```
   https://linuxversion-production.up.railway.app
   ```
   **OR** your actual Railway backend URL

4. Make sure it:
   - ✅ Starts with `https://` (or `http://` for local dev)
   - ✅ Does NOT have trailing slash
   - ✅ Does NOT include `/api` path
   - ✅ Is just the domain/URL

5. Select environments: ✅ Production ✅ Preview ✅ Development

6. Click **Save**

### Step 2: Same for CORE_API_URL

Do the same for `CORE_API_URL`:
```
CORE_API_URL=https://linuxversion-production.up.railway.app
```

---

## 🔍 Verification

After updating:

1. **Redeploy** (with cache disabled)

2. **Check Browser Console**:
   - Open DevTools → Console
   - Look for network requests
   - Should see: `https://linuxversion-production.up.railway.app/api/users/login`
   - Should NOT see: `thodoris.newconcierge.app/linuxversion-production...`

3. **Test Login**:
   - Should work without 405 errors
   - Should not show "Method Not Allowed"

---

## 💡 Code Auto-Fix

The code now automatically:
- ✅ Adds `https://` if protocol is missing
- ✅ Removes trailing slashes
- ✅ Normalizes URLs before use

But it's **better to set it correctly** in Vercel to avoid any issues.

---

## 📝 Example Values

### Production:
```
NEXT_PUBLIC_CORE_API_URL=https://linuxversion-production.up.railway.app
CORE_API_URL=https://linuxversion-production.up.railway.app
```

### Development (local):
```
NEXT_PUBLIC_CORE_API_URL=http://localhost:18000
CORE_API_URL=http://localhost:18000
```

---

**After updating the environment variable with correct format and redeploying, the login should work!** ✅



