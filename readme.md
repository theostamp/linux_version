# 🏢 Building Management System - Linux Version

## 🎯 Επισκόπηση

Πλήρες σύστημα διαχείρισης πολυκατοικιών με multi-tenant αρχιτεκτονική, kiosk mode για δημόσιους χώρους, και comprehensive financial management.

## 🚀 Γρήγορη Εκκίνηση

### 🧹 Καθαρισμός και Επανεκκίνηση Docker

#### Πλήρες Reset (Άδειασμα Όλων)

```bash
# 1. Διακοπή και διαγραφή όλων των containers
docker compose down --volumes --remove-orphans

# 2. Διαγραφή όλων των images (προαιρετικό)
docker rmi $(docker images -q) 2>/dev/null || true

# 3. Καθαρισμός volumes
docker volume prune -f

# 4. Καθαρισμός networks
docker network prune -f

# 5. Πλήρες καθαρισμός συστήματος (προαιρετικό)
docker system prune -a --volumes

# 6. Επανεκκίνηση με νέα build
docker compose up --build -d
```

#### Γρήγορο Reset (Διατήρηση Images)

```bash
# 1. Διακοπή containers και καθαρισμός volumes
docker compose down --volumes

# 2. Καθαρισμός μόνο unused resources
docker system prune -f

# 3. Επανεκκίνηση
docker compose up --build -d
```

#### Reset Μόνο Database (Διατήρηση Κώδικα)

```bash
# 1. Διακοπή containers
docker compose down

# 2. Διαγραφή μόνο του database volume
docker volume rm linux_version_pgdata_dev

# 3. Επανεκκίνηση (νέα βάση δεδομένων)
docker compose up -d
```

### 🔄 Αυτόματη Αρχικοποίηση

```bash
# Πλήρες reset και εκκίνηση
./reset_and_start.sh

# Ή με interactive menu
./clean_and_restart.sh
```

### 📝 Χειροκίνητη Εκκίνηση

```bash
# 1. Εκκίνηση containers
docker compose up -d

# 2. Παρακολούθηση logs
docker compose logs -f backend
```

### 🔍 Έλεγχος Κατάστασης

```bash
# Έλεγχος containers
docker compose ps

# Έλεγχος logs
docker compose logs

# Έλεγχος volumes
docker volume ls

# Έλεγχος networks
docker network ls
```

## 🌐 Πρόσβαση

Μετά την εκκίνηση, μπορείτε να αποκτήσετε πρόσβαση:

- **Public Admin (Ultra-Superuser)**: http://localhost:8000/admin/
- **Demo Frontend**: http://demo.localhost:8080
- **Demo Backend API**: http://demo.localhost:8000/api/
- **Demo Admin Panel**: http://demo.localhost:8000/admin/
- **Kiosk Mode (Building-specific)**: http://demo.localhost:8080/info-screen/1
- **Kiosk Mode (General)**: http://demo.localhost:8080/kiosk
- **Kiosk Settings**: http://demo.localhost:8080/kiosk-settings

## 👑 Διαθέσιμοι Χρήστες

### Ultra-Superuser (Public Schema)
| Email | Password | Δικαιώματα |
|-------|----------|------------|
| 👑 **theostam1966@gmail.com** | **theo123!@#** | **Πλήρη διαχείριση όλων των tenants** |

### Demo Χρήστες (Demo Tenant)
| Ρόλος | Email | Password | Δικαιώματα |
|-------|-------|----------|------------|
| 🔧 Admin | admin@demo.localhost | admin123456 | **Superuser** - Πλήρη admin πρόσβαση |
| 👨‍💼 Manager | manager@demo.localhost | manager123456 | **Staff** - Περιορισμένα admin δικαιώματα |
| 👤 Resident 1 | resident1@demo.localhost | resident123456 | **User** - Χωρίς admin πρόσβαση |
| 👤 Resident 2 | resident2@demo.localhost | resident123456 | **User** - Χωρίς admin πρόσβαση |

## 🏗️ Ιεραρχία Δικαιωμάτων

