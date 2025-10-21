#!/bin/bash

# Public App Environment Setup Script

echo "🚀 Setting up Public App environment variables..."

# Generate secure API key
API_KEY=$(openssl rand -base64 32)
echo "Generated API Key: $API_KEY"

# Create .env.local file
cat > .env.local << EOF
# Public App Environment Variables

# Stripe Configuration (Development - Replace with production keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdef
STRIPE_SECRET_KEY=sk_test_51234567890abcdef
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef

# Internal API Configuration
INTERNAL_API_SECRET_KEY=$API_KEY
CORE_API_URL=http://localhost:18000

# App Configuration
NEXT_PUBLIC_APP_NAME=New Concierge
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo "✅ Created .env.local file"
echo "📝 Please update Stripe keys with your actual values"
echo "🔑 API Key: $API_KEY"
echo ""
echo "Next steps:"
echo "1. Update Stripe keys in .env.local"
echo "2. Add INTERNAL_API_SECRET_KEY to Core App .env"
echo "3. Restart both applications"
