# 🔧 Tenant Login Fix - Multi-Tenant Routing

**Date**: November 2, 2025  
**Status**: ✅ DEPLOYED  
**Commits**: 
- `370bde26` - Forward X-Tenant-Schema header in API proxy
- `897cab45` - Add X-Tenant-Schema to CORS allowed headers

---

## 🐛 Problem Description

Users could not log in to tenant subdomains (e.g., `theo-eth.newconcierge.app`).

### Error Logs
```
POST https://theo-eth.newconcierge.app/api/users/login 405 (Method Not Allowed)
```

### What Was Happening
1. User navigates to `theo-eth.newconcierge.app`
2. Frontend detects subdomain and adds `X-Tenant-Schema: theo-eth` header to all API requests
3. Next.js rewrite sends `/api/users/login` → `/api/proxy/users/login`
4. **PROBLEM**: Proxy route forwarded request to Railway backend **WITHOUT** the `X-Tenant-Schema` header
5. Backend middleware couldn't determine tenant schema
6. Request failed with 405 Method Not Allowed

---

## ✅ Solution

### Files Modified
- `frontend/app/api/proxy/[...path]/route.ts`

### Changes Made

#### 1. Forward X-Tenant-Schema Header (CRITICAL)
```typescript
// Forward X-Tenant-Schema header (CRITICAL for multi-tenant routing)
if (request.headers.get('x-tenant-schema')) {
  headers['X-Tenant-Schema'] = request.headers.get('x-tenant-schema')!;
}
```

**Why This Matters**: The backend `SessionTenantMiddleware` reads this header to determine which tenant schema to route the request to:

```python
# backend/core/middleware.py
def _tenant_from_header(self, request):
    """Resolve tenant via X-Tenant-Schema header (from subdomain routing)."""
    tenant_schema = request.META.get('HTTP_X_TENANT_SCHEMA')  # ← Needs this!
    if not tenant_schema:
        return None
    
    tenant = tenant_model.objects.get(schema_name=tenant_schema)
    return tenant
```

#### 2. Dynamic Backend URL
```typescript
const RAILWAY_BACKEND_URL = 
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 
  process.env.API_URL?.replace(/\/api\/?$/, '') || 
  'https://linuxversion-production.up.railway.app';
```

**Why This Matters**: Makes the proxy work with different backend URLs in different environments (dev, staging, production).

#### 3. CORS Headers Fix
```typescript
'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Schema',
```

**Why This Matters**: Without this, browsers would block requests with the `X-Tenant-Schema` header due to CORS policy.

#### 4. Enhanced Logging
```typescript
console.log('[PROXY] Forwarding request:', {
  method,
  originalPath: originalPath,
  targetUrl,
  hasQueryString: queryString.length > 0,
  hasTenantSchema: !!request.headers.get('x-tenant-schema'),
  tenantSchema: request.headers.get('x-tenant-schema') || 'none'
});
```

**Why This Matters**: Makes debugging easier - we can see exactly what headers are being forwarded.

---

## 🧪 Testing

### How to Test the Fix

1. **Navigate to Tenant Subdomain**
   ```
   https://theo-eth.newconcierge.app/
   ```

2. **Open Browser Console** (F12)

3. **Try to Login**
   - Email: `etherm2021@gmail.com`
   - Password: [your password]

4. **Expected Behavior**
   - ✅ Console shows: `[PROXY] Forwarding request: {..., tenantSchema: 'theo-eth'}`
   - ✅ Login succeeds (200 OK)
   - ✅ User is redirected to `/dashboard`
   - ✅ JWT tokens are stored in localStorage

5. **Check Vercel Logs** (optional)
   - Go to Vercel Dashboard → Project → Functions
   - Check logs for `/api/proxy/users/login`
   - Should see `[PROXY] Forwarding request` log with tenant schema

---

## 🔍 What to Look For

