# 🚀 Quick Setup Guide - Ready for Testing in 15 Minutes

Αυτός ο οδηγός σε βοηθά να ρυθμίσεις την εφαρμογή για testing σε 3 απλά βήματα.

---

## ✅ Βήμα 1: Django Secret Keys (2 λεπτά)

### 1.1 Copy τα Generated Keys

```bash
# Django SECRET_KEY (ήδη δημιουργημένο):
DJANGO_SECRET_KEY=6YckP4vk4WwcW1jP-KpwyL4OXThvqA1B1ddzQRAea6jMIjq6tCjnGoaTqV1mTQk30s8

# Internal API Secret (ήδη δημιουργημένο):
INTERNAL_API_SECRET_KEY=1ee9ykmIUySC0+YhnfLswDzkdowcUbns2+pyMpjgd/8=
```

### 1.2 Άνοιξε το `.env` file

```bash
cd /home/theo/project/linux_version/backend
nano .env
# ή
code .env  # Αν χρησιμοποιείς VS Code
```

### 1.3 Πρόσθεσε τα keys

Βρες τις γραμμές που λένε:
```bash
# DJANGO_SECRET_KEY=your-secret-key-here-change-in-production
```

Και αντικατέστησε με:
```bash
DJANGO_SECRET_KEY=6YckP4vk4WwcW1jP-KpwyL4OXThvqA1B1ddzQRAea6jMIjq6tCjnGoaTqV1mTQk30s8
INTERNAL_API_SECRET_KEY=1ee9ykmIUySC0+YhnfLswDzkdowcUbns2+pyMpjgd/8=
```

✅ **Done!** Τα secret keys είναι έτοιμα.

---

## 📧 Βήμα 2: Gmail SMTP Setup (5 λεπτά)

### 2.1 Ενεργοποίησε 2-Step Verification

1. Πήγαινε στο: https://myaccount.google.com/security
2. Scroll down μέχρι "Signing in to Google"
3. Κλικ στο "2-Step Verification"
4. Ακολούθησε τα βήματα για να το ενεργοποιήσεις

### 2.2 Δημιούργησε App Password

1. Πήγαινε στο: https://myaccount.google.com/apppasswords
2. Select app: **"Mail"**
3. Select device: **"Other (Custom name)"**
4. Γράψε: **"New Concierge"**
5. Κλικ **"Generate"**
6. **COPY** το 16-character password που εμφανίζεται (format: `xxxx-xxxx-xxxx-xxxx`)

### 2.3 Ενημέρωσε το `.env`

Βρες τις γραμμές:
```bash
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password-here
```

Αντικατέστησε με τα δικά σου:
```bash
EMAIL_HOST_USER=your-real-email@gmail.com
EMAIL_HOST_PASSWORD=abcd-efgh-ijkl-mnop  # Το 16-char password από το Step 2.2
DEFAULT_FROM_EMAIL=noreply@newconcierge.gr
```

✅ **Done!** Τα emails θα στέλνονται τώρα!

---

## 💳 Βήμα 3: Stripe Test Account (5 λεπτά)

### 3.1 Δημιούργησε Stripe Account (ΔΩΡΕΑΝ)

1. Πήγαινε στο: https://dashboard.stripe.com/register
2. Συμπλήρωσε:
   - Email
   - Password
   - Country: **Greece**
3. Skip όλα τα "Tell us about your business" (κλικ Skip ή Later)
4. Θα μπεις στο Stripe Dashboard

### 3.2 Activate Test Mode

Στο Dashboard, **πάνω δεξιά** θα δεις ένα toggle:
```
🔧 Test mode  |  Live mode
```

✅ Σιγουρέψου ότι είναι στο **"Test mode"** (γκρι/μπλε χρώμα)

### 3.3 Πάρε τα API Keys

1. Από το αριστερό μενού, κλικ **"Developers"**
2. Κλικ **"API keys"**
3. Θα δεις:

```
Publishable key: pk_test_51...
Secret key: sk_test_51... [Reveal test key]
```

4. **Κλικ "Reveal test key"** για να δεις το secret key
5. **COPY** και τα δύο keys

### 3.4 Δημιούργησε Webhook Endpoint

1. Από το αριστερό μενού, κλικ **"Developers"** → **"Webhooks"**
2. Κλικ **"Add endpoint"**
3. Endpoint URL: `http://localhost:8080/api/billing/webhook/stripe/`
4. Events to send:
   - Κλικ **"Select events"**
   - Διάλεξε:
     - ✅ `checkout.session.completed`
     - ✅ `invoice.payment_succeeded`
     - ✅ `invoice.payment_failed`
     - ✅ `customer.subscription.deleted`
     - ✅ `customer.subscription.updated`
5. Κλικ **"Add endpoint"**
6. Θα δεις το **Signing secret**: `whsec_...`
7. **COPY** το signing secret

### 3.5 Ενημέρωσε το `.env`

