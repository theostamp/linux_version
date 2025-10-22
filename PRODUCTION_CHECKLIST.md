# Production Deployment Checklist

Αυτό το checklist διασφαλίζει ότι η εφαρμογή είναι έτοιμη για production deployment.

---

## 🔐 1. Environment Variables (.env)

### ❌ Current Status: INCOMPLETE
Το τρέχον `.env` έχει placeholder values που πρέπει να αντικατασταθούν.

### ✅ Required Configuration

#### A. Django Core Settings

```bash
# ❌ CRITICAL: Change this!
DJANGO_SECRET_KEY=<generate-strong-random-key-50-chars>

# ❌ CRITICAL: Set to False for production!
DJANGO_DEBUG=False

# ✅ OK: Configure for your domains
DJANGO_ALLOWED_HOSTS=yourdomain.com,*.yourdomain.com,localhost

# ✅ Set production environment
ENV=production
```

**Πώς να δημιουργήσεις SECRET_KEY:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

#### B. Database Configuration

```bash
# ❌ CRITICAL: Change default credentials!
DB_HOST=db
DB_PORT=5432
DB_NAME=concierge_production_db
DB_USER=concierge_user
DB_PASSWORD=<strong-random-password-here>

# Docker Compose equivalents (used by postgres container)
POSTGRES_DB=concierge_production_db
POSTGRES_USER=concierge_user
POSTGRES_PASSWORD=<same-as-above>
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

**Security Notes:**
- ❌ NEVER use `postgres/postgres` in production
- ✅ Use strong passwords (20+ characters, mixed case, numbers, symbols)
- ✅ Restrict database access to backend container only

---

#### C. Stripe Configuration

```bash
# ❌ CRITICAL: Replace with real Stripe keys!
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXXXXXXXXXXX
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXX

# ❌ CRITICAL: Disable mock mode for production!
STRIPE_MOCK_MODE=False

# ✅ Currency setting
STRIPE_CURRENCY=eur
```

**Where to get Stripe keys:**
1. Go to https://dashboard.stripe.com/test/apikeys (for testing)
2. For production: https://dashboard.stripe.com/apikeys
3. Webhook secret: Create webhook endpoint at https://dashboard.stripe.com/webhooks
   - Endpoint URL: `https://yourdomain.com/api/billing/webhook/stripe/`
   - Events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`

**⚠️ CRITICAL:**
- Test mode keys start with `pk_test_` and `sk_test_`
- Production keys start with `pk_live_` and `sk_live_`
- NEVER commit real keys to git
- Rotate keys immediately if exposed

---

#### D. Email Configuration (SMTP)

```bash
# ❌ CRITICAL: Replace with real email credentials!

# Option 1: Gmail (for testing/small scale)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-real-email@gmail.com
EMAIL_HOST_PASSWORD=xxxx-xxxx-xxxx-xxxx  # 16-char App Password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Option 2: Professional SMTP (recommended for production)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.yourmailprovider.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=smtp-username
EMAIL_HOST_PASSWORD=smtp-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

**Email Providers Recommended:**
- SendGrid: https://sendgrid.com/ (12k emails/month free)
- AWS SES: https://aws.amazon.com/ses/ (cheap, reliable)
- Mailgun: https://www.mailgun.com/ (5k emails/month free)
- Postmark: https://postmarkapp.com/ (transactional emails specialist)

**Gmail Setup (Testing Only):**
1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use 16-character password (format: xxxx-xxxx-xxxx-xxxx)

**⚠️ Gmail Limitations:**
- Max 500 emails/day
- May be flagged as spam
- Not recommended for production

---

#### E. Frontend Configuration

```bash
# ❌ Update for production domain
FRONTEND_URL=https://yourdomain.com

# For development
# FRONTEND_URL=http://localhost:8080
```

---

#### F. Redis Configuration

```bash
# ✅ OK for Docker Compose
REDIS_HOST=redis
REDIS_PORT=6379

# ⚠️ For production, consider Redis password
# REDIS_PASSWORD=<strong-password>
```

---

#### G. Celery Configuration

```bash
# ✅ OK for Docker Compose
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# ⚠️ With Redis password:
# CELERY_BROKER_URL=redis://:password@redis:6379/0
# CELERY_RESULT_BACKEND=redis://:password@redis:6379/0
```

---

#### H. Google Integration (Optional)

```bash
# Google Calendar Integration
GOOGLE_CALENDAR_ENABLED=False  # Set True if using
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

# Google Document AI (Optional)
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_LOCATION=us
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=
GOOGLE_SERVICE_ACCOUNT_FILE=/path/to/service-account.json
GOOGLE_ADMIN_EMAIL=
```

---

#### I. Security Settings

```bash
# ❌ CRITICAL: Change this!
INTERNAL_API_SECRET_KEY=<generate-strong-random-key>

# ✅ Cookie security (production)
CSRF_COOKIE_SAMESITE=Strict
SESSION_COOKIE_SAMESITE=Strict
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SECURE=True

# ✅ HTTPS redirect (production)
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
```

