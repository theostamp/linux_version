#!/bin/bash

echo "🚀 DigitalOcean Remote Connection Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Your SSH Public Key:${NC}"
echo "----------------------------------------"
cat ~/.ssh/digitalocean_cursor.pub
echo "----------------------------------------"
echo ""

echo -e "${YELLOW}🔧 Next Steps:${NC}"
echo "1. Copy the public key above"
echo "2. Add it to your DigitalOcean droplet:"
echo "   - Go to DigitalOcean Dashboard"
echo "   - Click on your droplet (164.92.139.229)"
echo "   - Go to Settings → SSH Keys"
echo "   - Add the key above"
echo ""

echo -e "${YELLOW}🔑 Alternative: Reset Droplet Password${NC}"
echo "If you can't access the UI:"
echo "1. Go to DigitalOcean Dashboard"
echo "2. Click on your droplet"
echo "3. Click 'Reset root password'"
echo "4. Wait for email with new password"
echo ""

echo -e "${YELLOW}🧪 Test Connection:${NC}"
echo "After adding the key, test with:"
echo "ssh newconcierge-droplet"
echo ""

echo -e "${YELLOW}📁 Cursor Remote Development:${NC}"
echo "1. Open Cursor"
echo "2. Press Ctrl+Shift+P"
echo "3. Type 'Remote-SSH: Connect to Host'"
echo "4. Select 'newconcierge-droplet'"
echo "5. Open folder: /root/newconcierge"
echo ""

echo -e "${GREEN}✅ Setup complete!${NC}"