```
👑 Ultra-Superuser (theostam1966@gmail.com)
├── Public Schema (localhost:8000/admin/)
│   ├── Διαχείριση όλων των tenants
│   ├── Δημιουργία/διαγραφή tenants
│   └── Πλήρη πρόσβαση σε όλα τα schemas
│
├── 🔧 Tenant Admin (admin@demo.localhost)
│   ├── Demo Tenant (demo.localhost:8000/admin/)
│   ├── Διαχείριση χρηστών στο tenant
│   └── Πλήρη πρόσβαση στο tenant schema
│
├── 👨‍💼 Tenant Manager (manager@demo.localhost)
│   ├── Περιορισμένα admin δικαιώματα
│   └── Διαχείριση δεδομένων του tenant
│
└── 👤 Residents (resident1@demo.localhost, resident2@demo.localhost)
    ├── Κανονικοί χρήστες
    └── Πρόσβαση μόνο στα δικά τους δεδομένα
```

## 📊 Demo Δεδομένα

Το σύστημα περιλαμβάνει:

- ✅ **2 κτίρια** (Αθηνών 12, Πατησίων 45)
- ✅ **4 χρήστες** με διαφορετικούς ρόλους
- ✅ **12 διαμερίσματα** (2 κτίρια × 2 όροφοι × 3 διαμερίσματα)
- ✅ **2 ανακοινώσεις**
- ✅ **2 αιτήματα** (maintenance)
- ✅ **2 ψηφοφορίες** με επιλογές
- ✅ **2 υποχρεώσεις** (financial)
- ✅ **Building memberships** για όλους τους χρήστες

## 🖥️ Kiosk Mode - Οθόνη Προβολής

Το σύστημα διαθέτει μια οθόνη προβολής (kiosk mode) που μπορεί να τοποθετηθεί στην είσοδο της πολυκατοικίας και παρέχει:

### ✨ Χαρακτηριστικά:
- **📢 Ανακοινώσεις**: Εμφάνιση ενεργών ανακοινώσεων με προτεραιότητα
- **🗳️ Ψηφοφορίες**: Προβολή ενεργών ψηφοφοριών με ημερομηνίες λήξης
- **🏢 Πληροφορίες Κτιρίου**: Στοιχεία κτιρίου, διαχειριστή, αριθμός διαμερισμάτων
- **🌤️ Καιρός**: Πραγματικές πληροφορίες καιρού για την περιοχή
- **📰 Ειδήσεις**: Κινούμενο ticker με ειδήσεις και προτροπές
- **📢 Διαφημιστικά Banners**: Χρήσιμες υπηρεσίες και διαφημίσεις
- **⏰ Ώρα & Ημερομηνία**: Πραγματικού χρόνου ενημέρωση

### 🎨 Σχεδιασμός:
- **Full-screen layout** με gradient background
- **Auto-sliding** slides κάθε 10 δευτερόλεπτα
- **Responsive design** για διαφορετικά μεγέθη οθόνης
- **Touch-friendly** navigation με dots
- **Professional appearance** κατάλληλο για δημόσιους χώρους

### 🔧 Διαχείριση:
- **Ρυθμίσεις Kiosk**: `/kiosk-settings` για διαχείριση banners και ρυθμίσεων
- **Προεπισκόπηση**: Άμεση προεπισκόπηση των αλλαγών
- **Building-specific**: Διαφορετικό περιεχόμενο ανά κτίριο
- **Real-time updates**: Αυτόματη ανανέωση δεδομένων

## 🐧 WSL Ubuntu Terminal Configuration

Το project έχει ρυθμιστεί για να χρησιμοποιεί το WSL Ubuntu ως default terminal αντί για PowerShell.

### Ρυθμίσεις VS Code:
- **Default Terminal**: WSL Ubuntu
- **Debugging**: Ρυθμισμένο για WSL environment
- **Tasks**: Όλες οι εργασίες τρέχουν στο WSL

