# 🗑️ Scripts Διαγραφής Οικονομικών Δεδομένων

Αυτή η συλλογή scripts επιτρέπει τη διαγραφή όλων των οικονομικών ποσών από τη βάση δεδομένων του New Concierge.

## ⚠️ ΠΡΟΣΟΧΗ - ΚΡΙΤΙΚΗ ΕΝΕΡΓΕΙΑ

**Αυτά τα scripts διαγράφουν ΜΟΝΙΜΑ όλα τα οικονομικά δεδομένα!**
- Δαπάνες (Expenses)
- Εισπράξεις (Payments) 
- Συναλλαγές (Transactions)
- Αποδείξεις (Financial Receipts)
- Μερίδια διαμερισμάτων (Apartment Shares)
- Περίοδοι κοινοχρήστων (Common Expense Periods)
- Μετρήσεις (Meter Readings)
- Προμηθευτές (Suppliers)
- Audit logs

**ΔΕΝ μπορείτε να αναιρέσετε αυτή την ενέργεια!**

## 📁 Scripts που Δημιουργήθηκαν

### 1. `clear_all_financial_data.py` - Πλήρες Script
- **Περιγραφή**: Πλήρες script με διπλή επιβεβαίωση και λεπτομερή αναφορά
- **Χαρακτηριστικά**: 
  - Διπλή επιβεβαίωση (yes + DELETE ALL)
  - Λεπτομερής αναφορά διαγραφής
  - Επιβεβαίωση καθαρισμού
  - Χειρισμός σφαλμάτων
- **Χρήση**: Για πλήρη καθαρισμό με ασφάλεια

### 2. `clear_financial_data_simple.py` - Απλό Script
- **Περιγραφή**: Απλοποιημένη έκδοση για γρήγορη χρήση
- **Χαρακτηριστικά**:
  - Μία επιβεβαίωση
  - Βασική αναφορά
  - Γρήγορη εκτέλεση
- **Χρήση**: Για γρήγορο καθαρισμό

### 3. `clear_financial_management_command.py` - Django Management Command
- **Περιγραφή**: Script που μπορεί να εκτελεστεί ως Django management command
- **Χαρακτηριστικά**:
  - Dry-run mode για προεπισκόπηση
  - Command line options
  - Ενσωμάτωση με Django
- **Χρήση**: Για επαγγελματική χρήση

## 🚀 Τρόποι Εκτέλεσης

### Επιλογή 1: Απευθείας Εκτέλεση (Προτεινόμενο)

```bash
# 1. Αντιγράψτε το script στο Docker container
docker cp clear_financial_data_simple.py linux_version-backend-1:/app/

# 2. Εκτελέστε το script μέσα στο container
docker exec -it linux_version-backend-1 python /app/clear_financial_data_simple.py
```

### Επιλογή 2: Django Shell

```bash
# 1. Μπείτε στο Django shell
docker exec -it linux_version-backend-1 python manage.py shell

# 2. Αντιγράψτε και επικολλήστε τον κώδικα από το script
```

### Επιλογή 3: Management Command

```bash
# 1. Αντιγράψτε το script στο container
docker cp clear_financial_management_command.py linux_version-backend-1:/app/

# 2. Εκτελέστε ως management command
docker exec -it linux_version-backend-1 python manage.py clear_financial_data --tenant=demo --dry-run
docker exec -it linux_version-backend-1 python manage.py clear_financial_data --tenant=demo --confirm
```

## 📋 Βήματα Εκτέλεσης

### Βήμα 1: Επιβεβαίωση Docker Containers
```bash
# Έλεγχος ότι τα containers τρέχουν
docker ps | grep linux_version
```

### Βήμα 2: Αντιγραφή Script
```bash
# Αντιγραφή του επιθυμητού script
docker cp clear_financial_data_simple.py linux_version-backend-1:/app/
```

### Βήμα 3: Εκτέλεση Script
```bash
# Εκτέλεση μέσα στο container
docker exec -it linux_version-backend-1 python /app/clear_financial_data_simple.py
```

### Βήμα 4: Επιβεβαίωση
```bash
# Έλεγχος ότι η βάση είναι καθαρή
docker exec -it linux_version-backend-1 python manage.py shell
```

## 🔍 Dry Run (Προεπισκόπηση)

Πριν τη διαγραφή, μπορείτε να δείτε τι θα διαγραφεί:

```bash
# Για το management command
docker exec -it linux_version-backend-1 python manage.py clear_financial_data --tenant=demo --dry-run

# Για το πλήρες script
docker exec -it linux_version-backend-1 python /app/clear_all_financial_data.py
# (Επιλέξτε "no" στην πρώτη επιβεβαίωση)
```

## 📊 Τι Διαγράφεται

