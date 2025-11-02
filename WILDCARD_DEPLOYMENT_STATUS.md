# Wildcard Subdomain Deployment Status

**Date**: 2025-11-02  
**Status**: ⚠️ Partially Complete - Manual Vercel Configuration Pending

## ✅ Completed Steps

### 1. DNS Wildcard Configuration
- ✅ Vercel nameservers configured: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`
- ✅ Wildcard ALIAS record exists: `*` → `cname.vercel-dns-016.com.`
- ✅ DNS propagation verified with `dig`:
  - `theo-etherm.newconcierge.app` resolves to `216.150.16.1`, `216.150.1.65`
  - `newconcierge.app` resolves to same IPs
- ✅ SSL wildcard certificate issued: `*.newconcierge.app` (valid until 2026-01-31)
- ✅ Wildcard subdomains serve Vercel error pages (not browser 404)

### 2. Django Backend Configuration
- ✅ **Production domains added to ALLOWED_HOSTS**:
  - `newconcierge.app`
  - `.newconcierge.app` (allows all subdomains)
- ✅ **CustomTenantMiddleware** configured and active
- ✅ **Security fix applied**: Removed insecure `ALLOWED_HOSTS = ['*']` override
  - File: `linux_version/backend/new_concierge_backend/settings.py` (line 83-93)
  - Now properly appends Railway domain instead of allowing all hosts
- ✅ **CSRF_TRUSTED_ORIGINS** includes:
  - `https://newconcierge.app`
  - `https://*.newconcierge.app`
  - Railway domains

### 3. Next.js Frontend
- ✅ `manifest.json` exists at `frontend/public/manifest.json`
- ✅ API proxy route handler at `app/api/proxy/[...path]/route.ts`
- ✅ Removed redundant rewrites from `next.config.js` (direct routing handles all `/api/*` requests)

## ⚠️ Pending Manual Steps

### 1. Add Wildcard Domain to Vercel Project ⚠️ **CRITICAL**

**Problem**: API requests to tenant subdomains return 404 because Vercel doesn't know to serve the Next.js app for `*.newconcierge.app`.

**Action Required**:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the project hosting `newconcierge.app`
3. Navigate to **Settings → Domains**
4. Click **"Add Domain"**
5. Enter: `*.newconcierge.app`
6. Verify it's assigned to the correct project and **Production** environment
7. Wait for SSL certificate issuance (~2-5 minutes)
8. Redeploy the project

**Current Status**:
- Base domain `newconcierge.app` ✅ configured
- Wildcard domain `*.newconcierge.app` ❌ **NOT added**

**Verification**:
```bash
# After adding wildcard domain, test:
curl -I https://theo-etherm.newconcierge.app/api/users/me
# Should return 401 (authenticated) not 404 (not found)
```

### 2. Railway Environment Variables Update

**Action Required**: Update Railway backend environment variables:

**File**: Railway Dashboard → Project → Service → Variables

#### A. FRONTEND_URL (Current)
```
FRONTEND_URL=https://linux-version.vercel.app
```

#### B. FRONTEND_URL (Should be)
```
FRONTEND_URL=https://newconcierge.app
```

#### C. CORS_ALLOWED_ORIGINS (Add)
Add to existing list:
```
...existing origins...,https://newconcierge.app,https://*.newconcierge.app
```

#### D. CSRF_ORIGINS (Add)
Add to existing list:
```
...existing origins...,newconcierge.app,*.newconcierge.app
```

**After updating**: Trigger a redeploy in Railway dashboard.

### 3. Post-Deployment Testing

Once Vercel wildcard domain is added:

```bash
# 1. Test tenant subdomain API
curl -I https://theo-etherm.newconcierge.app/api/users/me
# Expected: 401 Unauthorized (not 404)

# 2. Test tenant dashboard
curl -I https://theo-etherm.newconcierge.app/dashboard
# Expected: 200 OK with Next.js page

# 3. Test public buildings endpoint
curl https://theo-etherm.newconcierge.app/api/buildings/public/
# Expected: 200 OK with tenant-specific data

# 4. Test tenant-specific announcements
curl https://theo-etherm.newconcierge.app/api/announcements/
# Expected: 200 OK with tenant data (not demo)
```

**Full E2E Test**:
```bash
cd linux_version
chmod +x e2e_tenant_provisioning_test.sh
./e2e_tenant_provisioning_test.sh
```

## 🔍 Troubleshooting

### Issue: 404 on tenant subdomains
**Cause**: Wildcard domain not added to Vercel project  
**Fix**: Add `*.newconcierge.app` in Vercel dashboard (see section 1 above)

### Issue: CORS errors on tenant subdomains
**Cause**: Frontend URL or CORS origins not updated in Railway  
**Fix**: Update Railway environment variables (see section 2 above)

### Issue: CSRF errors on tenant subdomains
**Cause**: CSRF_TRUSTED_ORIGINS missing wildcard  
**Fix**: The fix is already in `settings.py` lines 64-67. Ensure Railway env vars include `*.newconcierge.app`

### Issue: Tenant resolution fails
**Cause**: CustomTenantMiddleware not processing hostname correctly  
**Fix**: Check logs for `[CustomTenantMiddleware]` entries. Verify hostname extraction in `core/middleware.py`

## 📋 Deployment Checklist

- [x] DNS wildcard records configured
- [x] SSL wildcard certificate issued
- [x] Django ALLOWED_HOSTS security fix applied
- [x] Django tenant middleware configured
- [x] Next.js rewrites configured
- [ ] **Add `*.newconcierge.app` to Vercel project** ⚠️
- [ ] Update Railway FRONTEND_URL environment variable
- [ ] Update Railway CORS_ORIGINS environment variable  
- [ ] Trigger Railway redeploy
- [ ] Test tenant subdomain API endpoints
- [ ] Test tenant subdomain dashboard access
- [ ] Run full E2E tenant provisioning test
- [ ] Monitor MailerSend logs for email delivery

## 🎯 Success Criteria

All checks must pass:

1. ✅ Tenant subdomain loads dashboard: `https://<tenant>.newconcierge.app/dashboard`
2. ✅ API endpoints return tenant-scoped data: `GET /api/buildings/public/`
3. ✅ Invite accept redirects to tenant subdomain: `POST /api/tenants/accept-invite/`
4. ✅ Authentication works on tenant subdomain: `GET /api/users/me`
5. ✅ Email flows continue to work: Check MailerSend delivery logs
6. ✅ No CORS errors in browser console
7. ✅ No CSRF errors in production

## 📚 Related Documentation

- `VERCEL_WILDCARD_SUBDOMAIN_SETUP.md` - Full setup guide
- `MAILERSEND_DNS_SETUP_VERCEL.md` - Email DNS configuration
- `e2e_tenant_provisioning_test.sh` - End-to-end testing script

## 🚨 Security Notes

**IMPORTANT**: The insecure `ALLOWED_HOSTS = ['*']` configuration has been removed from production settings. The application now uses domain-specific host validation:

- Development: `.localhost`, `backend`
- Production: `newconcierge.app`, `.newconcierge.app`, Railway domain
- All domains properly configured in `CSRF_TRUSTED_ORIGINS`

**Next Security Audit**: After full deployment, run:
```bash
cd linux_version/backend
python manage.py check --deploy
```

