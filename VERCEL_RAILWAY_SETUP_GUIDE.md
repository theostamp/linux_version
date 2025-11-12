# 🚀 Vercel & Railway Setup Guide - Main Branch

**Ημερομηνία:** 11 Νοεμβρίου 2025  
**Production Branch:** `main`

---

## 📋 Quick Checklist

- [ ] Vercel: Set Production Branch to `main`
- [ ] Vercel: Set Root Directory to `public-app`
- [ ] Vercel: Configure Environment Variables
- [ ] Railway: Verify Deploy Branch is `main`
- [ ] Railway: Configure Environment Variables
- [ ] Test: Verify deployments work

---

## 🌐 Vercel Configuration

### Step 1: Project Settings → Git

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project

2. **Navigate to Settings → Git**
   - Click on your project
   - Go to **Settings** tab
   - Click **Git** in the sidebar

3. **Configure Production Branch**
   ```
   Production Branch: main
   ```
   - Set to `main` (not `deploy-sync`)
   - This ensures production deployments come from `main`

4. **Preview Branches** (Optional)
   - Keep default settings
   - Or add specific branches if needed

### Step 2: Project Settings → General

1. **Root Directory**
   ```
   Root Directory: public-app
   ```
   - **CRITICAL**: Must be set to `public-app`
   - This tells Vercel where your Next.js app is located
   - **Where to find**: Settings → General → Root Directory

2. **Framework Preset**
   ```
   Framework Preset: Next.js
   ```
   - Should auto-detect, but verify it's Next.js
   - **Where to find**: Settings → General → Framework Preset

3. **Build & Development Settings**
   - **Install Command**: `npm ci` (auto-detected from `vercel.json`)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Where to find**: Settings → General → Build & Development Settings
   - These are usually auto-detected from `public-app/vercel.json`
   - **Note**: If Project Settings differ from Production Overrides, see `VERCEL_SETTINGS_SYNC_GUIDE.md` for synchronization instructions

4. **Project Configuration File**
   - **File Location**: `public-app/vercel.json` (inside your app directory)
   - **Note**: Vercel does NOT use a root-level config file like Railway
   - The `vercel.json` is inside `public-app/` directory
   - **Where to view in Dashboard**: Settings → General → Configuration (shows current settings)

### Step 3: Environment Variables

Go to **Settings → Environment Variables** and add:

#### Required Variables

```bash
# Backend API URL (server-side only)
API_BASE_URL=https://your-railway-backend.up.railway.app
# OR
NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
STRIPE_WEBHOOK_SECRET=whsec_...

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
```

#### Optional Variables

```bash
# If using internal API
INTERNAL_API_SECRET_KEY=your-secret-key-32-chars-min

# If using core API
CORE_API_URL=https://core-api-url.com
```

#### Environment Scope

- **Production**: All production deployments
- **Preview**: All preview deployments
- **Development**: Local development (if using Vercel CLI)

**Important**: Add variables for all environments (Production, Preview, Development)

### Step 4: Trigger Deployment

After configuring:
1. Go to **Deployments** tab
2. Click **Redeploy** on latest deployment
3. Or push a new commit to `main` branch (auto-deploys)

---

## 🚂 Railway Configuration

### Step 1: Project Settings → Source

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/dashboard
   - Select your project

2. **Navigate to Settings → Source**
   - Click on your project
   - Go to **Settings** tab
   - Find **Source** section

3. **Configure Deploy Branch**
   ```
   Branch: main
   ```
   - Set to `main` (Railway usually defaults to `main`)
   - Railway will auto-deploy on pushes to `main`

4. **Root Directory** (if applicable)
   ```
   Root Directory: /backend
   ```
   - Verify this is set correctly if your backend is in `backend/` directory
   - Railway will use this as the working directory

### Step 2: Environment Variables

Go to **Variables** tab and ensure:

#### Required Variables

```bash
# Django Settings
DJANGO_ENV=production
DJANGO_SECRET_KEY=your-secret-key
DJANGO_ALLOWED_HOSTS=your-domain.com,*.vercel.app,your-app.up.railway.app

# Security Settings
CSRF_TRUSTED_ORIGINS=https://your-domain.com,https://*.vercel.app,https://your-app.up.railway.app
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://*.vercel.app

# Database
DATABASE_URL=postgresql://... (Railway auto-provides)

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (if using)
MAILERSEND_API_KEY=...
```

#### Critical: Domain Configuration

**DJANGO_ALLOWED_HOSTS** must include:
- Your custom domain (if any)
- Vercel preview domains (`*.vercel.app`)
- Railway domain (`*.up.railway.app`)

**CSRF_TRUSTED_ORIGINS** must include:
- Same domains as above, but with `https://` prefix
- Example: `https://your-app.vercel.app,https://your-domain.com`

### Step 3: Deploy Settings

1. **Release Command** (if not auto-detected)
   ```
   python manage.py migrate && python manage.py collectstatic --noinput
   ```
   - Railway usually detects this from `Procfile`
   - Verify in **Settings → Deploy**

