#!/bin/bash
# Write Raspberry Pi OS Image to MicroSD
# This script properly writes the image to the MicroSD card

echo "💾 Writing Raspberry Pi OS Image to MicroSD"
echo "==========================================="
echo ""

# Configuration
DEVICE="sdb"
IMAGE_FILE="raspios-lite.img"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Check if image exists
if [ ! -f "$IMAGE_FILE" ]; then
    echo "❌ Image file not found: $IMAGE_FILE"
    exit 1
fi

# Check if device exists
if [ ! -b "/dev/$DEVICE" ]; then
    echo "❌ Device /dev/$DEVICE not found"
    exit 1
fi

echo "📋 Configuration:"
echo "   • Image: $IMAGE_FILE"
echo "   • Device: /dev/$DEVICE"
echo "   • Size: $(du -h $IMAGE_FILE | cut -f1)"
echo ""

# Safety check
echo "⚠️  WARNING: This will completely erase /dev/$DEVICE"
echo "⚠️  Make sure this is the correct MicroSD card!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Operation cancelled"
    exit 0
fi

# Force unmount and kill processes
echo "🔧 Preparing device..."
umount /dev/${DEVICE}* 2>/dev/null || true
fuser -k /dev/$DEVICE 2>/dev/null || true
sleep 2

# Check if device is still busy
if lsof /dev/$DEVICE 2>/dev/null; then
    echo "❌ Device is still busy. Please close any applications using it."
    exit 1
fi

# Write image
echo "💾 Writing image to MicroSD..."
echo "⚠️  This may take 5-15 minutes depending on MicroSD speed..."
echo ""

dd if="$IMAGE_FILE" of="/dev/$DEVICE" bs=4M status=progress

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Image written successfully!"
    
    # Sync to ensure data is written
    echo "🔄 Syncing data..."
    sync
    
    # Refresh partition table
    echo "🔄 Refreshing partition table..."
    partprobe "/dev/$DEVICE"
    sleep 3
    
    echo ""
    echo "📁 New partitions:"
    lsblk | grep "$DEVICE"
    
    echo ""
    echo "🎉 MicroSD is ready for post-installation setup!"
    echo ""
    echo "🚀 Next step:"
    echo "   sudo ./post-install-setup.sh"
    
else
    echo ""
    echo "❌ Failed to write image"
    exit 1
fi
