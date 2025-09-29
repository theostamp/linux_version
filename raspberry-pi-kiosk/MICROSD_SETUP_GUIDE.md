# 🍓 MicroSD Card Setup Guide - Plug & Play Kiosk

## 📋 Overview

This guide provides multiple methods to prepare a MicroSD card with Raspberry Pi OS and all kiosk files, ready for plug & play deployment.

## 🚀 Quick Start Options

### Option 1: Automated Setup (Recommended)
```bash
# Fully automated setup
sudo ./quick-microsd-setup.sh
```

### Option 2: Raspberry Pi Imager
```bash
# Uses Raspberry Pi Imager with custom settings
./imager-microsd-setup.sh
```

### Option 3: Manual Setup
```bash
# Complete manual control
sudo ./prepare-microsd.sh
```

## 📋 Prerequisites

### Required Software
- **Raspberry Pi Imager** (optional, for Option 2)
- **wget** (for downloading OS image)
- **xz-utils** (for extracting compressed images)
- **dd** (for writing images)

### Required Hardware
- **MicroSD Card** (32GB+ recommended)
- **MicroSD Card Reader** (USB or built-in)
- **Computer** with Linux/macOS/Windows

## 🔧 Option 1: Automated Setup (Recommended)

### Features
- ✅ **Fully automated** - no manual intervention needed
- ✅ **Downloads latest** Raspberry Pi OS automatically
- ✅ **Configures everything** - WiFi, IP, hostname, kiosk files
- ✅ **Auto-installation** on first boot
- ✅ **Health monitoring** setup

### Usage
```bash
# Make script executable
chmod +x quick-microsd-setup.sh

# Run with sudo (required for device access)
sudo ./quick-microsd-setup.sh
```

### What it does
1. **Downloads** Raspberry Pi OS Lite (64-bit)
2. **Writes** image to MicroSD card
3. **Configures** WiFi, static IP, hostname
4. **Copies** all kiosk files
5. **Sets up** auto-installation on first boot
6. **Creates** health monitoring scripts

## 🎯 Option 2: Raspberry Pi Imager

### Features
- ✅ **Official tool** from Raspberry Pi Foundation
- ✅ **User-friendly** GUI interface
- ✅ **Built-in** WiFi and SSH configuration
- ✅ **Custom settings** support

### Usage
```bash
# Check if Raspberry Pi Imager is installed
rpi-imager --version

# If not installed, install it first
# Then run the setup script
./imager-microsd-setup.sh
```

### Manual Steps with Imager
1. **Launch** Raspberry Pi Imager
2. **Select OS**: Raspberry Pi OS Lite (64-bit)
3. **Select Storage**: Your MicroSD card
4. **Click gear icon** for advanced options
5. **Configure**:
   - Enable SSH
   - Set hostname
   - Configure WiFi
   - Set static IP
6. **Write** the image
7. **Copy kiosk files** to boot partition

## ⚙️ Option 3: Manual Setup

### Features
- ✅ **Complete control** over every step
- ✅ **Custom configurations** possible
- ✅ **Detailed logging** of all operations
- ✅ **Advanced options** available

### Usage
```bash
# Make script executable
chmod +x prepare-microsd.sh

# Run with sudo
sudo ./prepare-microsd.sh
```

## 📝 Configuration Options

### Required Information
- **WiFi SSID**: Your network name
- **WiFi Password**: Your network password
- **Static IP**: IP address for the kiosk (default: 192.168.1.100)
- **Server URL**: Your building management server URL
- **Building ID**: ID of the building for this kiosk

### Example Configuration
```
WiFi SSID: MyBuilding-WiFi
WiFi Password: SecurePassword123
Static IP: 192.168.1.100
Server URL: http://192.168.1.50:3000
Building ID: 1
```

## 🔍 Step-by-Step Process

### 1. Preparation
```bash
# List available storage devices
lsblk -d -o NAME,SIZE,MODEL

# Identify your MicroSD card (usually sdb, sdc, or mmcblk0)
```

### 2. Safety Check
```bash
# Make sure you have the correct device
# WARNING: This will erase everything on the device!
```

