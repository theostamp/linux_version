# 🔧 Fix 502 Error in Email Verification

## ⚠️ Problem

```
Failed to load resource: the server responded with a status of 502
Email verification error: Error: Email verification failed
```

## 🔍 Root Causes

502 Bad Gateway means the Vercel API route cannot reach the backend. Common causes:

1. **Backend URL not configured correctly**
   - `CORE_API_URL` or `NEXT_PUBLIC_CORE_API_URL` missing/wrong
   - Missing `https://` protocol
   - Wrong domain/URL

2. **Backend not accessible**
   - Backend is down
   - Backend URL is incorrect
   - Network/firewall issues

3. **Backend returns invalid response**
   - Empty response
   - Non-JSON response
   - Backend error

---

## ✅ Solutions Applied (in code)

### 1. URL Normalization
- ✅ Auto-add `https://` if missing
- ✅ Remove trailing slashes
- ✅ Normalize URLs before use

### 2. Better Error Handling
- ✅ Handle network errors (502)
- ✅ Handle empty responses
- ✅ Handle invalid JSON
- ✅ Better error messages

### 3. Logging
- ✅ Log API calls for debugging
- ✅ Log errors with details

---

## 🚀 Action Required: Vercel Configuration

### Step 1: Verify Environment Variables

1. Go to **Vercel Dashboard** → **Settings** → **Environment Variables**

2. Check these variables exist and are correct:

   ```
   CORE_API_URL=https://linuxversion-production.up.railway.app
   NEXT_PUBLIC_CORE_API_URL=https://linuxversion-production.up.railway.app
   ```

3. Make sure:
   - ✅ Both have `https://` prefix
   - ✅ No trailing slash
   - ✅ Correct Railway domain
   - ✅ Set for Production environment

### Step 2: Verify Backend is Running

1. Check Railway Dashboard:
   - Is backend service running?
   - What's the public URL?

2. Test backend directly:
   ```bash
   curl https://linuxversion-production.up.railway.app/api/users/verify-email/?token=test
   ```
   Should return JSON (even if error)

### Step 3: Redeploy

1. After fixing environment variables:
   - Go to **Deployments**
   - Click **Redeploy**
   - **Uncheck** "Use existing Build Cache"
   - Click **Redeploy**

---

## 🔍 Debugging Steps

### 1. Check Vercel Logs

1. Go to **Deployments** → Latest → **Functions** → **Logs**
2. Look for `[verify-email]` logs
3. Check what URL is being called
4. Check for error messages

### 2. Check Network Tab

1. Open browser DevTools → **Network**
2. Look for `/api/verify-email` request
3. Check:
   - Request URL
   - Response status
   - Response body

### 3. Test Backend Directly

```bash
# Replace with your actual token
curl "https://linuxversion-production.up.railway.app/api/users/verify-email/?token=YOUR_TOKEN"
```

Should return JSON response.

---

## 📋 Common Issues & Fixes

### Issue 1: "Cannot connect to backend API"
**Fix**: Check `CORE_API_URL` is set correctly in Vercel

### Issue 2: "Backend returned invalid response"
**Fix**: Backend might be returning HTML error page instead of JSON

### Issue 3: "Empty response from backend"
**Fix**: Backend might be down or URL is wrong

### Issue 4: Still getting 502 after fixes
**Fix**: 
- Check Railway backend is running
- Check Railway public URL matches Vercel env var
- Check Railway logs for errors

---

## ✅ Verification

After fixes:

1. **Test Email Verification**:
   - Click verification link from email
   - Should NOT show 502 error
   - Should verify successfully or show clear error

2. **Check Vercel Logs**:
   - Should see `[verify-email] Calling backend: ...`
   - Should NOT see connection errors

3. **Check Browser Console**:
   - Should NOT see 502 errors
   - Should see clear error messages if something fails

---

**After fixing environment variables and redeploying, the 502 error should be resolved!** ✅

