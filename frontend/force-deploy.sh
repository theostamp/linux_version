#!/bin/bash

echo "🚀 Force deploying to Vercel with environment variables..."

# Export all environment variables from env.production
export $(cat env.production | grep -v '^#' | xargs)

# Force deploy with --prod flag
echo "📦 Building and deploying..."
npx vercel --prod --force

echo "✅ Deployment initiated!"