---

## 📋 2. Pre-Deployment Checklist

### Security Audit

- [ ] **SECRET_KEY**: Changed from default
- [ ] **DEBUG**: Set to `False`
- [ ] **Database**: Strong passwords, not `postgres/postgres`
- [ ] **Stripe**: Real API keys configured, mock mode disabled
- [ ] **Email**: Production SMTP configured (not Gmail for production)
- [ ] **ALLOWED_HOSTS**: Configured for production domains
- [ ] **HTTPS**: SSL certificates configured
- [ ] **CSRF/Session Cookies**: Secure flags enabled

### Stripe Configuration

- [ ] **Test Mode**: Tested with `pk_test_` and `sk_test_` keys
- [ ] **Webhook**: Endpoint created at Stripe Dashboard
- [ ] **Webhook Secret**: Configured in `.env`
- [ ] **Events**: Subscribed to:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.deleted`
  - `customer.subscription.updated`
- [ ] **Live Mode**: Switched to `pk_live_` and `sk_live_` keys
- [ ] **Payment Testing**: Completed end-to-end test in test mode

### Email Configuration

- [ ] **SMTP Provider**: Selected and configured
- [ ] **Credentials**: Valid and tested
- [ ] **From Email**: Professional address configured
- [ ] **Welcome Email**: Tested (sent after subscription)
- [ ] **Invitation Email**: Tested
- [ ] **Password Reset**: Tested
- [ ] **SPF/DKIM**: Configured for domain (prevents spam)

### Database

- [ ] **Migrations**: All applied (`python manage.py migrate_schemas --shared`)
- [ ] **Tenant Migrations**: Applied (`python manage.py migrate_schemas`)
- [ ] **Backups**: Automated backup system configured
- [ ] **Superuser**: Created (`python manage.py createsuperuser`)
- [ ] **Initial Data**: Subscription plans created

### Static Files & Media

- [ ] **Static Files**: Collected (`python manage.py collectstatic`)
- [ ] **Media Directory**: Configured and writable
- [ ] **File Permissions**: Correct permissions set
- [ ] **Storage**: Consider S3/CloudFlare R2 for production

### Performance

- [ ] **Gunicorn**: Workers configured (recommendation: `2-4 × CPU_COUNT`)
- [ ] **Nginx**: Configured as reverse proxy
- [ ] **Redis**: Cache configured and tested
- [ ] **Celery**: Workers running (`celery -A new_concierge_backend worker -l info`)
- [ ] **Database Indexes**: Verified (already optimized in codebase)

### Monitoring & Logging

- [ ] **Error Logging**: Sentry or similar configured
- [ ] **Access Logs**: Nginx logs configured
- [ ] **Application Logs**: Django logging configured
- [ ] **Health Checks**: `/health/` endpoint working
- [ ] **Uptime Monitoring**: Service like UptimeRobot configured

### Testing

- [ ] **System Check**: `python manage.py check --deploy` passes
- [ ] **Signup Flow**: Tested end-to-end
- [ ] **Payment Flow**: Tested with test cards
- [ ] **Tenant Creation**: Verified demo building created
- [ ] **Auto-Login**: Verified redirect and JWT auth works
- [ ] **Email Delivery**: All emails received
- [ ] **Password Sync**: Login works in both public and tenant schemas
- [ ] **Subdomain Routing**: All tenant subdomains accessible

---

## 🧪 3. Testing Checklist

### End-to-End User Journey

1. **Signup** (http://localhost:8080 or yourdomain.com)
   - [ ] Register new user
   - [ ] Email verification sent (if enabled)
   - [ ] User created in public schema

2. **Login**
   - [ ] Login successful
   - [ ] JWT tokens generated
   - [ ] Redirect to payment page

3. **Payment** (Stripe Checkout)
   - [ ] Checkout session created
   - [ ] Test card accepted: `4242 4242 4242 4242`
   - [ ] Payment successful
   - [ ] Webhook received

4. **Tenant Creation** (Backend)
   - [ ] Subscription created in public schema
   - [ ] Tenant schema created
   - [ ] Migrations applied to tenant
   - [ ] Tenant user created with synced password
   - [ ] Demo building "Αλκμάνος 22" created
   - [ ] 10 demo apartments created
   - [ ] Welcome email sent

5. **Success Page**
   - [ ] Polling starts automatically
   - [ ] Progress bar shows attempts
   - [ ] Success message displayed
   - [ ] Auto-redirect to tenant subdomain

6. **Auto-Login** (Tenant Domain)
   - [ ] Redirect to `{subdomain}.localhost:8080/auth/verify?token=JWT`
   - [ ] Token authenticates user
   - [ ] Redirect to `/dashboard`
   - [ ] User logged in successfully

7. **Tenant Application**
   - [ ] Dashboard loads
   - [ ] Demo building visible
   - [ ] User can navigate all sections
   - [ ] Same email/password works for manual login

8. **Email Notifications**
   - [ ] Welcome email received
   - [ ] Contains workspace link
   - [ ] Contains credential reminder
   - [ ] Link works

---

## 🚀 4. Deployment Commands

### Initial Setup

```bash
# 1. Generate Django secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# 2. Generate internal API key
openssl rand -base64 32

