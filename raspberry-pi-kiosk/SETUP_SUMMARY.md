# 🍓 Raspberry Pi Kiosk Setup - Summary

## 📁 Complete Setup Package

This directory contains everything needed to deploy a voice-enabled kiosk for the Building Management System on Raspberry Pi hardware.

## 🚀 Quick Start

### 1. Basic Kiosk (No Voice)
```bash
# Copy files to Raspberry Pi
scp -r raspberry-pi-kiosk/ pi@raspberrypi.local:/home/pi/

# SSH and install
ssh pi@raspberrypi.local
cd raspberry-pi-kiosk/
./install-basic-kiosk.sh
```

### 2. Voice-Enabled Kiosk
```bash
# Install voice capabilities
./install-voice-kiosk.sh
```

### 3. Docker Testing
```bash
# Test in Docker before hardware deployment
./docker-simulation.sh
```

## 📋 Files Overview

### Installation Scripts
- `install-basic-kiosk.sh` - Basic kiosk installation
- `install-voice-kiosk.sh` - Voice-enabled kiosk installation
- `docker-simulation.sh` - Docker testing script

### Kiosk Applications
- `kiosk.sh` - Basic kiosk startup script
- `voice-kiosk.sh` - Voice-enabled kiosk startup script
- `voice-recognition.py` - Voice recognition application

### System Services
- `kiosk.service` - Basic kiosk systemd service
- `voice-kiosk.service` - Voice kiosk systemd service

### Configuration Files
- `configs/wpa_supplicant.conf` - WiFi configuration
- `configs/dhcpcd.conf` - Static IP configuration
- `configs/pulseaudio.conf` - Audio configuration

### Docker Simulation
- `docker/Dockerfile` - Docker container definition
- `docker/docker-compose.yml` - Docker compose configuration

## 🎤 Voice Commands

### Greek Commands
- **"ανακοινώσεις"** - Show announcements
- **"ψηφοφορίες"** - Show votes
- **"οικονομικά"** - Show financial information
- **"συντήρηση"** - Show maintenance information
- **"αρχική"** - Go to home page
- **"ανανέωση"** - Refresh page
- **"βοήθεια"** - Show help

### English Commands
- **"announcements"** - Show announcements
- **"votes"** - Show votes
- **"financial"** - Show financial information
- **"maintenance"** - Show maintenance information
- **"home"** - Go to home page
- **"refresh"** - Refresh page
- **"help"** - Show help

## 🔧 Management Commands

### Service Control
```bash
# Start/stop kiosk
sudo systemctl start kiosk
sudo systemctl stop kiosk
sudo systemctl restart kiosk

# Start/stop voice kiosk
sudo systemctl start voice-kiosk
sudo systemctl stop voice-kiosk
sudo systemctl restart voice-kiosk
```

### Monitoring
```bash
# View logs
journalctl -u kiosk -f
journalctl -u voice-kiosk -f

# Health check
/home/pi/health-check.sh
/home/pi/voice-health-check.sh

# Test voice
/home/pi/test-voice.sh
```

## 🖥️ Hardware Requirements

### Minimum Setup
- Raspberry Pi 4B (2GB RAM)
- MicroSD Card (32GB+)
- HDMI Display (7"-10")
- WiFi connectivity

### Voice-Enabled Setup
- Raspberry Pi 4B (4GB+ RAM)
- USB Microphone
- USB Speakers or 3.5mm Audio
- Touch Screen (optional)

## 🌐 Network Configuration

### WiFi Setup
1. Edit `configs/wpa_supplicant.conf`
2. Copy to `/etc/wpa_supplicant/wpa_supplicant.conf`
3. Restart WiFi: `sudo systemctl restart wpa_supplicant`

### Static IP Setup
1. Edit `configs/dhcpcd.conf`
2. Copy to `/etc/dhcpcd.conf`
3. Restart networking: `sudo systemctl restart dhcpcd`

## 🐳 Docker Testing

### Build and Run
```bash
cd docker/
docker build -t kiosk-simulation .
docker run -p 5900:5900 --device /dev/snd kiosk-simulation
```

### VNC Access
- Connect to `localhost:5900` with VNC viewer
- View kiosk interface in container

## 🔒 Security Considerations

### Network Security
- Use HTTPS for kiosk URL
- Configure firewall
- Use strong WiFi passwords
- Consider VPN for remote management

### Device Security
- Regular system updates
- Disable unnecessary services
- Use read-only filesystem for production
- Implement proper access controls

## 📊 Performance Optimization

### System Optimization
- Use Class 10+ MicroSD card
- Enable GPU memory split (128MB)
- Disable unnecessary services
- Use wired connection if possible

### Voice Recognition Optimization
- Use high-quality microphone
- Minimize background noise
- Adjust sensitivity settings
- Use dedicated audio interface

## 🐛 Troubleshooting

### Common Issues
1. **Kiosk not starting** - Check service status and logs
2. **No internet** - Check WiFi configuration
3. **Voice not working** - Test audio devices
4. **Display issues** - Check display configuration
5. **Touch not working** - Test touch input

### Debug Commands
```bash
# Check service status
sudo systemctl status kiosk
sudo systemctl status voice-kiosk

# View logs
journalctl -u kiosk -f
journalctl -u voice-kiosk -f

# Test audio
aplay -l
arecord -l
speaker-test -t wav -c 2 -l 1

# Test network
ping 8.8.8.8
iwconfig
```

## 📞 Support

For issues and support:
- Check logs: `journalctl -u kiosk -f`
- Run health check: `/home/pi/health-check.sh`
- Verify network: `ping 8.8.8.8`
- Test voice: `/home/pi/test-voice.sh`

## 🎯 Next Steps

After successful installation:
1. Configure building-specific settings
2. Test kiosk functionality
3. Set up monitoring and alerting
4. Consider multiple kiosks
5. Implement remote management
6. Test voice commands
7. Optimize audio settings

---

**Ready for deployment!** 🚀

This complete package provides everything needed to deploy a professional kiosk solution for the Building Management System with optional voice interaction capabilities.
