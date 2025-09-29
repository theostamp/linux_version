# 🚀 Quick Start - MicroSD Setup Ready!

## 📋 Pre-configured Settings

Το script είναι **έτοιμο** με τις ρυθμίσεις σου:

```
WiFi SSID: Redmi Note 14 Pro+ 5G
WiFi Password: theo123123
Static IP: 192.168.1.100
Server URL: http://192.168.1.100:3000
Building ID: 1
Device: /dev/sdb (D: drive)
```

## 🚀 Run Setup Now

### **Option 1: Quick Setup (Recommended)**
```bash
cd /home/theo/projects/linux_version/raspberry-pi-kiosk
sudo ./run-setup-now.sh
```

### **Option 2: Direct Setup**
```bash
cd /home/theo/projects/linux_version/raspberry-pi-kiosk
sudo ./auto-setup-microsd.sh
```

## ⏱️ What to Expect

### **Setup Process (15-30 minutes):**
1. **Download** Raspberry Pi OS (5-10 minutes)
2. **Extract** image (2-3 minutes)
3. **Write** to MicroSD (5-15 minutes)
4. **Configure** WiFi, IP, hostname (1-2 minutes)
5. **Copy** kiosk files (1-2 minutes)
6. **Setup** auto-installation (1-2 minutes)

### **First Boot (10-15 minutes):**
1. **Connect** to WiFi automatically
2. **Update** system packages
3. **Install** required software
4. **Configure** kiosk service
5. **Start** kiosk automatically

## 🎯 After Setup

### **MicroSD Ready for:**
- ✅ **Plug & play** deployment
- ✅ **Automatic** WiFi connection
- ✅ **Automatic** kiosk installation
- ✅ **SSH access** at 192.168.1.100
- ✅ **Voice commands** ready
- ✅ **Health monitoring** active

### **Deployment Steps:**
1. **Insert** MicroSD into Raspberry Pi
2. **Connect** power supply
3. **Wait** 10-15 minutes for auto-installation
4. **Access** kiosk at http://192.168.1.100:3000/kiosk
5. **SSH access**: `ssh pi@192.168.1.100`

## 🔧 Management Commands

### **After Deployment:**
```bash
# SSH into kiosk
ssh pi@192.168.1.100

# Check kiosk status
sudo systemctl status kiosk

# View logs
journalctl -u kiosk -f

# Restart kiosk
sudo systemctl restart kiosk
```

## 🎤 Voice Commands

### **Greek Commands:**
- **"ανακοινώσεις"** - Show announcements
- **"ψηφοφορίες"** - Show votes
- **"οικονομικά"** - Show financial info
- **"συντήρηση"** - Show maintenance
- **"αρχική"** - Go to home page
- **"ανανέωση"** - Refresh page
- **"βοήθεια"** - Show help

### **English Commands:**
- **"announcements"** - Show announcements
- **"votes"** - Show votes
- **"financial"** - Show financial info
- **"maintenance"** - Show maintenance
- **"home"** - Go to home page
- **"refresh"** - Refresh page
- **"help"** - Show help

## 🐛 Troubleshooting

### **If Setup Fails:**
```bash
# Check if MicroSD is accessible
lsblk | grep sdb

# Unmount if needed
sudo umount /dev/sdb*

# Try again
sudo ./run-setup-now.sh
```

### **If Kiosk Doesn't Start:**
```bash
# SSH into kiosk
ssh pi@192.168.1.100

# Check service status
sudo systemctl status kiosk

# Restart service
sudo systemctl restart kiosk

# View logs
journalctl -u kiosk -f
```

## 🎉 Ready to Go!

Το setup είναι **100% έτοιμο** με τις ρυθμίσεις σου. Απλά τρέξε:

```bash
sudo ./run-setup-now.sh
```

Και σε 15-30 λεπτά θα έχεις μια **professional kiosk** έτοιμη για deployment! 🚀
