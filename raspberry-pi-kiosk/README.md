# 🍓 Raspberry Pi Building Management Kiosk

**Version 2.0** - Voice-Enabled Kiosk with Web Speech API

Complete plug & play solution for Raspberry Pi kiosk displays with **voice navigation**.

---

## 🌟 What's New in v2.0

- 🎤 **Browser-based Voice Navigation** - No Python backend needed!
- 🇬🇷 **Greek & English Commands** - Full bilingual support
- 🚀 **Faster Setup** - 20 minutes from SD card to working kiosk
- 📦 **Simpler Architecture** - Web Speech API in browser
- 🔧 **Easy Maintenance** - Management scripts included
- 📚 **Complete Documentation** - Step-by-step guides

---

## 📖 Documentation

| Document | Description | Use Case |
|----------|-------------|----------|
| **[QUICK_SETUP.md](QUICK_SETUP.md)** | ⚡ 5-step quick start | **Start here!** |
| **[README_VOICE_KIOSK.md](README_VOICE_KIOSK.md)** | 📚 Complete guide | Full documentation |
| **[CHANGELOG.md](CHANGELOG.md)** | 📝 Version history | What's new in v2.0 |
| **[RASPBERRY_PI_IMAGER_GUIDE.md](RASPBERRY_PI_IMAGER_GUIDE.md)** | 💾 SD card setup | First-time setup |

---

## 🚀 Quick Start (20 minutes)

### What You Need
- ✅ Raspberry Pi 4 (2GB+ RAM)
- ✅ MicroSD card (16GB+)
- ✅ HDMI display
- ✅ USB microphone
- ✅ Network connection

### Setup Steps

1. **Flash SD Card** (5 min)
   ```bash
   # Use Raspberry Pi Imager
   # OS: Raspberry Pi OS Lite (64-bit)
   # Configure: WiFi, SSH, hostname
   ```

2. **Copy Setup Script** (1 min)
   ```bash
   cp setup-voice-kiosk.sh /path/to/boot/
   ```

3. **Boot & Run** (15 min)
   ```bash
   ssh pi@kiosk-display.local
   cp /boot/setup-voice-kiosk.sh ~/
   sudo ./setup-voice-kiosk.sh
   # Automatic reboot
   ```

4. **Enable Voice** (10 sec)
   - Click 🎤 button
   - Allow microphone
   - Say: **"ανακοινώσεις"**

**Done!** 🎉

---

## 🎤 Voice Commands

### Greek
- **"ανακοινώσεις"** - Announcements
- **"ψηφοφορίες"** - Votes
- **"οικονομικά"** - Financial
- **"συντήρηση"** - Maintenance
- **"επόμενο"** - Next slide
- **"προηγούμενο"** - Previous slide

### English
- **"announcements"** - Announcements
- **"votes"** - Votes
- **"financial"** - Financial
- **"maintenance"** - Maintenance
- **"next"** - Next slide
- **"previous"** - Previous slide

👉 See [voice-commands.txt](voice-commands.txt) for complete list

---

## 🔧 Management Commands

```bash
# Restart kiosk
~/restart-kiosk.sh

# Test microphone
~/test-audio.sh

# Update server URL
~/update-config.sh

# View voice commands
cat ~/voice-commands.txt
```

---

## 🎯 Features

### Display Features
- ✅ Fullscreen kiosk mode
- ✅ Auto-slide presentation (8s intervals)
- ✅ Real-time data (announcements, financial, maintenance)
- ✅ Greek news ticker (8 sources)
- ✅ Weather forecast (3-day)
- ✅ QR code for dashboard access

### Voice Navigation Features
- 🎤 Web Speech API (browser-based)
- 🇬🇷 Greek & English commands
- 🗣️ Natural language processing
- 📢 Audio feedback (text-to-speech)
- 🎯 Direct slide navigation
- ⏯️ Playback control (pause/resume/next/previous)
- 🔴 Live listening indicator

---

## 🛠️ Architecture

### Version 2.0 (Current)
```
Raspberry Pi
    ↓
Chromium Browser
    ↓
Kiosk Display Page (React)
    ↓
Web Speech API (browser built-in)
    ↓
Voice Commands → Slide Navigation
```

