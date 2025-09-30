# 🖥️ Passive Kiosk Display Setup - Pi Zero 2W

**Production setup για 32"+ non-touch displays με auto-rotating content**

## 📋 Hardware Requirements

- **Raspberry Pi Zero 2W**: €15 (WiFi built-in)
- **32"+ HDMI Display**: Customer provides
- **MicroSD Card**: 16GB+ (€8)
- **Power Supply**: 5V/2.5A USB-C (€8)
- **HDMI Cable**: Standard HDMI (€5)
- **Optional: Wireless Remote**: For manual navigation (€12)

**Total Cost: €36-48 per kiosk** (excluding display)

## 🎯 Features

### Auto-Rotating Display
- ✅ **8-second intervals** between slides
- ✅ **Automatic loop** through all content
- ✅ **Zero interaction** required
- ✅ **Always-on display** for lobby/common areas

### Content Slides
1. **Announcements** - Ανακοινώσεις & ψηφοφορίες
2. **Financial** - Οικονομικά & ταμείο
3. **Maintenance** - Συντήρηση & επείγοντα
4. **Buildings** - Στατιστικά πολυκατοικίας
5. **Weather** - Καιρός & πρόγνωση

### Optional Remote Control
- **Arrow Keys**: Next/Previous slide
- **Space Bar**: Pause/Resume auto-play
- **Home Key**: Return to first slide
- **Number Keys (1-9)**: Direct slide access

## 🚀 Quick Setup

### 1. Prepare MicroSD Card

**Using Raspberry Pi Imager:**

1. Download: https://www.raspberrypi.com/software/
2. Select OS: **Raspberry Pi OS Lite (64-bit)**
3. Select Storage: Your MicroSD card
4. Click ⚙️ (Settings) and configure:
   ```
   Hostname: kiosk-display
   WiFi SSID: [Your WiFi]
   WiFi Password: [Your Password]
   Enable SSH: Yes
   Username: pi
   Password: [Your Password]
   ```
5. Write to MicroSD card

### 2. Install Kiosk Software

**Boot Raspberry Pi and SSH:**
```bash
ssh pi@kiosk-display.local
```

**Run setup script:**
```bash
# Download setup script
curl -o setup-kiosk.sh https://[your-server]/setup-kiosk.sh

# Make executable
chmod +x setup-kiosk.sh

# Run setup (takes 10-15 minutes)
sudo ./setup-kiosk.sh
```

**Script will:**
- Install Chromium browser
- Configure auto-login
- Setup kiosk mode (fullscreen)
- Configure auto-start on boot
- Disable screen blanking
- Setup frontend URL

### 3. Configure Kiosk URL

Edit kiosk URL to point to your frontend:
```bash
sudo nano /home/pi/.config/autostart/kiosk.desktop

# Change URL to:
# https://your-domain.com/kiosk-display
```

### 4. Reboot

```bash
sudo reboot
```

Display will boot directly into kiosk fullscreen mode!

## 🔧 Setup Script (setup-kiosk.sh)

```bash
#!/bin/bash
# Simple Kiosk Setup for Raspberry Pi Zero 2W
# No voice recognition - passive auto-rotating display

set -e

echo "🖥️ Installing Kiosk Display..."

# Update system
sudo apt update
sudo apt upgrade -y

# Install Chromium
sudo apt install -y chromium-browser x11-xserver-utils unclutter

# Disable screen blanking
sudo raspi-config nonint do_blanking 1

# Setup auto-login
sudo raspi-config nonint do_boot_behaviour B4

# Create kiosk startup script
mkdir -p /home/pi/.config/autostart
cat > /home/pi/.config/autostart/kiosk.desktop <<EOF
[Desktop Entry]
Type=Application
Name=Kiosk
Exec=/home/pi/start-kiosk.sh
X-GNOME-Autostart-enabled=true
EOF

# Create kiosk launch script
cat > /home/pi/start-kiosk.sh <<'EOF'
#!/bin/bash
# Wait for X server
sleep 5

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Hide cursor
unclutter -idle 0.1 &

# Launch Chromium in kiosk mode
chromium-browser --kiosk --noerrdialogs --disable-infobars \
  --disable-session-crashed-bubble --check-for-update-interval=31536000 \
  http://localhost:3000/kiosk-display
EOF

chmod +x /home/pi/start-kiosk.sh

echo "✅ Kiosk setup complete!"
echo "Rebooting in 5 seconds..."
sleep 5
sudo reboot
```

