#!/bin/bash

# 🏭 Production Environment Setup Script
# This script generates production-ready environment files for both apps

set -e

echo "🏭 Setting up production environment files..."

# Generate secure keys
DJANGO_SECRET_KEY=$(openssl rand -base64 32)
INTERNAL_API_SECRET_KEY=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 16)

echo "🔑 Generated secure keys:"
echo "   DJANGO_SECRET_KEY: $DJANGO_SECRET_KEY"
echo "   INTERNAL_API_SECRET_KEY: $INTERNAL_API_SECRET_KEY"
echo "   DB_PASSWORD: $DB_PASSWORD"

# Core App Production Environment
cat > linux_version/.env.production << EOF
# Django Core App Production Environment

# Django Settings
DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=app.yourdomain.com,*.yourdomain.com,your-server-ip

# Database Configuration
DATABASE_URL=postgresql://newconcierge_user:$DB_PASSWORD@db:5432/newconcierge_prod
POSTGRES_DB=newconcierge_prod
POSTGRES_USER=newconcierge_user
POSTGRES_PASSWORD=$DB_PASSWORD

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# Internal API Security (MUST match Public App)
INTERNAL_API_SECRET_KEY=$INTERNAL_API_SECRET_KEY

# Stripe Configuration (if needed for Core App)
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Security Settings
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
SECURE_CONTENT_TYPE_NOSNIFF=True
SECURE_BROWSER_XSS_FILTER=True
X_FRAME_OPTIONS=DENY

# Logging
LOG_LEVEL=INFO
EOF

# Public App Production Environment
cat > public-app/.env.production << EOF
# Public App Production Environment

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Internal API Configuration (MUST match Core App)
INTERNAL_API_SECRET_KEY=$INTERNAL_API_SECRET_KEY
CORE_API_URL=https://app.yourdomain.com/api/internal/tenants/create/

# App Configuration
NEXT_PUBLIC_APP_NAME=New Concierge
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Error Tracking (optional)
SENTRY_DSN=https://your-sentry-dsn
EOF

echo "✅ Production environment files created:"
echo "   📁 linux_version/.env.production"
echo "   📁 public-app/.env.production"

echo ""
echo "📋 Next steps:"
echo "1. Update Stripe keys in both files"
echo "2. Update domain names (yourdomain.com → your actual domain)"
echo "3. Update server IP in Core App environment"
echo "4. Configure email settings if needed"
echo "5. Copy .env.production to .env on your production server"
echo ""
echo "🔐 IMPORTANT: Keep these keys secure and never commit them to Git!"









