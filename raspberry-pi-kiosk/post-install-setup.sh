#!/bin/bash
# Post-Installation Setup Script
# This script configures the MicroSD after Raspberry Pi OS is written

echo "🔧 Post-Installation Setup"
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
echo "   • Hostname: $KIOSK_HOSTNAME"
echo "   • WiFi: $KIOSK_SSID"
echo "   • Static IP: $KIOSK_STATIC_IP"
echo "   • Server: $KIOSK_SERVER_URL"
echo "   • Building ID: $KIOSK_BUILDING_ID"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Check if device has partitions
PARTITIONS=$(lsblk -l | grep "$DEVICE" | wc -l)
if [ "$PARTITIONS" -le 1 ]; then
    echo "❌ No partitions found on /dev/$DEVICE"
    echo "   Please write Raspberry Pi OS image first"
    echo "   Run: sudo ./check-and-setup.sh"
    exit 1
fi

echo "✅ MicroSD partitions found"
echo ""

# Find boot and root partitions
if [[ "$DEVICE" == mmcblk* ]]; then
    BOOT_PARTITION="/dev/${DEVICE}p1"
    ROOT_PARTITION="/dev/${DEVICE}p2"
else
    BOOT_PARTITION="/dev/${DEVICE}1"
    ROOT_PARTITION="/dev/${DEVICE}2"
fi

echo "📁 Partitions:"
echo "   • Boot: $BOOT_PARTITION"
echo "   • Root: $ROOT_PARTITION"
echo ""

# Create mount points
BOOT_MOUNT="/mnt/kiosk-boot"
ROOT_MOUNT="/mnt/kiosk-root"

mkdir -p "$BOOT_MOUNT" "$ROOT_MOUNT"

# Mount partitions
echo "📁 Mounting partitions..."
mount "$BOOT_PARTITION" "$BOOT_MOUNT"
mount "$ROOT_PARTITION" "$ROOT_MOUNT"

if [ $? -eq 0 ]; then
    echo "✅ Partitions mounted successfully"
else
    echo "❌ Failed to mount partitions"
    exit 1
fi

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
