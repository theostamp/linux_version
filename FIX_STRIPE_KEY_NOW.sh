#!/bin/bash

# Fix Railway Stripe Key
# This script sets the correct Stripe test key in Railway

echo "🔧 Fixing Railway Stripe Keys..."
echo ""

# The CORRECT Stripe test keys
STRIPE_SECRET="sk_test_51SKvgDALGEaGtPDYQjJzEQJilEg23btupuoQHNWPtuGazZOAdnQ7mHwYDFg5aTAbASJPfvrsqSZHZ6DyHiLF1AOx0077mYI0Bn"
STRIPE_PUBLISHABLE="pk_test_51SKvgDALGEaGtPDYQjJzEQJilEg23btupuoQHNWPtuGazZOAdnQ7mHwYDFg5aTAbASJPfvrsqSZHZ6DyHiLF1AOx0077mYI0Bn"

echo "📝 Setting STRIPE_SECRET_KEY..."
railway variables set STRIPE_SECRET_KEY="$STRIPE_SECRET"

echo "📝 Setting STRIPE_PUBLISHABLE_KEY..."
railway variables set STRIPE_PUBLISHABLE_KEY="$STRIPE_PUBLISHABLE"

echo ""
echo "✅ Stripe keys updated!"
echo "⏳ Railway will now redeploy (3-5 minutes)"
echo ""
echo "After redeploy, run:"
echo "  ./test_stripe_prices.sh"

