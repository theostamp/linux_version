# 🎤 Voice-Enabled Building Management Kiosk

Complete plug & play solution for Raspberry Pi kiosk displays with voice navigation.

## 🌟 Features

### Display Features
- ✅ **Fullscreen Kiosk Display** - Professional building management interface
- ✅ **Auto-slide Presentation** - 8-second intervals with manual control
- ✅ **Real-time Data** - Live announcements, financial, maintenance, weather
- ✅ **Greek News Ticker** - Real-time news from 8 Greek sources
- ✅ **Weather Integration** - 3-day forecast for Athens
- ✅ **QR Code Access** - Direct link to dashboard

### Voice Navigation Features
- 🎤 **Web Speech API** - Browser-based voice recognition (no server needed!)
- 🇬🇷 **Greek & English Commands** - Full bilingual support
- 🗣️ **Natural Language** - Speak naturally, no rigid syntax
- 📢 **Audio Feedback** - Text-to-speech confirmation
- 🎯 **Slide Navigation** - Jump directly to any slide
- ⏯️ **Playback Control** - Pause, resume, next, previous
- 🔴 **Live Indicator** - Visual feedback when listening

## 🚀 Quick Start Guide

### Prerequisites

1. **Hardware:**
   - Raspberry Pi 4 (2GB+ RAM recommended)
   - MicroSD card (16GB+ recommended)
   - HDMI display
   - USB microphone (or USB audio adapter with mic)
   - Keyboard (for initial setup)
   - Network connection (WiFi or Ethernet)

2. **Software:**
   - Raspberry Pi OS Lite (64-bit) - Latest version
   - Raspberry Pi Imager - https://www.raspberrypi.com/software/

### Step 1: Flash Raspberry Pi OS

1. Download and install **Raspberry Pi Imager**
2. Insert MicroSD card into your computer
3. Open Raspberry Pi Imager
4. Click "Choose OS" → "Raspberry Pi OS (other)" → "Raspberry Pi OS Lite (64-bit)"
5. Click "Choose Storage" → Select your MicroSD card
6. Click the ⚙️ Settings icon (important!)

### Step 2: Configure Advanced Settings

In the Raspberry Pi Imager settings:

```
✅ Set hostname: kiosk-display
✅ Enable SSH: ✓
   - Use password authentication
✅ Set username and password:
   - Username: pi
   - Password: [your-password]
✅ Configure WiFi: ✓
   - SSID: [your-wifi-name]
   - Password: [your-wifi-password]
   - Country: GR
✅ Set locale settings:
   - Time zone: Europe/Athens
   - Keyboard layout: el
```

Click "Save" → "Write" → "Yes" (wait 5-10 minutes)

### Step 3: Transfer Setup Script

1. Remove and reinsert MicroSD card
2. Copy `setup-voice-kiosk.sh` to the boot partition:
   ```bash
   # On your computer (Linux/Mac)
   cp setup-voice-kiosk.sh /media/your-username/boot/

   # On Windows
   # Copy to the drive labeled "boot" (usually D: or E:)
   ```

3. Safely eject the MicroSD card

### Step 4: Boot Raspberry Pi

1. Insert MicroSD card into Raspberry Pi
2. Connect HDMI display
3. Connect USB microphone
4. Connect power (boot will take ~2 minutes)

### Step 5: Run Setup Script

1. SSH into Raspberry Pi:
   ```bash
   ssh pi@kiosk-display.local
   # Or use IP address: ssh pi@192.168.1.xxx
   ```

2. Copy setup script from boot partition:
   ```bash
   cp /boot/setup-voice-kiosk.sh ~/
   chmod +x setup-voice-kiosk.sh
   ```

3. Configure your server URL (optional):
   ```bash
   # Edit before running if your server is not at http://192.168.1.100:3000
   nano setup-voice-kiosk.sh
   # Change SERVER_URL line
   ```

4. Run the setup:
   ```bash
   sudo ./setup-voice-kiosk.sh
   ```

5. Wait for installation (10-15 minutes)
6. Raspberry Pi will reboot automatically

### Step 6: Enable Voice Navigation

1. After reboot, kiosk will start automatically
2. Look for the 🎤 microphone button in the top-right corner
3. Click the microphone button to enable voice control
4. Green pulsing icon = listening
5. Speak commands (see below)

## 🎤 Voice Commands

### Greek Commands

| Command | Action |
|---------|--------|
| **"ανακοινώσεις"** | Show announcements slide |
| **"ψηφοφορίες"** | Show votes slide |
| **"οικονομικά"** | Show financial information |
| **"συντήρηση"** | Show maintenance information |
| **"αρχική"** | Go to first slide |
| **"επόμενο"** | Next slide |
| **"προηγούμενο"** | Previous slide |
| **"παύση"** | Pause auto-play |
| **"συνέχεια"** | Resume auto-play |
| **"βοήθεια"** | Show help |

### English Commands

| Command | Action |
|---------|--------|
| **"announcements"** | Show announcements slide |
| **"votes"** | Show votes slide |
| **"financial"** | Show financial information |
| **"maintenance"** | Show maintenance information |
| **"home"** | Go to first slide |
| **"next"** | Next slide |
| **"previous"** | Previous slide |
| **"pause"** | Pause auto-play |
| **"resume"** | Resume auto-play |
| **"help"** | Show help |

