# 🔧 Railway Environment Variables Configuration

## ✅ Προτεινόμενη Configuration για MailerSend

```bash
# Email Configuration
EMAIL_BACKEND="users.mailersend_backend.MailerSendEmailBackend"
DEFAULT_FROM_EMAIL="noreply@newconcierge.app"  # ⚠️ IMPORTANT: Must match verified domain
MAILERSEND_API_KEY="mlsn.xxxxxxxxxxxxx"
MAILERSEND_FROM_EMAIL="noreply@newconcierge.app"  # ⚠️ No spaces before variable name

# Frontend
FRONTEND_URL="https://newconcierge.app"

# Security
DJANGO_SECRET_KEY="your-secret-key-here"
DJANGO_DEBUG="False"
DJANGO_ALLOWED_HOSTS=".railway.app,localhost,linuxversion-production.up.railway.app,newconcierge.app,.newconcierge.app,linux-version.vercel.app"

# CORS
CORS_ALLOWED_ORIGINS="https://newconcierge.app,https://*.newconcierge.app,https://linux-version.vercel.app,https://*.vercel.app"

# CSRF
CSRF_ORIGINS=".railway.app,localhost,linuxversion-production.up.railway.app,newconcierge.app,*.newconcierge.app,linux-version.vercel.app,*.vercel.app"

# Railway
RAILWAY_PUBLIC_DOMAIN="linuxversion-production.up.railway.app"

# Database
DATABASE_URL="${{Postgres.DATABASE_URL}}"

# Redis
REDIS_URL="redis://:password@redis.railway.internal:6379/0"

# Stripe
STRIPE_SECRET_KEY="sk_test_xxxxx"
STRIPE_PUBLISHABLE_KEY="pk_test_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"

# Google OAuth
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"
GOOGLE_REDIRECT_URI="https://newconcierge.app/auth/callback"
GOOGLE_ADMIN_EMAIL="theostam1966@gmail.com"

# Database Cleanup
CLEANUP_DATABASE="true"
```

## ⚠️ Προβλήματα που εντοπίστηκαν

### 1. DEFAULT_FROM_EMAIL points to Resend domain
**Current:** `DEFAULT_FROM_EMAIL="onboarding@resend.dev"`  
**Problem:** Αυτό είναι Resend test domain, όχι MailerSend verified domain  
**Solution:** Αλλάξτε σε `DEFAULT_FROM_EMAIL="noreply@newconcierge.app"`

### 2. Space before MAILERSEND_FROM_EMAIL
**Current:** ` MAILERSEND_FROM_EMAIL="noreply@newconcierge.app"`  
**Problem:** Το space πριν από το variable name μπορεί να προκαλέσει parsing issues  
**Solution:** Αφαιρέστε το space: `MAILERSEND_FROM_EMAIL="noreply@newconcierge.app"`

### 3. Inconsistency between DEFAULT_FROM_EMAIL and MAILERSEND_FROM_EMAIL
**Problem:** Δύο διαφορετικά from emails μπορούν να προκαλέσουν σύγχυση  
**Solution:** Χρησιμοποιήστε το ίδιο email και για τα δύο: `noreply@newconcierge.app`

## 🔍 Verification Checklist

### MailerSend Dashboard:
- ✅ Domain `newconcierge.app` is verified
- ✅ API token is active
- ✅ Email stats show: Sent = Delivered (0 rejected)

### Railway Environment Variables:
- ✅ `EMAIL_BACKEND="users.mailersend_backend.MailerSendEmailBackend"`
- ✅ `DEFAULT_FROM_EMAIL="noreply@newconcierge.app"` (not `onboarding@resend.dev`)
- ✅ `MAILERSEND_FROM_EMAIL="noreply@newconcierge.app"` (no spaces before)
- ✅ `MAILERSEND_API_KEY="mlsn.xxxxx"` (valid API key)

### Code Configuration:
- ✅ `EmailService` χρησιμοποιεί `MAILERSEND_FROM_EMAIL` αν είναι διαθέσιμο
- ✅ `MailerSendEmailBackend` χρησιμοποιεί verified domain email
- ✅ Logging ενεργό για debugging

## 📋 Steps to Fix

1. **Στο Railway Dashboard:**
   - Go to your service → Variables
   - Αλλάξτε `DEFAULT_FROM_EMAIL` από `onboarding@resend.dev` σε `noreply@newconcierge.app`
   - Αφαιρέστε το space πριν από `MAILERSEND_FROM_EMAIL`
   - Save και redeploy

2. **Verify:**
   - Check logs μετά το deploy: `MailerSend backend initialized with from_email: noreply@newconcierge.app`
   - Test registration flow
   - Check MailerSend dashboard για delivery

3. **Monitor:**
   - Παρακολουθήστε logs για email sending
   - Ελέγξτε MailerSend dashboard για delivery rates
   - Test με πραγματικό email address

## 🔐 Security Notes

- ⚠️ **Never commit API keys** στο git
- ✅ Χρησιμοποιήστε Railway secrets για sensitive data
- ✅ Rotate API keys περιοδικά
- ✅ Monitor για suspicious activity στο MailerSend dashboard

## 📊 Expected Logs After Fix

```
INFO: MailerSend backend initialized with from_email: noreply@newconcierge.app
INFO: ✅ Email sent successfully via MailerSend to ['user@example.com']
INFO:    Message ID: xxxxx
INFO:    From: noreply@newconcierge.app
INFO:    Subject: [New Concierge] Επιβεβαίωση Email
```

## 🐛 Troubleshooting

### Emails not sending:
1. Check `MAILERSEND_API_KEY` is valid
2. Verify domain is verified στο MailerSend dashboard
3. Check logs για errors
4. Verify `MAILERSEND_FROM_EMAIL` matches verified domain

### Emails going to spam:
1. Verify SPF/DKIM records για `newconcierge.app`
2. Check MailerSend delivery stats
3. Ensure verified domain email is used

### API errors:
1. Check API key permissions
2. Verify API key hasn't expired
3. Check MailerSend API status page