Πρόσθεσε τα Stripe keys στο `.env`:

```bash
# Stripe Configuration (Test Mode)
STRIPE_PUBLISHABLE_KEY=pk_test_51XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_SECRET_KEY=sk_test_51XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_MOCK_MODE=False  # Disable mock mode - use real Stripe test mode
STRIPE_CURRENCY=eur
```

✅ **Done!** Το Stripe είναι έτοιμο για testing!

---

## 🔄 Βήμα 4: Restart & Test (3 λεπτά)

### 4.1 Save το `.env` file

Πάτησε `Ctrl+S` (ή `Cmd+S` στο Mac) για save

### 4.2 Restart το Backend

```bash
cd /home/theo/project/linux_version
docker compose restart backend
```

Περίμενε ~10 δευτερόλεπτα μέχρι να ξεκινήσει.

### 4.3 Validate Configuration

```bash
python3 check_env.py
```

Θα πρέπει να δεις:
```
✅ Django Secret Key                        Set (6Yck...Qk30s8)
✅ Stripe Publishable Key                   Set (pk_t...)
✅ Stripe Secret Key                        Set (sk_t...)
✅ Stripe Webhook Secret                    Set (whse...)
✅ Email Host User                          your-email@gmail.com
✅ Email Host Password                      Set (abcd...)
```

---

## 🧪 Βήμα 5: Test the Complete Flow!

### 5.1 Ξεκίνα την Εφαρμογή

```bash
docker compose up -d
```

Περίμενε 20-30 δευτερόλεπτα για να ξεκινήσουν όλα τα containers.

### 5.2 Άνοιξε τον Browser

```
http://localhost:8080
```

### 5.3 Complete User Journey Test

#### **Test 1: Signup**
1. Κλικ "Sign Up" ή "Εγγραφή"
2. Συμπλήρωσε:
   - Email: `test-user@example.com`
   - Password: `Test123!@#`
   - First Name: `Test`
   - Last Name: `User`
3. Κλικ "Register"

✅ Θα πρέπει να δεις: "Registration successful"

#### **Test 2: Login**
1. Login με τα credentials που έφτιαξες
2. Θα σε πάει στο payment page

#### **Test 3: Payment (Stripe Test Mode)**
1. Επέλεξε ένα plan (π.χ. "Starter")
2. Κλικ "Subscribe"
3. Θα ανοίξει η Stripe Checkout σελίδα
4. Συμπλήρωσε:
   - **Card number**: `4242 4242 4242 4242` ← Test card που λειτουργεί ΠΑΝΤΑ
   - **Expiry**: Οποιαδήποτε μελλοντική ημερομηνία (π.χ. `12/25`)
   - **CVC**: Οποιοιδήποτε 3 αριθμοί (π.χ. `123`)
   - **Name**: `Test User`
   - **Email**: Το email σου
5. Κλικ "Subscribe" ή "Pay"

✅ Θα πρέπει να δεις: "Payment successful"

#### **Test 4: Success Page & Tenant Creation**
1. Θα σε redirect στο `/payment/success`
2. Θα δεις progress bar: "Ολοκλήρωση Χώρου Εργασίας"
3. Περίμενε 3-10 δευτερόλεπτα
4. Θα δεις: "Ο χώρος εργασίας σας είναι έτοιμος!"

✅ Success! Το tenant δημιουργήθηκε!

#### **Test 5: Auto-Redirect & Auto-Login**
1. Αυτόματα θα γίνει redirect στο: `{subdomain}.localhost:8080/auth/verify?token=...`
2. Το subdomain θα είναι κάτι σαν: `testuser.localhost:8080`
3. Θα δεις: "Verifying your session..."
4. Αυτόματα θα μπεις στο dashboard

✅ Auto-login λειτούργησε!

#### **Test 6: Explore Dashboard**
1. Θα πρέπει να δεις το dashboard
2. Κλικ "Κτίρια" ή "Buildings"
3. Θα δεις το demo building: **"🎓 Demo Building - Αλκμάνος 22"**
4. Κλικ πάνω του
5. Θα δεις 10 demo apartments (Α1, Α2, Α3, Β1, Β2, Β3, Γ1, Γ2, Γ3, Δ1)

✅ Η εφαρμογή λειτουργεί!

#### **Test 7: Check Email**
1. Άνοιξε το Gmail που χρησιμοποίησες
2. Θα έχεις λάβει email με θέμα: **"Ο χώρος εργασίας σας είναι έτοιμος!"**
3. Το email θα περιέχει:
   - Welcome message
   - Link στο tenant workspace
   - Τα credentials σου
   - Next steps

✅ Email delivery λειτουργεί!

#### **Test 8: Manual Login (Verify Password Sync)**
1. Κάνε logout από το tenant
2. Πήγαινε στο login page του tenant: `{subdomain}.localhost:8080/login`
3. Login με:
   - Email: `test-user@example.com`
   - Password: `Test123!@#` (τα ίδια που χρησιμοποίησες στο signup)