### Οικονομικά Μοντέλα
- **Transaction**: Όλες οι συναλλαγές
- **Payment**: Όλες οι εισπράξεις
- **Expense**: Όλες οι δαπάνες
- **FinancialReceipt**: Όλες οι αποδείξεις
- **ExpenseApartment**: Όλες οι σχέσεις δαπανών-διαμερισμάτων
- **ApartmentShare**: Όλα τα μερίδια διαμερισμάτων
- **CommonExpensePeriod**: Όλες οι περίοδοι κοινοχρήστων
- **MeterReading**: Όλες οι μετρήσεις
- **Supplier**: Όλοι οι προμηθευτές

### Άλλα Δεδομένα
- **Apartment.current_balance**: Μηδενίζεται σε €0.00
- **FinancialAuditLog**: Όλα τα audit logs (αν υπάρχουν)

## 🛡️ Ασφάλεια

### Διπλή Επιβεβαίωση
1. **Πρώτη επιβεβαίωση**: "yes"
2. **Δεύτερη επιβεβαίωση**: "DELETE ALL"

### Database Transactions
- Όλες οι διαγραφές εκτελούνται σε ένα transaction
- Σε περίπτωση σφάλματος, γίνεται rollback
- Δεν μπορεί να μείνει η βάση σε ασταθή κατάσταση

### Σειρά Διαγραφής
Η διαγραφή γίνεται σε σωστή σειρά για να αποφευχθούν foreign key errors:
1. Child models (Transaction, Payment, etc.)
2. Parent models (Expense, Supplier)
3. Apartment balances

## 🚨 Προειδοποιήσεις

### ΠΡΙΝ τη Διαγραφή
- [ ] Κάντε backup της βάσης δεδομένων
- [ ] Επιβεβαιώστε ότι είστε στο σωστό tenant
- [ ] Επιβεβαιώστε ότι είστε στο σωστό environment
- [ ] Ενημερώστε την ομάδα ανάπτυξης

### ΜΕΤΑ τη Διαγραφή
- [ ] Επιβεβαιώστε ότι όλα διαγράφηκαν
- [ ] Ελέγξτε ότι τα υπόλοιπα είναι μηδενικά
- [ ] Δοκιμάστε τη λειτουργικότητα του συστήματος
- [ ] Ενημερώστε την ομάδα ανάπτυξης

## 🔧 Αντιμετώπιση Προβλημάτων

### Σφάλμα "Permission Denied"
```bash
# Έλεγχος permissions
docker exec -it linux_version-backend-1 ls -la /app/
```

### Σφάλμα "Module Not Found"
```bash
# Έλεγχος Django setup
docker exec -it linux_version-backend-1 python manage.py check
```

### Σφάλμα "Database Connection"
```bash
# Έλεγχος container status
docker ps | grep postgres
docker logs linux_version-postgres-1
```

## 📞 Υποστήριξη

Αν αντιμετωπίσετε προβλήματα:

1. **Ελέγξτε τα logs**: `docker logs linux_version-backend-1`
2. **Επιβεβαιώστε το tenant**: `schema_context('demo')`
3. **Ελέγξτε τα permissions**: File ownership στο container
4. **Επικοινωνήστε με την ομάδα**: Για κρίσιμα προβλήματα

## 📝 Παραδείγματα Χρήσης

### Παράδειγμα 1: Γρήγορη Διαγραφή
```bash
docker cp clear_financial_data_simple.py linux_version-backend-1:/app/
docker exec -it linux_version-backend-1 python /app/clear_financial_data_simple.py
# Απαντήστε "yes" στην επιβεβαίωση
```

### Παράδειγμα 2: Ασφαλής Διαγραφή με Dry Run
```bash
docker cp clear_financial_management_command.py linux_version-backend-1:/app/
docker exec -it linux_version-backend-1 python manage.py clear_financial_data --tenant=demo --dry-run
docker exec -it linux_version-backend-1 python manage.py clear_financial_data --tenant=demo --confirm
```

### Παράδειγμα 3: Επιβεβαίωση Καθαρισμού
```bash
docker exec -it linux_version-backend-1 python manage.py shell
# Στο shell:
from django_tenants.utils import schema_context
with schema_context('demo'):
    from financial.models import Transaction, Payment, Expense
    print(f"Transactions: {Transaction.objects.count()}")
    print(f"Payments: {Payment.objects.count()}")
    print(f"Expenses: {Expense.objects.count()}")
```

## 🎯 Συμπέρασμα

Αυτά τα scripts παρέχουν ασφαλή και ολοκληρωμένη διαγραφή όλων των οικονομικών δεδομένων. 

**Επιλέξτε το script που ταιριάζει στις ανάγκες σας:**
- **Απλό**: `clear_financial_data_simple.py`
- **Πλήρες**: `clear_all_financial_data.py`  
- **Management Command**: `clear_financial_management_command.py`

**Ακολουθήστε πάντα τα βήματα ασφάλειας και κάντε backup πριν τη διαγραφή!**
