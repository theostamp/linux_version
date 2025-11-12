#!/bin/bash
# Vercel Rollback Script
# Promotes a previous deployment to production

set -e

echo "🔄 Vercel Rollback Script"
echo "========================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "   npm install -g vercel"
    exit 1
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please run: vercel login"
    exit 1
fi

echo "📋 Listing recent deployments..."
vercel ls --json | jq -r '.[] | "\(.uid) - \(.created) - \(.state)"' | head -10

echo ""
read -p "Enter deployment URL or ID to promote (or press Enter to cancel): " DEPLOYMENT_ID

if [ -z "$DEPLOYMENT_ID" ]; then
    echo "⚠️  No deployment ID provided. Exiting."
    exit 1
fi

echo ""
echo "🚀 Promoting deployment $DEPLOYMENT_ID to production..."
vercel promote "$DEPLOYMENT_ID" --yes

echo ""
echo "✅ Rollback completed!"
echo "   Check Vercel dashboard for deployment status"



