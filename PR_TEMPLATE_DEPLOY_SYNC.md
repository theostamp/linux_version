# Align Frontend Proxy and Vercel Config

## Summary

This PR aligns the frontend proxy configuration with Vercel deployment settings, updating the proxy destination and adding necessary configuration optimizations.

## Changes

### Files Modified
- `public-app/vercel.json` - Updated proxy destination from `/api/proxy/:path*` to `/backend-proxy/:path*`
- `public-app/next.config.ts` - Added Next.js proxy rewrites and configuration optimizations
- `public-app/.vercelignore` - Added Vercel ignore rules for deployment optimization

### Technical Details

1. **Proxy Routing Update**
   - Changed Vercel rewrite destination from `/api/proxy/:path*` to `/backend-proxy/:path*`
   - This aligns with the existing Next.js route handler at `public-app/src/app/backend-proxy/[...path]/route.ts`

2. **Next.js Configuration**
   - Added proxy rewrites configuration
   - Added headers configuration for caching
   - Added redirects for `/kiosk` → `/kiosk-display`
   - Optimized build settings (CSS chunking, image optimization, etc.)

3. **Vercel Optimization**
   - Added `.vercelignore` to exclude unnecessary files from deployment
   - Updated `ignoreCommand` to properly detect changes

## Environment Variables Required

### Vercel
- `API_BASE_URL` or `NEXT_PUBLIC_API_URL` - Railway backend URL
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- (Optional) `CORE_API_URL` - Core API URL
- (Optional) `INTERNAL_API_SECRET_KEY` - Internal API secret key

### Railway
- `DJANGO_ALLOWED_HOSTS` - Must include Vercel domain(s)
- `CSRF_TRUSTED_ORIGINS` - Must include Vercel domain(s) with `https://`

## Testing Steps

1. ✅ Build completed successfully on `deploy-sync` branch
2. ✅ Preview URL tested and working
3. ✅ Proxy connectivity verified (API calls succeed)
4. ✅ Backend connection verified (requests reach Railway)
5. ✅ No CORS/CSRF errors

## Deployment Notes

- Root Directory in Vercel must be set to `public-app`
- Ensure all environment variables are set before deployment
- Railway backend must have correct `DJANGO_ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS`

## Related Documentation

- `DEPLOY_SYNC_ENV_SETUP.md` - Environment setup instructions
- `DEPLOY_SYNC_TESTING_GUIDE.md` - Testing guide

## Checklist

- [x] Code changes tested locally
- [x] Build passes on Vercel preview
- [x] Proxy connectivity verified
- [x] Environment variables documented
- [x] Documentation updated

## Next Steps After Merge

1. Update Vercel/Railway to use `main` branch
2. Verify production deployment
3. Monitor for any issues
4. Clean up `deploy-sync` branch if no longer needed



