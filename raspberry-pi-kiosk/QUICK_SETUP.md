# 🚀 Quick Setup - Voice-Enabled Kiosk

**Time required:** 20-30 minutes

## 📦 What You Need

- ✅ Raspberry Pi 4 (2GB+ RAM)
- ✅ MicroSD card (16GB+)
- ✅ HDMI display
- ✅ USB microphone
- ✅ WiFi or Ethernet connection
- ✅ Computer with SD card reader

## ⚡ 5-Step Setup

### 1️⃣ Flash SD Card (5 min)

1. Download **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. Insert MicroSD card
3. Open Imager → Choose OS → "Raspberry Pi OS Lite (64-bit)"
4. Click ⚙️ → Configure:
   - Hostname: `kiosk-display`
   - Enable SSH ✓
   - Username: `pi`, Password: [your-password]
   - WiFi: [your-network], Password: [wifi-password]
   - Locale: Europe/Athens, el
5. Write → Yes (wait 5-10 min)

### 2️⃣ Copy Setup Script (1 min)

```bash
# Copy to boot partition of SD card
cp setup-voice-kiosk.sh /path/to/boot/
```

### 3️⃣ Boot Raspberry Pi (2 min)

1. Insert SD card
2. Connect HDMI + Microphone
3. Power on (wait 2 min)

### 4️⃣ Run Setup (15 min)

```bash
# SSH into Pi
ssh pi@kiosk-display.local

# Copy and run setup
cp /boot/setup-voice-kiosk.sh ~/
chmod +x setup-voice-kiosk.sh

# Optional: Edit server URL
nano setup-voice-kiosk.sh
# Change: SERVER_URL="http://192.168.1.100:3000"

# Run setup
sudo ./setup-voice-kiosk.sh

# Wait for automatic reboot
```

### 5️⃣ Enable Voice (10 sec)

1. Kiosk starts automatically
2. Click 🎤 button (top-right)
3. Allow microphone access
4. Green pulsing = ready!
5. Say: **"ανακοινώσεις"** or **"announcements"**

## 🎤 Quick Voice Commands

| Greek | English | Action |
|-------|---------|--------|
| ανακοινώσεις | announcements | Announcements slide |
| ψηφοφορίες | votes | Votes slide |
| οικονομικά | financial | Financial slide |
| συντήρηση | maintenance | Maintenance slide |
| επόμενο | next | Next slide |
| προηγούμενο | previous | Previous slide |
| παύση | pause | Pause auto-play |
| αρχική | home | First slide |

## 🔧 Useful Commands

```bash
# Restart kiosk
~/restart-kiosk.sh

# Test microphone
~/test-audio.sh

# Update server URL
~/update-config.sh

# View all voice commands
cat ~/voice-commands.txt
```

## ❓ Troubleshooting

**Kiosk not starting?**
```bash
sudo systemctl status lightdm
~/start-kiosk.sh  # Manual start
```

**Voice not working?**
```bash
~/test-audio.sh  # Test microphone
# Check internet connection
# Allow microphone in browser
```

**Wrong server?**
```bash
~/update-config.sh
# Enter new URL
~/restart-kiosk.sh
```

## 📖 Full Documentation

For complete documentation, see: `README_VOICE_KIOSK.md`

---

**🎉 That's it! Voice-enabled kiosk ready in 20 minutes!**