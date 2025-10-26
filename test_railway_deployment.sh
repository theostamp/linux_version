#!/bin/bash

# Railway Deployment Test Script
# This script tests the deployment with CLEANUP_DATABASE="true"

echo "🚀 Railway Deployment Test Script"
echo "=================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please login first:"
    echo "   railway login"
    exit 1
fi

echo "✅ Railway CLI is ready"

# Set cleanup environment variable
echo "🧹 Setting CLEANUP_DATABASE=true..."
railway variables set CLEANUP_DATABASE=true

# Deploy
echo "🚀 Deploying to Railway..."
railway up

# Wait for deployment to complete
echo "⏳ Waiting for deployment to complete..."
sleep 30

# Check deployment status
echo "🔍 Checking deployment status..."
railway status

# Check logs for cleanup and auto-init
echo "📋 Checking logs for cleanup and auto-init..."
railway logs | grep -E "(CLEANUP|auto-initialization|Ultra-Superuser|Demo tenant)"

# Test database connection
echo "🔍 Testing database connection..."
railway connect < railway_db_test.sql

echo "✅ Deployment test complete!"
echo ""
echo "📋 Next steps:"
echo "1. Check the database results above"
echo "2. Test Google Auth at https://linux-version.vercel.app/register"
echo "3. Verify redirect to /plans (not /dashboard)"
echo "4. Test subscription flow with test card: 4242 4242 4242 4242"
echo "5. Check webhook processing in Railway logs"
echo "6. Verify tenant provisioning and email notification"
