#!/bin/bash
# MicroSD Card Preparation Script
# This script prepares a MicroSD card with Raspberry Pi OS and all kiosk files
# Ready for plug & play deployment

set -e

# Configuration
RASPBERRY_PI_OS_URL="https://downloads.raspberrypi.org/raspios_lite_arm64/images/raspios_lite_arm64-2024-01-12/2024-01-12-raspios-bookworm-arm64-lite.img.xz"
RASPBERRY_PI_OS_FILE="raspios-lite-arm64.img.xz"
RASPBERRY_PI_OS_IMAGE="raspios-lite-arm64.img"
KIOSK_HOSTNAME="building-kiosk"
KIOSK_SSID=""
KIOSK_PASSWORD=""
KIOSK_STATIC_IP="192.168.1.100"
KIOSK_SERVER_URL="http://your-server:3000"
KIOSK_BUILDING_ID="1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍓 Raspberry Pi Kiosk - MicroSD Preparation${NC}"
echo "=================================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Get user input
echo ""
print_info "Please provide the following information:"
echo ""

read -p "Enter WiFi SSID: " KIOSK_SSID
read -s -p "Enter WiFi Password: " KIOSK_PASSWORD
echo ""
read -p "Enter Static IP (default: $KIOSK_STATIC_IP): " input_ip
if [ ! -z "$input_ip" ]; then
    KIOSK_STATIC_IP="$input_ip"
fi

read -p "Enter Server URL (default: $KIOSK_SERVER_URL): " input_url
if [ ! -z "$input_url" ]; then
    KIOSK_SERVER_URL="$input_url"
fi

read -p "Enter Building ID (default: $KIOSK_BUILDING_ID): " input_building
if [ ! -z "$input_building" ]; then
    KIOSK_BUILDING_ID="$input_building"
fi

# List available storage devices
echo ""
print_info "Available storage devices:"
lsblk -d -o NAME,SIZE,MODEL | grep -E "(sd|mmcblk)"

echo ""
read -p "Enter the device name (e.g., sdb, mmcblk0): " DEVICE

# Validate device
if [ ! -b "/dev/$DEVICE" ]; then
    print_error "Device /dev/$DEVICE not found or not a block device"
    exit 1
fi

# Safety check
echo ""
print_warning "WARNING: This will completely erase /dev/$DEVICE"
print_warning "Make sure this is the correct MicroSD card!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    print_info "Operation cancelled"
    exit 0
fi

# Download Raspberry Pi OS if not exists
if [ ! -f "$RASPBERRY_PI_OS_FILE" ]; then
    print_info "Downloading Raspberry Pi OS Lite..."
    wget -O "$RASPBERRY_PI_OS_FILE" "$RASPBERRY_PI_OS_URL"
    print_status "Download completed"
fi

# Extract image if not exists
if [ ! -f "$RASPBERRY_PI_OS_IMAGE" ]; then
    print_info "Extracting Raspberry Pi OS image..."
    xz -d "$RASPBERRY_PI_OS_FILE"
    print_status "Extraction completed"
fi

# Unmount device if mounted
print_info "Unmounting device..."
umount /dev/${DEVICE}* 2>/dev/null || true
print_status "Device unmounted"

# Write image to MicroSD
print_info "Writing Raspberry Pi OS to MicroSD card..."
print_warning "This may take several minutes..."
dd if="$RASPBERRY_PI_OS_IMAGE" of="/dev/$DEVICE" bs=4M status=progress
sync
print_status "Image written to MicroSD"

# Wait for system to recognize the new partitions
sleep 5

# Find boot and root partitions
BOOT_PARTITION=""
ROOT_PARTITION=""

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
print_info "Mounting partitions..."
mount "$BOOT_PARTITION" "$BOOT_MOUNT"
mount "$ROOT_PARTITION" "$ROOT_MOUNT"
print_status "Partitions mounted"

# Enable SSH
print_info "Enabling SSH..."
touch "$BOOT_MOUNT/ssh"
print_status "SSH enabled"

# Configure WiFi
print_info "Configuring WiFi..."
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
print_status "WiFi configured"

# Set hostname
print_info "Setting hostname..."
echo "$KIOSK_HOSTNAME" > "$ROOT_MOUNT/etc/hostname"
sed -i "s/raspberrypi/$KIOSK_HOSTNAME/g" "$ROOT_MOUNT/etc/hosts"
print_status "Hostname set to $KIOSK_HOSTNAME"

# Configure static IP
print_info "Configuring static IP..."
cat >> "$ROOT_MOUNT/etc/dhcpcd.conf" << EOF

# Kiosk static IP configuration
interface wlan0
static ip_address=$KIOSK_STATIC_IP/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
EOF
print_status "Static IP configured: $KIOSK_STATIC_IP"

# Copy kiosk files to root partition
print_info "Copying kiosk files..."
cp -r . "$ROOT_MOUNT/home/pi/kiosk-setup/"
chown -R 1000:1000 "$ROOT_MOUNT/home/pi/kiosk-setup/"
chmod +x "$ROOT_MOUNT/home/pi/kiosk-setup/"*.sh
chmod +x "$ROOT_MOUNT/home/pi/kiosk-setup/"*.py
print_status "Kiosk files copied"

