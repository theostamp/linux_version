# New Tenant User 404 Investigation

**Date**: 2025-11-03
**Issue**: New tenant user (thodoris.newconcierge.app) gets 404 for all API endpoints after successful login
**Status**: 🔍 **INVESTIGATING**

---

## 🔴 Problem Description

After successful payment and login, a new tenant user at `thodoris.newconcierge.app` sees:
```
GET https://thodoris.newconcierge.app/api/votes 404 (Not Found)
GET https://thodoris.newconcierge.app/api/announcements 404 (Not Found)
GET https://thodoris.newconcierge.app/api/user-requests 404 (Not Found)
```

**Expected**: These endpoints should return tenant-specific data (may be empty arrays, but not 404)

---

## 🏗️ System Architecture

### Production Environment

**Frontend (Vercel)**:
- Domain: `newconcierge.app` with wildcard `*.newconcierge.app`
- Framework: Next.js 15 (standalone)
- API Routing: Same-origin `/api` → Rewrite to `/api/proxy` → Backend

**Backend (Railway)**:
- Domain: `linuxversion-production.up.railway.app`
- Framework: Django + django-tenants
- Database: PostgreSQL with schema-based multi-tenancy

### Request Flow (Expected)

```
Browser (thodoris.newconcierge.app)
   ↓
GET /api/votes
   ↓ (frontend adds X-Tenant-Schema: thodoris)
Next.js Rewrite: /api/votes → /api/proxy/votes
   ↓
Proxy Handler (app/api/proxy/[...path]/route.ts)
   ↓ (forwards X-Tenant-Schema header)
Railway Backend (linuxversion-production.up.railway.app/api/votes)
   ↓
CustomTenantMiddleware (tries to resolve from hostname)
   ↓ (fails - sees Railway domain, not thodoris.newconcierge.app)
SessionTenantMiddleware (uses X-Tenant-Schema header)
   ↓
Tenant Resolution → Schema Switch → URLconf Set
   ↓
Tenant-specific API Response
```

### Critical Components

1. **Frontend Tenant Detection** (`frontend/lib/api.ts:347-360`):
   ```typescript
   // Extract subdomain (e.g., thodoris.newconcierge.app → thodoris)
   if (parts.length >= 3) {
     const tenant = parts[0];
     config.headers['X-Tenant-Schema'] = tenant;
   }
   ```

2. **Next.js Rewrite** (`frontend/next.config.js:42-60`):
   ```javascript
   async rewrites() {
     // Only in production (not localhost)
     return [{ source: '/api/:path*', destination: '/api/proxy/:path*' }];
   }
   ```

3. **Proxy Handler** (`frontend/app/api/proxy/[...path]/route.ts:97-100`):
   ```typescript
   // Forward X-Tenant-Schema header (CRITICAL)
   if (request.headers.get('x-tenant-schema')) {
     headers['X-Tenant-Schema'] = request.headers.get('x-tenant-schema')!;
   }
   ```

4. **CustomTenantMiddleware** (`backend/core/middleware.py:21-124`):
   - Extracts hostname from `HTTP_HOST` header
   - Problem: Sees Railway domain, not subdomain
   - Calls parent `TenantMainMiddleware.process_request()`
   - Sets `request.urlconf` to `tenant_urls.py`

5. **SessionTenantMiddleware** (`backend/core/middleware.py:127-399`):
   - Reads `X-Tenant-Schema` header
   - Resolves tenant by schema_name or domain
   - **Critical**: Checks if URLconf is set correctly (line 172-184)
   - Switches to tenant schema
   - Sets URLconf if missing

---

## 🔍 Root Cause Analysis

### Historical Context

From commit history, this issue has been fixed **10+ times**:
- `dd011b2`: Add debug logging to CustomTenantMiddleware
- `6b55603`: Fix TokenRefreshView 500 error
- `4cdee94`: **Fix critical URLconf issue** (URLconf not set when tenant already correct)
- `346f8b9`: Fix middleware interaction for tenant routing
- `302ea28`: Fix JWT authentication in multi-tenant environment
- `5015992`: Fix X-Tenant-Schema header handling
- ... and more

**Pattern**: The issue keeps recurring, suggesting a **structural problem** rather than implementation bugs.

### Hypothesis 1: Tenant Does Not Exist (80% probability)

