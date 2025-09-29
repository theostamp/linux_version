#!/bin/bash
# Voice-Enabled Kiosk Installation Script
# Run this script on the Raspberry Pi

set -e

echo "🎤 Installing Voice-Enabled Building Management Kiosk..."

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
    xserver-xorg-video-fbdev \
    python3 \
    python3-pip \
    python3-venv \
    espeak \
    espeak-data \
    espeak-data-voices \
    alsa-utils \
    pulseaudio \
    pulseaudio-utils \
    pavucontrol \
    portaudio19-dev \
    python3-pyaudio \
    flac \
    sox \
    libsox-fmt-all

# Install Python packages for voice recognition
echo "🐍 Installing Python voice recognition packages..."
pip3 install --user \
    SpeechRecognition \
    pyaudio \
    requests \
    wave

# Create kiosk user (optional)
echo "👤 Setting up kiosk user..."
sudo useradd -m -s /bin/bash kiosk || true
sudo usermod -a -G audio,video,plugdev kiosk

# Copy kiosk files
echo "📁 Copying voice kiosk files..."
sudo cp voice-kiosk.sh /home/pi/
sudo cp voice-recognition.py /home/pi/
sudo cp voice-kiosk.service /etc/systemd/system/
sudo chmod +x /home/pi/voice-kiosk.sh
sudo chmod +x /home/pi/voice-recognition.py

# Configure systemd service
echo "⚙️ Configuring systemd service..."
sudo systemctl daemon-reload
sudo systemctl enable voice-kiosk.service

# Configure autologin
echo "🔐 Configuring autologin..."
sudo systemctl set-default graphical.target
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d
sudo tee /etc/systemd/system/getty@tty1.service.d/autologin.conf > /dev/null <<EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi --noclear %I \$TERM
EOF

# Configure audio system
echo "🔊 Configuring audio system..."
# Add user to audio group
sudo usermod -a -G audio pi

# Configure PulseAudio
sudo tee /etc/pulse/default.pa > /dev/null <<EOF
# Load audio drivers
load-module module-alsa-sink
load-module module-alsa-source device=hw:1,0
load-module module-udev-detect
load-module module-switch-on-connect

# Set default devices
set-default-sink alsa_output.usb-USB_PnP_Audio_Device-00.analog-stereo
set-default-source alsa_input.usb-USB_PnP_Audio_Device-00.analog-mono
EOF

# Configure ALSA
sudo tee /etc/asound.conf > /dev/null <<EOF
pcm.!default {
    type pulse
}
ctl.!default {
    type pulse
}
EOF

# Test audio devices
echo "🎵 Testing audio devices..."
# List audio devices
echo "Available audio devices:"
aplay -l
arecord -l

# Test microphone
echo "🎤 Testing microphone..."
timeout 3s arecord -f cd -t wav /tmp/mic_test.wav
if [ $? -eq 0 ]; then
    echo "✅ Microphone test successful"
    rm /tmp/mic_test.wav
else
    echo "❌ Microphone test failed"
fi

# Test speakers
echo "🔊 Testing speakers..."
speaker-test -t wav -c 2 -l 1 &
SPEAKER_PID=$!
sleep 2
kill $SPEAKER_PID 2>/dev/null

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

# Create voice commands help file
echo "📋 Creating voice commands help..."
sudo tee /home/pi/voice-commands.txt > /dev/null <<EOF
🎤 Voice Commands for Building Management Kiosk

Greek Commands:
- "ανακοινώσεις" - Show announcements
- "ψηφοφορίες" - Show votes
- "οικονομικά" - Show financial information
- "συντήρηση" - Show maintenance information
- "αρχική" or "κύρια" - Go to home page
- "ανανέωση" - Refresh page
- "βοήθεια" - Show help
- "πληροφορίες" - Show building information
- "καιρός" - Show weather
- "ώρα" - Show current time
- "ημερομηνία" - Show current date