### Number Commands

You can also say slide numbers:
- Greek: "ένα", "δύο", "τρία", "τέσσερα"
- English: "one", "two", "three", "four"
- Numbers: "1", "2", "3", "4"

## 🔧 Configuration

### Change Server URL

```bash
~/update-config.sh
```

### Test Audio Devices

```bash
~/test-audio.sh
```

### Restart Kiosk

```bash
~/restart-kiosk.sh
```

### View Voice Commands

```bash
cat ~/voice-commands.txt
```

## 🛠️ Troubleshooting

### Voice recognition not working

1. **Check microphone connection:**
   ```bash
   arecord -l
   # Should show your USB microphone
   ```

2. **Test microphone recording:**
   ```bash
   ~/test-audio.sh
   ```

3. **Check browser permissions:**
   - Click the 🎤 button
   - Browser should ask for microphone permission
   - Click "Allow"

4. **Check internet connection:**
   - Voice recognition uses Google Speech API
   - Requires active internet connection

### Kiosk not starting automatically

1. **Check X server:**
   ```bash
   sudo systemctl status lightdm
   ```

2. **Check auto-login:**
   ```bash
   cat /etc/systemd/system/getty@tty1.service.d/autologin.conf
   ```

3. **Manually start kiosk:**
   ```bash
   ~/start-kiosk.sh
   ```

### Display issues

1. **Check HDMI connection**
2. **Force HDMI output:**
   ```bash
   sudo nano /boot/firmware/config.txt
   # Add: hdmi_force_hotplug=1
   sudo reboot
   ```

### Server unreachable

1. **Check network:**
   ```bash
   ping 8.8.8.8
   ping your-server-ip
   ```

2. **Update server URL:**
   ```bash
   ~/update-config.sh
   ```

3. **Check firewall on server:**
   - Make sure port 3000 is open
   - Allow connections from Raspberry Pi IP

## 📁 File Structure

```
/home/pi/
├── start-kiosk.sh          # Main kiosk startup script
├── restart-kiosk.sh        # Restart kiosk
├── update-config.sh        # Update configuration
├── test-audio.sh           # Test audio devices
├── voice-commands.txt      # Voice commands reference
├── .xinitrc                # X server configuration
└── .bash_profile           # Auto-start X on login
```

## 🔐 Security Notes

### Default Configuration
- **User:** pi
- **Default Password:** Change this immediately!
- **SSH:** Enabled by default
- **Firewall:** Not configured

### Recommended Security Steps

1. **Change default password:**
   ```bash
   passwd
   ```

2. **Update system regularly:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Configure firewall (optional):**
   ```bash
   sudo apt install ufw
   sudo ufw allow ssh
   sudo ufw enable
   ```

4. **Disable SSH after setup (optional):**
   ```bash
   sudo systemctl disable ssh
   ```

## 🚀 Advanced Configuration

### Custom Voice Commands

Voice commands are handled in the frontend. To add custom commands:

1. Edit `/home/theo/projects/linux_version/frontend/hooks/useVoiceNavigation.ts`
2. Add new command mappings to `commandMap`
3. Rebuild and redeploy frontend

### Offline Voice Recognition

Current implementation uses Google Speech API (requires internet).

For offline voice recognition:
1. Install Vosk: https://alphacephei.com/vosk/
2. Download Greek model
3. Replace Web Speech API with Vosk in `useVoiceNavigation.ts`

### Multiple Buildings

To deploy multiple kiosks for different buildings:

1. Set `BUILDING_ID` during setup:
   ```bash
   sudo BUILDING_ID=2 ./setup-voice-kiosk.sh
   ```

2. Or update after installation:
   ```bash
   nano ~/start-kiosk.sh
   # Change building_id parameter in URL
   ```

## 📊 System Requirements

### Minimum Requirements
- Raspberry Pi 3B+ or newer
- 1GB RAM
- 8GB MicroSD card
- 1280x720 display resolution

### Recommended Requirements
- Raspberry Pi 4 (2GB+ RAM)
- 16GB+ MicroSD card (Class 10 or better)
- 1920x1080 display resolution
- USB microphone with noise cancellation
- Ethernet connection (more stable than WiFi)

## 🆘 Support

### Logs

```bash
# View kiosk logs
journalctl -xe

# View X server logs
cat ~/.local/share/xorg/Xorg.0.log

# View Chromium logs
ls -la ~/.config/chromium/crash-reports/
```

### Common Issues

**Issue:** Kiosk shows blank screen
**Solution:** Check server URL is accessible

**Issue:** Voice button missing
**Solution:** Browser doesn't support Web Speech API (use Chromium 90+)

**Issue:** Commands not recognized
**Solution:** Speak clearly, check microphone volume

**Issue:** Raspberry Pi overheating
**Solution:** Add heatsink or fan, improve ventilation

## 📝 License

This project is part of the New Concierge building management system.

## 👥 Credits

- **New Concierge Team**
- **Web Speech API** - Google
- **Raspberry Pi Foundation**
- **Chromium Project**

---

**Version:** 2.0
**Last Updated:** 2025-09-29
**Maintainer:** New Concierge Team