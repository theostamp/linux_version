# ✅ Ready for Testing - Configuration Summary

## 🎉 Τι Έχει Γίνει

### ✅ Completed Automatically:
1. ✅ **Django SECRET_KEY** - Generated and configured
2. ✅ **INTERNAL_API_SECRET_KEY** - Already configured
3. ✅ **Stripe Keys** - Test mode keys already configured
4. ✅ **STRIPE_MOCK_MODE** - Set to `False` (using real Stripe test mode)
5. ✅ **FRONTEND_URL** - Configured for localhost
6. ✅ **Database** - Using Docker defaults (OK for dev)

### ⏳ Needs Manual Configuration (2 steps):

#### 1️⃣ Email SMTP (5 minutes) - REQUIRED for welcome emails

#### 2️⃣ Stripe Webhook Secret (2 minutes) - REQUIRED for payments

---

## 📧 Step 1: Configure Gmail SMTP (5 minutes)

### Option A: Use Your Gmail Account (Recommended for Testing)

1. **Enable 2-Step Verification**
   - Go to: https://myaccount.google.com/security
   - Find "Signing in to Google"
   - Click "2-Step Verification"
   - Follow the setup wizard

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: **"Mail"**
   - Select device: **"Other (Custom name)"** → Type "New Concierge"
   - Click **"Generate"**
   - **COPY** the 16-character password (format: `xxxx-xxxx-xxxx-xxxx`)

3. **Update .env File**

   Edit: `/home/theo/project/linux_version/.env`

   Find:
   ```bash
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-app-password-here
   ```

   Replace with:
   ```bash
   EMAIL_HOST_USER=your-real-email@gmail.com
   EMAIL_HOST_PASSWORD=abcd-efgh-ijkl-mnop  # Your 16-char app password
   ```

### Option B: Skip Email for Now (Mock Mode)

If you want to test without email:

Edit: `/home/theo/project/linux_version/.env`

Add:
```bash
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

This will print emails to console instead of sending them.

---

## 💳 Step 2: Update Stripe Webhook Secret (2 minutes)

Your Stripe test keys are already configured! You just need to:

### Option A: Create Real Webhook (Recommended)

1. **Go to Stripe Dashboard**
   - Login at: https://dashboard.stripe.com/
   - Make sure you're in **Test Mode** (toggle at top right)

2. **Create Webhook Endpoint**
   - Go to: Developers → Webhooks
   - Click **"Add endpoint"**
   - Endpoint URL: `http://localhost:8080/api/billing/webhook/stripe/`
   - Select events:
     - ✅ `checkout.session.completed`
     - ✅ `invoice.payment_succeeded`
     - ✅ `invoice.payment_failed`
     - ✅ `customer.subscription.deleted`
     - ✅ `customer.subscription.updated`
   - Click **"Add endpoint"**

3. **Copy Webhook Secret**
   - You'll see: **Signing secret**: `whsec_...`
   - Click **"Reveal"** and copy the full secret

4. **Update .env**

   Edit: `/home/theo/project/linux_version/.env`

   Find:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_test_1234567890abcdef
   ```

   Replace with:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXX  # Your real webhook secret
   ```

### Option B: Keep Mock Webhook (For Quick Testing)

The current webhook secret `whsec_test_1234567890abcdef` is a mock value.

If you want to test quickly without webhooks:

Edit: `/home/theo/project/linux_version/.env`

Change:
```bash
STRIPE_MOCK_MODE=False
```

To:
```bash
STRIPE_MOCK_MODE=True  # This bypasses real Stripe calls
```

⚠️ **Note**: With mock mode, tenant creation happens immediately without waiting for Stripe webhook.

---

## 🚀 Step 3: Start Testing! (30 seconds)

After configuring email + webhook:

```bash
# 1. Restart backend to load new .env
cd /home/theo/project/linux_version
docker compose restart backend

# 2. Wait 10 seconds for backend to start

# 3. Open browser
# http://localhost:8080

# 4. Test complete flow:
# - Signup
# - Login
# - Payment (use test card: 4242 4242 4242 4242)
# - Wait for tenant creation
# - Auto-redirect to tenant domain
# - Check email for welcome message
```

