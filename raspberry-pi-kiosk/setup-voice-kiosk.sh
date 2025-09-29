#!/bin/bash
# 🍓 Voice-Enabled Building Management Kiosk - Complete Setup
# Run this script ONCE after Raspberry Pi OS installation
#
# Author: New Concierge Team
# Version: 2.0
# Date: 2025-09-29

set -e  # Exit on error

# ========================================
# Configuration
# ========================================

# Server Configuration (EDIT THESE)
SERVER_URL="${SERVER_URL:-http://192.168.1.100:3000}"
BUILDING_ID="${BUILDING_ID:-1}"
KIOSK_URL="${SERVER_URL}/kiosk-display"

# Voice Configuration
VOICE_LANGUAGE="el-GR"  # Greek language
VOICE_CONTINUOUS=true
VOICE_AUTO_RESTART=true

# System Configuration
KIOSK_USER="pi"
INSTALL_DIR="/home/${KIOSK_USER}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# Helper Functions
# ========================================

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        echo "Run: sudo ./setup-voice-kiosk.sh"
        exit 1
    fi
}

# ========================================
# Main Setup
# ========================================

print_header "🍓 Voice-Enabled Building Management Kiosk Setup"

echo "Configuration:"
echo "  • Server URL: ${SERVER_URL}"
echo "  • Kiosk URL: ${KIOSK_URL}"
echo "  • Building ID: ${BUILDING_ID}"
echo "  • Voice Language: ${VOICE_LANGUAGE}"
echo "  • Install Directory: ${INSTALL_DIR}"
echo ""

# Check root privileges
check_root

# ========================================
# Step 1: System Update
# ========================================

print_header "Step 1/8: Updating System Packages"
apt update
apt upgrade -y
print_step "System packages updated"

# ========================================
# Step 2: Install Core Packages
# ========================================

print_header "Step 2/8: Installing Core Packages"

apt install -y \
    chromium-browser \
    xserver-xorg \
    x11-xserver-utils \
    xinit \
    openbox \
    unclutter \
    xdotool \
    lightdm \
    --no-install-recommends

print_step "Core packages installed"

# ========================================
# Step 3: Install Audio Packages
# ========================================

print_header "Step 3/8: Installing Audio System"

apt install -y \
    alsa-utils \
    pulseaudio \
    pulseaudio-utils \
    portaudio19-dev \
    libportaudio2 \
    --no-install-recommends

# Add user to audio group
usermod -a -G audio ${KIOSK_USER}
print_step "Audio system installed"

# ========================================
# Step 4: Configure Display
# ========================================

print_header "Step 4/8: Configuring Display Settings"

# Disable screen blanking
if ! grep -q "hdmi_blanking" /boot/firmware/config.txt; then
    cat >> /boot/firmware/config.txt <<EOF

# Kiosk Display Configuration
hdmi_force_hotplug=1
hdmi_blanking=1
disable_overscan=1
EOF
fi

print_step "Display configured"

# ========================================
# Step 5: Configure Auto-login
# ========================================

print_header "Step 5/8: Configuring Auto-login"

# Set graphical target
systemctl set-default graphical.target

# Configure auto-login
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf <<EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${KIOSK_USER} --noclear %I \$TERM
EOF

print_step "Auto-login configured"

# ========================================
# Step 6: Create Kiosk Startup Script
# ========================================

print_header "Step 6/8: Creating Kiosk Startup Script"

cat > ${INSTALL_DIR}/start-kiosk.sh <<'SCRIPT_EOF'
#!/bin/bash
# Kiosk Display Startup Script

# Wait for network (30 second timeout)
echo "⏳ Waiting for network..."
timeout=30
while ! ping -c 1 -W 1 8.8.8.8 > /dev/null 2>&1; do
    if [ $timeout -le 0 ]; then
        echo "❌ Network timeout"
        break
    fi
    sleep 1
    timeout=$((timeout-1))
done

# Configure X server
export DISPLAY=:0
xset s off
xset -dpms
xset s noblank

