#!/bin/bash
# Force Write Raspberry Pi OS Image to MicroSD
# This script uses alternative methods to write the image

echo "💾 Force Writing Raspberry Pi OS Image to MicroSD"
echo "================================================="
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

echo "🔧 Attempting to free the device..."

# Method 1: Force unmount all partitions
echo "   • Unmounting all partitions..."
umount /dev/${DEVICE}* 2>/dev/null || true

# Method 2: Kill any processes using the device
echo "   • Killing processes using device..."
fuser -k /dev/$DEVICE 2>/dev/null || true

# Method 3: Use blockdev to flush buffers
echo "   • Flushing device buffers..."
blockdev --flushbufs /dev/$DEVICE 2>/dev/null || true

# Method 4: Wait and retry
echo "   • Waiting for device to be free..."
sleep 5

# Method 5: Try to write with different block size
echo "💾 Attempting to write image..."
echo "⚠️  This may take 5-15 minutes..."

# Try with smaller block size first
if ! dd if="$IMAGE_FILE" of="/dev/$DEVICE" bs=1M status=progress 2>/dev/null; then
    echo "   • Retrying with even smaller block size..."
    if ! dd if="$IMAGE_FILE" of="/dev/$DEVICE" bs=512k status=progress 2>/dev/null; then
        echo "   • Retrying with minimal block size..."
        dd if="$IMAGE_FILE" of="/dev/$DEVICE" bs=64k status=progress
    fi
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Image written successfully!"
    
    # Sync to ensure data is written
    echo "🔄 Syncing data..."
    sync
    
    # Refresh partition table
    echo "🔄 Refreshing partition table..."
    partprobe "/dev/$DEVICE" 2>/dev/null || true
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
    echo "❌ Failed to write image with all methods"
    echo ""
    echo "🔧 Alternative solutions:"
    echo "   1. Remove and reinsert the MicroSD card"
    echo "   2. Use a different USB port"
    echo "   3. Use Raspberry Pi Imager instead"
    echo "   4. Try on a different computer"
    echo ""
    echo "📥 Manual method:"
    echo "   1. Download Raspberry Pi Imager"
    echo "   2. Write Raspberry Pi OS Lite to /dev/$DEVICE"
    echo "   3. Run: sudo ./post-install-setup.sh"
    exit 1
fi