# Update kiosk configuration
print_info "Updating kiosk configuration..."
sed -i "s|http://your-server:3000|$KIOSK_SERVER_URL|g" "$ROOT_MOUNT/home/pi/kiosk-setup/kiosk.sh"
sed -i "s|http://your-server:3000|$KIOSK_SERVER_URL|g" "$ROOT_MOUNT/home/pi/kiosk-setup/voice-kiosk.sh"
sed -i "s|building_id=1|building_id=$KIOSK_BUILDING_ID|g" "$ROOT_MOUNT/home/pi/kiosk-setup/kiosk.sh"
sed -i "s|building_id=1|building_id=$KIOSK_BUILDING_ID|g" "$ROOT_MOUNT/home/pi/kiosk-setup/voice-kiosk.sh"
print_status "Kiosk configuration updated"

# Create auto-installation script
print_info "Creating auto-installation script..."
cat > "$ROOT_MOUNT/home/pi/auto-install-kiosk.sh" << 'EOF'
#!/bin/bash
# Auto-installation script that runs on first boot

echo "🍓 Starting automatic kiosk installation..."

# Wait for network
sleep 30

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y \
    chromium-browser \
    xdotool \
    unclutter \
    x11-xserver-utils \
    lightdm \
    xserver-xorg-video-fbdev \
    python3 \
    python3-pip \
    espeak \
    alsa-utils \
    pulseaudio \
    portaudio19-dev \
    python3-pyaudio \
    flac \
    sox \
    libsox-fmt-all

# Install Python packages
pip3 install --user SpeechRecognition pyaudio requests

# Copy and configure kiosk files
cp -r /home/pi/kiosk-setup/* /home/pi/
chmod +x /home/pi/*.sh
chmod +x /home/pi/*.py

# Configure systemd services
cp /home/pi/kiosk.service /etc/systemd/system/
cp /home/pi/voice-kiosk.service /etc/systemd/system/
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

# Create health check script
cat > /home/pi/health-check.sh << 'HEALTHEOF'
#!/bin/bash
if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    echo "$(date): No internet connection, restarting WiFi..."
    systemctl restart wpa_supplicant
fi

if ! pgrep -f "chromium-browser" > /dev/null; then
    echo "$(date): Kiosk not running, restarting..."
    systemctl restart kiosk
fi
HEALTHEOF

chmod +x /home/pi/health-check.sh

# Setup cron job for health checks
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/pi/health-check.sh >> /home/pi/kiosk-health.log 2>&1") | crontab -

echo "✅ Kiosk installation completed!"
echo "🔄 Rebooting in 10 seconds..."
sleep 10
reboot
EOF

chmod +x "$ROOT_MOUNT/home/pi/auto-install-kiosk.sh"
print_status "Auto-installation script created"

# Create systemd service to run auto-installation on first boot
print_info "Creating first-boot service..."
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

# Enable first-boot service
ln -sf "$ROOT_MOUNT/etc/systemd/system/first-boot.service" "$ROOT_MOUNT/etc/systemd/system/multi-user.target.wants/"
print_status "First-boot service configured"

# Unmount partitions
print_info "Unmounting partitions..."
umount "$BOOT_MOUNT"
umount "$ROOT_MOUNT"
print_status "Partitions unmounted"

# Cleanup
rmdir "$BOOT_MOUNT" "$ROOT_MOUNT"

print_status "MicroSD card preparation completed!"
echo ""
echo "🎉 Your MicroSD card is ready for plug & play deployment!"
echo ""
echo "📋 What was configured:"
echo "   • Raspberry Pi OS Lite with SSH enabled"
echo "   • WiFi: $KIOSK_SSID"
echo "   • Static IP: $KIOSK_STATIC_IP"
echo "   • Hostname: $KIOSK_HOSTNAME"
echo "   • Server URL: $KIOSK_SERVER_URL"
echo "   • Building ID: $KIOSK_BUILDING_ID"
echo "   • Auto-installation on first boot"
echo ""
echo "🚀 Next steps:"
echo "   1. Insert MicroSD card into Raspberry Pi"
echo "   2. Connect power and wait for first boot (5-10 minutes)"
echo "   3. Kiosk will automatically install and start"
echo "   4. Access via SSH: ssh pi@$KIOSK_STATIC_IP"
echo ""
echo "🔧 Management commands:"
echo "   • Check status: ssh pi@$KIOSK_STATIC_IP 'sudo systemctl status kiosk'"
echo "   • View logs: ssh pi@$KIOSK_STATIC_IP 'journalctl -u kiosk -f'"
echo "   • Restart kiosk: ssh pi@$KIOSK_STATIC_IP 'sudo systemctl restart kiosk'"
echo ""
print_warning "Remember to remove the MicroSD card safely before inserting into Raspberry Pi!"