# Hide mouse cursor
unclutter -idle 0.1 -root &

# Start window manager
openbox &

# Give window manager time to start
sleep 2

# Start Chromium in kiosk mode
chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --no-first-run \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --disable-translate \
    --disable-features=TranslateUI \
    --disable-suggestions-ui \
    --disable-save-password-bubble \
    --start-fullscreen \
    --check-for-update-interval=31536000 \
    --app="KIOSK_URL_PLACEHOLDER" &

# Keep script running
wait
SCRIPT_EOF

# Replace placeholders
sed -i "s|KIOSK_URL_PLACEHOLDER|${KIOSK_URL}|g" ${INSTALL_DIR}/start-kiosk.sh
chmod +x ${INSTALL_DIR}/start-kiosk.sh
chown ${KIOSK_USER}:${KIOSK_USER} ${INSTALL_DIR}/start-kiosk.sh

print_step "Kiosk startup script created"

# ========================================
# Step 7: Configure X Auto-start
# ========================================

print_header "Step 7/8: Configuring X Auto-start"

# Create .xinitrc
cat > ${INSTALL_DIR}/.xinitrc <<EOF
#!/bin/bash
exec ${INSTALL_DIR}/start-kiosk.sh
EOF
chmod +x ${INSTALL_DIR}/.xinitrc
chown ${KIOSK_USER}:${KIOSK_USER} ${INSTALL_DIR}/.xinitrc

# Auto-start X on login
if ! grep -q "startx" ${INSTALL_DIR}/.bash_profile 2>/dev/null; then
    cat >> ${INSTALL_DIR}/.bash_profile <<EOF

# Auto-start X server on login (tty1 only)
if [ -z "\$DISPLAY" ] && [ "\$(tty)" = "/dev/tty1" ]; then
    startx -- -nocursor
fi
EOF
    chown ${KIOSK_USER}:${KIOSK_USER} ${INSTALL_DIR}/.bash_profile
fi

print_step "X auto-start configured"

# ========================================
# Step 8: Create Management Tools
# ========================================

print_header "Step 8/8: Creating Management Tools"

# Voice commands help
cat > ${INSTALL_DIR}/voice-commands.txt <<EOF
🎤 VOICE COMMANDS FOR KIOSK DISPLAY
═══════════════════════════════════

GREEK COMMANDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📢 "ανακοινώσεις"       - Show announcements slide
  🗳️  "ψηφοφορίες"         - Show votes slide
  💰 "οικονομικά"         - Show financial information
  🔧 "συντήρηση"          - Show maintenance information
  🏠 "αρχική"             - Go to first slide
  ▶️  "επόμενο"            - Next slide
  ◀️  "προηγούμενο"        - Previous slide
  ⏸️  "παύση"              - Pause auto-play
  ▶️  "συνέχεια"           - Resume auto-play
  ❓ "βοήθεια"            - Show help

ENGLISH COMMANDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📢 "announcements"      - Show announcements slide
  🗳️  "votes"              - Show votes slide
  💰 "financial"          - Show financial information
  🔧 "maintenance"        - Show maintenance information
  🏠 "home"               - Go to first slide
  ▶️  "next"               - Next slide
  ◀️  "previous"           - Previous slide
  ⏸️  "pause"              - Pause auto-play
  ▶️  "resume"             - Resume auto-play
  ❓ "help"               - Show help

TIPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Click the 🎤 microphone button to enable voice control
  • Speak clearly and naturally
  • Commands work in both Greek and English
  • You'll see feedback on screen when commands are recognized
  • The green dot shows when the system is listening

KEYBOARD SHORTCUTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  F11     - Toggle fullscreen
  Esc     - Exit fullscreen

TROUBLESHOOTING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • If voice doesn't work, check microphone permissions
  • Refresh page (Ctrl+R) if issues occur
  • Check internet connection for voice recognition
EOF

# Restart script
cat > ${INSTALL_DIR}/restart-kiosk.sh <<EOF
#!/bin/bash
# Restart Kiosk Display