## 🎮 Remote Control Setup (Optional)

### Option 1: Bluetooth Wireless Remote

**Hardware:** Generic Bluetooth media remote (~€12)

**Pairing:**
```bash
# Enable Bluetooth
sudo bluetoothctl
power on
agent on
default-agent
scan on

# Wait for remote to appear
# pair [MAC_ADDRESS]
# connect [MAC_ADDRESS]
# trust [MAC_ADDRESS]
```

**Key Mapping:** Works out-of-the-box with keyboard navigation!

### Option 2: USB Wireless Presenter

**Hardware:** USB wireless presenter (~€15)

**Setup:** Plug & play - acts as keyboard input

### Option 3: Physical Button Panel

**Hardware:**
- Arcade buttons (4-6 buttons)
- GPIO wiring to Pi
- Custom Python script

**Not recommended** - adds complexity and cost

## 📊 Performance

| Metric | Pi Zero 2W |
|--------|-----------|
| **Boot Time** | 30-45 seconds |
| **Display FPS** | 30-40 FPS |
| **RAM Usage** | 200-300MB |
| **CPU Usage** | 10-15% idle |
| **Power Draw** | 2-3W |

**Suitable for:**
- ✅ Auto-rotating content display
- ✅ Static information boards
- ✅ Lobby kiosks
- ✅ Elevator displays

**NOT suitable for:**
- ❌ Heavy video playback
- ❌ Real-time video streaming
- ❌ Complex 3D graphics
- ❌ Voice recognition

## 🐛 Troubleshooting

### Display not showing content

**Check Chromium:**
```bash
ps aux | grep chromium
```

**Restart kiosk:**
```bash
sudo systemctl restart lightdm
```

### Black screen / Screen blanking

**Disable DPMS:**
```bash
# Edit /home/pi/start-kiosk.sh
xset s off
xset -dpms
xset s noblank
```

### WiFi not connecting

**Check connection:**
```bash
iwconfig
ping google.com
```

**Reconfigure WiFi:**
```bash
sudo raspi-config
# System Options → Wireless LAN
```

### Content not updating

**Clear Chromium cache:**
```bash
rm -rf ~/.cache/chromium
sudo reboot
```

## 🔄 Updates

### Update kiosk software

```bash
ssh pi@kiosk-display.local
cd /path/to/frontend
git pull
npm run build
sudo systemctl restart lightdm
```

### Update frontend URL

```bash
sudo nano /home/pi/.config/autostart/kiosk.desktop
# Change URL
sudo reboot
```

## 📦 Production Deployment Checklist

- [ ] Flash Raspberry Pi OS Lite to MicroSD
- [ ] Configure WiFi/SSH in Imager
- [ ] Boot Pi and SSH in
- [ ] Run setup-kiosk.sh script
- [ ] Configure frontend URL
- [ ] Test auto-rotating slides
- [ ] Test remote control (if using)
- [ ] Mount Pi behind display
- [ ] Verify WiFi connection stable
- [ ] Test auto-boot after power cycle
- [ ] Document building-specific notes

## 💡 Tips

### Power Management
- Use quality power supply (2.5A+)
- Consider UPS for critical displays
- Test power cycle recovery

### Network Reliability
- Use 5GHz WiFi if available
- Place Pi close to access point
- Consider Ethernet adapter for critical setups

### Display Settings
- Set display to "always on" mode
- Disable display sleep/standby
- Adjust brightness for ambient light

### Content Management
- Update content via backend API
- Changes reflect immediately
- No need to restart kiosk

---

**Cost per kiosk: €36-48**
**Setup time: 20 minutes**
**Maintenance: Zero** (auto-updating)

✅ **Simple, reliable, cost-effective solution για passive information displays**