#!/bin/bash
# 🍓 Offline Voice-Enabled Kiosk Setup
# Complete setup with Greek offline voice recognition using Vosk
#
# Author: New Concierge Team
# Version: 3.0 - Offline Voice
# Date: 2025-09-29

set -e  # Exit on error

# ========================================
# Configuration
# ========================================

SERVER_URL="${SERVER_URL:-http://192.168.1.100:3000}"
BUILDING_ID="${BUILDING_ID:-1}"
KIOSK_URL="${SERVER_URL}/kiosk-display"

# Vosk model configuration
VOSK_MODEL_NAME="vosk-model-small-el-gr-0.7"
VOSK_MODEL_URL="https://alphacephei.com/vosk/models/${VOSK_MODEL_NAME}.zip"
VOSK_MODEL_PATH="/home/pi/${VOSK_MODEL_NAME}"

KIOSK_USER="pi"
INSTALL_DIR="/home/${KIOSK_USER}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
        echo "Run: sudo ./setup-offline-voice-kiosk.sh"
        exit 1
    fi
}

# ========================================
# Main Setup
# ========================================

print_header "🍓 Offline Voice-Enabled Kiosk Setup"

echo "Configuration:"
echo "  • Server URL: ${SERVER_URL}"
echo "  • Kiosk URL: ${KIOSK_URL}"
echo "  • Building ID: ${BUILDING_ID}"
echo "  • Vosk Model: ${VOSK_MODEL_NAME}"
echo "  • Install Directory: ${INSTALL_DIR}"
echo ""

check_root

# ========================================
# Step 1: System Update
# ========================================

print_header "Step 1/10: Updating System Packages"
apt update
apt upgrade -y
print_step "System packages updated"

# ========================================
# Step 2: Install Core Packages
# ========================================

print_header "Step 2/10: Installing Core Packages"

apt install -y \
    chromium-browser \
    xserver-xorg \
    x11-xserver-utils \
    xinit \
    openbox \
    unclutter \
    xdotool \
    lightdm \
    wget \
    unzip \
    --no-install-recommends

print_step "Core packages installed"

# ========================================
# Step 3: Install Audio Packages
# ========================================

print_header "Step 3/10: Installing Audio System"

apt install -y \
    alsa-utils \
    pulseaudio \
    pulseaudio-utils \
    portaudio19-dev \
    libportaudio2 \
    python3-pyaudio \
    --no-install-recommends

usermod -a -G audio ${KIOSK_USER}
print_step "Audio system installed"

# ========================================
# Step 4: Install Python Packages
# ========================================

print_header "Step 4/10: Installing Python Voice Recognition"

apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    --no-install-recommends

# Install voice recognition packages as user
sudo -u ${KIOSK_USER} pip3 install --user \
    vosk \
    sounddevice \
    websockets

print_step "Python packages installed"

# ========================================
# Step 5: Download Vosk Greek Model
# ========================================

print_header "Step 5/10: Downloading Greek Voice Model"

if [ ! -d "${VOSK_MODEL_PATH}" ]; then
    echo "📥 Downloading ${VOSK_MODEL_NAME}..."
    echo "   Size: ~45MB, this may take a few minutes"

    cd /home/${KIOSK_USER}

    # Download model
    sudo -u ${KIOSK_USER} wget -q --show-progress ${VOSK_MODEL_URL}

    # Extract
    echo "📦 Extracting model..."
    sudo -u ${KIOSK_USER} unzip -q ${VOSK_MODEL_NAME}.zip
    rm ${VOSK_MODEL_NAME}.zip

    print_step "Greek voice model installed"
else
    print_step "Greek voice model already exists"
fi

# ========================================
# Step 6: Install Voice Keyword Spotter
# ========================================

print_header "Step 6/10: Installing Voice Keyword Spotter"

# Copy Python script
if [ -f "voice-keyword-spotter.py" ]; then
    cp voice-keyword-spotter.py ${INSTALL_DIR}/
    chmod +x ${INSTALL_DIR}/voice-keyword-spotter.py
    chown ${KIOSK_USER}:${KIOSK_USER} ${INSTALL_DIR}/voice-keyword-spotter.py
    print_step "Keyword spotter installed"
else
    print_warning "voice-keyword-spotter.py not found, skipping"
fi

# Create systemd service
cat > /etc/systemd/system/voice-spotter.service <<EOF
[Unit]
Description=Offline Voice Keyword Spotter
After=network.target sound.target

[Service]
Type=simple
User=${KIOSK_USER}
WorkingDirectory=${INSTALL_DIR}
Environment="VOSK_MODEL_PATH=${VOSK_MODEL_PATH}"
ExecStart=/usr/bin/python3 ${INSTALL_DIR}/voice-keyword-spotter.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable voice-spotter.service

print_step "Voice spotter service configured"

# ========================================
# Step 7: Configure Display
# ========================================

print_header "Step 7/10: Configuring Display Settings"

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
# Step 8: Configure Auto-login
# ========================================

print_header "Step 8/10: Configuring Auto-login"

systemctl set-default graphical.target

mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf <<EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${KIOSK_USER} --noclear %I \$TERM
EOF

print_step "Auto-login configured"

# ========================================
# Step 9: Create Kiosk Startup Script
# ========================================

print_header "Step 9/10: Creating Kiosk Startup Script"

cat > ${INSTALL_DIR}/start-kiosk.sh <<'SCRIPT_EOF'
#!/bin/bash
# Kiosk Display Startup Script with Offline Voice

