# Railway Environment Variables Setup

## Required Environment Variables for Backend

### Stripe Configuration
```env
STRIPE_SECRET_KEY=sk_test_51... (ή sk_live_ για production)
STRIPE_PUBLISHABLE_KEY=pk_test_51... (ή pk_live_ για production)
STRIPE_WEBHOOK_SECRET=whsec_... (από Stripe Dashboard)
STRIPE_CURRENCY=eur
```

### Django Configuration
```env
DJANGO_ALLOWED_HOSTS=linuxversion-production.up.railway.app,linux-version.vercel.app
CORS_ALLOWED_ORIGINS=https://linux-version.vercel.app,https://*.vercel.app
CSRF_TRUSTED_ORIGINS=https://linux-version.vercel.app,https://*.vercel.app
FRONTEND_URL=https://linux-version.vercel.app
```

### Email Configuration (για tenant welcome emails)
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=New Concierge <noreply@newconcierge.gr>
```

### Internal API Security
```env
INTERNAL_API_SECRET_KEY=<generate-random-32-char-secret>
```

### Database (Railway auto-provides)
```env
DATABASE_URL=postgresql://... (auto-provided by Railway)
```

## Setup Instructions

### 1. Access Railway Dashboard
- Go to https://railway.app
- Navigate to your project
- Click on your backend service

### 2. Add Environment Variables
- Go to "Variables" tab
- Add each variable from the list above
- Click "Deploy" after adding all variables

### 3. Generate Internal API Secret
```bash
# Generate a secure random key
openssl rand -hex 32
```

### 4. Email Setup (Gmail)
1. Enable 2-factor authentication on Gmail
2. Generate App Password: Google Account → Security → App passwords
3. Use the app password (not your regular password)

## Verification Steps

### 1. Check Environment Variables
```bash
# In Railway logs, you should see:
echo "Environment variables loaded successfully"
```

### 2. Test Database Connection
```bash
# Railway should show successful database connection
```

### 3. Test Email Configuration
```bash
# Check Railway logs for email backend initialization
```

## Production vs Development

### Development (Local)
```env
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
```

### Production (Railway + Vercel)
```env
FRONTEND_URL=https://linux-version.vercel.app
CORS_ALLOWED_ORIGINS=https://linux-version.vercel.app,https://*.vercel.app
CSRF_TRUSTED_ORIGINS=https://linux-version.vercel.app,https://*.vercel.app
```

## Security Notes

1. **Never commit secrets to git**
2. **Use different keys for test/production**
3. **Rotate keys regularly**
4. **Monitor Railway logs for any security issues**

## Troubleshooting

### Common Issues
1. **CORS errors**: Check CORS_ALLOWED_ORIGINS
2. **CSRF errors**: Check CSRF_TRUSTED_ORIGINS
3. **Email not sending**: Check EMAIL_HOST_PASSWORD (use app password)
4. **Webhook signature errors**: Check STRIPE_WEBHOOK_SECRET

### Debug Commands
```bash
# Check if environment variables are loaded
python manage.py shell
>>> from django.conf import settings
>>> print(settings.STRIPE_SECRET_KEY[:10] + "...")
```