### 3. Run Setup Script
```bash
# Choose your preferred method
sudo ./quick-microsd-setup.sh
```

### 4. Wait for Completion
- **Download**: 5-10 minutes (depending on internet speed)
- **Extraction**: 2-3 minutes
- **Writing**: 5-15 minutes (depending on MicroSD speed)
- **Configuration**: 1-2 minutes

### 5. Safely Remove
```bash
# Unmount and safely remove the MicroSD card
sync
umount /dev/sdX*
```

## 🚀 Deployment

### 1. Insert MicroSD
- Insert the prepared MicroSD card into Raspberry Pi
- Connect power supply
- Connect to network (WiFi or Ethernet)

### 2. First Boot Process
- **Boot time**: 2-3 minutes
- **Network setup**: 1-2 minutes
- **Auto-installation**: 5-10 minutes
- **Kiosk startup**: 1-2 minutes

### 3. Verification
```bash
# SSH into the kiosk
ssh pi@192.168.1.100

# Check kiosk status
sudo systemctl status kiosk

# View logs
journalctl -u kiosk -f
```

## 🔧 Post-Deployment Management

### SSH Access
```bash
# Connect to kiosk
ssh pi@192.168.1.100

# Default password: raspberry (change this!)
```

### Service Management
```bash
# Start/stop kiosk
sudo systemctl start kiosk
sudo systemctl stop kiosk
sudo systemctl restart kiosk

# Check status
sudo systemctl status kiosk
```

### Logs and Monitoring
```bash
# View kiosk logs
journalctl -u kiosk -f

# View health check logs
tail -f /home/pi/kiosk-health.log

# Run health check manually
/home/pi/health-check.sh
```

## 🐛 Troubleshooting

### Common Issues

#### MicroSD Card Not Recognized
```bash
# Check if device is detected
lsblk

# Check USB connections
dmesg | tail
```

#### Write Permission Denied
```bash
# Make sure you're running as root
sudo ./quick-microsd-setup.sh
```

#### Network Issues After Deployment
```bash
# Check WiFi configuration
sudo cat /boot/wpa_supplicant.conf

# Check network status
ip addr show wlan0
```

#### Kiosk Not Starting
```bash
# Check service status
sudo systemctl status kiosk

# Check logs
journalctl -u kiosk -f

# Restart service
sudo systemctl restart kiosk
```

### Debug Commands
```bash
# Check system status
systemctl status kiosk
systemctl status networking
systemctl status wpa_supplicant

# Check network connectivity
ping 8.8.8.8
ping your-server-ip

# Check disk space
df -h

# Check memory usage
free -h
```

## 📊 Performance Optimization

### MicroSD Card Selection
- **Class 10+** for better performance
- **32GB+** for sufficient space
- **High-endurance** cards for 24/7 operation

### System Optimization
- **GPU memory split**: 128MB
- **Disable unnecessary services**
- **Use wired connection** if possible
- **Regular system updates**

## 🔒 Security Considerations

### Network Security
- **Use strong WiFi passwords**
- **Enable WPA3** if available
- **Consider VPN** for remote management
- **Use HTTPS** for kiosk URL

### Device Security
- **Change default password**
- **Disable unnecessary services**
- **Regular security updates**
- **Use read-only filesystem** for production

## 📞 Support

### Getting Help
- **Check logs**: `journalctl -u kiosk -f`
- **Run health check**: `/home/pi/health-check.sh`
- **Verify network**: `ping 8.8.8.8`
- **Check service status**: `sudo systemctl status kiosk`

### Useful Commands
```bash
# System information
uname -a
cat /etc/os-release

# Network information
ip addr show
iwconfig

# Service information
systemctl list-units --type=service
```

## 🎯 Next Steps

After successful deployment:
1. **Test kiosk functionality** with different building IDs
2. **Set up monitoring** and alerting
3. **Configure remote management**
4. **Test voice commands** (if voice-enabled)
5. **Optimize performance** settings
6. **Set up backup procedures**

---

**Ready for plug & play deployment!** 🚀

This complete setup provides everything needed for professional kiosk deployment with minimal manual intervention.
