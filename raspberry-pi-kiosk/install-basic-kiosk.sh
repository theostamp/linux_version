#!/bin/bash
# Basic Kiosk Installation Script for Raspberry Pi
# Run this script on the Raspberry Pi

set -e

echo "🏢 Installing Basic Building Management Kiosk..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "🔧 Installing required packages..."
sudo apt install -y \
    chromium-browser \
    xdotool \
    unclutter \
    x11-xserver-utils \
    lightdm \
    xserver-xorg-video-fbdev

# Create kiosk user (optional)
echo "👤 Setting up kiosk user..."
sudo useradd -m -s /bin/bash kiosk || true
sudo usermod -a -G audio,video,plugdev kiosk

# Copy kiosk files
echo "📁 Copying kiosk files..."
sudo cp kiosk.sh /home/pi/
sudo cp kiosk.service /etc/systemd/system/
sudo chmod +x /home/pi/kiosk.sh

# Configure systemd service
echo "⚙️ Configuring systemd service..."
sudo systemctl daemon-reload
sudo systemctl enable kiosk.service

# Configure autologin
echo "🔐 Configuring autologin..."
sudo systemctl set-default graphical.target
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d
sudo tee /etc/systemd/system/getty@tty1.service.d/autologin.conf > /dev/null <<EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi --noclear %I \$TERM
EOF

# Configure WiFi (if needed)
echo "📶 WiFi configuration..."
echo "Please configure WiFi manually:"
echo "sudo raspi-config"
echo "Or edit /etc/wpa_supplicant/wpa_supplicant.conf"

# Configure static IP (optional)
echo "🌐 Static IP configuration..."
echo "To configure static IP, edit /etc/dhcpcd.conf:"
echo "interface wlan0"
echo "static ip_address=192.168.1.100/24"
echo "static routers=192.168.1.1"
echo "static domain_name_servers=8.8.8.8 8.8.4.4"

# Disable screen blanking
echo "🖥️ Disabling screen blanking..."
sudo tee -a /etc/xdg/lxsession/LXDE-pi/autostart > /dev/null <<EOF
@xset s off
@xset -dpms
@xset s noblank
EOF

# Create health check script
echo "🏥 Creating health check script..."
sudo tee /home/pi/health-check.sh > /dev/null <<'EOF'
#!/bin/bash
# Health check script

# Check internet connectivity
if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    echo "$(date): No internet connection, restarting WiFi..."
    sudo systemctl restart wpa_supplicant
fi

# Check kiosk process
if ! pgrep -f "chromium-browser" > /dev/null; then
    echo "$(date): Kiosk not running, restarting..."
    sudo systemctl restart kiosk
fi
EOF

sudo chmod +x /home/pi/health-check.sh

# Setup cron job for health checks
echo "⏰ Setting up health check cron job..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/pi/health-check.sh >> /home/pi/kiosk-health.log 2>&1") | crontab -

echo "✅ Basic kiosk installation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Configure WiFi: sudo raspi-config"
echo "2. Update KIOSK_URL in /home/pi/kiosk.sh"
echo "3. Reboot: sudo reboot"
echo "4. The kiosk should start automatically"
echo ""
echo "🔧 Management commands:"
echo "- Start kiosk: sudo systemctl start kiosk"
echo "- Stop kiosk: sudo systemctl stop kiosk"
echo "- View logs: journalctl -u kiosk -f"
echo "- Health check: /home/pi/health-check.sh"
