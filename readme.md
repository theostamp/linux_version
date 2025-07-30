# Οδηγός Εκκίνησης & Διαχείρισης (linux_version)

## 🚀 Αυτόματη Αρχικοποίηση

Το σύστημα τώρα αρχικοποιείται αυτόματα με την εκκίνηση των containers!

### 🎯 Γρήγορη Εκκίνηση (Fresh Start)

```bash
# Πλήρες reset και εκκίνηση
./reset_and_start.sh

# Ή με interactive menu
./clean_and_restart.sh
```

### 🔄 Χειροκίνητη Εκκίνηση

```bash
# 1. Καθαρισμός και εκκίνηση
docker compose down --volumes --remove-orphans
docker network prune -f docker system prune -a --volumes
docker compose up --build -d

# 2. Παρακολούθηση logs
docker compose logs -f backend
```

### 🧹 Καθαρισμός και Επανεκκίνηση Containers

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

### 🚨 Troubleshooting

#### Αν δεν ξεκινάνε τα containers:

```bash
# 1. Έλεγχος αν χρησιμοποιούνται οι ports
sudo lsof -i :3000  # Frontend port
sudo lsof -i :8000  # Backend port
sudo lsof -i :5432  # Database port

# 2. Kill processes που χρησιμοποιούν τα ports
sudo kill -9 <PID>

# 3. Επανεκκίνηση
docker compose up --build -d
```

#### Αν δεν συνδέεται η βάση δεδομένων:

```bash
# 1. Έλεγχος database container
docker compose logs db

# 2. Restart μόνο τη βάση
docker compose restart db

# 3. Έλεγχος σύνδεσης
docker compose exec db psql -U postgres -c "SELECT 1;"
```

#### Αν δεν λειτουργεί η αυτόματη αρχικοποίηση:

```bash
# 1. Έλεγχος backend logs
docker compose logs backend

# 2. Χειροκίνητη αρχικοποίηση
docker exec linux_version-backend-1 python backend/scripts/auto_initialization.py

# 3. Έλεγχος αν δημιουργήθηκαν οι χρήστες
docker exec linux_version-backend-1 python backend/scripts/check_permissions.py --all
```

### 🛠️ Χρήσιμες Εντολές

#### Διαχείριση Containers

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

#### Διαχείριση Database

```bash
# Σύνδεση στη βάση δεδομένων
docker compose exec db psql -U postgres

# Backup βάσης δεδομένων
docker compose exec db pg_dump -U postgres > backup.sql

# Restore βάσης δεδομένων
docker compose exec -T db psql -U postgres < backup.sql
```

#### Διαχείριση Files

```bash
# Έλεγχος volumes
docker volume ls

# Backup volumes
docker run --rm -v linux_version_pgdata_dev:/data -v $(pwd):/backup alpine tar czf /backup/pgdata_backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v linux_version_pgdata_dev:/data -v $(pwd):/backup alpine tar xzf /backup/pgdata_backup.tar.gz -C /data
```

#### Development

```bash
# Εκτέλεση Django shell
docker compose exec backend python manage.py shell

# Εκτέλεση migrations
docker compose exec backend python manage.py migrate_schemas --shared
docker compose exec backend python manage.py migrate_schemas --tenant

# Δημιουργία superuser
docker compose exec backend python manage.py createsuperuser

# Έλεγχος static files
docker compose exec backend python manage.py collectstatic --dry-run
```

---

## 🌐 Πρόσβαση

Μετά την εκκίνηση, μπορείτε να αποκτήσετε πρόσβαση:

- **Public Admin (Ultra-Superuser)**: http://localhost:8000/admin/
- **Demo Frontend**: http://demo.localhost:3000
- **Demo Backend API**: http://demo.localhost:8000/api/
- **Demo Admin Panel**: http://demo.localhost:8000/admin/
- **Kiosk Mode (Building-specific)**: http://demo.localhost:3000/info-screen/1
- **Kiosk Mode (General)**: http://demo.localhost:3000/kiosk
- **Kiosk Settings**: http://demo.localhost:3000/kiosk-settings

### 👑 Ultra-Superuser (Public Schema)

Ο Ultra-Superuser διαχειρίζεται όλους τους tenants από το public schema:

| Email | Password | Δικαιώματα |
|-------|----------|------------|
| 👑 **theostam1966@gmail.com** | **theo123!@#** | **Πλήρη διαχείριση όλων των tenants** |

**Ικανότητες Ultra-Superuser:**
- ✅ Δημιουργία/διαγραφή tenants
- ✅ Διαχείριση όλων των χρηστών σε όλα τα schemas
- ✅ Πλήρη πρόσβαση σε όλα τα δεδομένα
- ✅ Δημιουργία admin users για κάθε tenant

### 👥 Demo Χρήστες (Demo Tenant)

