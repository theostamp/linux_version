# Email Configuration Guide

## Overview

The New Concierge system uses email notifications to send common expenses sheets and announcements to building residents. This guide shows you how to configure email sending.

## Quick Setup (Gmail - Recommended for Testing)

### Step 1: Enable 2-Step Verification

1. Go to your Google Account: https://myaccount.google.com/security
2. Under "Signing in to Google", click on "2-Step Verification"
3. Follow the prompts to enable it

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)**
4. Enter name: **New Concierge**
5. Click **Generate**
6. Copy the **16-character password** (format: `xxxx-xxxx-xxxx-xxxx`)

### Step 3: Configure Backend

Edit `backend/.env`:

```env
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Your app password from step 2
DEFAULT_FROM_EMAIL=noreply@newconcierge.gr
```

### Step 4: Restart Backend

```bash
docker restart linux_version-backend-1
```

### Step 5: Test Email Sending

1. Login to the system
2. Go to **Financial** → **Φύλλο Κοινοχρήστων**
3. Create a common expenses sheet
4. Go to **Export** tab
5. Click **"Αποστολή Email"** button
6. Check your email inbox for the JPG attachment

## Alternative: Custom SMTP Server (Production)

For production deployments, you may want to use a dedicated email service:

### Option A: SendGrid

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your-sendgrid-api-key
DEFAULT_FROM_EMAIL=noreply@yourbuilding.com
```

### Option B: AWS SES

```env
EMAIL_HOST=email-smtp.eu-west-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-aws-access-key-id
EMAIL_HOST_PASSWORD=your-aws-secret-access-key
DEFAULT_FROM_EMAIL=noreply@yourbuilding.com
```

### Option C: Mailgun

```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=postmaster@yourdomain.mailgun.org
EMAIL_HOST_PASSWORD=your-mailgun-smtp-password
DEFAULT_FROM_EMAIL=noreply@yourbuilding.com
```

## Email Features

### Common Expenses Notification

**What it does:**
- Generates JPG of common expenses sheet
- Sends email to all apartment owners
- Includes JPG as attachment
- Tracks delivery success/failure

**How to use:**
1. Create common expenses sheet in calculator
2. Go to Export tab
3. Click "Αποστολή Email"
4. System shows delivery statistics

**Email includes:**
- Subject: "Λογαριασμός Κοινοχρήστων [Month/Year]"
- Body: Professional Greek message with due date
- Attachment: High-quality JPG of expense sheet

### Future Automated Notifications

The system is designed to support:
- ✅ Common expenses notifications (implemented)
- 🔄 Announcement notifications (planned)
- 🔄 Vote/poll notifications (planned)
- 🔄 Maintenance task notifications (planned)
- 🔄 Payment confirmations (planned)

## Troubleshooting

### Email not sending

**Check 1: Backend logs**
```bash
docker logs linux_version-backend-1 --tail 50
```

**Check 2: Environment variables loaded**
```bash
docker exec linux_version-backend-1 python -c "import os; print('EMAIL_HOST_USER:', os.getenv('EMAIL_HOST_USER'))"
```

**Check 3: Test SMTP connection**
```bash
docker exec linux_version-backend-1 python manage.py shell
```

Then in Python shell:
```python
from django.core.mail import send_mail

send_mail(
    'Test Email',
    'This is a test email from New Concierge.',
    'noreply@newconcierge.gr',
    ['your-email@gmail.com'],
    fail_silently=False,
)
```

### Gmail "Less secure app access" error

**Solution:** Use App Password (not your regular password)
- Gmail no longer supports "less secure apps"
- You MUST use an App Password generated from Google Account settings

### Emails going to spam

**Solution:**
1. Add `noreply@newconcierge.gr` to your contacts
2. For production, use a custom domain with SPF/DKIM records

### Rate limiting (too many emails)

**Gmail limits:**
- Free Gmail: 500 emails/day
- Google Workspace: 2,000 emails/day

**Solution for large buildings:**
- Use dedicated email service (SendGrid, AWS SES)
- Implement batch sending with delays

## Security Best Practices

### Development
- ✅ Use `.env` file (not committed to git)
- ✅ Use App Passwords (not account passwords)
- ✅ Rotate passwords regularly

### Production
- ✅ Use dedicated SMTP service
- ✅ Use environment variables (not `.env` files)
- ✅ Enable TLS/SSL
- ✅ Monitor sending quotas
- ✅ Implement rate limiting
- ✅ Add SPF/DKIM/DMARC records

## Support

For issues or questions:
- Check Django logs: `docker logs linux_version-backend-1`
- Check email service dashboard (Gmail, SendGrid, etc.)
- Review backend settings: `backend/new_concierge_backend/settings.py`
