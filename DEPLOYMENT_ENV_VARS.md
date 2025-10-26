# Environment Variables για Deployment

Αυτό το έγγραφο περιγράφει τα απαραίτητα environment variables για το deployment στο Railway (Backend) και Vercel (Frontend).

## 🚂 Railway - Backend Environment Variables

### Υποχρεωτικά Variables

```bash
# Django Core
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=False

# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# Allowed Hosts (comma-separated)
DJANGO_ALLOWED_HOSTS=linuxversion-production.up.railway.app,linux-version.vercel.app

# CORS Origins (comma-separated)
CORS_ALLOWED_ORIGINS=https://linux-version.vercel.app,https://*.vercel.app

# CSRF Trusted Origins (comma-separated, no protocol)
CSRF_ORIGINS=linuxversion-production.up.railway.app,linux-version.vercel.app,*.vercel.app
```

### Προαιρετικά Variables

```bash
# Google OAuth (για Google Sign-In)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://linux-version.vercel.app/auth/callback

# Email Configuration (αν χρησιμοποιείται SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Redis (για caching και Celery)
REDIS_HOST=redis-host
REDIS_PORT=6379
```

### Notes για Railway

1. **DATABASE_URL**: Το Railway το δημιουργεί αυτόματα όταν προσθέτετε PostgreSQL service
2. **DJANGO_ALLOWED_HOSTS**: Πρέπει να περιλαμβάνει και το Railway domain και το Vercel domain
3. **CORS_ALLOWED_ORIGINS**: Χρειάζεται wildcard για Vercel preview deployments
4. **CSRF_ORIGINS**: Χωρίς `http://` ή `https://` - το Django τα προσθέτει αυτόματα

## ▲ Vercel - Frontend Environment Variables

### Υποχρεωτικά Variables

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://linuxversion-production.up.railway.app/api
API_URL=https://linuxversion-production.up.railway.app/api
```

### Προαιρετικά Variables

```bash
# Stripe (για payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Notes για Vercel

1. **NEXT_PUBLIC_API_URL**: Χρησιμοποιείται για client-side API calls
2. **API_URL**: Χρησιμοποιείται για server-side API calls
3. **Προσοχή**: Οι variables που αρχίζουν με `NEXT_PUBLIC_` είναι accessible από το browser

## 🔍 Verification Steps

### 1. Ελέγχουμε τα Health Endpoints

```bash
# Βασικό health check
curl https://linuxversion-production.up.railway.app/api/health/

# Database check
curl https://linuxversion-production.up.railway.app/api/health/db/

# OAuth check
curl https://linuxversion-production.up.railway.app/api/health/oauth/

# Schema check
curl https://linuxversion-production.up.railway.app/api/health/schema/
```

### 2. Ελέγχουμε Registration

```bash
curl -X POST https://linux-version.vercel.app/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "password": "Test123!@#",
    "password_confirm": "Test123!@#"
  }'
```

### 3. Ελέγχουμε τα Logs

Στο Railway dashboard, ελέγξτε τα logs για:
- `[REGISTER]` messages - για schema logging
- `[HEALTH]` messages - για health checks
- CORS errors
- Database connection errors

## 🚨 Troubleshooting

### Πρόβλημα: 500 error στο /api/users/register/

**Δυνατές αιτίες:**
- Database migrations δεν έχουν τρέξει: `python manage.py migrate_schemas --shared`
- DJANGO_SECRET_KEY missing ή invalid
- Database connection issue

**Λύση:**
```bash
# Στο Railway, εκτελέστε:
python manage.py migrate_schemas --shared
python manage.py migrate
```

### Πρόβλημα: CORS errors στο frontend

**Δυνατές αιτίες:**
- CORS_ALLOWED_ORIGINS δεν περιλαμβάνει το Vercel domain
- CSRF_TRUSTED_ORIGINS missing ή λάθος format

**Λύση:**
- Ενημερώστε `CORS_ALLOWED_ORIGINS` με το exact Vercel domain
- Προσθέστε wildcard pattern για preview deployments

### Πρόβλημα: Users δημιουργούνται σε λάθος schema

**Δυνατές αιτίες:**
- Middleware configuration issue
- schema_context δεν λειτουργεί σωστά

**Λύση:**
- Ελέγξτε τα logs για `[REGISTER]` messages
- Χρησιμοποιήστε `/api/health/schema/` για έλεγχο active schema

## 📊 Environment Checklist

### Railway Variables ✓
- [ ] DJANGO_SECRET_KEY
- [ ] DJANGO_DEBUG=False
- [ ] DATABASE_URL
- [ ] DJANGO_ALLOWED_HOSTS
- [ ] CORS_ALLOWED_ORIGINS
- [ ] CSRF_ORIGINS
- [ ] GOOGLE_CLIENT_ID (optional)
- [ ] GOOGLE_CLIENT_SECRET (optional)

### Vercel Variables ✓
- [ ] NEXT_PUBLIC_API_URL
- [ ] API_URL

### Migrations ✓
- [ ] `migrate_schemas --shared` executed
- [ ] `migrate` executed

### Health Checks ✓
- [ ] /api/health/ returns 200
- [ ] /api/health/db/ returns connected
- [ ] /api/health/schema/ shows "public"
- [ ] /api/health/oauth/ returns configured (if OAuth vars set)

## 📝 Notes

- Όλα τα passwords και secrets πρέπει να είναι strong και unguessable
- Μην commit-άρετε τα .env files στο git
- Χρησιμοποιήστε different secrets για development και production
- Regular security audits για environment variables