Το σύστημα δημιουργεί αυτόματα τους εξής χρήστες:

| Ρόλος | Email | Password | Δικαιώματα |
|-------|-------|----------|------------|
| 🔧 Admin | admin@demo.localhost | admin123456 | **Superuser** - Πλήρη admin πρόσβαση |
| 👨‍💼 Manager | manager@demo.localhost | manager123456 | **Staff** - Περιορισμένα admin δικαιώματα |
| 👤 Resident 1 | resident1@demo.localhost | resident123456 | **User** - Χωρίς admin πρόσβαση |
| 👤 Resident 2 | resident2@demo.localhost | resident123456 | **User** - Χωρίς admin πρόσβαση |

### 🔐 Δικαιώματα Admin

- **👑 Ultra-Superuser**: Πλήρη διαχείριση όλων των tenants και χρηστών
- **🔧 Admin (Superuser)**: Μπορεί να διαγράψει/ελέγξει όλους τους χρήστες, έχει πλήρη πρόσβαση στο admin panel
- **👨‍💼 Manager (Staff)**: Έχει admin πρόσβαση αλλά δεν μπορεί να διαγράψει superusers
- **👤 Residents**: Κανονικοί χρήστες χωρίς admin πρόσβαση

### 🏗️ Ιεραρχία Δικαιωμάτων

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

### 🛡️ Ασφάλεια

- **👑 Ultra-Superuser** μπορεί να διαχειριστεί όλους τους tenants και χρήστες
- **🔧 Tenant Superusers** μπορούν να διαγράψουν/ελέγξουν χρήστες μόνο στο δικό τους tenant
- **👨‍💼 Tenant Managers** μπορούν να διαχειριστούν δεδομένα αλλά όχι να διαγράψουν superusers
- **👤 Residents** έχουν πρόσβαση μόνο στα δικά τους δεδομένα

### 📊 Demo Δεδομένα

Το σύστημα περιλαμβάνει:

- ✅ **2 κτίρια** (Αθηνών 12, Πατησίων 45)
- ✅ **4 χρήστες** με διαφορετικούς ρόλους
- ✅ **12 διαμερίσματα** (2 κτίρια × 2 όροφοι × 3 διαμερίσματα)
- ✅ **2 ανακοινώσεις**
- ✅ **2 αιτήματα** (maintenance)
- ✅ **2 ψηφοφορίες** με επιλογές
- ✅ **2 υποχρεώσεις** (financial)
- ✅ **Building memberships** για όλους τους χρήστες

### 🖥️ Kiosk Mode - Οθόνη Προβολής

Το σύστημα διαθέτει μια οθόνη προβολής (kiosk mode) που μπορεί να τοποθετηθεί στην είσοδο της πολυκατοικίας και παρέχει:

#### ✨ Χαρακτηριστικά:
- **📢 Ανακοινώσεις**: Εμφάνιση ενεργών ανακοινώσεων με προτεραιότητα
- **🗳️ Ψηφοφορίες**: Προβολή ενεργών ψηφοφοριών με ημερομηνίες λήξης
- **🏢 Πληροφορίες Κτιρίου**: Στοιχεία κτιρίου, διαχειριστή, αριθμός διαμερισμάτων
- **🌤️ Καιρός**: Πραγματικές πληροφορίες καιρού για την περιοχή
- **📰 Ειδήσεις**: Κινούμενο ticker με ειδήσεις και προτροπές
- **📢 Διαφημιστικά Banners**: Χρήσιμες υπηρεσίες και διαφημίσεις
- **⏰ Ώρα & Ημερομηνία**: Πραγματικού χρόνου ενημέρωση

#### 🎨 Σχεδιασμός:
- **Full-screen layout** με gradient background
- **Auto-sliding** slides κάθε 10 δευτερόλεπτα
- **Responsive design** για διαφορετικά μεγέθη οθόνης
- **Touch-friendly** navigation με dots
- **Professional appearance** κατάλληλο για δημόσιους χώρους

#### 🔧 Διαχείριση:
- **Ρυθμίσεις Kiosk**: `/kiosk-settings` για διαχείριση banners και ρυθμίσεων
- **Προεπισκόπηση**: Άμεση προεπισκόπηση των αλλαγών
- **Building-specific**: Διαφορετικό περιεχόμενο ανά κτίριο
- **Real-time updates**: Αυτόματη ανανέωση δεδομένων

#### 📱 URLs:
- **Building-specific kiosk**: `/info-screen/{buildingId}`
- **General kiosk**: `/kiosk`
- **Kiosk settings**: `/kiosk-settings`

---

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

### Διαθέσιμες Εργασίες:
- `Docker Compose Up`: Εκκίνηση των containers
- `Docker Compose Down`: Διακοπή των containers  
- `Django Migrate`: Εκτέλεση migrations
- `Frontend Dev`: Εκκίνηση του frontend development server