English Commands:
- "announcements" - Show announcements
- "votes" - Show votes
- "financial" - Show financial information
- "maintenance" - Show maintenance information
- "home" - Go to home page
- "refresh" - Refresh page
- "help" - Show help
- "info" - Show building information
- "weather" - Show weather
- "time" - Show current time
- "date" - Show current date

Tips:
- Speak clearly and wait for the beep
- Commands work in both Greek and English
- The system will provide audio feedback
- Use "βοήθεια" or "help" for assistance
EOF

# Create health check script
echo "🏥 Creating health check script..."
sudo tee /home/pi/voice-health-check.sh > /dev/null <<'EOF'
#!/bin/bash
# Voice kiosk health check script

# Check internet connectivity
if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    echo "$(date): No internet connection, restarting WiFi..."
    sudo systemctl restart wpa_supplicant
fi

# Check kiosk process
if ! pgrep -f "chromium-browser" > /dev/null; then
    echo "$(date): Kiosk not running, restarting..."
    sudo systemctl restart voice-kiosk
fi

# Check voice recognition process
if ! pgrep -f "voice-recognition.py" > /dev/null; then
    echo "$(date): Voice recognition not running, restarting..."
    sudo systemctl restart voice-kiosk
fi

# Check audio devices
if ! aplay -l > /dev/null 2>&1; then
    echo "$(date): Audio devices not working, restarting audio..."
    sudo systemctl restart pulseaudio
fi
EOF

sudo chmod +x /home/pi/voice-health-check.sh

# Setup cron job for health checks
echo "⏰ Setting up health check cron job..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/pi/voice-health-check.sh >> /home/pi/voice-kiosk-health.log 2>&1") | crontab -

# Create voice test script
echo "🧪 Creating voice test script..."
sudo tee /home/pi/test-voice.sh > /dev/null <<'EOF'
#!/bin/bash
# Voice recognition test script

echo "🎤 Testing voice recognition..."
echo "Say one of these commands:"
echo "- ανακοινώσεις (announcements)"
echo "- ψηφοφορίες (votes)"
echo "- οικονομικά (financial)"
echo "- συντήρηση (maintenance)"
echo "- αρχική (home)"
echo ""

# Test microphone
echo "🎤 Testing microphone..."
timeout 5s arecord -f cd -t wav /tmp/voice_test.wav
if [ $? -eq 0 ]; then
    echo "✅ Microphone recording successful"
    rm /tmp/voice_test.wav
else
    echo "❌ Microphone recording failed"
fi

# Test text-to-speech
echo "🔊 Testing text-to-speech..."
espeak -v el "Δοκιμή φωνητικής αναγνώρισης" --stdout | aplay -q

echo "✅ Voice test completed"
EOF

sudo chmod +x /home/pi/test-voice.sh

echo "✅ Voice-enabled kiosk installation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Configure WiFi: sudo raspi-config"
echo "2. Update KIOSK_URL in /home/pi/voice-kiosk.sh"
echo "3. Test voice recognition: /home/pi/test-voice.sh"
echo "4. Reboot: sudo reboot"
echo "5. The voice kiosk should start automatically"
echo ""
echo "🎤 Voice Commands:"
echo "- Say 'ανακοινώσεις' for announcements"
echo "- Say 'ψηφοφορίες' for votes"
echo "- Say 'οικονομικά' for financial info"
echo "- Say 'συντήρηση' for maintenance"
echo "- Say 'αρχική' for home page"
echo "- Say 'βοήθεια' for help"
echo ""
echo "🔧 Management commands:"
echo "- Start kiosk: sudo systemctl start voice-kiosk"
echo "- Stop kiosk: sudo systemctl stop voice-kiosk"
echo "- View logs: journalctl -u voice-kiosk -f"
echo "- Test voice: /home/pi/test-voice.sh"
echo "- View commands: cat /home/pi/voice-commands.txt"