---

## 📊 Current Configuration Status

### ✅ Ready (No action needed):
- Django SECRET_KEY: `6Yck...Qk30s8` ✅
- Stripe Publishable Key: `pk_test_51PMuwq...` ✅
- Stripe Secret Key: `sk_test_51PMuwq...` ✅
- Internal API Secret: `Pf2i...62Y=` ✅
- Database: PostgreSQL (Docker) ✅
- Frontend URL: `http://localhost:8080` ✅

### ⏳ Needs Configuration:
- Email SMTP: `your-email@gmail.com` ← **Configure this**
- Stripe Webhook: `whsec_test_1234567890abcdef` ← **Or use mock mode**

---

## 🧪 Test Cards (Stripe Test Mode)

When testing payment:

| Card Number | Result | Use Case |
|-------------|--------|----------|
| `4242 4242 4242 4242` | ✅ Success | Normal successful payment |
| `4000 0000 0000 0002` | ❌ Decline | Card declined |
| `4000 0027 6000 3184` | 🔐 3D Secure | Requires authentication |

All test cards:
- Expiry: Any future date (e.g., `12/25`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

---

## 📝 Quick Reference

### Files Modified:
- ✅ `.env` - Updated with Django SECRET_KEY, email placeholders, STRIPE_MOCK_MODE

### Files Created:
- ✅ `SETUP_GUIDE.md` - Detailed setup instructions
- ✅ `PRODUCTION_CHECKLIST.md` - Production deployment guide
- ✅ `check_env.py` - Environment validator script
- ✅ `READY_TO_TEST.md` - This file

### Next Actions:
1. Configure email SMTP (5 min)
2. Configure Stripe webhook OR enable mock mode (2 min)
3. Restart backend: `docker compose restart backend`
4. Test complete flow!

---

## 🎯 Success Criteria

After testing, you should see:

✅ User can signup and login
✅ Payment page loads with Stripe checkout
✅ Test card payment succeeds
✅ Success page shows "Ο χώρος εργασίας σας είναι έτοιμος!"
✅ Auto-redirect to tenant domain: `{subdomain}.localhost:8080`
✅ Auto-login works (no need to login again)
✅ Dashboard shows demo building "Αλκμάνος 22"
✅ Email received with workspace link (if SMTP configured)
✅ Manual login works with same credentials

---

## 🐛 Troubleshooting

### Backend not starting?

```bash
# Check logs
docker compose logs -f backend

# Common issues:
# - Missing migrations: docker compose exec backend python manage.py migrate_schemas --shared
# - Database not ready: wait 30 seconds and try again
```

### Email not sending?

```bash
# Test email configuration
docker compose exec backend python manage.py shell

>>> from users.services import EmailService
>>> from users.models import CustomUser
>>> user = CustomUser.objects.first()
>>> EmailService.send_workspace_welcome_email(user, 'demo.localhost')

# Check for errors in output
```

### Stripe webhook failing?

**Option 1**: Use Stripe CLI for local testing
```bash
stripe listen --forward-to localhost:8080/api/billing/webhook/stripe/
```

**Option 2**: Enable mock mode
```bash
# In .env:
STRIPE_MOCK_MODE=True
```

---

## 💡 Tips

1. **Gmail App Password**: Make sure you copy it with the dashes removed
2. **Stripe Test Mode**: Always use test mode keys (they start with `pk_test_` and `sk_test_`)
3. **Webhook Testing**: For local development, Stripe CLI is easiest
4. **Mock Mode**: Great for quick testing without external dependencies

---

**Status**: ⏳ Waiting for email + webhook configuration
**Estimated Time to Complete**: 7 minutes
**Then Ready For**: Full end-to-end testing!

---

_Last Updated: 2025-01-22_
_Files: .env configured, SETUP_GUIDE.md created_
