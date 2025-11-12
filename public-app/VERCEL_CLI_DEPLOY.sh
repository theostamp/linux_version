#!/bin/bash

# 🚀 Vercel CLI Deploy Script
# Usage: ./VERCEL_CLI_DEPLOY.sh

set -e

echo "🚀 Deploying public-app to Vercel..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Navigate to public-app directory
cd "$(dirname "$0")"

# Deploy to production
echo "📦 Building and deploying to production..."
vercel --prod --yes

echo "✅ Deployment complete!"
echo "🌐 Check your deployment at: https://vercel.com/dashboard"



