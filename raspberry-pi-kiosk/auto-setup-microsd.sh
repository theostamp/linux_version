#!/bin/bash
# Automated MicroSD Setup Script
# Pre-configured for quick deployment

set -e

# Configuration - UPDATE THESE VALUES
KIOSK_HOSTNAME="building-kiosk"
KIOSK_SSID="Redmi Note 14 Pro+ 5G"    # Your WiFi name
KIOSK_PASSWORD="theo123123"           # Your WiFi password
KIOSK_STATIC_IP="192.168.1.100"      # Change this if needed
KIOSK_SERVER_URL="http://192.168.1.100:3000"  # Server URL for kiosk
KIOSK_BUILDING_ID="1"                # Change this to your building ID

# Device configuration
DEVICE="sdb"  # Change this to your MicroSD device (D: drive is usually sdb)

echo "🍓 Automated MicroSD Setup for Building Kiosk"
echo "=============================================="
echo ""
echo "📋 Configuration:"
echo "   • Hostname: $KIOSK_HOSTNAME"
echo "   • WiFi: $KIOSK_SSID"
echo "   • Static IP: $KIOSK_STATIC_IP"
echo "   • Server: $KIOSK_SERVER_URL"
echo "   • Building ID: $KIOSK_BUILDING_ID"
echo "   • Device: /dev/$DEVICE"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    echo "   Run: sudo ./auto-setup-microsd.sh"
    exit 1
fi

# Validate device
if [ ! -b "/dev/$DEVICE" ]; then
    echo "❌ Device /dev/$DEVICE not found or not a block device"
    echo "   Available devices:"
    lsblk -d -o NAME,SIZE,MODEL | grep -E "(sd|mmcblk)"
    exit 1
fi

# Safety check
echo "⚠️  WARNING: This will completely erase /dev/$DEVICE"
echo "⚠️  Make sure this is the correct MicroSD card!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Operation cancelled"
    exit 0
fi

# Download Raspberry Pi OS if not exists
if [ ! -f "raspios-lite.img" ]; then
    echo "📥 Downloading Raspberry Pi OS Lite..."
    # Try the latest available version
    wget -O raspios-lite.img.xz "https://downloads.raspberrypi.org/raspios_lite_arm64/images/raspios_lite_arm64-2023-12-05/2023-12-05-raspios-bookworm-arm64-lite.img.xz" || \
    wget -O raspios-lite.img.xz "https://downloads.raspberrypi.org/raspios_lite_arm64/images/raspios_lite_arm64-2023-10-10/2023-10-10-raspios-bookworm-arm64-lite.img.xz" || \
    wget -O raspios-lite.img.xz "https://downloads.raspberrypi.org/raspios_lite_arm64/images/raspios_lite_arm64-2023-05-03/2023-05-03-raspios-bookworm-arm64-lite.img.xz"
    
    if [ $? -eq 0 ]; then
        echo "📦 Extracting image..."
        xz -d raspios-lite.img.xz
        echo "✅ Image ready"
    else
        echo "❌ Failed to download Raspberry Pi OS"
        echo "   Please download manually from: https://www.raspberrypi.org/downloads/"
        echo "   Or use Raspberry Pi Imager instead"
        exit 1
    fi
fi

# Unmount device if mounted
echo "📤 Unmounting device..."
umount /dev/${DEVICE}* 2>/dev/null || true

# Write image to MicroSD
echo "💾 Writing to MicroSD card..."
echo "⚠️  This may take several minutes..."
dd if=raspios-lite.img of="/dev/$DEVICE" bs=4M status=progress
sync

echo "✅ Image written to MicroSD"

# Wait for partitions to be ready
sleep 5

# Find boot and root partitions
if [[ "$DEVICE" == mmcblk* ]]; then
    BOOT_PARTITION="/dev/${DEVICE}p1"
    ROOT_PARTITION="/dev/${DEVICE}p2"
else
    BOOT_PARTITION="/dev/${DEVICE}1"
    ROOT_PARTITION="/dev/${DEVICE}2"
fi

# Create mount points
BOOT_MOUNT="/mnt/kiosk-boot"
ROOT_MOUNT="/mnt/kiosk-root"

mkdir -p "$BOOT_MOUNT" "$ROOT_MOUNT"

# Mount partitions
echo "📁 Mounting partitions..."
mount "$BOOT_PARTITION" "$BOOT_MOUNT"
mount "$ROOT_PARTITION" "$ROOT_MOUNT"

# Enable SSH
echo "🔐 Enabling SSH..."
touch "$BOOT_MOUNT/ssh"

# Configure WiFi
echo "📶 Configuring WiFi..."
cat > "$BOOT_MOUNT/wpa_supplicant.conf" << EOF
country=GR
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="$KIOSK_SSID"
    psk="$KIOSK_PASSWORD"
    key_mgmt=WPA-PSK
}
EOF

# Set hostname
echo "🏷️  Setting hostname..."
echo "$KIOSK_HOSTNAME" > "$ROOT_MOUNT/etc/hostname"
sed -i "s/raspberrypi/$KIOSK_HOSTNAME/g" "$ROOT_MOUNT/etc/hosts"

