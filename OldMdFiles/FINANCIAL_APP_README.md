# 🏦 Financial App - Οικονομική Διαχείριση Πολυκατοικίας

## 📋 Επισκόπηση

Το Financial App είναι ένα ολοκληρωμένο σύστημα διαχείρισης οικονομικών για πολυκατοικίες που επιτρέπει τη διαχείριση πληρωμών κοινοχρήστων, οικονομικών συναλλαγών, τραπεζικών λογαριασμών και αποδείξεων εισπράξεων.

## ✨ Βασικά Χαρακτηριστικά

### 💳 Διαχείριση Πληρωμών
- **Πληρωμές Κοινοχρήστων**: Δημιουργία και διαχείριση πληρωμών για διαφορετικούς τύπους χρεώσεων
- **Καταστάσεις Πληρωμών**: Εκκρεμεί, Πληρωμένο, Μερική Πληρωμή, Ληξιπρόθεσμο
- **Αυτόματη Ενημέρωση**: Υπολογισμός υπολοίπων και ληξιπρόθεσμων πληρωμών
- **Φιλτράρισμα**: Αναζήτηση και φιλτράρισμα ανά διαμέρισμα, τύπο, κατάσταση

### 📊 Οικονομικές Συναλλαγές
- **Έσοδα/Έξοδα**: Καταγραφή όλων των οικονομικών κινήσεων
- **Κατηγοριοποίηση**: Οργανωμένη καταγραφή ανά κατηγορία
- **Στατιστικά**: Πραγματικού χρόνου αναλυτικά στατιστικά
- **Ιστορικό**: Πλήρες ιστορικό συναλλαγών με αναζήτηση

### 🏦 Λογαριασμοί Κτιρίου
- **Τραπεζικοί Λογαριασμοί**: Διαχείριση πολλαπλών λογαριασμών
- **Τύποι Λογαριασμών**: Λειτουργικός, Αποθεματικό, Ειδικός
- **Αυτόματη Ενημέρωση**: Υπολογισμός υπολοίπων με κάθε συναλλαγή
- **Σύνοψη**: Επισκόπηση όλων των λογαριασμών

### 📄 Αποδείξεις Εισπράξεων
- **Αποδείξεις Πληρωμών**: Καταγραφή αποδείξεων για κάθε πληρωμή
- **Αρχεία**: Αποθήκευση ψηφιακών αποδείξεων
- **Τύποι**: Μετρητά, Τραπεζική μεταφορά, Επιταγή, Online
- **Αναζήτηση**: Εύκολη εύρεση αποδείξεων

## 🏗️ Αρχιτεκτονική Συστήματος

### Backend (Django)
```
backend/financial/
├── models.py          # Μοντέλα δεδομένων
├── serializers.py     # API serializers
├── views.py          # API endpoints
├── urls.py           # URL routing
└── admin.py          # Django admin
```

### Frontend (Next.js)
```
frontend/app/(dashboard)/financial/
├── page.tsx                    # Κύριο dashboard
├── payments/
│   ├── page.tsx               # Λίστα πληρωμών
│   └── new/page.tsx           # Νέα πληρωμή
├── transactions/
│   ├── page.tsx               # Λίστα συναλλαγών
│   └── new/page.tsx           # Νέα συναλλαγή
└── accounts/
    └── page.tsx               # Διαχείριση λογαριασμών
```

## 🚀 Εγκατάσταση & Ρύθμιση

### Προαπαιτούμενα
- Docker & Docker Compose
- Node.js 18+
- PostgreSQL

### 1. Εκκίνηση Συστήματος
```bash
# Πλήρες reset και εκκίνηση
./reset_and_start.sh

# Ή με interactive menu
./clean_and_restart.sh
```

### 2. Έλεγχος Εγκατάστασης
```bash
# Έλεγχος containers
docker compose ps

# Έλεγχος logs
docker compose logs -f backend
```

### 3. Πρόσβαση
- **Frontend**: http://demo.localhost:8080/financial
- **Backend API**: http://demo.localhost:8000/api/financial/
- **Admin Panel**: http://demo.localhost:8000/admin/

## 📊 Μοντέλα Δεδομένων

