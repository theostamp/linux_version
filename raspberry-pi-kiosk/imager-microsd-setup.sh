#!/bin/bash
# Raspberry Pi Imager MicroSD Setup Script
# Uses Raspberry Pi Imager for easy setup

set -e

# Configuration
KIOSK_HOSTNAME="building-kiosk"
KIOSK_SSID=""
KIOSK_PASSWORD=""
KIOSK_STATIC_IP="192.168.1.100"
KIOSK_SERVER_URL="http://your-server:3000"
KIOSK_BUILDING_ID="1"

echo "🍓 Raspberry Pi Imager - Kiosk Setup"
echo "===================================="

# Check if Raspberry Pi Imager is installed
if ! command -v rpi-imager &> /dev/null; then
    echo "❌ Raspberry Pi Imager not found!"
    echo ""
    echo "Please install Raspberry Pi Imager first:"
    echo "  • Download from: https://www.raspberrypi.org/downloads/"
    echo "  • Or install via package manager"
    echo ""
    echo "Alternative: Use quick-microsd-setup.sh for manual setup"
    exit 1
fi

echo "✅ Raspberry Pi Imager found"
echo ""

# Get user input
echo "Please provide the following information:"
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

# Create custom settings file for Raspberry Pi Imager
echo "📝 Creating custom settings..."
cat > kiosk-imager-settings.json << EOF
{
    "custom_options": {
        "hostname": "$KIOSK_HOSTNAME",
        "ssh": true,
        "wifi": {
            "ssid": "$KIOSK_SSID",
            "password": "$KIOSK_PASSWORD"
        },
        "static_ip": {
            "enabled": true,
            "ip": "$KIOSK_STATIC_IP",
            "gateway": "192.168.1.1",
            "dns": "8.8.8.8"
        },
        "locale": {
            "country": "GR",
            "timezone": "Europe/Athens"
        }
    }
}
EOF

echo "✅ Custom settings created: kiosk-imager-settings.json"
echo ""

# Create post-installation script
echo "📝 Creating post-installation script..."
cat > kiosk-post-install.sh << 'EOF'
#!/bin/bash
# Post-installation script for kiosk setup

echo "🍓 Starting kiosk post-installation..."

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

# Copy kiosk files (assuming they were copied to /boot)
if [ -d "/boot/kiosk-setup" ]; then
    cp -r /boot/kiosk-setup/* /home/pi/
    chmod +x /home/pi/*.sh
    chmod +x /home/pi/*.py
fi

# Configure systemd services
if [ -f "/home/pi/kiosk.service" ]; then
    cp /home/pi/kiosk.service /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable kiosk.service
fi

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
# Health check script

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

echo "✅ Kiosk post-installation completed!"
echo "🔄 Rebooting in 10 seconds..."
sleep 10
reboot
EOF

chmod +x kiosk-post-install.sh

echo "✅ Post-installation script created: kiosk-post-install.sh"
echo ""

# Instructions for using Raspberry Pi Imager
echo "🚀 Raspberry Pi Imager Setup Instructions:"
echo "=========================================="
echo ""
echo "1. Launch Raspberry Pi Imager:"
echo "   rpi-imager"
echo ""
echo "2. In Raspberry Pi Imager:"
echo "   • Click 'Choose OS' → 'Raspberry Pi OS Lite (64-bit)'"
echo "   • Click 'Choose Storage' → Select your MicroSD card"
echo "   • Click the gear icon (⚙️) for advanced options"
echo ""
echo "3. In Advanced Options:"
echo "   • Enable SSH"
echo "   • Set hostname: $KIOSK_HOSTNAME"
echo "   • Configure WiFi:"
echo "     - SSID: $KIOSK_SSID"
echo "     - Password: [your password]"
echo "   • Set static IP: $KIOSK_STATIC_IP"
echo "   • Set locale: Greece/Athens"
echo ""
echo "4. After writing the image:"
echo "   • Mount the boot partition"
echo "   • Copy kiosk files to the boot partition:"
echo "     cp -r . /path/to/boot/kiosk-setup/"
echo "   • Copy post-installation script:"
echo "     cp kiosk-post-install.sh /path/to/boot/"
echo ""
echo "5. Create first-boot service:"
echo "   • Mount the root partition"
echo "   • Copy the service file to enable auto-installation"
echo ""
echo "📋 Configuration Summary:"
echo "   • Hostname: $KIOSK_HOSTNAME"
echo "   • WiFi: $KIOSK_SSID"
echo "   • Static IP: $KIOSK_STATIC_IP"
echo "   • Server: $KIOSK_SERVER_URL"
echo "   • Building ID: $KIOSK_BUILDING_ID"
echo ""
echo "🎯 Alternative: Use the automated script instead:"
echo "   ./quick-microsd-setup.sh"
echo ""
echo "This will handle everything automatically!"
