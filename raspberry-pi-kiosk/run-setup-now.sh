#!/bin/bash
# Run MicroSD Setup with Pre-configured Settings
# WiFi: Redmi Note 14 Pro+ 5G
# Password: theo123123

echo "🍓 MicroSD Setup - Pre-configured"
echo "================================="
echo ""
echo "📋 Configuration:"
echo "   • WiFi SSID: Redmi Note 14 Pro+ 5G"
echo "   • WiFi Password: theo123123"
echo "   • Static IP: 192.168.1.100"
echo "   • Server URL: http://192.168.1.100:3000"
echo "   • Building ID: 1"
echo "   • Device: /dev/sdb (D: drive)"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "🔐 This script needs root privileges to access the MicroSD card"
    echo "   Run: sudo ./run-setup-now.sh"
    exit 1
fi

# Check if MicroSD is accessible
if [ ! -b "/dev/sdb" ]; then
    echo "❌ MicroSD card not found at /dev/sdb"
    echo "   Available devices:"
    lsblk -d -o NAME,SIZE,MODEL | grep -E "(sd|mmcblk)"
    echo ""
    echo "   If your MicroSD is at a different device, edit the script:"
    echo "   nano auto-setup-microsd.sh"
    echo "   Change DEVICE=\"sdb\" to your device (e.g., sdc, mmcblk0)"
    exit 1
fi

echo "✅ MicroSD card found at /dev/sdb"
echo ""

# Safety check
echo "⚠️  WARNING: This will completely erase /dev/sdb"
echo "⚠️  Make sure this is the correct MicroSD card!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Operation cancelled"
    exit 0
fi

echo ""
echo "🚀 Starting automated MicroSD setup..."
echo "   This will take 15-30 minutes depending on internet speed"
echo ""

# Run the auto-setup script
exec ./auto-setup-microsd.sh