---

## 🔧 Χειροκίνητη Διαχείριση (Advanced)

### Δημιουργία νέου tenant

```bash
# Δημιουργία custom tenant
docker exec linux_version-backend-1 python backend/scripts/create_tenant_and_migrate.py mycompany
```

### 🔧 Δημιουργία Superuser

```bash
# Δημιουργία superuser στο public schema
docker exec linux_version-backend-1 python backend/scripts/create_superuser.py --email myadmin@example.com --password mypassword

# Δημιουργία superuser σε συγκεκριμένο tenant
docker exec linux_version-backend-1 python backend/scripts/create_superuser.py --email tenantadmin@demo.localhost --password mypassword --tenant demo

# Εμφάνιση όλων των superusers
docker exec linux_version-backend-1 python backend/scripts/create_superuser.py --list
```

### 🏢 Διαχείριση Tenants (Ultra-Superuser)

```bash
# Εμφάνιση όλων των tenants
docker exec linux_version-backend-1 python backend/scripts/manage_tenants.py --list

# Δημιουργία νέου tenant
docker exec linux_version-backend-1 python backend/scripts/manage_tenants.py --create mycompany --domain mycompany.localhost

# Δημιουργία admin για tenant
docker exec linux_version-backend-1 python backend/scripts/manage_tenants.py --create-admin mycompany --admin-email admin@mycompany.localhost --admin-password mypassword

# Διαγραφή tenant
docker exec linux_version-backend-1 python backend/scripts/manage_tenants.py --delete mycompany
```

### 🔍 Έλεγχος Δικαιωμάτων

```bash
# Έλεγχος όλων των χρηστών
docker exec linux_version-backend-1 python backend/scripts/check_permissions.py --all

# Έλεγχος συγκεκριμένου χρήστη
docker exec linux_version-backend-1 python backend/scripts/check_permissions.py --email admin@demo.localhost

# Έλεγχος χρήστη σε συγκεκριμένο tenant
docker exec linux_version-backend-1 python backend/scripts/check_permissions.py --email admin@demo.localhost --tenant demo
```

### Έλεγχος δεδομένων

```bash
# Έλεγχος tenants
docker exec linux_version-backend-1 python manage.py shell -c "from tenants.models import Client, Domain; print('Clients:', Client.objects.count()); print('Domains:', Domain.objects.count())"

# Έλεγχος demo δεδομένων
docker exec linux_version-backend-1 python backend/check_data.py
```

### Migrations

```bash
# Shared migrations
docker compose exec backend python manage.py migrate_schemas --shared --noinput

# Tenant migrations
docker compose exec backend python manage.py migrate_schemas --tenant --noinput
```

---

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
├── docker-compose.yml         # Container configuration
├── reset_and_start.sh         # 🚀 Quick reset script
├── clean_and_restart.sh       # 🧹 Interactive clean script
└── readme.md                  # This file
```

---

## 📜 Διαθέσιμα Scripts

### 🚀 Εκκίνηση & Reset

| Script | Περιγραφή | Χρήση |
|--------|-----------|-------|
| `reset_and_start.sh` | Πλήρες reset και εκκίνηση | `./reset_and_start.sh` |
| `clean_and_restart.sh` | Interactive καθαρισμός | `./clean_and_restart.sh` |

### 🔧 Backend Scripts

| Script | Περιγραφή | Χρήση |
|--------|-----------|-------|
| `auto_initialization.py` | Αυτόματη αρχικοποίηση | `python backend/scripts/auto_initialization.py` |
| `create_superuser.py` | Δημιουργία superuser | `python backend/scripts/create_superuser.py --email admin@example.com --password mypassword` |
| `manage_tenants.py` | Διαχείριση tenants | `python backend/scripts/manage_tenants.py --list` |
| `check_permissions.py` | Έλεγχος δικαιωμάτων | `python backend/scripts/check_permissions.py --all` |

### 🐳 Docker Commands

| Εντολή | Περιγραφή |
|--------|-----------|
| `docker compose up -d` | Εκκίνηση containers |
| `docker compose down` | Διακοπή containers |
| `docker compose logs -f` | Παρακολούθηση logs |
| `docker compose ps` | Έλεγχος κατάστασης |

---

## 📄 Credentials File

Τα credentials αποθηκεύονται αυτόματα στο:
```
backend/logs/demo_credentials.log
```

---

## 🎉 Επιτυχής Αρχικοποίηση!

Μετά την εκκίνηση, το σύστημα είναι έτοιμο για χρήση με πλήρη demo δεδομένα και χρήστες!







echo "# linux_version" >> README.md git init

git add .
git commit -m "kiosk mode 1.2"
git branch -M main git remote add origin https://github.com/theostamp/linux_version.git 
git push -u origin main

git push --force