**Problem**: Tenant 'thodoris' was never created in the database.

**Evidence**:
- Subscription payment may have succeeded
- But tenant creation callback may have failed
- No Client record with `schema_name='thodoris'`
- No Domain record with `domain='thodoris.newconcierge.app'`

**Test**:
```bash
docker exec -it linux_version-backend-1 python /app/check_thodoris_tenant.py
```

**Expected if true**:
```
❌ Tenant 'thodoris' NOT FOUND in database
🔧 This is likely the ROOT CAUSE of 404 errors
```

**Solution**:
```bash
docker exec -it linux_version-backend-1 python /app/create_thodoris_tenant.py
```

### Hypothesis 2: Domain Mapping Missing (15% probability)

**Problem**: Tenant exists but domain is not mapped.

**Evidence**:
- Client record exists with `schema_name='thodoris'`
- But no Domain record with `domain='thodoris.newconcierge.app'`
- SessionTenantMiddleware can't resolve tenant from header

**Test**: Same script as above

**Solution**: Run `create_thodoris_tenant.py` which will add missing domain

### Hypothesis 3: URLconf Regression (5% probability)

**Problem**: Recent change broke URLconf setting logic.

**Evidence**:
- Commit 4cdee94 fixed this issue
- But new changes may have regressed it
- Middleware sets tenant but not URLconf
- Public URLconf used → tenant endpoints not found → 404

**Test**: Check backend logs for URLconf value
```bash
docker logs linux_version-backend-1 --tail 200 | grep URLconf
```

**Expected if true**:
```
[SessionTenantMiddleware] Set URLconf: new_concierge_backend.public_urls
```

**Solution**: Verify middleware logic in lines 172-227 of `core/middleware.py`

---

## 🛠️ Diagnostic Steps

### Step 1: Check if Tenant Exists

**Option A: Run diagnostic script**
```bash
# Copy script to container
docker cp backend/check_thodoris_tenant.py linux_version-backend-1:/app/

# Run diagnostic
docker exec -it linux_version-backend-1 python /app/check_thodoris_tenant.py
```

**Option B: Manual database check**
```bash
docker exec -it linux_version-backend-1 python manage.py shell
```
```python
from tenants.models import Client, Domain

# Check tenant
try:
    tenant = Client.objects.get(schema_name='thodoris')
    print(f"✅ Tenant found: {tenant.name}")
except Client.DoesNotExist:
    print("❌ Tenant not found")

# Check domain
try:
    domain = Domain.objects.get(domain='thodoris.newconcierge.app')
    print(f"✅ Domain found: {domain.domain} → {domain.tenant.schema_name}")
except Domain.DoesNotExist:
    print("❌ Domain not found")
```

### Step 2: Check Backend Logs

```bash
# Check middleware logs for tenant-specific requests
docker logs linux_version-backend-1 --tail 500 | grep -E "announcements|votes|user-requests|URLconf|Tenant"
```

**Look for**:
- `[CustomTenantMiddleware] HTTP_HOST: ...`
- `[CustomTenantMiddleware] X-Tenant-Schema: thodoris`
- `[SessionTenantMiddleware] Resolved tenant: thodoris`
- `[SessionTenantMiddleware] Set URLconf: tenant_urls`

**Red flags**:
- `Resolved tenant: None`
- `Set URLconf: new_concierge_backend.public_urls`
- `Tenant not found for X-Tenant-Schema header value: thodoris`

### Step 3: Check Frontend Proxy

Open browser DevTools:

**Network Tab**:
1. Filter: `/api/votes`
2. Check **Request URL**: Should be `https://thodoris.newconcierge.app/api/votes`
3. Check **Request Headers**: Should include `x-tenant-schema: thodoris`
4. Check **Status**: Currently 404

**Console**:
Look for:
```
[API INTERCEPTOR] Added X-Tenant-Schema header: thodoris
[PROXY] Forwarding request: { method: 'GET', tenantSchema: 'thodoris', ... }
```

### Step 4: Test API Directly

**Test if backend can handle request with explicit header**:
```bash
# Get JWT token (from browser DevTools → Application → Local Storage)
TOKEN="your_jwt_token_here"

# Test with X-Tenant-Schema header
curl -X GET "https://linuxversion-production.up.railway.app/api/announcements/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Schema: thodoris" \
  -H "Content-Type: application/json" \
  -v
```