### Payment (Πληρωμή)
```python
class Payment(models.Model):
    apartment = models.ForeignKey(Apartment)
    payment_type = models.CharField(choices=PAYMENT_TYPES)
    amount = models.DecimalField()
    due_date = models.DateField()
    status = models.CharField(choices=STATUS_CHOICES)
    amount_paid = models.DecimalField()
    payment_date = models.DateField(null=True)
    payment_method = models.CharField()
    reference_number = models.CharField()
    notes = models.TextField()
```

### FinancialTransaction (Οικονομική Συναλλαγή)
```python
class FinancialTransaction(models.Model):
    building = models.ForeignKey(Building)
    account = models.ForeignKey(BuildingAccount)
    transaction_type = models.CharField(choices=['income', 'expense'])
    amount = models.DecimalField()
    description = models.TextField()
    transaction_date = models.DateField()
    category = models.CharField()
    reference_number = models.CharField()
    notes = models.TextField()
```

### BuildingAccount (Λογαριασμός Κτιρίου)
```python
class BuildingAccount(models.Model):
    building = models.ForeignKey(Building)
    account_type = models.CharField(choices=ACCOUNT_TYPES)
    account_number = models.CharField()
    bank_name = models.CharField()
    current_balance = models.DecimalField()
    description = models.TextField()
    is_active = models.BooleanField()
```

## 🔌 API Endpoints

### Πληρωμές
```
GET    /api/financial/payments/           # Λίστα πληρωμών
POST   /api/financial/payments/           # Νέα πληρωμή
GET    /api/financial/payments/{id}/      # Λεπτομέρειες πληρωμής
PATCH  /api/financial/payments/{id}/      # Ενημέρωση πληρωμής
DELETE /api/financial/payments/{id}/      # Διαγραφή πληρωμής
POST   /api/financial/payments/{id}/mark_as_paid/  # Σημείωση ως πληρωμένη
GET    /api/financial/payments/statistics/ # Στατιστικά πληρωμών
```

### Συναλλαγές
```
GET    /api/financial/transactions/           # Λίστα συναλλαγών
POST   /api/financial/transactions/           # Νέα συναλλαγή
GET    /api/financial/transactions/{id}/      # Λεπτομέρειες συναλλαγής
PATCH  /api/financial/transactions/{id}/      # Ενημέρωση συναλλαγής
DELETE /api/financial/transactions/{id}/      # Διαγραφή συναλλαγής
GET    /api/financial/transactions/statistics/ # Στατιστικά συναλλαγών
```

### Λογαριασμοί
```
GET    /api/financial/accounts/           # Λίστα λογαριασμών
POST   /api/financial/accounts/           # Νέος λογαριασμός
GET    /api/financial/accounts/{id}/      # Λεπτομέρειες λογαριασμού
PATCH  /api/financial/accounts/{id}/      # Ενημέρωση λογαριασμού
DELETE /api/financial/accounts/{id}/      # Διαγραφή λογαριασμού
GET    /api/financial/accounts/summary/   # Σύνοψη λογαριασμών
```

### Αποδείξεις
```
GET    /api/financial/receipts/           # Λίστα αποδείξεων
POST   /api/financial/receipts/           # Νέα απόδειξη
GET    /api/financial/receipts/{id}/      # Λεπτομέρειες απόδειξης
PATCH  /api/financial/receipts/{id}/      # Ενημέρωση απόδειξης
DELETE /api/financial/receipts/{id}/      # Διαγραφή απόδειξης
```

## 🎯 Χρήση του Συστήματος

### 1. Δημιουργία Πληρωμής
1. Μεταβείτε στο **Financial Dashboard**
2. Επιλέξτε την καρτέλα **"Πληρωμές"**
3. Κάντε κλικ στο **"Νέα Πληρωμή"**
4. Συμπληρώστε:
   - **Διαμέρισμα**: Επιλέξτε το διαμέρισμα
   - **Τύπος Πληρωμής**: Κοινοχρήστων, Θέρμανση, κλπ
   - **Ποσό**: Το ποσό της πληρωμής
   - **Ημερομηνία Λήξης**: Πότε λήγει η πληρωμή
   - **Κατάσταση**: Εκκρεμεί, Πληρωμένο, κλπ
