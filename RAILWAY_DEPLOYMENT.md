# 🚂 Railway Deployment Guide

## Prerequisites

1. **Railway Account**: Sign up at https://railway.app
2. **GitHub Repository**: Push your code to GitHub
3. **Stripe Account**: Get production keys from https://dashboard.stripe.com

---

## Step 1: Create Railway Project

### 1.1 Login to Railway
```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Login
railway login
```

### 1.2 Create New Project
1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account
5. Select your repository: `linux_version`

---

## Step 2: Configure Services

Railway will need **3 services**:

### Service 1: PostgreSQL Database
1. Click "New" → "Database" → "PostgreSQL"
2. Railway will auto-provision the database
3. Note the connection details (automatic)

### Service 2: Redis
1. Click "New" → "Database" → "Redis"
2. Railway will auto-provision Redis
3. Note the connection details (automatic)

### Service 3: Django Backend
1. Railway should auto-detect your Django app
2. Set the root directory: `backend`
3. Configure build command (see below)

### Service 4: Next.js Frontend (Optional - can use Vercel)
1. Set root directory: `frontend`
2. Build command: `npm run build`
3. Start command: `npm start`

---

## Step 3: Environment Variables

### For Backend Service:

Click on the Django Backend service → Variables → Add all these:

```env
# Django Core
DEBUG=False
DJANGO_SECRET_KEY=<generate-new-secret-key>
ALLOWED_HOSTS=.railway.app,yourdomain.com
CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app,https://yourdomain.com

# Database (Railway auto-populates these)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (Railway auto-populates)
REDIS_URL=${{Redis.REDIS_URL}}

# Stripe (Production Keys!)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=eur
STRIPE_MOCK_MODE=False

# Internal API
INTERNAL_API_SECRET_KEY=<generate-new-secret-key>

# Frontend URL
FRONTEND_URL=https://your-frontend.railway.app

# Email (Gmail or SendGrid)
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### Generate Secret Keys:
```bash
# Django Secret Key
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Internal API Secret Key
openssl rand -hex 32
```

---

## Step 4: Deploy Commands

### Backend Build & Start Commands

**Build Command:**
```bash
python manage.py collectstatic --noinput && python manage.py migrate
```

**Start Command:**
```bash
gunicorn new_concierge_backend.wsgi:application --bind 0.0.0.0:$PORT
```

### Frontend Build & Start Commands

**Build Command:**
```bash
npm run build
```

**Start Command:**
```bash
npm start
```

---

## Step 5: Configure Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-backend.railway.app/api/billing/webhook/stripe/`
4. Events to listen:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Webhook Signing Secret**
6. Add it to Railway Backend environment: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## Step 6: Configure Custom Domain (Optional)

### Backend Domain:
1. Go to Backend Service → Settings → Domains
2. Click "Generate Domain" (gets `xxx.railway.app`)
3. OR add custom domain: `api.yourdomain.com`
4. Update DNS: Add CNAME record pointing to Railway

### Frontend Domain:
1. Deploy frontend to **Vercel** (recommended for Next.js)
2. Or use Railway domain for frontend too

---

## Step 7: Initial Database Setup

After deployment, run migrations:

```bash
# Using Railway CLI
railway run python manage.py migrate

# Or use Railway web shell
# Go to Service → Shell
python manage.py migrate
python manage.py createsuperuser
```

---

## Step 8: Testing Production Deployment

### Test Endpoints:
```bash
# Health check
curl https://your-backend.railway.app/health/

# API root
curl https://your-backend.railway.app/api/

# Create test user
curl -X POST https://your-backend.railway.app/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","first_name":"Test","last_name":"User"}'
```

### Test Stripe Payment:
1. Go to frontend: `https://your-frontend.railway.app`
2. Register new user
3. Select plan
4. Complete Stripe checkout (use test card: `4242 4242 4242 4242`)
5. Check if tenant is created automatically
6. Login to tenant domain

---

## Troubleshooting

### Issue: Database connection fails
**Solution**: Make sure `DATABASE_URL` is set correctly. Railway auto-populates this.

### Issue: Static files not loading
**Solution**: Run `python manage.py collectstatic` in build command.

### Issue: Webhook returns 403
**Solution**: Check `STRIPE_WEBHOOK_SECRET` is correct and matches Stripe dashboard.

### Issue: CORS errors
**Solution**: Add frontend domain to `CORS_ALLOWED_ORIGINS`.

### Issue: Internal API returns 403
**Solution**: Verify `INTERNAL_API_SECRET_KEY` matches in both webhook and internal API.

---

## Security Checklist

- [ ] `DEBUG=False` in production
- [ ] Strong `DJANGO_SECRET_KEY` (different from dev)
- [ ] Production Stripe keys (not test keys)
- [ ] Real `STRIPE_WEBHOOK_SECRET` from Stripe dashboard
- [ ] Secure `INTERNAL_API_SECRET_KEY`
- [ ] Configure `ALLOWED_HOSTS` properly
- [ ] Set up SSL/HTTPS (Railway provides this automatically)
- [ ] Enable CORS only for your domain

---

## Monitoring

### Railway Metrics:
1. CPU Usage
2. Memory Usage
3. Network Traffic
4. Logs (real-time)

### Django Logs:
```bash
# View logs in Railway CLI
railway logs

# Or in Railway dashboard → Deployments → Logs
```

---

## Scaling

### Vertical Scaling:
1. Go to Service → Settings → Resources
2. Increase RAM/CPU as needed

### Horizontal Scaling:
1. Increase number of replicas
2. Add load balancer (Railway Pro)

---

## Costs Estimate

**Railway Pricing** (as of 2024):
- **Free Tier**: $5 credit/month (good for testing)
- **Pro Plan**: $20/month (includes $20 usage)
- **Additional usage**: ~$0.000463/GB-minute

**Estimated Monthly Cost**:
- PostgreSQL: ~$5-10
- Redis: ~$2-5
- Backend (Django): ~$5-15
- Frontend (if on Railway): ~$5-10
- **Total**: ~$20-40/month

**Recommendation**: Host frontend on **Vercel** (free) to save costs.

---

## Next Steps After Deployment

1. **Monitor tenant creation**: Check logs for successful tenant creations
2. **Set up email notifications**: Configure SMTP for welcome emails
3. **Add monitoring**: Set up Sentry for error tracking
4. **Configure backups**: Enable Railway database backups
5. **Set up CI/CD**: Auto-deploy on git push

---

## Quick Deploy Checklist

- [ ] GitHub repo pushed
- [ ] Railway project created
- [ ] PostgreSQL database added
- [ ] Redis database added
- [ ] Environment variables configured
- [ ] Stripe webhook configured
- [ ] Initial migration run
- [ ] Superuser created
- [ ] Test payment completed
- [ ] Tenant auto-creation verified

---

**🎉 You're ready for production!**

For questions: https://docs.railway.app