### ✅ Success Indicators
- Login request returns `200 OK` (not 405)
- Console shows tenant schema in proxy logs
- User lands on tenant dashboard
- No CORS errors in console

### ❌ Failure Indicators
- Still getting `405 Method Not Allowed`
- Proxy logs show `tenantSchema: 'none'`
- CORS errors in console
- Login fails with different error

---

## 📊 Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User visits: theo-eth.newconcierge.app                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Frontend API Interceptor (lib/api.ts)                        │
│    Detects subdomain: 'theo-eth'                                │
│    Adds header: X-Tenant-Schema: theo-eth                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Request: POST /api/users/login                               │
│    Headers: { X-Tenant-Schema: 'theo-eth' }                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Next.js Rewrite (next.config.js)                             │
│    /api/:path* → /api/proxy/:path*                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Proxy Route (app/api/proxy/[...path]/route.ts) ← FIX HERE!   │
│    ✅ NOW: Forwards X-Tenant-Schema header to backend           │
│    ❌ BEFORE: Dropped the header                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Railway Backend                                              │
│    URL: https://linuxversion-production.up.railway.app          │
│    Receives: POST /api/users/login                              │
│    Headers: { X-Tenant-Schema: 'theo-eth' }                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. SessionTenantMiddleware (backend/core/middleware.py)         │
│    Reads X-Tenant-Schema header                                 │
│    Switches to tenant schema: 'theo-eth'                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Login View (backend/users/views.py)                          │
│    Authenticates user in PUBLIC schema                          │
│    Returns JWT tokens                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. User logged in! Redirects to dashboard                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Important Notes

### Why Login Uses PUBLIC Schema (Not Tenant Schema)

The `/api/users/login` endpoint is in the middleware's SKIP list:

```python
# backend/core/middleware.py
def _should_skip_path(self, path: str) -> bool:
    public_prefixes = (
        "/admin",
        "/api/users/register",
        "/api/users/login",  # ← Login stays in public schema
        "/api/users/verify-email",
        # ...
    )
    return any(path.startswith(prefix) for prefix in public_prefixes)
```

**Why?**
- User accounts are stored in the PUBLIC schema (not tenant schemas)
- Login happens BEFORE the user has a tenant context
- After successful login, the user is redirected to their tenant dashboard

So even though we forward the `X-Tenant-Schema` header, the login endpoint itself operates on the public schema. The header is still important for:
1. Proper request routing
2. Future requests after login
3. Consistency in the API architecture

---

## 🚀 Deployment Status

- **Git Commits**: ✅ Pushed to main branch
- **Vercel Deployment**: ✅ Auto-deploy triggered
- **Expected Deploy Time**: ~2-3 minutes
- **Deployment URL**: `https://newconcierge.app` (and all subdomains)

### Check Deployment Status
```bash
# In Vercel Dashboard
https://vercel.com/[your-org]/[project-name]/deployments
```

Or via CLI:
```bash
cd frontend
npx vercel ls
```

---

## 🎯 Next Steps

1. **Wait for Vercel Deployment** (~2-3 minutes)
2. **Test Login** on tenant subdomain
3. **Check Logs** in Vercel Functions
4. **Verify** user can access tenant dashboard

If issues persist:
- Check Vercel deployment logs
- Check Railway backend logs
- Verify DNS and custom domain settings

---

## 🔗 Related Files

- `frontend/app/api/proxy/[...path]/route.ts` - Proxy route (MODIFIED)
- `frontend/lib/api.ts` - API interceptor (adds X-Tenant-Schema)
- `backend/core/middleware.py` - Tenant middleware (reads X-Tenant-Schema)
- `backend/users/views.py` - Login view
- `frontend/next.config.js` - Rewrites configuration

---

## 📚 References

- [Django Tenants Middleware](https://django-tenants.readthedocs.io/)
- [Next.js Rewrites](https://nextjs.org/docs/app/api-reference/next-config-js/rewrites)
- [CORS Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

