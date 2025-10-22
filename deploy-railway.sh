#!/bin/bash

# Railway Deployment Helper Script
# This script helps prepare your project for Railway deployment

set -e

echo "🚂 Railway Deployment Preparation"
echo "=================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "⚠️  Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

echo "✅ Railway CLI installed"
echo ""

# Login to Railway
echo "1️⃣  Logging in to Railway..."
railway login

echo ""
echo "2️⃣  Creating new project..."
echo "   Choose one:"
echo "   a) Create empty project"
echo "   b) Link to existing project"
echo ""
read -p "Enter choice (a/b): " choice

if [ "$choice" = "a" ]; then
    railway init
else
    railway link
fi

echo ""
echo "3️⃣  Adding PostgreSQL database..."
railway add --database postgres

echo ""
echo "4️⃣  Adding Redis..."
railway add --database redis

echo ""
echo "5️⃣  Setting up environment variables..."
echo ""
echo "⚠️  IMPORTANT: You need to set these variables in Railway dashboard:"
echo ""
echo "Required variables:"
echo "-------------------"
echo "DEBUG=False"
echo "DJANGO_SECRET_KEY=<generate with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'>"
echo "STRIPE_SECRET_KEY=sk_live_... (from Stripe dashboard)"
echo "STRIPE_PUBLISHABLE_KEY=pk_live_... (from Stripe dashboard)"
echo "STRIPE_WEBHOOK_SECRET=whsec_... (configure after deployment)"
echo "INTERNAL_API_SECRET_KEY=<generate with: openssl rand -hex 32>"
echo ""

read -p "Press Enter to open Railway dashboard to set variables..."
railway open

echo ""
echo "6️⃣  Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment started!"
echo ""
echo "📋 Next steps:"
echo "1. Wait for deployment to complete (check Railway dashboard)"
echo "2. Get your backend URL from Railway"
echo "3. Configure Stripe webhook with your backend URL + /api/billing/webhook/stripe/"
echo "4. Copy webhook secret and add to Railway environment variables"
echo "5. Redeploy to apply new environment variables"
echo ""
echo "🎉 Done! Check Railway dashboard for deployment status."
