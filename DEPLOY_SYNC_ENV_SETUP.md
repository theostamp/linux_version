# Deploy Sync - Environment Setup Instructions

## Vercel Configuration

### Root Directory
- Set **Root Directory** = `public-app` in Vercel Project Settings

### Environment Variables (Required)
Set the following environment variables in Vercel:

1. **API_BASE_URL** or **NEXT_PUBLIC_API_URL**
   - Value: Your Railway backend URL (e.g., `https://linuxversion-production.up.railway.app`)
   - This is used by the backend-proxy route handler

2. **STRIPE_SECRET_KEY**
   - Your Stripe secret key (starts with `sk_`)

3. **STRIPE_WEBHOOK_SECRET**
   - Your Stripe webhook secret (starts with `whsec_`)

### Optional Environment Variables
- **CORE_API_URL** - If using core API
- **INTERNAL_API_SECRET_KEY** - If using internal API authentication

### Git Settings
- **Production Branch**: `main` (or keep current)
- **Preview Branches**: Ensure `deploy-sync` is included in preview branches

## Railway Configuration

### Environment Variables (Required)
Ensure the following are set in Railway:

1. **DJANGO_ALLOWED_HOSTS**
   - Must include your Vercel domain(s)
   - Example: `your-app.vercel.app,your-custom-domain.com`
   - Separate multiple domains with commas

2. **CSRF_TRUSTED_ORIGINS**
   - Must include your Vercel domain(s) with `https://` protocol
   - Example: `https://your-app.vercel.app,https://your-custom-domain.com`
   - Separate multiple origins with commas

### Release Command
Ensure Railway runs migrations and collectstatic:
```bash
python manage.py migrate && python manage.py collectstatic --noinput
```

## Proxy Configuration

The proxy is configured to route `/api/*` requests to `/backend-proxy/*` which forwards them to the Railway backend.

### How it works:
1. Frontend makes request to `/api/some-endpoint`
2. Vercel rewrites to `/backend-proxy/some-endpoint` (via `vercel.json`)
3. Next.js route handler (`public-app/src/app/backend-proxy/[...path]/route.ts`) forwards to Railway backend
4. Backend URL is resolved from `API_BASE_URL` or `NEXT_PUBLIC_API_URL` env var

## Verification Steps

1. **Check Vercel Build**
   - Go to Vercel Dashboard → Deployments
   - Find the deployment from `deploy-sync` branch
   - Verify build completed successfully

2. **Test Proxy Connection**
   - Open preview URL: `https://your-app-git-deploy-sync-username.vercel.app`
   - Open browser DevTools → Network tab
   - Try a login or API call
   - Verify requests go to `/api/*` and return successfully

3. **Check Railway Logs**
   - Verify requests are reaching Railway backend
   - Check for CORS or CSRF errors

## Troubleshooting

### Proxy not working
- Verify `API_BASE_URL` or `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- Check Railway logs for incoming requests
- Verify `DJANGO_ALLOWED_HOSTS` includes Vercel domain

### CORS/CSRF errors
- Ensure `CSRF_TRUSTED_ORIGINS` includes Vercel domain with `https://`
- Check that `DJANGO_ALLOWED_HOSTS` includes Vercel domain

### Build failures
- Check Vercel build logs
- Verify `public-app` is set as Root Directory
- Ensure all dependencies are in `public-app/package.json`



