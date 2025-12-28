# Deploy Sync - Testing Guide

## Step 1: Wait for Vercel Build

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Navigate to your project
3. Find the deployment from `deploy-sync` branch
4. Wait for build to complete (check build logs for any errors)

## Step 2: Get Preview URL

After build completes:
- Vercel will provide a preview URL like: `https://your-app-git-deploy-sync-username.vercel.app`
- Copy this URL for testing

## Step 3: Manual Smoke Tests

### Test 1: Basic Page Load
1. Open preview URL in browser
2. Verify page loads without errors
3. Check browser console for any JavaScript errors

### Test 2: Proxy Connectivity
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to login or make an API call
4. Verify:
   - Request goes to `/api/*` endpoint
   - Request succeeds (status 200 or expected status)
   - Response data is correct

### Test 3: Backend Connection
1. Check Railway logs to verify requests are reaching backend
2. Verify no CORS errors in browser console
3. Verify no CSRF errors in Railway logs

## Step 4: Specific API Tests

### Test Login Flow
```
POST /api/auth/login
Body: { "email": "test@example.com", "password": "test123" }
Expected: 200 OK with user data
```

### Test Health Check (if available)
```
GET /api/health
Expected: 200 OK
```

## Step 5: Verify Proxy Routing

The proxy should route:
- `/api/*` → `/backend-proxy/*` → Railway backend

Check Network tab:
- Request URL should show `/api/...`
- Response should come from Railway backend
- No 502 Bad Gateway errors

## Troubleshooting

### Build Failed
- Check Vercel build logs
- Verify Root Directory is set to `public-app`
- Check for missing dependencies

### Proxy Returns 502
- Verify `API_BASE_URL` or `NEXT_PUBLIC_API_URL` is set in Vercel
- Check Railway backend is running
- Verify Railway URL is correct

### CORS Errors
- Check `CSRF_TRUSTED_ORIGINS` in Railway includes Vercel domain
- Verify `DJANGO_ALLOWED_HOSTS` includes Vercel domain

### 404 Errors on API Calls
- Verify proxy route exists: `public-app/src/app/backend-proxy/[...path]/route.ts`
- Check `vercel.json` rewrites configuration
- Verify Next.js rewrites in `next.config.ts`

## Success Criteria

✅ Build completes successfully
✅ Preview URL loads without errors
✅ API calls succeed (no 502/404 errors)
✅ Requests reach Railway backend
✅ No CORS/CSRF errors
✅ Login/authentication works

## Next Steps

Once all tests pass:
1. Proceed to create Pull Request
2. Document any issues found
3. Update environment variables if needed