# 3. Build and start containers
docker compose up -d --build

# 4. Apply shared migrations
docker compose exec backend python manage.py migrate_schemas --shared

# 5. Apply tenant migrations
docker compose exec backend python manage.py migrate_schemas

# 6. Create superuser
docker compose exec backend python manage.py createsuperuser

# 7. Collect static files
docker compose exec backend python manage.py collectstatic --no-input

# 8. Create subscription plans
docker compose exec backend python manage.py shell
>>> from billing.models import SubscriptionPlan
>>> SubscriptionPlan.objects.create(
...     name="Starter",
...     plan_type="starter",
...     monthly_price=29.00,
...     yearly_price=290.00,
...     max_buildings=3,
...     max_users=10,
...     stripe_price_id_monthly="price_test_starter_monthly",
...     stripe_price_id_yearly="price_test_starter_yearly"
... )
```

### Health Checks

```bash
# Check Django system
docker compose exec backend python manage.py check --deploy

# Check database connection
docker compose exec backend python manage.py dbshell

# Check Celery
docker compose exec backend celery -A new_concierge_backend inspect active

# Check Redis
docker compose exec redis redis-cli ping

# View logs
docker compose logs -f backend
docker compose logs -f celery
docker compose logs -f frontend
```

---

## 📊 5. Current Environment Status

### ❌ Issues Found

1. **Email Configuration**
   - `EMAIL_HOST_USER=your-email@gmail.com` ← Placeholder
   - `EMAIL_HOST_PASSWORD=your-app-password-here` ← Placeholder
   - **Impact:** Welcome emails will NOT be sent
   - **Fix:** Configure real SMTP credentials

2. **Stripe Configuration**
   - Not present in `.env` file
   - **Impact:** Defaults to empty strings + mock mode
   - **Fix:** Add Stripe keys (test keys for now)

3. **Secret Keys**
   - May be using default values from settings.py
   - **Impact:** Security vulnerability
   - **Fix:** Generate and configure strong keys

### ✅ Working Configuration

1. **Database**: Using Docker defaults (OK for development)
2. **Redis**: Configured correctly
3. **Celery**: Configured correctly
4. **Allowed Hosts**: Configured for localhost

---

## 📝 6. Recommended .env Template

Create `/home/theo/project/linux_version/backend/.env` with:

```bash
# ================================
# CORE DJANGO SETTINGS
# ================================
DJANGO_SECRET_KEY=<generate-with-command-above>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,*.localhost,yourdomain.com,*.yourdomain.com
ENV=production

# ================================
# DATABASE
# ================================
DB_HOST=db
DB_PORT=5432
DB_NAME=concierge_production_db
DB_USER=concierge_user
DB_PASSWORD=<strong-password>

POSTGRES_DB=concierge_production_db
POSTGRES_USER=concierge_user
POSTGRES_PASSWORD=<same-as-above>
POSTGRES_HOST=db
POSTGRES_PORT=5432

# ================================
# STRIPE (START WITH TEST KEYS)
# ================================
STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXX
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXX
STRIPE_MOCK_MODE=True  # Set False when using real Stripe
STRIPE_CURRENCY=eur

# ================================
# EMAIL (CONFIGURE REAL SMTP)
# ================================
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-real-email@gmail.com
EMAIL_HOST_PASSWORD=xxxx-xxxx-xxxx-xxxx
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# ================================
# FRONTEND
# ================================
FRONTEND_URL=http://localhost:8080

# ================================
# REDIS & CELERY
# ================================
REDIS_HOST=redis
REDIS_PORT=6379
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# ================================
# SECURITY
# ================================
INTERNAL_API_SECRET_KEY=<generate-with-openssl>
CSRF_COOKIE_SAMESITE=Lax
SESSION_COOKIE_SAMESITE=Lax

# ================================
# OPTIONAL INTEGRATIONS
# ================================
GOOGLE_CALENDAR_ENABLED=False
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 🎯 Next Steps

### Immediate (Before Any Testing):

1. ✅ Configure email SMTP (at minimum Gmail for testing)
2. ✅ Add Stripe test keys
3. ✅ Generate and set Django SECRET_KEY
4. ✅ Restart backend: `docker compose restart backend`

### Before Production:

1. ⚠️ Switch to professional SMTP provider (SendGrid, AWS SES, etc.)
2. ⚠️ Switch to Stripe live keys
3. ⚠️ Configure real database passwords
4. ⚠️ Set DEBUG=False
5. ⚠️ Configure SSL/HTTPS
6. ⚠️ Set up monitoring (Sentry, etc.)

---

**Last Updated:** 2025-01-22
**Status:** Development environment with placeholder credentials
**Next Action:** Configure email and Stripe for testing
