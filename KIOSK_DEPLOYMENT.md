# 🚀 Kiosk Management Deployment Guide

## 📺 **Existing Public Kiosk Display**

Το project έχει ήδη ένα **public kiosk display** που λειτουργεί:
- 🌐 **URL:** `https://newconcierge.app/kiosk-display?building=2`
- 🔓 **Public Access:** Χωρίς authentication
- 📱 **Features:** Ανακοινώσεις, QR codes, Emergency phones, Weather

### 🆕 **Νέο Kiosk Management System**

Το νέο σύστημα που δημιουργήθηκε προσφέρει:
- 🎨 **Dynamic Widget Management:** Δημιουργία custom widgets
- 🎬 **Scene Management:** Προκαθορισμένες διατάξεις (π.χ. "Πρωινή Επισκόπηση")
- ⚙️ **Settings:** Slide duration, auto-slide, navigation
- 👁️ **Live Preview:** Real-time προεπισκόπηση
- 🔧 **Admin Control Panel:** `/kiosk-management`

---

## Βήματα για Production Deployment

### 📋 **Prerequisites**
- ✅ Git push completed
- ✅ Frontend deployed (Next.js)
- ⚠️ Backend needs migration + restart
- ✅ Existing kiosk-display remains functional

---

## 🔧 **Backend Deployment Steps**

### 1️⃣ **SSH στον Production Server**
```bash
ssh user@your-production-server
cd /path/to/backend
```

### 2️⃣ **Pull Latest Changes**
```bash
git pull origin main
```

### 3️⃣ **Activate Virtual Environment**
```bash
source venv/bin/activate
# ή
source .venv/bin/activate
```

### 4️⃣ **Run Migrations**
```bash
python manage.py migrate

# Θα δείτε κάτι σαν:
# Running migrations:
#   Applying kiosk.0001_initial... OK
#   Applying kiosk.0002_kioskdisplaysettings_kioskwidget_and_more... OK
#   Applying kiosk.0003_kioskscene_widgetplacement... OK
#   Applying kiosk.0004_rename_kiosk_scene_building_enabled_idx... OK
```

### 5️⃣ **Create Default Widgets (Optional)**
```bash
python create_default_kiosk_widgets.py
```

### 6️⃣ **Restart Django Server**

**Με Gunicorn:**
```bash
sudo systemctl restart gunicorn
# ή
sudo supervisorctl restart gunicorn
```

**Με PM2:**
```bash
pm2 restart django
```

**Manual Restart:**
```bash
# Stop existing process
ps aux | grep python
kill <PID>

# Start new process
python manage.py runserver 0.0.0.0:8000
# ή με gunicorn
gunicorn new_concierge_backend.wsgi:application --bind 0.0.0.0:8000
```

### 7️⃣ **Verify API Endpoints**
```bash
# Test kiosk configs endpoint
curl https://your-domain.com/api/kiosk/configs/?building_id=1

# Test kiosk scenes endpoint
curl https://your-domain.com/api/kiosk/scenes/?building_id=1
```

---

## 🧪 **Testing After Deployment**

1. ✅ Ανοίξτε: `https://your-domain.com/kiosk-management`
2. ✅ Πρέπει να βλέπετε statistics (όχι errors)
3. ✅ Πηγαίνετε στο `/kiosk-management/scenes`
4. ✅ Πατήστε "Δημιουργία Default Scene"
5. ✅ Ελέγξτε το `/kiosk-management/preview`

---

## 🐛 **Troubleshooting**

### ❌ **404 Errors στα API endpoints**
```bash
# Ελέγξτε αν έτρεξαν οι migrations
python manage.py showmigrations kiosk

# Αν δείτε [ ] (unchecked), τρέξτε:
python manage.py migrate kiosk
```

### ❌ **No tables found**
```bash
# Ελέγξτε τη database
python manage.py dbshell
> \dt kiosk*;  # PostgreSQL
> SHOW TABLES LIKE 'kiosk%';  # MySQL
```

### ❌ **500 Internal Server Error**
```bash
# Ελέγξτε τα logs
tail -f /var/log/gunicorn/error.log
# ή
journalctl -u gunicorn -f
```

---

## 📦 **Database Tables Created**

Μετά τις migrations θα υπάρχουν:

- ✅ `kiosk_widget_configs` - Widget configurations
- ✅ `kiosk_display_configs` - Display settings
- ✅ `kiosk_scenes` - Scene layouts
- ✅ `kiosk_widget_placements` - Widget positions in scenes

---

## 🎯 **Kiosk System Architecture**

### **2 Kiosk Endpoints:**

#### 1️⃣ **Legacy Kiosk Display** (Existing - Public)
- **URL:** `/kiosk-display?building=X`
- **Type:** Hardcoded, static widgets
- **Access:** Public (no auth required)
- **Features:** Basic display με ανακοινώσεις, QR, emergency contacts
- **Status:** ✅ Ήδη σε production και λειτουργεί

#### 2️⃣ **New Managed Kiosk** (Coming Soon - Dynamic)
- **URL:** `/kiosk?building_id=X`
- **Type:** Dynamic, widget-based με scenes
- **Access:** Public (no auth required)
- **Management:** `/kiosk-management` (requires admin auth)
- **Features:** 
  - Custom widgets
  - Scene templates ("Πρωινή Επισκόπηση")
  - Live preview
  - Configurable settings

### **Migration Path:**

Δεν χρειάζεται να αντικαταστήσετε το existing kiosk-display! Τα 2 systems μπορούν να συνυπάρχουν:

```
┌─────────────────────────────────────┐
│  /kiosk-display (Legacy)            │
│  ✅ Hardcoded widgets               │
│  ✅ Stable & proven                 │
│  ✅ Already in production           │
└─────────────────────────────────────┘
                 ↓
         Μελλοντική μετάβαση
                 ↓
┌─────────────────────────────────────┐
│  /kiosk (New Managed)               │
│  ✨ Dynamic widgets                 │
│  ✨ Scene management                │
│  ✨ Full customization              │
└─────────────────────────────────────┘
```

---

## 🎯 **Quick Start για Users**

Μετά το deployment, οι admins μπορούν να:

1. **Γρήγορη Ρύθμιση:**
   - `/kiosk-management` → "Γρήγορη Ρύθμιση με Scenes"
   - Πατάνε "Διαχείριση Scenes"
   - Πατάνε "Δημιουργία Default Scene"
   - Done! Το νέο managed kiosk είναι έτοιμο

2. **Προχωρημένη:**
   - Δημιουργούν custom widgets
   - Φτιάχνουν δικά τους scenes
   - Προσαρμόζουν πλήρως το layout

**Note:** Το `/kiosk-display` θα συνεχίσει να λειτουργεί κανονικά!

---

## 📞 **Support**

Για προβλήματα με το deployment:
- Ελέγξτε τα logs
- Επιβεβαιώστε ότι έτρεξαν όλες οι migrations
- Κάντε restart το Django server
- Επαληθεύστε τα API endpoints με curl

---

**Created:** 2025-01-19  
**Last Updated:** 2025-01-19

