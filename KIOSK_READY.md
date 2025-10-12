# ✅ Kiosk Scenes - ΕΤΟΙΜΟ ΓΙΑ ΧΡΗΣΗ

**Ημερομηνία:** 12 Οκτωβρίου 2025
**Κατάσταση:** ✅ Πλήρως λειτουργικό

---

## 📋 Τι έγινε

Το σύστημα Kiosk Scenes έχει ρυθμιστεί και είναι πλήρως λειτουργικό!

### ✅ Backend (Ολοκληρώθηκε)

1. **Database Migrations** - Όλες οι migrations εφαρμόστηκαν επιτυχώς
   - `KioskScene` model
   - `WidgetPlacement` model
   - Σχέση με `Building` και `KioskWidget`

2. **Default Widgets** - Δημιουργήθηκαν 14 widgets για το building "Αλκμάνος 22":
   - 8 Main Slides (Επισκόπηση, Στατιστικά, Ανακοινώσεις, Ψηφοφορίες, Οικονομικά, Υπηρεσίες, Προσφορές, Έκτακτη Ανάγκη)
   - 3 Sidebar Widgets (Καιρός, QR Code, Πληροφορίες)
   - 2 Top Bar Widgets (Ώρα, Επιλογή Κτιρίου)
   - 1 Special Widget (Ταινία Ειδήσεων)

3. **Scenes** - Δημιουργήθηκαν 8 scenes με το `migrate_to_scenes` command
   - Κάθε main widget έχει τη δική του σκηνή
   - Διάρκεια: 30 δευτερόλεπτα ανά σκηνή
   - Transition: fade

4. **API Endpoints** - Όλα τα endpoints λειτουργούν:
   - ✅ `GET /api/kiosk/public/scenes/active/?building_id=1`
   - ✅ Επιστρέφει όλες τις ενεργές σκηνές με placements και widgets

### ✅ Frontend (Ολοκληρώθηκε)

1. **Hooks** - Όλα τα hooks είναι έτοιμα:
   - ✅ `useKioskScenes` - Fetch active scenes
   - ✅ Auto-refresh κάθε 5 λεπτά

2. **API Route** - Proxy route λειτουργεί:
   - ✅ `/api/kiosk-scenes-active`
   - ✅ Fallback support όταν backend down

3. **Components** - Όλα τα components έτοιμα:
   - ✅ `KioskSceneRenderer` - Main renderer για scenes
   - ✅ Scene cycling με transitions
   - ✅ Grid-based layout system
   - ✅ Dynamic widget rendering

4. **Widget Registry** - Ενημερώθηκε με backend compatibility mappings:
   - ✅ `DashboardOverview` → `DashboardWidget`
   - ✅ `BuildingStatistics` → `DashboardWidget`
   - ✅ `Announcements` → `AnnouncementsWidget`
   - ✅ ... και άλλα

5. **Kiosk Page** - Ρυθμίστηκε για scene mode:
   - ✅ `useSceneMode = true` by default
   - ✅ Keyboard shortcuts (Ctrl+Alt+S για toggle)

---

## 🚀 Πώς να το χρησιμοποιήσεις

### 1. Πρόσβαση στο Kiosk

```
http://localhost:8080/kiosk?building=1
```

ή με subdomain:
```
http://demo.localhost:8080/kiosk?building=1
```

### 2. Keyboard Shortcuts

- **Ctrl+Alt+S** - Toggle Scene Mode (ενεργοποίηση/απενεργοποίηση scenes)
- **Ctrl+Alt+C** - Toggle Canvas Mode (editor mode)
- **Ctrl+Alt+B** - Building Selection

### 3. Servers που τρέχουν

✅ **Backend:** http://localhost:18000 (Docker container)
✅ **Frontend:** http://localhost:8080 (Docker container)
✅ **Database:** PostgreSQL on port 15432
✅ **Redis:** On port 16379

---

## 🎨 Τι βλέπεις στο Kiosk

Το Kiosk εναλλάσσει αυτόματα 8 σκηνές:

1. **Επισκόπηση Κτιρίου** (30s)
2. **Στατιστικά Κτιρίου** (30s)
3. **Ανακοινώσεις** (30s)
4. **Ψηφοφορίες** (30s)
5. **Οικονομική Επισκόπηση** (30s)
6. **Υπηρεσίες & Συντήρηση** (30s)
7. **Προσφορές & Έργα** (30s)
8. **Τηλέφωνα Έκτακτης Ανάγκης** (30s)

Κάθε σκηνή:
- Εμφανίζεται fullscreen
- Έχει fade transition
- Εναλλάσσεται αυτόματα

---

## 🔧 Διαχείριση Scenes

### Via Django Admin

1. Πήγαινε στο: http://localhost:18000/admin/kiosk/kioskscene/
2. Εκεί μπορείς να:
   - Δημιουργήσεις νέες σκηνές
   - Επεξεργαστείς την διάταξη (placements)
   - Αλλάξεις τη διάρκεια
   - Ενεργοποιήσεις/απενεργοποιήσεις σκηνές
   - Ορίσεις time-based activation (π.χ. μόνο πρωί)

### Via Management Command

Για να ξαναδημιουργήσεις scenes:

```bash
docker exec linux_version-backend-1 python manage.py tenant_command migrate_to_scenes --schema=demo --building-id=1 --force
```

### Προσθήκη νέων Widgets

1. Δημιούργησε νέο widget μέσω Django Admin ή API
2. Τρέξε το migrate_to_scenes με --force
3. Ή δημιούργησε scene χειροκίνητα και πρόσθεσε placements

---

## 📊 Τρέχουσα Κατάσταση

```
Building: Αλκμάνος 22 (ID: 1)
Widgets: 14 (8 main, 3 sidebar, 2 topbar, 1 special)
Scenes: 8 (όλες ενεργές)
Placements: 8 (1 per scene, fullscreen)
```

---

## 🐛 Troubleshooting

### Δεν βλέπω scenes
```bash
# Ελέγξε αν υπάρχουν scenes
docker exec linux_version-backend-1 python manage.py tenant_command shell --schema=demo -c "from kiosk.models import KioskScene; print(f'Scenes: {KioskScene.objects.count()}')"

# Αν δεν υπάρχουν, δημιούργησε
docker exec linux_version-backend-1 python manage.py tenant_command migrate_to_scenes --schema=demo --building-id=1
```

### Widget δεν εμφανίζεται
- Έλεγξε ότι το component name στο backend ταιριάζει με το registry
- Έλεγξε console για errors
- Δες το `/home/theo/project/linux_version/frontend/lib/kiosk/widgets/registry.ts`

### API Error
```bash
# Έλεγξε το backend
docker logs linux_version-backend-1 --tail 50

# Restart backend
docker restart linux_version-backend-1
```

---

## 🎉 Επιτυχία!

Το Kiosk Scenes system είναι πλήρως λειτουργικό και έτοιμο για χρήση!

**Επόμενα βήματα (προαιρετικά):**
1. Δημιούργησε custom scenes με διαφορετικά layouts
2. Πρόσθεσε χρονοβασισμένες σκηνές (π.χ. διαφορετικές για πρωί/απόγευμα)
3. Δοκίμασε split-screen layouts με πολλαπλά widgets ανά scene
4. Προσάρμοσε την εμφάνιση των widgets

---

**Δημιουργήθηκε:** 12 Οκτωβρίου 2025
**Status:** ✅ Production Ready


