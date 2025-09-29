#!/bin/bash
# Check and Setup MicroSD Script
# This script checks the current state and provides clear instructions

echo "🍓 MicroSD Check and Setup"
echo "=========================="
echo ""

# Configuration
KIOSK_HOSTNAME="building-kiosk"
KIOSK_SSID="Redmi Note 14 Pro+ 5G"
KIOSK_PASSWORD="theo123123"
KIOSK_STATIC_IP="192.168.1.100"
KIOSK_SERVER_URL="http://192.168.1.100:3000"
KIOSK_BUILDING_ID="1"
DEVICE="sdb"

echo "📋 Configuration:"
echo "   • WiFi SSID: $KIOSK_SSID"
echo "   • Static IP: $KIOSK_STATIC_IP"
echo "   • Server: $KIOSK_SERVER_URL"
echo "   • Building ID: $KIOSK_BUILDING_ID"
echo "   • Device: /dev/$DEVICE"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Check device status
echo "🔍 Checking MicroSD card status..."
lsblk | grep "$DEVICE"

# Check if device has partitions
PARTITIONS=$(lsblk -l | grep "$DEVICE" | wc -l)
echo "   Partitions found: $((PARTITIONS - 1))"

# Check if Raspberry Pi OS image exists
if [ -f "raspios-lite.img" ]; then
    echo "✅ Raspberry Pi OS image found: raspios-lite.img"
    IMAGE_READY=true
else
    echo "❌ Raspberry Pi OS image not found"
    IMAGE_READY=false
fi

echo ""

# Determine next steps
if [ "$PARTITIONS" -eq 1 ]; then
    echo "📝 Status: MicroSD card is empty (no partitions)"
    echo ""
    
    if [ "$IMAGE_READY" = true ]; then
        echo "🚀 Ready to write image to MicroSD!"
        echo ""
        read -p "Do you want to write the image now? (yes/no): " write_image
        
        if [ "$write_image" = "yes" ]; then
            echo "💾 Writing Raspberry Pi OS to MicroSD..."
            echo "⚠️  This will take 5-15 minutes..."
            
            # Unmount device if mounted
            umount /dev/${DEVICE}* 2>/dev/null || true
            
            # Write image
            dd if=raspios-lite.img of="/dev/$DEVICE" bs=4M status=progress
            sync
            
            echo "✅ Image written successfully!"
            echo ""
            echo "🔄 Refreshing partition table..."
            partprobe "/dev/$DEVICE"
            sleep 3
            
            echo "📁 New partitions:"
            lsblk | grep "$DEVICE"
            
            echo ""
            echo "🔧 Now running post-installation setup..."
            ./post-install-setup.sh
            
        else
            echo "❌ Image writing cancelled"
            exit 0
        fi
        
    else
        echo "📥 You need to download Raspberry Pi OS first:"
        echo ""
        echo "Option 1: Manual Download"
        echo "   1. Go to: https://www.raspberrypi.org/downloads/"
        echo "   2. Download 'Raspberry Pi OS Lite (64-bit)'"
        echo "   3. Save as 'raspios-lite.img.xz' in this directory"
        echo "   4. Run: xz -d raspios-lite.img.xz"
        echo "   5. Run: sudo ./check-and-setup.sh"
        echo ""
        echo "Option 2: Use Raspberry Pi Imager"
        echo "   1. Install Raspberry Pi Imager"
        echo "   2. Write Raspberry Pi OS Lite to /dev/$DEVICE"
        echo "   3. Run: sudo ./post-install-setup.sh"
        echo ""
        echo "Option 3: Try automatic download"
        echo "   Run: sudo ./auto-setup-microsd.sh"
    fi
    
elif [ "$PARTITIONS" -gt 1 ]; then
    echo "✅ MicroSD card has partitions (Raspberry Pi OS detected)"
    echo ""
    echo "🔧 Running post-installation setup..."
    ./post-install-setup.sh
    
else
    echo "❌ Error: Cannot determine MicroSD status"
    exit 1
fi