2. **Start Command**
   - Should be: `gunicorn new_concierge_backend.wsgi:application`
   - Usually auto-detected from `Procfile`

### Step 4: Verify Deployment

1. **Check Logs**
   - Go to **Deployments** tab
   - Click on latest deployment
   - Check logs for errors

2. **Health Check**
   ```bash
   curl https://your-railway-backend.up.railway.app/api/health/
   ```
   - Should return: `{"status":"healthy","service":"linux-version-backend"}`

---

## ✅ Verification Steps

### 1. Vercel Deployment Check

```bash
# Check latest deployment
# Go to Vercel Dashboard → Deployments
# Verify:
- ✅ Build completed successfully
- ✅ Branch: main
- ✅ Status: Ready
```

### 2. Railway Deployment Check

```bash
# Check latest deployment
# Go to Railway Dashboard → Deployments
# Verify:
- ✅ Build completed successfully
- ✅ Branch: main
- ✅ Status: Active
```

### 3. Integration Test

```bash
# Test frontend → backend connection
curl https://your-vercel-app.vercel.app/api/health/

# Should proxy to Railway backend and return health status
```

### 4. Browser Test

1. **Open Production URL**
   - Visit your Vercel production URL
   - Check browser console for errors

2. **Test API Calls**
   - Try login or any API call
   - Check Network tab in DevTools
   - Verify requests go to `/api/*` and succeed

---

## 🔧 Current Configuration Files

### Vercel Configuration (`public-app/vercel.json`)

**Location**: `public-app/vercel.json` (inside the Next.js app directory)

```json
{
  "framework": "nextjs",
  "installCommand": "npm ci",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/backend-proxy/:path*"
    }
  ],
  "headers": [
    {
      "source": "/_next/static/:path*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Note**: 
- Vercel **does NOT** use a root-level `vercel.json` like Railway uses `railway.json`
- Configuration is in `public-app/vercel.json` (inside the app directory)
- Vercel auto-detects Next.js projects and uses this file for routing/headers
- Additional settings are configured in Vercel Dashboard → Settings

### Next.js (`public-app/next.config.ts`)

- Proxy rewrites configured
- Image optimization enabled
- Caching headers configured
- Redirects configured (`/kiosk` → `/kiosk-display`)

### Railway (`backend/Procfile`)

```
web: gunicorn new_concierge_backend.wsgi:application
```

### Railway Configuration (`railway.json`)

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "backend/Dockerfile"
  },
  "deploy": {
    "runtime": "V2",
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Note**: This file is in the repository root and configures Railway to:
- Use Dockerfile from `backend/Dockerfile`
- Deploy with V2 runtime
- Auto-restart on failure (up to 10 retries)

---

## 🐛 Troubleshooting

### Vercel Build Fails

**Problem**: Build fails with "Cannot find module"  
**Solution**: 
- Verify Root Directory is set to `public-app`
- Check `public-app/package.json` exists
- Verify all dependencies are listed

**Problem**: Environment variables not found  
**Solution**:
- Check variables are set for correct environment (Production/Preview)
- Verify variable names match exactly (case-sensitive)
- Redeploy after adding variables

### Railway Deployment Fails

**Problem**: CORS/CSRF errors  
**Solution**:
- Verify `DJANGO_ALLOWED_HOSTS` includes Vercel domain
- Verify `CSRF_TRUSTED_ORIGINS` includes Vercel domain with `https://`
- Check Railway logs for specific error

**Problem**: Database connection errors  
**Solution**:
- Verify `DATABASE_URL` is set correctly
- Check Railway PostgreSQL service is running
- Verify migrations ran successfully

### Proxy Not Working

**Problem**: API calls return 404 or 502  
**Solution**:
- Verify `API_BASE_URL` or `NEXT_PUBLIC_API_URL` is set in Vercel
- Check Railway backend is accessible
- Verify `backend-proxy` route handler exists at `public-app/src/app/backend-proxy/[...path]/route.ts`

---

## 📝 Quick Reference

### Vercel Dashboard URLs

- **Projects**: https://vercel.com/dashboard
- **Project Settings**: `https://vercel.com/[username]/[project]/settings`
- **Environment Variables**: `https://vercel.com/[username]/[project]/settings/environment-variables`
- **Deployments**: `https://vercel.com/[username]/[project]/deployments`

### Railway Dashboard URLs

- **Projects**: https://railway.app/dashboard
- **Project Settings**: `https://railway.app/project/[project-id]/settings`
- **Variables**: `https://railway.app/project/[project-id]/variables`
- **Deployments**: `https://railway.app/project/[project-id]/deployments`

---

## 🎯 Next Steps

After configuring:

1. ✅ Verify both platforms deploy from `main` branch
2. ✅ Test production URLs
3. ✅ Monitor first few deployments for errors
4. ✅ Set up monitoring/alerts if needed

---

**Last Updated**: 11 Νοεμβρίου 2025  
**Branch**: `main`