5. Κάντε κλικ **"Δημιουργία Πληρωμής"**

### 2. Δημιουργία Συναλλαγής
1. Μεταβείτε στο **Financial Dashboard**
2. Επιλέξτε την καρτέλα **"Συναλλαγές"**
3. Κάντε κλικ στο **"Νέα Συναλλαγή"**
4. Συμπληρώστε:
   - **Λογαριασμός**: Επιλέξτε τον λογαριασμό
   - **Τύπος**: Έσοδο ή Έξοδο
   - **Ποσό**: Το ποσό της συναλλαγής
   - **Περιγραφή**: Περιγραφή της συναλλαγής
   - **Ημερομηνία**: Ημερομηνία συναλλαγής
   - **Κατηγορία**: Κατηγορία συναλλαγής
5. Κάντε κλικ **"Δημιουργία Συναλλαγής"**

### 3. Διαχείριση Λογαριασμών
1. Μεταβείτε στο **Financial Dashboard**
2. Επιλέξτε την καρτέλα **"Λογαριασμοί"**
3. Κάντε κλικ στο **"Προσθήκη Λογαριασμού"**
4. Συμπληρώστε:
   - **Τύπος Λογαριασμού**: Λειτουργικός, Αποθεματικό, Ειδικός
   - **Αριθμός Λογαριασμού**: Τραπεζικός αριθμός
   - **Τράπεζα**: Όνομα τράπεζας
   - **Τρέχον Υπόλοιπο**: Αρχικό υπόλοιπο
   - **Περιγραφή**: Περιγραφή λογαριασμού
5. Κάντε κλικ **"Δημιουργία Λογαριασμού"**

## 📈 Στατιστικά & Αναφορές

### Στατιστικά Πληρωμών
- Συνολικές πληρωμές
- Εκκρεμείς πληρωμές
- Ληξιπρόθεσμες πληρωμές
- Πληρωμένες πληρωμές
- Συνολικό ποσό vs Πληρωμένο ποσό

### Στατιστικά Συναλλαγών
- Συνολικές συναλλαγές
- Συνολικά έσοδα
- Συνολικά έξοδα
- Μηνιαία έσοδα/έξοδα
- Καθαρό υπόλοιπο

### Σύνοψη Λογαριασμών
- Συνολικοί λογαριασμοί
- Συνολικό υπόλοιπο
- Ενεργοί λογαριασμοί
- Υπόλοιπο ανά τύπο λογαριασμού

## 🔍 Φιλτράρισμα & Αναζήτηση

### Φίλτρα Πληρωμών
- **Κατάσταση**: Εκκρεμεί, Πληρωμένο, Ληξιπρόθεσμο, Μερική
- **Τύπος**: Κοινοχρήστων, Θέρμανση, Ηλεκτρικό, κλπ
- **Αναζήτηση**: Αριθμός διαμερίσματος, αναφορά, σημειώσεις
- **Ημερομηνία**: Φιλτράρισμα ανά χρονικό διάστημα

### Φίλτρα Συναλλαγών
- **Τύπος**: Έσοδο, Έξοδο
- **Λογαριασμός**: Φιλτράρισμα ανά λογαριασμό
- **Κατηγορία**: Φιλτράρισμα ανά κατηγορία
- **Ημερομηνία**: Φιλτράρισμα ανά χρονικό διάστημα
- **Αναζήτηση**: Περιγραφή, αναφορά, κατηγορία

## 🔐 Ασφάλεια & Δικαιώματα

### Δικαιώματα Χρηστών
- **👑 Ultra-Superuser**: Πλήρη πρόσβαση σε όλα τα tenants
- **🔧 Admin**: Πλήρη πρόσβαση στο tenant
- **👨‍💼 Manager**: Περιορισμένα admin δικαιώματα
- **👤 Resident**: Πρόσβαση μόνο στα δικά του δεδομένα

### Ασφάλεια Δεδομένων
- **Multi-tenant**: Απομόνωση δεδομένων ανά tenant
- **Authentication**: JWT token authentication
- **Authorization**: Role-based access control
- **Validation**: Server-side validation όλων των δεδομένων