✅ Credentials synced σωστά!

---

## 🎉 Success Criteria

Αν όλα τα παραπάνω tests πέρασαν, τότε:

✅ Signup flow works
✅ Payment flow works
✅ Stripe integration works (test mode)
✅ Tenant creation works
✅ Demo building created
✅ Auto-redirect works
✅ Auto-login works
✅ Email delivery works
✅ Password sync works
✅ **ΟΛΑ ΛΕΙΤΟΥΡΓΟΥΝ!** 🎊

---

## 🐛 Troubleshooting

### ❌ "Email sending failed"

**Πρόβλημα**: Το Gmail app password δεν λειτουργεί

**Λύση**:
1. Σιγουρέψου ότι έχεις ενεργοποιήσει 2-Step Verification
2. Δημιούργησε ΝΕΟ app password
3. Copy το password ΑΚΡΙΒΩΣ όπως εμφανίζεται (με τις παύλες)
4. Restart backend: `docker compose restart backend`

### ❌ "Stripe webhook signature verification failed"

**Πρόβλημα**: Το webhook secret δεν είναι σωστό

**Λύση**:
1. Πήγαινε στο Stripe Dashboard → Developers → Webhooks
2. Κλικ στο endpoint που δημιούργησες
3. Copy το "Signing secret" ξανά
4. Ενημέρωσε το `STRIPE_WEBHOOK_SECRET` στο `.env`
5. Restart backend

### ❌ "Tenant creation timeout"

**Πρόβλημα**: Ο webhook δεν έφτασε ή αργεί

**Λύση**:
1. Έλεγξε τα logs: `docker compose logs -f backend`
2. Βρες το error message
3. Συνήθως είναι Stripe webhook issue
4. Use Stripe CLI for local testing: https://stripe.com/docs/stripe-cli

### ❌ "Login fails on tenant domain"

**Πρόβλημα**: Password δεν λειτουργεί

**Λύση**:
1. Αυτό ΔΕΝ θα πρέπει να συμβαίνει πλέον (fixed!)
2. Αν συμβαίνει, report it immediately
3. Temporary workaround: Κάνε password reset

---

## 📊 Your Complete .env File

Αν έχεις ακολουθήσει όλα τα βήματα, το `.env` σου θα πρέπει να μοιάζει με αυτό:

```bash
# ================================
# CORE DJANGO SETTINGS
# ================================
DJANGO_SECRET_KEY=6YckP4vk4WwcW1jP-KpwyL4OXThvqA1B1ddzQRAea6jMIjq6tCjnGoaTqV1mTQk30s8
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,neo.localhost,*.localhost
ENV=development

# ================================
# STRIPE (Test Mode)
# ================================
STRIPE_PUBLISHABLE_KEY=pk_test_51XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_SECRET_KEY=sk_test_51XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_MOCK_MODE=False
STRIPE_CURRENCY=eur

# ================================
# EMAIL (Gmail)
# ================================
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-real-email@gmail.com
EMAIL_HOST_PASSWORD=abcd-efgh-ijkl-mnop
DEFAULT_FROM_EMAIL=noreply@newconcierge.gr

# ================================
# SECURITY
# ================================
INTERNAL_API_SECRET_KEY=1ee9ykmIUySC0+YhnfLswDzkdowcUbns2+pyMpjgd/8=

# ================================
# FRONTEND
# ================================
FRONTEND_URL=http://localhost:8080

# ================================
# DATABASE (Docker defaults - OK for dev)
# ================================
# DB_HOST=db
# DB_PORT=5432
# DB_NAME=concierge_db
# DB_USER=postgres
# DB_PASSWORD=postgres

# ================================
# REDIS & CELERY (Docker defaults)
# ================================
REDIS_HOST=redis
REDIS_PORT=6379
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

---

## 🚀 Next Steps After Testing

Αφού το testing πετύχει:

### For Production Deployment:

1. **Email**: Switch to professional SMTP
   - Recommended: SendGrid, AWS SES, Mailgun
   - Remove Gmail limitations (500 emails/day)

2. **Stripe**: Switch to Live Mode
   - Use `pk_live_` and `sk_live_` keys
   - Update webhook endpoint to production URL
   - Set `STRIPE_MOCK_MODE=False`

3. **Security**:
   - Set `DEBUG=False`
   - Configure SSL/HTTPS
   - Use strong database passwords
   - Set secure cookie flags

4. **Infrastructure**:
   - Set up monitoring (Sentry, etc.)
   - Configure automated backups
   - Set up CDN for static files
   - Scale workers (Gunicorn, Celery)

5. **Domain**:
   - Configure DNS for your domain
   - Set up SSL certificates
   - Update `ALLOWED_HOSTS` and `FRONTEND_URL`

---

**Prepared by**: Claude Code
**Date**: 2025-01-22
**Status**: Ready for Testing
**Estimated Setup Time**: 15 minutes
