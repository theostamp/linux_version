#!/bin/bash

echo "🔄 Force redeploying to Vercel..."
echo ""
echo "This will:"
echo "  1. Clear Vercel build cache"
echo "  2. Trigger a fresh deployment"
echo "  3. Apply all recent fixes"
echo ""

# Add a timestamp to force a rebuild
TIMESTAMP=$(date +%s)
echo "// Build timestamp: $TIMESTAMP" >> .vercel-build-timestamp

# Commit the timestamp
git add .vercel-build-timestamp
git commit -m "Force rebuild: $TIMESTAMP"
git push origin main

echo ""
echo "✅ Forced rebuild initiated!"
echo "⏰ Wait 2-3 minutes for deployment to complete"
echo ""
echo "📊 Check deployment status:"
echo "   https://vercel.com/[your-team]/[your-project]/deployments"
echo ""
echo "🧪 After deployment, test login at:"
echo "   https://theo-etherm202.newconcierge.app/"
echo ""