**Benefits:**
- ✅ No backend service
- ✅ Simple deployment
- ✅ Browser-native voice
- ✅ Easy debugging
- ✅ Lower resources

### Version 1.0 (Deprecated)
```
Raspberry Pi
    ↓
Python Voice Service (systemd)
    ↓
Google Speech API
    ↓
xdotool → Chromium
```

**Issues:**
- ❌ Complex setup
- ❌ Service management
- ❌ Higher resources
- ❌ Harder debugging

---

## 📦 Files

```
raspberry-pi-kiosk/
├── setup-voice-kiosk.sh         # Main setup script
├── README.md                    # This file
├── QUICK_SETUP.md              # Quick start guide
├── README_VOICE_KIOSK.md       # Complete documentation
├── CHANGELOG.md                # Version history
├── voice-commands.txt          # Voice commands reference (generated)
│
├── configs/                    # Configuration templates
│   ├── config.txt              # Raspberry Pi boot config
│   └── dhcpcd.conf             # Network config
│
└── [legacy files]              # v1.0 files (deprecated)
    ├── install-voice-kiosk.sh  # Old Python-based installer
    ├── voice-recognition.py    # Old Python service
    └── voice-kiosk.sh          # Old startup script
```

---

## 🖥️ Hardware Requirements

### Minimum
- Raspberry Pi 3B+ or newer
- 1GB RAM
- 8GB MicroSD
- 1280x720 display

### Recommended
- **Raspberry Pi 4 (2GB+ RAM)**
- 16GB+ MicroSD (Class 10)
- 1920x1080 display
- USB microphone
- Ethernet (more stable than WiFi)

---

## ❓ Troubleshooting

### Voice not working?
```bash
# Test microphone
~/test-audio.sh

# Check devices
arecord -l

# Check internet (required for Google Speech API)
ping 8.8.8.8
```

### Kiosk not starting?
```bash
# Check status
sudo systemctl status lightdm

# Manual start
~/start-kiosk.sh

# View logs
journalctl -xe
```

### Server unreachable?
```bash
# Update URL
~/update-config.sh

# Test connection
ping your-server-ip
curl http://your-server-ip:3000/kiosk-display
```

👉 See [README_VOICE_KIOSK.md](README_VOICE_KIOSK.md) for complete troubleshooting

---

## 🔐 Security

### Default Setup
- User: `pi`
- SSH: Enabled
- Firewall: Not configured

### Recommended
```bash
# Change password
passwd

# Update system
sudo apt update && sudo apt upgrade -y

# Disable SSH after setup (optional)
sudo systemctl disable ssh
```

---

## 📊 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **RAM** | 1GB | 2GB+ |
| **Storage** | 8GB | 16GB+ |
| **Display** | 1280x720 | 1920x1080 |
| **Network** | WiFi | Ethernet |
| **Audio** | Any USB mic | Noise-canceling mic |

---

## 🆘 Support

### Logs
```bash
# System logs
journalctl -xe

# X server logs
cat ~/.local/share/xorg/Xorg.0.log

# Chromium logs
ls -la ~/.config/chromium/
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Blank screen | Check server URL, network |
| No voice button | Update browser (Chromium 90+) |
| Commands not recognized | Check microphone, internet |
| Overheating | Add heatsink/fan |

---

## 🎓 Learn More

- **Web Speech API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- **Raspberry Pi Docs**: https://www.raspberrypi.com/documentation/
- **New Concierge**: See main project README

---

## 📝 License

Part of the New Concierge building management system.

---

## 👥 Credits

- **New Concierge Team** - Development
- **Google** - Web Speech API
- **Raspberry Pi Foundation** - Hardware
- **Chromium Project** - Browser

---

**Version:** 2.0
**Last Updated:** 2025-09-29
**Status:** ✅ Production Ready

**Quick Links:**
- 📖 [Complete Documentation](README_VOICE_KIOSK.md)
- ⚡ [Quick Setup](QUICK_SETUP.md)
- 📝 [Changelog](CHANGELOG.md)
- 🎤 [Voice Commands Reference](voice-commands.txt)