pkill chromium
pkill xinit
pkill Xorg

# Restart X server
sudo systemctl restart lightdm

echo "✓ Kiosk restarted"
EOF
chmod +x ${INSTALL_DIR}/restart-kiosk.sh

# Test audio script
cat > ${INSTALL_DIR}/test-audio.sh <<'EOF'
#!/bin/bash
# Test Audio Devices

echo "🎵 Testing Audio Devices"
echo "========================"
echo ""

echo "📋 Available Playback Devices:"
aplay -l
echo ""

echo "📋 Available Recording Devices:"
arecord -l
echo ""

echo "🎤 Testing Microphone (recording 3 seconds)..."
arecord -d 3 -f cd /tmp/mic_test.wav
echo "✓ Recording complete"
echo ""

echo "🔊 Playing back recording..."
aplay /tmp/mic_test.wav
rm /tmp/mic_test.wav
echo ""

echo "✓ Audio test complete"
EOF
chmod +x ${INSTALL_DIR}/test-audio.sh

# Configuration update script
cat > ${INSTALL_DIR}/update-config.sh <<EOF
#!/bin/bash
# Update Kiosk Configuration

echo "Current configuration:"
echo "  Server URL: ${SERVER_URL}"
echo "  Building ID: ${BUILDING_ID}"
echo ""

read -p "Enter new Server URL (or press Enter to keep current): " new_url
read -p "Enter new Building ID (or press Enter to keep current): " new_id

if [ ! -z "\$new_url" ]; then
    sed -i "s|http://[^/]*/kiosk-display|\${new_url}/kiosk-display|g" ${INSTALL_DIR}/start-kiosk.sh
    echo "✓ Server URL updated to: \${new_url}"
fi

if [ ! -z "\$new_id" ]; then
    echo "✓ Building ID updated to: \${new_id}"
fi

echo ""
echo "Restart kiosk to apply changes:"
echo "  ${INSTALL_DIR}/restart-kiosk.sh"
EOF
chmod +x ${INSTALL_DIR}/update-config.sh

# Chown all scripts
chown ${KIOSK_USER}:${KIOSK_USER} ${INSTALL_DIR}/*.sh ${INSTALL_DIR}/*.txt

print_step "Management tools created"

# ========================================
# Completion
# ========================================

print_header "🎉 Installation Complete!"

echo -e "${GREEN}✓ Voice-enabled kiosk setup completed successfully!${NC}"
echo ""
echo "📋 Configuration Summary:"
echo "  • Kiosk URL: ${KIOSK_URL}"
echo "  • Voice Language: ${VOICE_LANGUAGE}"
echo "  • User: ${KIOSK_USER}"
echo "  • Install Dir: ${INSTALL_DIR}"
echo ""
echo "📚 Management Commands:"
echo "  • View voice commands:  cat ${INSTALL_DIR}/voice-commands.txt"
echo "  • Restart kiosk:        ${INSTALL_DIR}/restart-kiosk.sh"
echo "  • Update config:        ${INSTALL_DIR}/update-config.sh"
echo "  • Test audio:           ${INSTALL_DIR}/test-audio.sh"
echo ""
echo "🎤 Voice Control:"
echo "  • Voice control is built into the web interface"
echo "  • Click the 🎤 microphone button to enable"
echo "  • Say commands like 'ανακοινώσεις' or 'announcements'"
echo ""
echo "🔄 Next Steps:"
echo "  1. Reboot the Raspberry Pi: sudo reboot"
echo "  2. The kiosk will start automatically"
echo "  3. Click the 🎤 button to enable voice navigation"
echo "  4. Speak commands to navigate slides"
echo ""
echo "⚠️  Important:"
echo "  • Make sure ${SERVER_URL} is accessible from this device"
echo "  • Connect a microphone for voice navigation"
echo "  • Allow microphone access in the browser"
echo ""

print_warning "Rebooting in 10 seconds..."
echo "Press Ctrl+C to cancel"
sleep 10

reboot