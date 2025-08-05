# 🏠 Οικονομικά Demo Δεδομένα - Εικονικές Χρεώσεις και Πληρωμές

Αυτό το έγγραφο εξηγεί πώς να προσθέσετε εικονικές χρεώσεις και πληρωμές στα mock διαμερίσματα του demo tenant.

## 📋 Περιεχόμενα

- [Επισκόπηση](#επισκόπηση)
- [Αυτόματη Δημιουργία](#αυτόματη-δημιουργία)
- [Χειροκίνητη Δημιουργία](#χειροκίνητη-δημιουργία)
- [Τύποι Δεδομένων](#τύποι-δεδομένων)
- [Προβολή Δεδομένων](#προβολή-δεδομένων)

## 🎯 Επισκόπηση

Τα οικονομικά demo δεδομένα περιλαμβάνουν:

- **💰 Δαπάνες Κτιρίου**: Καθαρισμός, ΔΕΗ, συντήρηση ανελκυστήρα, κλπ.
- **💳 Πληρωμές Ιδιοκτητών**: Μετρητά, τραπεζική μεταφορά, επιταγές
- **📊 Συναλλαγές**: Αυτόματη καταγραφή όλων των κινήσεων
- **💾 Υπόλοιπα**: Ενημέρωση υπολοίπων διαμερισμάτων

## 🚀 Αυτόματη Δημιουργία

### Επιλογή 1: Κατά την Αρχικοποίηση

Τα οικονομικά δεδομένα δημιουργούνται αυτόματα κατά την εκτέλεση του `auto_initialization.py`:

```bash
cd backend
python scripts/auto_initialization.py
```

### Επιλογή 2: Μετά την Αρχικοποίηση

Εκτελέστε το script για οικονομικά δεδομένα:

```bash
cd backend
python run_financial_demo.py
```

## 🔧 Χειροκίνητη Δημιουργία

Για πλήρη έλεγχο, εκτελέστε το κύριο script:

```bash
cd backend
python add_financial_demo_data.py
```

## 📊 Τύποι Δεδομένων

### 1. Δαπάνες Κτιρίου

**Κατηγορίες:**
- 🧹 Καθαρισμός κοινοχρήστων χώρων
- ⚡ ΔΕΗ κοινοχρήστων
- 🛗 Συντήρηση ανελκυστήρα
- 🗑️ Συλλογή απορριμμάτων
- 🔧 Έκτακτες επισκευές
- 🎨 Βαψίματα εξωτερικών

**Παράδειγμα:**
```python
{
    'title': 'Καθαρισμός Κοινοχρήστων - Ιανουάριος 2024',
    'amount': 450.00,
    'category': 'cleaning',
    'distribution_type': 'by_participation_mills',
    'date': '2024-01-15'
}
```

### 2. Πληρωμές Ιδιοκτητών

**Μέθοδοι Πληρωμής:**
- 💰 Μετρητά
- 🏦 Τραπεζική μεταφορά
- 📄 Επιταγή
- 💳 Κάρτα

**Παράδειγμα:**
```python
{
    'apartment': '101',
    'amount': 150.00,
    'method': 'bank_transfer',
    'date': '2024-01-05',
    'notes': 'Πληρωμή κοινοχρήστων - Ιανουάριος 2024'
}
```

### 3. Συναλλαγές

**Τύποι Συναλλαγών:**
- `expense_created`: Δημιουργία δαπάνης
- `payment_received`: Λήψη πληρωμής
- `expense_issued`: Έκδοση δαπάνης
- `balance_adjustment`: Προσαρμογή υπολοίπου

## 🌐 Προβολή Δεδομένων

### Frontend
- **Οικονομικά**: http://demo.localhost:8080/financial
- **Διαμερίσματα**: http://demo.localhost:8080/apartments

### Backend API
- **Δαπάνες**: http://demo.localhost:8000/api/financial/expenses/
- **Πληρωμές**: http://demo.localhost:8000/api/financial/payments/
- **Συναλλαγές**: http://demo.localhost:8000/api/financial/transactions/

### Admin Panel
- **Admin**: http://demo.localhost:8000/admin/
- **Credentials**: admin@demo.localhost / admin123456

## 📈 Στατιστικά Demo Δεδομένων

Μετά την εκτέλεση, θα δημιουργηθούν:

- **💰 12 Δαπάνες** (6 ανά κτίριο)
- **💳 24-48 Πληρωμές** (2-4 ανά διαμέρισμα)
- **📊 36-60 Συναλλαγές** (αυτόματη καταγραφή)
- **🏠 12 Διαμερίσματα** με ενημερωμένα υπολοιπα

## 🔄 Επαναδημιουργία

Για να διαγράψετε και να επαναδημιουργήσετε τα δεδομένα:

```bash
# Διαγραφή υπαρχόντων δεδομένων
cd backend
python manage.py shell
```

```python
from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.models import Expense, Payment, Transaction

tenant = Client.objects.get(schema_name='demo')
with tenant_context(tenant):
    Expense.objects.all().delete()
    Payment.objects.all().delete()
    Transaction.objects.all().delete()
    print("✅ Διαγράφηκαν όλα τα οικονομικά δεδομένα")
```

Στη συνέχεια εκτελέστε ξανά το script δημιουργίας.

## ⚠️ Προειδοποιήσεις

1. **Μη διαγράψετε** τα κτίρια και διαμερίσματα αν θέλετε να διατηρήσετε τα οικονομικά δεδομένα
2. **Δημιουργήστε πρώτα** τα βασικά δεδομένα με το `auto_initialization.py`
3. **Ελέγξτε** ότι το σύστημα τρέχει πριν εκτελέσετε τα scripts

## 🆘 Αντιμετώπιση Προβλημάτων

### Σφάλμα: "Δεν βρέθηκαν κτίρια"
```bash
# Εκτελέστε πρώτα την αρχικοποίηση
python scripts/auto_initialization.py
```

### Σφάλμα: "Import error"
```bash
# Βεβαιωθείτε ότι είστε στο backend directory
cd backend
python add_financial_demo_data.py
```

### Σφάλμα: "Database connection"
```bash
# Ελέγξτε ότι το σύστημα τρέχει
docker compose up -d
```

## 📞 Υποστήριξη

Για περισσότερες πληροφορίες, ανατρέξτε στο:
- [Financial API Documentation](../FINANCIAL_API_DOCUMENTATION.md)
- [Financial User Guide](../FINANCIAL_USER_GUIDE.md)
- [Implementation Guide](../IMPLEMENTATION_GUIDE.md) 