## 🛠️ Ανάπτυξη & Επεκτάσεις

### Προσθήκη Νέων Τύπων Πληρωμών
```python
# Στο models.py
PAYMENT_TYPES = [
    ('common_expenses', 'Κοινοχρήστων'),
    ('heating', 'Θέρμανση'),
    ('electricity_common', 'Ηλεκτρικό Κοινοχρήστων'),
    ('cleaning', 'Καθαριότητα'),
    ('security', 'Ασφάλεια'),
    ('elevator', 'Ανελκυστήρες'),
    ('other', 'Άλλο'),
    # Προσθέστε νέους τύπους εδώ
]
```

### Προσθήκη Νέων Κατηγοριών Συναλλαγών
```typescript
// Στο frontend
const categories = [
    'Κοινοχρήστων',
    'Θέρμανση',
    'Ηλεκτρικό',
    'Καθαριότητα',
    'Ασφάλεια',
    'Ανελκυστήρες',
    'Συντήρηση',
    'Ασφάλιση',
    'Φόροι',
    'Άλλο',
    // Προσθέστε νέες κατηγορίες εδώ
];
```

### Προσθήκη Νέων API Endpoints
```python
# Στο views.py
@action(detail=False, methods=['get'])
def custom_endpoint(self, request):
    """Προσαρμοσμένο endpoint"""
    # Your custom logic here
    return Response(data)
```

## 🐛 Troubleshooting

### Συχνά Προβλήματα

#### 1. Δεν φορτώνονται τα δεδομένα
```bash
# Έλεγχος backend logs
docker compose logs backend

# Έλεγχος database connection
docker compose exec db psql -U postgres -c "SELECT 1;"
```

#### 2. Σφάλματα API
```bash
# Έλεγχος API endpoints
curl http://demo.localhost:8000/api/financial/payments/

# Έλεγχος authentication
curl -H "Authorization: Bearer YOUR_TOKEN" http://demo.localhost:8000/api/financial/payments/
```

#### 3. Σφάλματα Frontend
```bash
# Έλεγχος frontend logs
docker compose logs frontend

# Restart frontend
docker compose restart frontend
```

### Επαναφορά Συστήματος
```bash
# Πλήρες reset
./reset_and_start.sh

# Reset μόνο database
docker compose down
docker volume rm linux_version_pgdata_dev
docker compose up -d
```

## 📞 Υποστήριξη

### Επικοινωνία
- **Email**: theostam1966@gmail.com
- **GitHub**: https://github.com/theostamp/linux_version

### Documentation
- **API Documentation**: http://demo.localhost:8000/api/
- **Admin Panel**: http://demo.localhost:8000/admin/
- **Frontend**: http://demo.localhost:8080

### Logs
```bash
# Backend logs
docker compose logs -f backend

# Frontend logs
docker compose logs -f frontend

# Database logs
docker compose logs -f db
```

## 🎉 Συμπέρασμα

Το Financial App παρέχει μια ολοκληρωμένη λύση για τη διαχείριση οικονομικών πολυκατοικίας με:

- ✅ **Πλήρη διαχείριση πληρωμών** κοινοχρήστων
- ✅ **Οικονομικές συναλλαγές** με κατηγοριοποίηση
- ✅ **Διαχείριση λογαριασμών** κτιρίου
- ✅ **Αποδείξεις εισπράξεων** με αρχειοθέτηση
- ✅ **Στατιστικά και αναφορές** πραγματικού χρόνου
- ✅ **Φιλτράρισμα και αναζήτηση** δεδομένων
- ✅ **Multi-tenant αρχιτεκτονική** για ασφάλεια
- ✅ **Modern UI/UX** με responsive design

Το σύστημα είναι έτοιμο για παραγωγή και μπορεί να επεκταθεί εύκολα με νέες λειτουργίες ανάλογα με τις ανάγκες της πολυκατοικίας.

---

**🏦 Financial App - Οικονομική Διαχείριση Πολυκατοικίας**  
*Δημιουργήθηκε με ❤️ για τη διαχείριση πολυκατοικιών* 