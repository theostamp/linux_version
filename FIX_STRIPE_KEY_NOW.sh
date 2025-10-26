#!/bin/bash

# Fix Railway Stripe Key
# This script sets the correct Stripe test key in Railway

echo "🔧 Fixing Railway Stripe Keys..."
echo ""

# The CORRECT Stripe test keys (Updated 2025-10-26)
STRIPE_SECRET="sk_test_51SKvcFRpRJxSaTlvZIyUVuXoD5acYJBGN4gQSRuesBPSSbhLA2W7rfxfuuwR7HhFkN7FbZIJqdokC7rxpmNAf8iw00uriBspiH"
STRIPE_PUBLISHABLE="pk_test_51SKvcFRpRJxSaTlvMhLj0vC2j37lnAusNRTzA9fAPEABTEGQmv9AgWu0gKcyi6a30QWvGe9S7sK1omr66ENs1YY7006C9TYSn9"

echo "📝 Setting STRIPE_SECRET_KEY..."
railway variables --set "STRIPE_SECRET_KEY=$STRIPE_SECRET"

echo "📝 Setting STRIPE_PUBLISHABLE_KEY..."
railway variables --set "STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE"

echo ""
echo "✅ Stripe keys updated!"
echo "⏳ Railway will now redeploy (3-5 minutes)"
echo ""
echo "After redeploy, run:"
echo "  ./test_stripe_prices.sh"

