#!/bin/bash
# Railway Rollback Script
# Promotes the previous deployment to production

set -e

echo "🔄 Railway Rollback Script"
echo "=========================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

echo "📋 Listing recent deployments..."
railway deployments --json | jq -r '.[] | "\(.id) - \(.createdAt) - \(.status)"' | head -5

echo ""
read -p "Enter deployment ID to promote (or press Enter for latest): " DEPLOYMENT_ID

if [ -z "$DEPLOYMENT_ID" ]; then
    echo "⚠️  No deployment ID provided. Exiting."
    exit 1
fi

echo ""
echo "🚀 Promoting deployment $DEPLOYMENT_ID..."
railway up --detach "$DEPLOYMENT_ID"

echo ""
echo "✅ Rollback completed!"
echo "   Check Railway dashboard for deployment status"



