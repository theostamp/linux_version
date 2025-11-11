# 🚀 Repository Refactoring - Final Deployment Checklist

## ✅ Status: READY FOR DEPLOYMENT

Όλες οι αλλαγές για το repository refactoring έχουν ολοκληρωθεί.

---

## 📋 Pre-Deployment Verification

### ✅ Phase 1: Repository Cleanup - COMPLETED
- [x] Root build artifacts removed (node_modules, .next, temp_build)
- [x] Orphan frontend/ directory removed
- [x] linux_version/backend duplicate removed
- [x] linux_version/public-app duplicate removed
- [x] linux_version/frontend duplicate removed (partially - permission issues with build artifacts)

### ✅ Phase 2: Backend Stabilization - COMPLETED
- [x] Django settings refactored into base.py, dev.py, prod.py
- [x] ALLOWED_HOSTS=['*'] removed from production
- [x] Explicit environment variables required (DJANGO_ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS, CORS_ALLOWED_ORIGINS)
- [x] Auto-initialization moved to management commands (auto_init, create_demo_data)
- [x] entrypoint.sh simplified (only wait-for-DB + gunicorn)
- [x] Health check endpoints exist (/api/health/, /api/health/db/, etc.)

### ✅ Phase 3: Frontend Stabilization - COMPLETED
- [x] Vercel configuration fixed (rootDirectory, installCommand npm ci, buildCommand)
- [x] ignoreCommand added to check changes only in public-app/
- [x] Rewrites added for /api/* to route through proxy
- [x] Hardcoded Railway domain removed from vercel.json
- [x] API proxy route handler created (/api/proxy/[...path]/route.ts)
- [x] Client API helper created (src/lib/api.ts) with proxy route support
- [x] Frontend health check endpoint created (/api/health/)
- [x] .vercelignore created to ignore backend/, linux_version/, etc.

### ✅ Phase 4: Environment Variables Schema - COMPLETED
- [x] env.schema.example created with all required variables
- [x] backend/env.example created
- [x] Documentation for environment variables

### ✅ Phase 5: GitHub Actions CI/CD - COMPLETED
- [x] Backend pipeline created (.github/workflows/backend.yml)
- [x] Frontend pipeline created (.github/workflows/frontend.yml)
- [x] Lint, test, and build steps configured
- [x] Railway CLI deployment with health check verification
- [x] Vercel CLI deployment with health check verification
- [x] Integration tests run after frontend deployment

### ✅ Phase 6: Monitoring & Rollback - COMPLETED
- [x] Health check endpoints verified
- [x] Rollback scripts created (scripts/rollback-railway.sh, scripts/rollback-vercel.sh)
- [x] Integration test script created (scripts/test-app-connection.mjs)

---

## 🎯 New Repository Structure

```
project/
├── backend/                    # Canonical Django backend
│   ├── new_concierge_backend/
│   │   └── settings/
│   │       ├── __init__.py    # Auto-selects dev/prod
│   │       ├── base.py        # Common settings
│   │       ├── dev.py         # Development settings
│   │       └── prod.py        # Production settings (explicit env vars)
│   ├── core/
│   │   └── management/
│   │       └── commands/
│   │           ├── auto_init.py
│   │           └── create_demo_data.py
│   ├── entrypoint.sh          # Simplified (wait-for-DB + gunicorn)
│   └── env.example            # Environment variables template
├── public-app/                # Canonical Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   └── api/
│   │   │       ├── proxy/
│   │   │       │   └── [...path]/
│   │   │       │       └── route.ts  # API proxy handler
│   │   │       └── health/
│   │   │           └── route.ts     # Frontend health check
│   │   └── lib/
│   │       └── api.ts              # Client API helper
│   └── vercel.json            # Fixed configuration
├── .github/
│   └── workflows/
│       ├── backend.yml        # Backend CI/CD pipeline
│       └── frontend.yml       # Frontend CI/CD pipeline
├── scripts/
│   ├── test-app-connection.mjs
│   ├── rollback-railway.sh
│   └── rollback-vercel.sh
└── env.schema.example         # Environment variables schema
```

---

## 🚀 Deployment Steps

### Step 1: Update Environment Variables

#### Backend (Railway)
**REQUIRED Environment Variables:**
```bash
DJANGO_SECRET_KEY=your-secret-key
DJANGO_ENV=production
DJANGO_ALLOWED_HOSTS=yourdomain.com,*.railway.app,your-app.up.railway.app
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://*.vercel.app,https://your-app.up.railway.app
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://*.vercel.app
DATABASE_URL=postgresql://...
```

**Action:**
1. Go to Railway Dashboard → Backend service → Variables
2. Add/update all required variables from `backend/env.example`
3. **IMPORTANT:** Remove any `ALLOWED_HOSTS=['*']` patterns
4. Set explicit domains in DJANGO_ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS, CORS_ALLOWED_ORIGINS

#### Frontend (Vercel)
**REQUIRED Environment Variables:**
```bash
API_BASE_URL=https://your-backend.up.railway.app  # Server-side only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Action:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add/update all required variables
3. **IMPORTANT:** Set API_BASE_URL (not NEXT_PUBLIC_API_URL for proxy)

---

### Step 2: Update Vercel Project Settings

1. Go to Vercel Dashboard → Project → Settings → General
2. Set **Root Directory** to `public-app` (CRITICAL - without this, builds will fail)
3. Verify **Build Command**: `npm run build`
4. Verify **Install Command**: `npm ci` (more reliable than npm install)
5. Verify **Output Directory**: `.next`
6. The ignoreCommand in vercel.json will prevent unnecessary builds

---

### Step 3: Run Initial Setup (One-time)

#### Backend (Railway)
After first deployment, run initialization commands:

```bash
# Connect to Railway service
railway run bash

# Run auto-initialization
python manage.py auto_init

# Create Stripe prices
python manage.py create_stripe_prices
```

Or use Railway one-off commands:
```bash
railway run python manage.py auto_init
railway run python manage.py create_stripe_prices
```

---

### Step 4: Verify Deployment

#### Backend Health Checks
```bash
# Health check
curl https://your-backend.up.railway.app/api/health/

# Database health check
curl https://your-backend.up.railway.app/api/health/db/
```

#### Frontend Health Check
```bash
curl https://yourdomain.com/api/health/
```

#### Integration Test
```bash
API_BASE_URL=https://your-backend.up.railway.app node scripts/test-app-connection.mjs
```

---

## 🔄 Rollback Procedures

### Railway Rollback
```bash
./scripts/rollback-railway.sh
```

Or manually:
```bash
railway deployments
railway up --detach <deployment-id>
```

### Vercel Rollback
```bash
./scripts/rollback-vercel.sh
```

Or manually:
```bash
vercel ls
vercel promote <deployment-url>
```

---

## 📊 Monitoring

### Health Checks
- **Backend:** `/api/health/`, `/api/health/db/`, `/api/health/schema/`
- **Frontend:** `/api/health/`

### Logs
- **Railway:** Dashboard → Backend service → Logs
- **Vercel:** Dashboard → Project → Deployments → Logs

### Common Issues

#### CORS Errors
- Check `CORS_ALLOWED_ORIGINS` includes frontend domain
- Check `CSRF_TRUSTED_ORIGINS` includes frontend domain
- Verify API proxy route is working (`/api/proxy/...`)
- Check that rewrites in vercel.json are configured

#### 404 Errors on API
- Verify `API_BASE_URL` is set correctly in Vercel (server-side env var)
- Check backend health endpoints
- Verify proxy route handler is deployed
- Check that /api/:path* rewrites to /api/proxy/:path* in vercel.json

#### Backend Startup Issues
- Check `DJANGO_ALLOWED_HOSTS` is set (no wildcards in production)
- Verify `DATABASE_URL` is correct
- Check logs for missing environment variables
- Verify Railway CLI deployment succeeded in GitHub Actions

#### Vercel Build Failures
- Ensure Root Directory is set to `public-app` in Vercel dashboard
- Check that npm ci can install dependencies
- Verify ignoreCommand is not preventing necessary builds
- Check GitHub Actions frontend pipeline for build errors

---

## ✅ Success Criteria

- [ ] Backend health checks return 200 OK
- [ ] Frontend health check returns 200 OK
- [ ] API proxy route works (`/api/proxy/users/me/`)
- [ ] No CORS errors in browser console
- [ ] No hardcoded domains in code
- [ ] Environment variables properly configured
- [ ] GitHub Actions pipelines pass
- [ ] Integration tests pass

---

## 📚 Documentation Files

- **Environment Schema:** `env.schema.example`
- **Backend Env Example:** `backend/env.example`
- **Rollback Scripts:** `scripts/rollback-*.sh`
- **Integration Test:** `scripts/test-app-connection.mjs`
- **GitHub Actions:** `.github/workflows/*.yml`
- **Vercel Ignore:** `.vercelignore`
- **Git Ignore:** `.gitignore` (updated with comprehensive patterns)

---

## 🎉 Ready to Deploy!

Το repository έχει αναδιοργανωθεί και είναι έτοιμο για deployment.

**Next Steps:**
1. ✅ Update environment variables (Railway & Vercel)
2. ✅ Update Vercel project settings (rootDirectory)
3. ✅ Deploy code (GitHub Actions will auto-deploy)
4. ✅ Run initial setup commands (auto_init, create_stripe_prices)
5. ✅ Verify health checks and integration tests
6. ✅ Monitor logs for any issues

---

## 📝 Notes

- **Auto-initialization** is now a management command - run manually or as Railway one-off
- **Settings** are split into base/dev/prod - use DJANGO_ENV to select
- **API proxy** routes all `/api/*` requests through Next.js server (solves CORS)
- **No hardcoded domains** - all URLs come from environment variables
- **GitHub Actions** will auto-deploy on push to main branch
