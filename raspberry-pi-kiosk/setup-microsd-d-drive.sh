#!/bin/bash
# Setup MicroSD on D: Drive
# This script configures and runs the automated setup

echo "🍓 MicroSD Setup for D: Drive"
echo "============================="
echo ""

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTO_SETUP_SCRIPT="$SCRIPT_DIR/auto-setup-microsd.sh"

# Check if auto-setup script exists
if [ ! -f "$AUTO_SETUP_SCRIPT" ]; then
    echo "❌ auto-setup-microsd.sh not found!"
    exit 1
fi

echo "📋 Please provide the following information:"
echo ""

# Get WiFi information
read -p "Enter WiFi SSID: " WIFI_SSID
read -s -p "Enter WiFi Password: " WIFI_PASSWORD
echo ""

# Get server information
read -p "Enter Server URL (default: http://localhost:3000): " SERVER_URL
if [ -z "$SERVER_URL" ]; then
    SERVER_URL="http://localhost:3000"
fi

# Get building ID
read -p "Enter Building ID (default: 1): " BUILDING_ID
if [ -z "$BUILDING_ID" ]; then
    BUILDING_ID="1"
fi

# Get static IP
read -p "Enter Static IP (default: 192.168.1.100): " STATIC_IP
if [ -z "$STATIC_IP" ]; then
    STATIC_IP="192.168.1.100"
fi

echo ""
echo "🔧 Updating configuration..."

# Update the auto-setup script with user input
sed -i "s/KIOSK_SSID=\"YOUR_WIFI_NAME\"/KIOSK_SSID=\"$WIFI_SSID\"/" "$AUTO_SETUP_SCRIPT"
sed -i "s/KIOSK_PASSWORD=\"YOUR_WIFI_PASSWORD\"/KIOSK_PASSWORD=\"$WIFI_PASSWORD\"/" "$AUTO_SETUP_SCRIPT"
sed -i "s|KIOSK_SERVER_URL=\"http://localhost:3000\"|KIOSK_SERVER_URL=\"$SERVER_URL\"|" "$AUTO_SETUP_SCRIPT"
sed -i "s/KIOSK_BUILDING_ID=\"1\"/KIOSK_BUILDING_ID=\"$BUILDING_ID\"/" "$AUTO_SETUP_SCRIPT"
sed -i "s/KIOSK_STATIC_IP=\"192.168.1.100\"/KIOSK_STATIC_IP=\"$STATIC_IP\"/" "$AUTO_SETUP_SCRIPT"

echo "✅ Configuration updated"
echo ""
echo "📋 Final Configuration:"
echo "   • WiFi SSID: $WIFI_SSID"
echo "   • Server URL: $SERVER_URL"
echo "   • Building ID: $BUILDING_ID"
echo "   • Static IP: $STATIC_IP"
echo "   • Device: /dev/sdb (D: drive)"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "🔐 This script needs root privileges to access the MicroSD card"
    echo "   Run: sudo ./setup-microsd-d-drive.sh"
    echo ""
    echo "   Or run the auto-setup directly:"
    echo "   sudo ./auto-setup-microsd.sh"
    exit 1
fi

# Run the auto-setup script
echo "🚀 Starting automated MicroSD setup..."
echo ""

exec "$AUTO_SETUP_SCRIPT"
