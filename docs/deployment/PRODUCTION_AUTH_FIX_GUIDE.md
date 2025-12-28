# 🚨 Production Authentication Fix Guide

## 🔍 **Προβλήματα που εντοπίστηκαν:**

1. **Λείπουν Google OAuth ρυθμίσεις στο production**
2. **Public App δεν έχει authentication functionality**
3. **Railway/Vercel environment variables δεν είναι configured**
4. **Google OAuth redirect URIs δεν είναι configured για production domains**

---

## 🛠️ **Λύσεις - Βήμα προς Βήμα:**

### **Βήμα 1: Google Cloud Console Setup**

1. **Πήγαινε στο**: https://console.cloud.google.com/
2. **Δημιούργησε νέο project**: "New Concierge Production"
3. **Enable Google Calendar API**: APIs & Services → Library → "Google Calendar API" → Enable

### **Βήμα 2: OAuth 2.0 Credentials**

1. **OAuth Consent Screen**:
   ```
   APIs & Services → OAuth consent screen
   User Type: External
   App name: "New Concierge Building Management"
   User support email: [το email σου]
   Developer contact information: [το email σου]
   ```

2. **Create OAuth Client**:
   ```
   APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs
   Application type: Web application
   Name: "New Concierge Production Client"
   Authorized redirect URIs:
   - https://linuxversion-production.up.railway.app/auth/google/callback
   - https://linux-version-eyqhu8qtl-theo-stams-projects.vercel.app/auth/google/callback
   ```

### **Βήμα 3: Railway Environment Variables**

Πρόσθεσε στο **Railway Backend Service** → **Variables**:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=[SET_FROM_GOOGLE_CLOUD_CONSOLE]
GOOGLE_CLIENT_SECRET=[SET_FROM_GOOGLE_CLOUD_CONSOLE]
GOOGLE_REDIRECT_URI=https://linux-version-eyqhu8qtl-theo-stams-projects.vercel.app/auth/google/callback
GOOGLE_CALENDAR_ENABLED=True
GOOGLE_ADMIN_EMAIL=your-email@gmail.com

# Production URLs
FRONTEND_URL=https://linux-version-eyqhu8qtl-theo-stams-projects.vercel.app
CORE_API_URL=https://linuxversion-production.up.railway.app/api

# Database & Redis (Railway auto-populates)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Django Security
DEBUG=False
DJANGO_SECRET_KEY=your-super-secure-secret-key-50-chars-min
ALLOWED_HOSTS=.railway.app,linuxversion-production.up.railway.app
CORS_ALLOWED_ORIGINS=https://linux-version-eyqhu8qtl-theo-stams-projects.vercel.app,https://yourdomain.com

# Stripe (Production Keys!)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MOCK_MODE=False

# Internal API
INTERNAL_API_SECRET_KEY=your-internal-api-secret-key
```

### **Βήμα 4: Vercel Environment Variables**

Πρόσθεσε στο **Vercel Dashboard** → **Settings** → **Environment Variables**:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Internal API Configuration
INTERNAL_API_SECRET_KEY=your-internal-api-secret-key
CORE_API_URL=https://linuxversion-production.up.railway.app/api/tenants/internal/create/

# App Configuration
NEXT_PUBLIC_APP_NAME=New Concierge
NEXT_PUBLIC_APP_URL=https://linux-version-m7tbbfn9d-theo-stams-projects.vercel.app
NEXT_PUBLIC_APP_URL_CUSTOM=https://linux-version.vercel.app
NEXT_PUBLIC_API_URL=https://linuxversion-production.up.railway.app/api
NEXT_PUBLIC_DEFAULT_API_URL=https://linuxversion-production.up.railway.app/api

# Google OAuth (if needed for frontend)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=[SET_FROM_GOOGLE_CLOUD_CONSOLE]
```

### **Βήμα 5: Update Production Environment File**

Το `env.production` έχει ήδη ενημερωθεί με τα απαραίτητα Google OAuth variables.

### **Βήμα 6: Test Authentication Flow**

1. **Deploy στο Railway** με τα νέα environment variables
2. **Deploy στο Vercel** με τα νέα environment variables
3. **Test Google OAuth**:
   - Πήγαινε στο: `https://your-railway-domain.railway.app/admin/`
   - Δοκίμασε Google Calendar connection
   - Ελέγξε τα logs για errors

### **Βήμα 7: Verify Production Setup**

```bash
# Test Railway Backend
curl -I https://linuxversion-production.up.railway.app/health/
curl -I https://linuxversion-production.up.railway.app/api/

# Test Vercel Frontend
curl -I https://linux-version-eyqhu8qtl-theo-stams-projects.vercel.app/
curl -I https://linux-version-eyqhu8qtl-theo-stams-projects.vercel.app/signup
```

---

## 🚨 **Κρίσιμα Σημεία:**

1. **Google OAuth redirect URIs** πρέπει να ταιριάζουν ακριβώς με τα production domains
2. **Environment variables** πρέπει να είναι ίδια μεταξύ Railway και Vercel
3. **Stripe webhook URL** πρέπει να δείχνει στο Railway backend
4. **CORS settings** πρέπει να επιτρέπουν το Vercel domain

---

## 🔧 **Troubleshooting:**

### **Πρόβλημα: Google OAuth Error 400**
**Λύση**: Ελέγξε τα redirect URIs στο Google Cloud Console

### **Πρόβλημα: CORS errors**
**Λύση**: Πρόσθεσε το Vercel domain στο `CORS_ALLOWED_ORIGINS`

### **Πρόβλημα: Internal API 403**
**Λύση**: Ελέγξε ότι το `INTERNAL_API_SECRET_KEY` είναι ίδιο και στα δύο

### **Πρόβλημα: Stripe webhook fails**
**Λύση**: Ενημέρωσε το webhook URL στο Stripe Dashboard

---

## ✅ **Checklist:**

- [x] Google Cloud Console project created
- [x] Google Calendar API enabled
- [x] OAuth 2.0 credentials created
- [x] Redirect URIs configured for production domains
- [x] Railway environment variables set
- [x] Vercel environment variables set
- [ ] Stripe webhook URL updated
- [x] CORS settings configured (Django updated to read from environment)
- [x] Production deployment tested
- [ ] Authentication flow verified

---

**🎉 Μετά από αυτές τις αλλαγές, το authentication θα πρέπει να λειτουργεί στο production!**
