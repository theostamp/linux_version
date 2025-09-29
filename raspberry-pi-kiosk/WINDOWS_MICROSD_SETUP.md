# 🪟 Windows MicroSD Setup Guide

## 📋 Windows Formatting Options

Όταν το Windows ζητάει τον τρόπο διαμόρφωσης, έχεις τις εξής επιλογές:

### 🎯 **Συνιστώμενη Επιλογή: exFAT**

**Επιλέγεις:**
- **File System**: `exFAT`
- **Allocation Unit Size**: `Default`
- **Volume Label**: `KIOSK` (ή ό,τι θέλεις)

**Γιατί exFAT:**
- ✅ **Compatible** με Linux και Windows
- ✅ **Supports** αρχεία >4GB
- ✅ **Good performance** για MicroSD cards
- ✅ **Standard** για Raspberry Pi OS

### 🔄 **Εναλλακτικές Επιλογές:**

#### **NTFS** (αν θέλεις Windows compatibility)
- ✅ **Full Windows support**
- ❌ **Slower** σε Raspberry Pi
- ❌ **More overhead**

#### **FAT32** (παλιότερο standard)
- ✅ **Universal compatibility**
- ❌ **File size limit** 4GB
- ❌ **Less efficient**

## 🚀 **Βήματα για Formatting:**

### 1. **Επιλογή exFAT:**
```
File System: exFAT
Allocation Unit Size: Default allocation size
Volume Label: KIOSK
Quick Format: ✅ (checked)
```

### 2. **Κάνε κλικ "Start"**
- Περίμενε να ολοκληρωθεί το formatting
- Μην αφαιρέσεις την MicroSD κατά τη διαδικασία

### 3. **Verification:**
- Το Windows θα εμφανίσει την MicroSD ως νέα drive
- Θα έχει το όνομα "KIOSK" (ή ό,τι έβαλες)

## 📁 **Μετά το Formatting:**

### **Αν έχεις Raspberry Pi Imager:**
1. **Άνοιξε** το Raspberry Pi Imager
2. **Επιλέγεις** "Raspberry Pi OS Lite (64-bit)"
3. **Επιλέγεις** την MicroSD card
4. **Κάνεις κλικ** στο ⚙️ για advanced options
5. **Ρυθμίζεις**:
   - Enable SSH
   - Set hostname: `building-kiosk`
   - Configure WiFi
   - Set static IP
6. **Κάνεις κλικ** "Write"

### **Αν δεν έχεις Raspberry Pi Imager:**
1. **Κατεβάζεις** το Raspberry Pi Imager από: https://www.raspberrypi.org/downloads/
2. **Εγκαθιστάς** το
3. **Ακολουθείς** τα παραπάνω βήματα

## 🔧 **Manual Setup (Advanced):**

### **Αν θέλεις manual control:**
1. **Κατεβάζεις** το Raspberry Pi OS image
2. **Χρησιμοποιείς** το Win32DiskImager ή Rufus
3. **Γράφεις** το image στην MicroSD
4. **Αντιγράφεις** τα kiosk files στο boot partition

## ⚠️ **Σημαντικές Σημειώσεις:**

### **Μην κάνεις format αν:**
- Η MicroSD έχει ήδη Raspberry Pi OS
- Θέλεις να διατηρήσεις υπάρχοντα δεδομένα
- Η MicroSD είναι από άλλο Raspberry Pi

### **Κάνε format αν:**
- Η MicroSD είναι νέα
- Θέλεις να ξεκινήσεις από την αρχή
- Η MicroSD έχει προβλήματα

## 🎯 **Συνιστώμενη Διαδικασία:**

### **Για Plug & Play Setup:**
1. **Format** με exFAT
2. **Κατεβάζεις** Raspberry Pi Imager
3. **Ρυθμίζεις** όλες τις παραμέτρους
4. **Γράφεις** το image
5. **Αντιγράφεις** τα kiosk files
6. **Εισάγεις** στο Raspberry Pi

### **Για Automated Setup:**
1. **Format** με exFAT
2. **Χρησιμοποιείς** τα scripts από το Linux setup
3. **Ακολουθείς** το `quick-microsd-setup.sh` process

## 🔍 **Troubleshooting:**

### **Αν το Windows δεν αναγνωρίζει την MicroSD:**
- **Αφαίρεσε** και **εισάγε** ξανά
- **Δοκίμασε** άλλο USB port
- **Έλεγξε** αν η MicroSD είναι write-protected
- **Χρησιμοποίησε** άλλο card reader

### **Αν το formatting αποτυγχάνει:**
- **Έλεγξε** αν η MicroSD είναι κατεστραμμένη
- **Δοκίμασε** άλλο formatting tool
- **Χρησιμοποίησε** το Windows Disk Management

## 📞 **Βοήθεια:**

### **Αν χρειάζεσαι βοήθεια:**
- **Ελέγξε** το Windows Disk Management
- **Χρησιμοποίησε** το Raspberry Pi Imager
- **Ακολούθησε** το official Raspberry Pi guide
- **Δοκίμασε** άλλο formatting tool

---

## 🎉 **Συνοπτικά:**

**Επιλέγεις exFAT** και κάνεις format. Μετά χρησιμοποιείς το Raspberry Pi Imager για να γράψεις το OS και να ρυθμίσεις όλες τις παραμέτρους. Η MicroSD θα είναι έτοιμη για plug & play deployment στο Raspberry Pi!
