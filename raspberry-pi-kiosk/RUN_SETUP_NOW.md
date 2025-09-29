# 🚀 Run MicroSD Setup Now - D: Drive

## 📋 Quick Setup Instructions

Αφού η MicroSD είναι στο D: drive, ακολούθησε αυτά τα βήματα:

### 1. 🖥️ **Ανοίγεις Terminal στο Linux**

```bash
cd /home/theo/projects/linux_version/raspberry-pi-kiosk
```

### 2. 🔧 **Ενημερώνεις τις Ρυθμίσεις**

Πρώτα, ενημέρωσε τις ρυθμίσεις στο `auto-setup-microsd.sh`:

```bash
nano auto-setup-microsd.sh
```

**Αλλάζεις αυτές τις γραμμές:**
```bash
KIOSK_SSID="YOUR_WIFI_NAME"           # Βάλε το όνομα του WiFi σου
KIOSK_PASSWORD="YOUR_WIFI_PASSWORD"   # Βάλε τον κωδικό του WiFi σου
KIOSK_SERVER_URL="http://localhost:3000"  # Βάλε το URL του server σου
KIOSK_BUILDING_ID="1"                # Βάλε το ID του κτιρίου
```

### 3. 🚀 **Τρέχεις το Setup**

```bash
sudo ./auto-setup-microsd.sh
```

**Ή χρησιμοποίησε το interactive script:**
```bash
sudo ./setup-microsd-d-drive.sh
```

## 📝 **Παράδειγμα Ρυθμίσεων:**

```bash
KIOSK_SSID="MyBuilding-WiFi"
KIOSK_PASSWORD="SecurePassword123"
KIOSK_SERVER_URL="http://192.168.1.50:3000"
KIOSK_BUILDING_ID="1"
KIOSK_STATIC_IP="192.168.1.100"
```

## ⚠️ **Σημαντικά:**

### **Πριν τρέξεις το script:**
1. **Βεβαιώσου** ότι η MicroSD είναι στο D: drive
2. **Αφαίρεσε** όλα τα αρχεία από την MicroSD (αν έχει)
3. **Έχεις** sudo privileges

### **Κατά τη διάρκεια:**
- Το script θα **κατεβάσει** το Raspberry Pi OS (5-10 λεπτά)
- Θα **γράψει** το image στην MicroSD (5-15 λεπτά)
- Θα **ρυθμίσει** όλες τις παραμέτρους
- Θα **αντιγράψει** όλα τα kiosk files

### **Μετά το setup:**
- Η MicroSD θα είναι **έτοιμη** για plug & play
- **Βάλε** την στο Raspberry Pi
- **Συνδέσε** το power supply
- **Περίμενε** 10-15 λεπτά για auto-installation

## 🔍 **Troubleshooting:**

### **Αν το script αποτυγχάνει:**
```bash
# Έλεγξε αν η MicroSD είναι προσβάσιμη
lsblk | grep sdb

# Έλεγξε αν χρειάζεται unmount
sudo umount /dev/sdb*

# Δοκίμασε ξανά
sudo ./auto-setup-microsd.sh
```

### **Αν δεν βρίσκει το device:**
```bash
# Έλεγξε όλα τα devices
lsblk

# Αν η MicroSD είναι σε άλλο device (π.χ. sdc), άλλαξε στο script:
# DEVICE="sdc"  # αντί για sdb
```

## 🎯 **Αυτό που θα πάρεις:**

### **Plug & Play MicroSD με:**
- ✅ **Raspberry Pi OS Lite** pre-installed
- ✅ **WiFi configuration** με static IP
- ✅ **SSH access** enabled
- ✅ **Kiosk files** pre-copied
- ✅ **Auto-installation** on first boot
- ✅ **Health monitoring** setup
- ✅ **Voice commands** ready (optional)

### **Μετά την εισαγωγή στο Raspberry Pi:**
- ✅ **Αυτόματη σύνδεση** στο WiFi
- ✅ **Αυτόματη εγκατάσταση** όλων των packages
- ✅ **Αυτόματη εκκίνηση** του kiosk
- ✅ **SSH access** στο static IP
- ✅ **Health monitoring** ενεργό

## 🎉 **Ready to Go!**

Μόλις ολοκληρωθεί το setup, η MicroSD θα είναι **100% έτοιμη** για deployment. Απλά την βάζεις στο Raspberry Pi και όλα γίνονται αυτόματα!

**Total time**: 15-30 λεπτά (setup) + 10-15 λεπτά (first boot)
**Result**: Professional kiosk έτοιμο για χρήση! 🚀