# Wait for network
echo "⏳ Waiting for network..."
timeout=30
while ! ping -c 1 -W 1 8.8.8.8 > /dev/null 2>&1; do
    if [ $timeout -le 0 ]; then
        echo "⚠️  No network (continuing anyway for offline mode)"
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
# Step 10: Configure X Auto-start
# ========================================

print_header "Step 10/10: Configuring X Auto-start"

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
# Create Management Tools
# ========================================

print_header "Creating Management Tools"

# Test voice script
cat > ${INSTALL_DIR}/test-voice.sh <<'EOF'
#!/bin/bash
# Test offline voice recognition

echo "🎤 Testing Offline Voice Recognition"
echo "===================================="
echo ""

echo "📊 Checking voice spotter service..."
sudo systemctl status voice-spotter --no-pager

echo ""
echo "🔊 Testing microphone..."
arecord -l

echo ""
echo "📋 Configured keywords:"
echo "  • ανακοινώσεις (announcements)"
echo "  • ψηφοφορίες (votes)"
echo "  • οικονομικά (financial)"
echo "  • συντήρηση (maintenance)"
echo "  • επόμενο (next)"
echo "  • προηγούμενο (previous)"
echo ""
echo "✅ Voice test ready!"
echo ""
echo "To see live voice detection:"
echo "  sudo journalctl -u voice-spotter -f"
EOF
chmod +x ${INSTALL_DIR}/test-voice.sh

# Restart script
cat > ${INSTALL_DIR}/restart-kiosk.sh <<EOF
#!/bin/bash
# Restart Kiosk Display and Voice

sudo systemctl restart voice-spotter
pkill chromium
pkill xinit
pkill Xorg

sudo systemctl restart lightdm

echo "✓ Kiosk and voice restarted"
EOF
chmod +x ${INSTALL_DIR}/restart-kiosk.sh

# Keywords reference
cat > ${INSTALL_DIR}/voice-keywords.txt <<'EOF'
🎤 OFFLINE VOICE KEYWORDS
═══════════════════════════════════

GREEK KEYWORDS (Ελληνικά):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📢 "ανακοινώσεις"       - Announcements slide
  🗳️  "ψηφοφορίες"         - Votes slide
  💰 "οικονομικά"         - Financial slide
  🔧 "συντήρηση"          - Maintenance slide
  🏠 "αρχική"             - Home slide
  ▶️  "επόμενο"            - Next slide
  ◀️  "προηγούμενο"        - Previous slide
  ⏸️  "παύση"              - Pause auto-play
  ▶️  "συνέχεια"           - Resume auto-play

NUMBER KEYWORDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1️⃣  "ένα" / "μία"        - Slide 1
  2️⃣  "δύο"               - Slide 2
  3️⃣  "τρία"              - Slide 3
  4️⃣  "τέσσερα"           - Slide 4

FEATURES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ 100% Offline - No internet required!
  ✅ Greek language optimized
  ✅ Fast keyword spotting
  ✅ WebSocket real-time communication
  ✅ Auto-reconnect on disconnect

TECHNICAL INFO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Engine: Vosk (Greek model)
  Model Size: ~45MB
  WebSocket Port: 8765
  Service: voice-spotter.service

MANAGEMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Start:   sudo systemctl start voice-spotter
  Stop:    sudo systemctl stop voice-spotter
  Status:  sudo systemctl status voice-spotter
  Logs:    sudo journalctl -u voice-spotter -f
  Test:    ./test-voice.sh
EOF

# Chown all scripts
chown ${KIOSK_USER}:${KIOSK_USER} ${INSTALL_DIR}/*.sh ${INSTALL_DIR}/*.txt

print_step "Management tools created"

# ========================================
# Completion
# ========================================

print_header "🎉 Installation Complete!"

echo -e "${GREEN}✓ Offline voice-enabled kiosk setup completed!${NC}"
echo ""
echo "📋 Configuration Summary:"
echo "  • Kiosk URL: ${KIOSK_URL}"
echo "  • Vosk Model: ${VOSK_MODEL_NAME}"
echo "  • WebSocket Port: 8765"
echo "  • User: ${KIOSK_USER}"
echo "  • Install Dir: ${INSTALL_DIR}"
echo ""
echo "🎤 Voice Recognition:"
echo "  • Engine: Vosk (Offline)"
echo "  • Language: Greek"
echo "  • Keywords: 25+ commands"
echo "  • Internet: NOT required!"
echo ""
echo "📚 Management Commands:"
echo "  • Test voice:           ${INSTALL_DIR}/test-voice.sh"
echo "  • Restart kiosk:        ${INSTALL_DIR}/restart-kiosk.sh"
echo "  • View keywords:        cat ${INSTALL_DIR}/voice-keywords.txt"
echo "  • Voice logs:           sudo journalctl -u voice-spotter -f"
echo ""
echo "🔄 Next Steps:"
echo "  1. Reboot the Raspberry Pi: sudo reboot"
echo "  2. Kiosk will start automatically"
echo "  3. Voice recognition starts automatically"
echo "  4. Speak keywords to navigate!"
echo ""
echo "⚠️  Important:"
echo "  • Connect a microphone before booting"
echo "  • Voice works 100% offline (no internet needed)"
echo "  • Speak clearly in Greek"
echo ""

print_warning "Rebooting in 10 seconds..."
echo "Press Ctrl+C to cancel"
sleep 10

reboot