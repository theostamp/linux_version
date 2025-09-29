# 🍓 Raspberry Pi Imager Setup Guide

## 📋 Current Situation

Το device `/dev/sdb` είναι busy και δεν μπορούμε να γράψουμε το image με dd. Αυτό συμβαίνει συχνά στο WSL2. Η **Raspberry Pi Imager** είναι η καλύτερη λύση.

## 🚀 Raspberry Pi Imager Method

### **Step 1: Download Raspberry Pi Imager**
1. **Πηγαίνεις** στο: https://www.raspberrypi.org/downloads/
2. **Κατεβάζεις** το Raspberry Pi Imager για Windows
3. **Εγκαθιστάς** το

### **Step 2: Write Raspberry Pi OS**
1. **Άνοιξε** το Raspberry Pi Imager
2. **Επιλέγεις** "Choose OS" → "Raspberry Pi OS Lite (64-bit)"
3. **Επιλέγεις** "Choose Storage" → Select your MicroSD card (D: drive)
4. **Κάνεις κλικ** στο ⚙️ (gear icon) για advanced options

### **Step 3: Advanced Options Configuration**
```
✅ Enable SSH (use password authentication)
✅ Set hostname: building-kiosk
✅ Configure WiFi:
   - SSID: Redmi Note 14 Pro+ 5G
   - Password: theo123123
   - Country: GR
✅ Set static IP:
   - IP: 192.168.1.100
   - Gateway: 192.168.1.1
   - DNS: 8.8.8.8
✅ Set locale:
   - Country: Greece
   - Timezone: Europe/Athens
```

### **Step 4: Write the Image**
1. **Κάνεις κλικ** "Write"
2. **Περίμενε** να ολοκληρωθεί (5-15 λεπτά)
3. **Αφαίρεσε** την MicroSD με ασφάλεια

## 🔧 Post-Installation Setup

### **After Writing with Raspberry Pi Imager:**

```bash
cd /home/theo/projects/linux_version/raspberry-pi-kiosk
sudo ./post-install-setup.sh
```

**Αυτό το script θα:**
- ✅ **Mount** τα partitions
- ✅ **Αντιγράψει** όλα τα kiosk files
- ✅ **Ρυθμίσει** το kiosk configuration
- ✅ **Δημιουργήσει** auto-installation script
- ✅ **Ενεργοποιήσει** first-boot service

## 🎯 What You Get

### **After Complete Setup:**
- ✅ **Raspberry Pi OS Lite** με SSH enabled
- ✅ **WiFi configuration** με static IP
- ✅ **Kiosk files** pre-copied
- ✅ **Auto-installation** on first boot
- ✅ **Voice commands** ready
- ✅ **Health monitoring** setup

### **Deployment:**
1. **Βάλε** την MicroSD στο Raspberry Pi
2. **Συνδέσε** το power supply
3. **Περίμενε** 10-15 λεπτά για auto-installation
4. **Access** το kiosk στο: http://192.168.1.100:3000/kiosk
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

### **If Raspberry Pi Imager Fails:**
1. **Δοκίμασε** άλλο USB port
2. **Χρησιμοποίησε** άλλο card reader
3. **Δοκίμασε** άλλο MicroSD card
4. **Restart** τον υπολογιστή

### **If Post-Installation Fails:**
```bash
# Check if partitions exist
lsblk | grep sdb

# If no partitions, the image wasn't written properly
# Try Raspberry Pi Imager again
```

## 🎉 Ready to Go!

Η **Raspberry Pi Imager** είναι η πιο αξιόπιστη μέθοδος για να γράψεις το Raspberry Pi OS. Μετά το writing, το `post-install-setup.sh` θα ρυθμίσει όλα τα kiosk files και θα είναι έτοιμο για deployment!

**Total time**: 5-15 λεπτά (writing) + 2-3 λεπτά (post-installation) = **Professional kiosk έτοιμο!** 🚀
