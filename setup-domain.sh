#!/bin/bash

# 🌐 Domain Setup Helper Script
# Usage: ./setup-domain.sh [domain-name] [droplet-ip]

set -e

DOMAIN=${1:-"newconcierge.com"}
DROPLET_IP=${2:-"YOUR_DROPLET_IP"}

echo "🌐 Setting up domain: $DOMAIN"
echo "🖥️ Droplet IP: $DROPLET_IP"
echo ""

if [ "$DROPLET_IP" = "YOUR_DROPLET_IP" ]; then
    echo "❌ Please provide your Droplet IP: ./setup-domain.sh $DOMAIN YOUR_ACTUAL_IP"
    exit 1
fi

echo "📋 Domain Setup Checklist:"
echo ""
echo "1. ✅ Domain purchased: $DOMAIN"
echo "2. ✅ DigitalOcean Droplet created: $DROPLET_IP"
echo "3. ✅ Domain added to DigitalOcean"
echo "4. ✅ DNS records configured"
echo ""

echo "🔧 DNS Records to add in DigitalOcean:"
echo ""
echo "Type: A"
echo "Name: @"
echo "Value: $DROPLET_IP"
echo "TTL: 3600"
echo ""
echo "Type: A"
echo "Name: app"
echo "Value: $DROPLET_IP"
echo "TTL: 3600"
echo ""
echo "Type: CNAME"
echo "Name: www"
echo "Value: $DOMAIN"
echo "TTL: 3600"
echo ""

echo "⏳ DNS Propagation:"
echo "   - Usually takes 5-30 minutes"
echo "   - Can take up to 24-48 hours"
echo "   - Check with: nslookup $DOMAIN"
echo ""

echo "🧪 Test DNS:"
echo "   nslookup $DOMAIN"
echo "   nslookup app.$DOMAIN"
echo ""

echo "🚀 After DNS is ready, run:"
echo "   ./deploy-core-app.sh $DROPLET_IP $DOMAIN"
echo ""

echo "📱 Vercel Domain Setup:"
echo "   1. Go to Vercel Dashboard"
echo "   2. Select your project"
echo "   3. Settings → Domains"
echo "   4. Add: $DOMAIN"
echo "   5. Add: www.$DOMAIN"
echo ""

echo "🔐 SSL Certificate:"
echo "   After deployment, run:"
echo "   ssh root@$DROPLET_IP 'sudo certbot --nginx -d $DOMAIN -d app.$DOMAIN -d www.$DOMAIN'"
echo ""

echo "✅ Domain setup instructions completed!"
echo "   Next: Wait for DNS propagation, then deploy Core App"
