#!/bin/bash

# 🌐 Public App Production Deployment Script
# Usage: ./deploy-public-app.sh [vercel-token] [core-api-url]

set -e

VERCEL_TOKEN=${1:-""}
CORE_API_URL=${2:-"https://app.yourdomain.com/api/internal/tenants/create/"}

echo "🌐 Deploying Public App to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Navigate to public-app directory
cd public-app

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "Please create .env.local with your production environment variables"
    exit 1
fi

# Read environment variables from .env.local
source .env.local

# Validate required environment variables
if [ -z "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ] || [ -z "$STRIPE_SECRET_KEY" ] || [ -z "$INTERNAL_API_SECRET_KEY" ]; then
    echo "❌ Missing required environment variables in .env.local"
    echo "Required: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, INTERNAL_API_SECRET_KEY"
    exit 1
fi

# Update CORE_API_URL in .env.local
sed -i "s|CORE_API_URL=.*|CORE_API_URL=$CORE_API_URL|" .env.local

echo "🔧 Environment variables configured:"
echo "   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:0:20}..."
echo "   STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:0:20}..."
echo "   INTERNAL_API_SECRET_KEY: ${INTERNAL_API_SECRET_KEY:0:20}..."
echo "   CORE_API_URL: $CORE_API_URL"

# Login to Vercel if token provided
if [ -n "$VERCEL_TOKEN" ]; then
    echo "🔐 Logging in to Vercel with token..."
    echo "$VERCEL_TOKEN" | vercel login --token
else
    echo "🔐 Please login to Vercel manually..."
    vercel login
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod --yes

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls | grep -E "yourdomain\.com|vercel\.app" | head -1 | awk '{print $2}')

echo "✅ Public App deployed successfully!"
echo "🌐 URL: https://$DEPLOYMENT_URL"

# Create vercel.json for custom domain configuration
cat > vercel.json << EOF
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "STRIPE_SECRET_KEY": "$STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET": "$STRIPE_WEBHOOK_SECRET",
    "INTERNAL_API_SECRET_KEY": "$INTERNAL_API_SECRET_KEY",
    "CORE_API_URL": "$CORE_API_URL",
    "NEXT_PUBLIC_APP_NAME": "$NEXT_PUBLIC_APP_NAME",
    "NEXT_PUBLIC_APP_URL": "$NEXT_PUBLIC_APP_URL"
  }
}
EOF

echo ""
echo "📋 Next steps:"
echo "1. Configure custom domain in Vercel Dashboard"
echo "2. Update Stripe webhook URL to: https://$DEPLOYMENT_URL/api/webhooks/stripe"
echo "3. Test the complete signup flow"
echo "4. Update DNS records for your custom domain"