**Expected if tenant exists**: 200 OK with data or empty array
**Expected if tenant missing**: 404 or 500

---

## 🔧 Solutions

### Solution 1: Create Missing Tenant

If diagnostic shows tenant doesn't exist:

```bash
# Copy creation script
docker cp backend/create_thodoris_tenant.py linux_version-backend-1:/app/

# Create tenant
docker exec -it linux_version-backend-1 python /app/create_thodoris_tenant.py

# Verify
docker exec -it linux_version-backend-1 python /app/check_thodoris_tenant.py
```

### Solution 2: Fix Domain Mapping

If tenant exists but domain is missing:

```bash
docker exec -it linux_version-backend-1 python manage.py shell
```
```python
from tenants.models import Client, Domain

tenant = Client.objects.get(schema_name='thodoris')
Domain.objects.create(
    domain='thodoris.newconcierge.app',
    tenant=tenant,
    is_primary=True
)
print("✅ Domain added")
```

### Solution 3: Investigate Subscription Flow

If tenant should have been created automatically:

1. **Check Stripe webhook logs**:
   - Login to Stripe Dashboard
   - Developers → Webhooks
   - Find payment event for thodoris
   - Check if webhook was delivered

2. **Check Django logs for webhook**:
   ```bash
   docker logs linux_version-backend-1 | grep -E "stripe|webhook|subscription|tenant.*create"
   ```

3. **Verify tenant creation logic**:
   - File: `backend/billing/views.py` or similar
   - Check `SubscriptionWebhookView` or equivalent
   - Verify tenant is created on successful payment

### Solution 4: Fix Middleware (if URLconf issue)

If logs show URLconf is not set correctly:

1. **Review middleware changes**:
   ```bash
   git diff dd011b2 HEAD -- backend/core/middleware.py
   ```

2. **Check if URLconf validation is working**:
   - Lines 172-184 in `SessionTenantMiddleware`
   - Ensure it checks BOTH tenant AND urlconf
   - Ensure it sets urlconf even if tenant is correct

3. **Add more defensive checks**:
   ```python
   # Always set URLconf for tenant requests
   if tenant and target_schema != 'public':
       request.urlconf = getattr(settings, "TENANT_URLCONF", None)
   ```

---

## 🎯 Recommended Action Plan

### Immediate (Next 10 minutes)

1. ✅ Run diagnostic script
2. ✅ Check if tenant exists
3. ✅ If missing: Create tenant
4. ✅ Test API endpoint again

### Short-term (Next 1 hour)

1. ✅ Investigate subscription flow
2. ✅ Fix automatic tenant creation (if broken)
3. ✅ Add validation to prevent future occurrences
4. ✅ Document proper tenant creation process

### Long-term (Next 1 week)

1. ✅ Add automated tests for tenant creation
2. ✅ Add monitoring for tenant creation failures
3. ✅ Improve error messages (404 → "Tenant not configured")
4. ✅ Consider architectural refactoring to prevent recurring issues

---

## 📊 Success Criteria

After fix is applied, verify:

1. **Tenant exists**: `check_thodoris_tenant.py` shows ✅
2. **API works**: `curl https://thodoris.newconcierge.app/api/announcements/` returns 200
3. **Dashboard loads**: Browser shows dashboard without 404 errors
4. **Console clean**: No errors in browser console
5. **Backend logs**: Show proper tenant resolution

---

## 🔗 Related Files

- `backend/core/middleware.py` (lines 21-399)
- `backend/tenants/models.py` (Client, Domain models)
- `backend/billing/views.py` (subscription webhook)
- `frontend/lib/api.ts` (lines 347-360, X-Tenant-Schema header)
- `frontend/app/api/proxy/[...path]/route.ts` (proxy handler)
- `frontend/next.config.js` (lines 42-60, rewrites)

---

## 📝 Notes

- This issue has recurred 10+ times in commit history
- Suggests need for **structural refactoring**, not just bug fixes
- Consider:
  - Simplifying multi-tenant architecture
  - Adding comprehensive integration tests
  - Improving error handling and logging
  - Documenting tenant creation flow
  - Adding validation at each step

---

**Created**: 2025-11-03
**Author**: Claude Code
**Branch**: `claude/fix-new-tenant-user-issue-011CUmHGGRqnDEbVoKRBrrm5`
