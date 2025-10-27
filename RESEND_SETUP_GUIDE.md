# Resend Email Setup Guide

## Environment Variables Required

Add these environment variables to your Railway project:

### Required Variables
```bash
# Resend API Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev

# Email Backend (optional - defaults to ResendEmailBackend)
EMAIL_BACKEND=users.email_backends.ResendEmailBackend
```

**Note**: `onboarding@resend.dev` is Resend's test domain that works immediately without domain verification. For production, replace with your verified domain.

### How to Get Resend API Key

1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Sign up/Login to your account
3. Create a new API key
4. Copy the API key (starts with `re_`)

### Domain Setup (For Production)

**For testing/development**: The default `onboarding@resend.dev` works without verification.

**For production**, you should use your own verified domain:

1. Go to [Resend Domains](https://resend.com/domains)
2. Add your domain (e.g., `newconcierge.gr`)
3. Add the required DNS records:
   - TXT record for domain verification
   - CNAME record for DKIM
4. Wait for verification (usually 5-10 minutes)
5. Update `RESEND_FROM_EMAIL` to use your domain: `noreply@newconcierge.gr`

### Testing

Run the test script to verify configuration:

```bash
cd /home/theo/project/linux_version/backend
python test_resend_email.py
```

## Current Configuration

- **Email Backend**: `users.email_backends.ResendEmailBackend`
- **Default From**: `noreply@newconcierge.gr`
- **API Endpoint**: `https://api.resend.com/emails`

## Troubleshooting

### Common Issues

1. **"RESEND_API_KEY not configured"**
   - Check that `RESEND_API_KEY` is set in Railway environment variables
   - Restart the service after adding the variable

2. **"Sender not verified"**
   - Verify your domain in Resend dashboard
   - Check that `RESEND_FROM_EMAIL` matches your verified domain

3. **"Invalid API key"**
   - Verify the API key is correct
   - Check that the key is active (not expired)

### Logs

Check Railway logs for email sending errors:
- Look for "Email sent successfully via Resend API"
- Check for "Resend API error" messages
- Verify API key and domain configuration

## Email Templates

The system uses Django's email system with Resend backend:
- Verification emails: `users/email_templates/verification.html`
- Welcome emails: `users/email_templates/welcome.html`
- Password reset: `users/email_templates/password_reset.html`