### Χρήση:
1. **Terminal**: `Ctrl + `` (ανοίγει το WSL Ubuntu terminal)
2. **Tasks**: `Ctrl + Shift + P` → "Tasks: Run Task" → επιλέξτε εργασία
3. **Debugging**: `F5` → επιλέξτε "Python: Current File (WSL)" ή "Django: Run Server (WSL)"

## 📁 Project Structure

```
linux_version/
├── backend/                    # Django backend
│   ├── scripts/               # Automation scripts
│   │   ├── auto_initialization.py  # 🎯 Main auto-init script
│   │   ├── create_superuser.py     # 🔧 Superuser creation
│   │   ├── manage_tenants.py       # 🏢 Tenant management
│   │   └── check_permissions.py    # 🔍 Permission checking
│   ├── logs/                  # Credentials & logs
│   └── entrypoint.sh          # Container startup script
├── frontend/                  # Next.js frontend
├── docs/                      # 📚 Documentation (organized)
│   ├── index.md              # 🎯 Central documentation index
│   ├── session-management/   # 🔄 Session guides
│   ├── implementation-guides/ # 🛠️ Implementation guides
│   ├── testing/              # 🧪 Testing guides
│   ├── documentation/        # 📖 General documentation
│   ├── todo-planning/        # 📋 TODO & planning
│   ├── completion-summaries/ # ✅ Completion summaries
│   ├── quick-start-guides/   # 🚀 Quick start guides
│   └── debug-fixes/          # 🔧 Debug & fixes
├── docker-compose.yml         # Container configuration
├── reset_and_start.sh         # 🚀 Quick reset script
├── clean_and_restart.sh       # 🧹 Interactive clean script
└── readme.md                  # This file
```

## 📚 Τεκμηρίωση

### 📖 Κεντρικός Οδηγός Τεκμηρίωσης
Όλη η λεπτομερής τεκμηρίωση έχει οργανωθεί στο φάκελο `docs/`:

- **[📚 docs/index.md](docs/index.md)** - Κεντρικός οδηγός για όλη την τεκμηρίωση
- **[📋 README_ORGANIZATION.md](README_ORGANIZATION.md)** - Οδηγός οργάνωσης αρχείων

### 🎯 Γρήγορη Πλοήγηση Τεκμηρίωσης

| Κατηγορία | Περιγραφή | Σύνδεσμος |
|-----------|-----------|-----------|
| 🔄 Session Management | Επόμενες συνεδρίες και σύνοψες | [docs/session-management/](docs/session-management/) |
| 🛠️ Implementation Guides | Οδηγίες υλοποίησης | [docs/implementation-guides/](docs/implementation-guides/) |
| 🧪 Testing | Testing και validation | [docs/testing/](docs/testing/) |
| 📖 Documentation | Γενική τεκμηρίωση | [docs/documentation/](docs/documentation/) |
| 📋 TODO & Planning | Εργασίες και σχεδιασμός | [docs/todo-planning/](docs/todo-planning/) |
| ✅ Completion Summaries | Σύνοψες ολοκληρωμένων | [docs/completion-summaries/](docs/completion-summaries/) |
| 🚀 Quick Start Guides | Γρήγοροι οδηγοί | [docs/quick-start-guides/](docs/quick-start-guides/) |
| 🔧 Debug & Fixes | Διόρθωση προβλημάτων | [docs/debug-fixes/](docs/debug-fixes/) |

## 🔧 Χρήσιμες Εντολές

### 🐳 Docker Commands

```bash
# Έλεγχος κατάστασης
docker compose ps

# Παρακολούθηση logs
docker compose logs -f

# Restart συγκεκριμένου service
docker compose restart backend
docker compose restart frontend
docker compose restart db

# Έλεγχος χρήσης πόρων
docker stats
```

### 🔧 Backend Scripts

```bash
# Δημιουργία superuser
docker exec linux_version-backend-1 python backend/scripts/create_superuser.py --email admin@example.com --password mypassword

# Διαχείριση tenants
docker exec linux_version-backend-1 python backend/scripts/manage_tenants.py --list

# Έλεγχος δικαιωμάτων
docker exec linux_version-backend-1 python backend/scripts/check_permissions.py --all
```

### 🗄️ Database Commands

```bash
# Σύνδεση στη βάση δεδομένων
docker compose exec db psql -U postgres

# Backup βάσης δεδομένων
docker compose exec db pg_dump -U postgres > backup.sql

# Restore βάσης δεδομένων
docker compose exec -T db psql -U postgres < backup.sql
```

## 🚨 Troubleshooting

### Αν δεν ξεκινάνε τα containers:

```bash
# 1. Έλεγχος αν χρησιμοποιούνται οι ports
sudo lsof -i :8080  # Frontend port
sudo lsof -i :8000  # Backend port
sudo lsof -i :5432  # Database port

# 2. Kill processes που χρησιμοποιούν τα ports
sudo kill -9 <PID>

# 3. Επανεκκίνηση
docker compose up --build -d
```

### Αν δεν συνδέεται η βάση δεδομένων:

```bash
# 1. Έλεγχος database container
docker compose logs db

# 2. Restart μόνο τη βάση
docker compose restart db