# Configure static IP
echo "🌐 Configuring static IP..."
cat >> "$ROOT_MOUNT/etc/dhcpcd.conf" << EOF

# Kiosk static IP configuration
interface wlan0
static ip_address=$KIOSK_STATIC_IP/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
EOF

# Copy kiosk files
echo "📂 Copying kiosk files..."
cp -r . "$ROOT_MOUNT/home/pi/kiosk-setup/"
chown -R 1000:1000 "$ROOT_MOUNT/home/pi/kiosk-setup/"
chmod +x "$ROOT_MOUNT/home/pi/kiosk-setup/"*.sh
chmod +x "$ROOT_MOUNT/home/pi/kiosk-setup/"*.py

# Update kiosk configuration
echo "⚙️  Updating kiosk configuration..."
sed -i "s|http://your-server:3000|$KIOSK_SERVER_URL|g" "$ROOT_MOUNT/home/pi/kiosk-setup/kiosk.sh"
sed -i "s|http://your-server:3000|$KIOSK_SERVER_URL|g" "$ROOT_MOUNT/home/pi/kiosk-setup/voice-kiosk.sh"
sed -i "s|building_id=1|building_id=$KIOSK_BUILDING_ID|g" "$ROOT_MOUNT/home/pi/kiosk-setup/kiosk.sh"
sed -i "s|building_id=1|building_id=$KIOSK_BUILDING_ID|g" "$ROOT_MOUNT/home/pi/kiosk-setup/voice-kiosk.sh"

# Create auto-installation script
echo "🤖 Creating auto-installation script..."
cat > "$ROOT_MOUNT/home/pi/auto-install-kiosk.sh" << 'EOF'
#!/bin/bash
# Auto-installation script

echo "🍓 Starting automatic kiosk installation..."

# Wait for network
sleep 30

# Update and install packages
apt update && apt upgrade -y
apt install -y chromium-browser xdotool unclutter x11-xserver-utils lightdm python3 python3-pip espeak alsa-utils pulseaudio portaudio19-dev python3-pyaudio flac sox libsox-fmt-all

# Install Python packages
pip3 install --user SpeechRecognition pyaudio requests

# Setup kiosk
cp -r /home/pi/kiosk-setup/* /home/pi/
chmod +x /home/pi/*.sh /home/pi/*.py

# Configure services
cp /home/pi/kiosk.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable kiosk.service

# Configure autologin
systemctl set-default graphical.target
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << 'AUTOEOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi --noclear %I $TERM
AUTOEOF

# Disable screen blanking
cat >> /etc/xdg/lxsession/LXDE-pi/autostart << 'AUTOEOF'
@xset s off
@xset -dpms
@xset s noblank
AUTOEOF

# Create health check
cat > /home/pi/health-check.sh << 'HEALTHEOF'
#!/bin/bash
if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    systemctl restart wpa_supplicant
fi
if ! pgrep -f "chromium-browser" > /dev/null; then
    systemctl restart kiosk
fi
HEALTHEOF

chmod +x /home/pi/health-check.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/pi/health-check.sh >> /home/pi/kiosk-health.log 2>&1") | crontab -

echo "✅ Installation completed! Rebooting..."
sleep 10
reboot
EOF

chmod +x "$ROOT_MOUNT/home/pi/auto-install-kiosk.sh"

# Create first-boot service
mkdir -p "$ROOT_MOUNT/etc/systemd/system"
cat > "$ROOT_MOUNT/etc/systemd/system/first-boot.service" << 'EOF'
[Unit]
Description=First Boot Kiosk Installation
After=network.target

[Service]
Type=oneshot
ExecStart=/home/pi/auto-install-kiosk.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

ln -sf "$ROOT_MOUNT/etc/systemd/system/first-boot.service" "$ROOT_MOUNT/etc/systemd/system/multi-user.target.wants/"

# Unmount partitions
echo "📤 Unmounting partitions..."
umount "$BOOT_MOUNT"
umount "$ROOT_MOUNT"
rmdir "$BOOT_MOUNT" "$ROOT_MOUNT"

echo ""
echo "🎉 MicroSD card is ready for plug & play deployment!"
echo ""
echo "📋 Configuration:"
echo "   • Hostname: $KIOSK_HOSTNAME"
echo "   • WiFi: $KIOSK_SSID"
echo "   • Static IP: $KIOSK_STATIC_IP"
echo "   • Server: $KIOSK_SERVER_URL"
echo "   • Building ID: $KIOSK_BUILDING_ID"
echo ""
echo "🚀 Next steps:"
echo "   1. Insert MicroSD into Raspberry Pi"
echo "   2. Connect power and wait 5-10 minutes"
echo "   3. Kiosk will auto-install and start"
echo "   4. SSH access: ssh pi@$KIOSK_STATIC_IP"
echo ""
echo "⚠️  Remove MicroSD safely before inserting into Raspberry Pi!"