# 3. Έλεγχος σύνδεσης
docker compose exec db psql -U postgres -c "SELECT 1;"
```

### Αν δεν λειτουργεί η αυτόματη αρχικοποίηση:

```bash
# 1. Έλεγχος backend logs
docker compose logs backend

# 2. Χειροκίνητη αρχικοποίηση
docker exec linux_version-backend-1 python backend/scripts/auto_initialization.py

# 3. Έλεγχος αν δημιουργήθηκαν οι χρήστες
docker exec linux_version-backend-1 python backend/scripts/check_permissions.py --all
```

## 📄 Credentials File

Τα credentials αποθηκεύονται αυτόματα στο:
```
backend/logs/demo_credentials.log
```

## 🎯 Current Status

✅ **Financial Module**: Πλήρως λειτουργικό με API fixes  
✅ **Building Selector**: UI λειτουργικό, χρειάζεται data refresh fix  
✅ **Multi-tenant**: Λειτουργικό με django-tenants  
✅ **Authentication**: JWT-based με refresh tokens  
✅ **Sample Data**: Διαθέσιμο στο demo tenant  
✅ **Documentation**: Πλήρως οργανωμένη σε 8 κατηγορίες  

## 📋 TODO - Επόμενα Βήματα

### 🔧 Building Selector Issue (Priority: HIGH)
**Πρόβλημα**: Μετά την επιλογή άλλου κτιρίου δεν έχουμε αλλαγή δεδομένων.

**Επόμενα Βήματα**:
1. Ελέγξω αν το `selectedBuilding` ενημερώνεται στο context
2. Ελέγξω αν τα components re-render όταν αλλάζει το building
3. Ελέγξω αν τα API calls χρησιμοποιούν το σωστό building ID
4. Ελέγξω αν υπάρχει caching issue

### 🏗️ Financial Module Enhancements
- [ ] Add transaction creation form
- [ ] Add payment creation form
- [ ] Add account creation form
- [ ] Add financial reports
- [ ] Add export functionality

### 🔐 Security Enhancements
- [ ] Add rate limiting
- [ ] Add audit logging
- [ ] Add session management
- [ ] Add 2FA support

### 📊 Monitoring & Analytics
- [ ] Add system health dashboard
- [ ] Add performance metrics
- [ ] Add user activity tracking
- [ ] Add error reporting

### 🚀 Production Deployment
- [ ] Set up CI/CD pipeline
- [ ] Configure production environment
- [ ] Set up monitoring and alerting
- [ ] Create backup procedures

## 🎉 Επιτυχής Αρχικοποίηση!

Μετά την εκκίνηση, το σύστημα είναι έτοιμο για χρήση με πλήρη demo δεδομένα και χρήστες!

## 🔄 GitHub Ενημέρωση

### 📤 Εκκίνηση Git Repository

```bash
# Αρχικοποίηση Git repository
git init

# Προσθήκη όλων των αρχείων
git add .

# Πρώτο commit
git commit -m "Initial commit - Building Management System"

# Ορισμός main branch
git branch -M main

# Προσθήκη remote repository
git remote add origin https://github.com/theostamp/linux_version.git

# Push στο GitHub
git push -u origin main
```

### 📝 Ενημέρωση Αλλαγών

```bash
# Προσθήκη αλλαγών
git add .

# Commit με περιγραφικό μήνυμα
git commit -m "αναδιαρθρωση financial calculator"

# Push στο GitHub
git push origin main
```

### 🚨 Force Push (Προσοχή!)

```bash
# Force push (χρησιμοποιείται μόνο όταν είναι απαραίτητο)
git push --force origin main
```

### 📋 Παραδείγματα Commit Messages

```bash
# Για νέες λειτουργίες
git commit -m "Feature: Add advanced calculator functionality"

# Για διορθώσεις
git commit -m "Fix: Resolve building selector data refresh issue"

# Για βελτιώσεις
git commit -m "Improve: Enhance documentation organization"

# Για refactoring
git commit -m "Refactor: Reorganize project structure"

# Για testing
git commit -m "Test: Add comprehensive test coverage"
```

---

**📅 Τελευταία ενημέρωση:** Δεκέμβριος 2024  
**🔧 Δημιουργήθηκε από:** AI Assistant  
**📁 Οργανωμένα αρχεία:** 93 σε 8 κατηγορίες στο `docs/`