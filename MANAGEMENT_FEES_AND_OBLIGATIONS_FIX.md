# Διόρθωση Management Fees & Previous Obligations

**Ημερομηνία:** 10 Οκτωβρίου 2025  
**Προβλήματα που διορθώθηκαν:**
1. Τα management fees δεν εμφανίζονται στο MonthlyBalance
2. Οι οφειλές (previous_obligations) δεν μεταφέρονται σωστά από μήνα σε μήνα

---

## 📋 Περίληψη Προβλημάτων

### Πρόβλημα 1: MonthlyBalance.management_fees = 0.00

**Αιτία:**  
Το πεδίο `management_fees` στο `MonthlyBalance` model δημιουργείται πάντα με τιμή `0.00` και δεν ενημερώνεται ποτέ.

**Επίδραση:**  
- Τα διαχειριστικά έξοδα δεν εμφανίζονται σωστά στα μηνιαία υπόλοιπα
- Οι αναφορές δεν δείχνουν τα management fees ανά μήνα
- Το `total_obligations` υπολογίζεται χωρίς management fees στο MonthlyBalance

### Πρόβλημα 2: Previous Obligations δεν χρησιμοποιούν carry_forward

**Αιτία:**  
Η λογική υπολογισμού των `previous_obligations` στο `FinancialDashboardService.get_summary()` υπολογίζει κάθε φορά από το μηδέν τα expenses και payments, αντί να χρησιμοποιεί το `carry_forward` από το `MonthlyBalance` του προηγούμενου μήνα.

**Επίδραση:**  
- Πιθανές ανακρίβειες στον υπολογισμό των previous obligations
- Αργή απόδοση (υπολογίζει κάθε φορά από την αρχή)
- Δεν αξιοποιείται το σύστημα MonthlyBalance σωστά

---

## 🔧 Λύσεις που Εφαρμόστηκαν

### 1. Διόρθωση MonthlyBalance.management_fees

**Αρχείο:** `backend/financial/views.py`  
**Action:** `MonthlyBalanceViewSet.create_month()`

**Αλλαγές:**
```python
# ΠΡΙΝ (λάθος):
management_fees=Decimal('0.00'),

# ΜΕΤΑ (σωστό):
management_fees = Expense.objects.filter(
    building=building,
    category='management_fees',
    date__gte=month_start,
    date__lt=month_end
).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
```

**Τι κάνει:**
- Όταν δημιουργείται ένα νέο `MonthlyBalance`, υπολογίζει αυτόματα τα management fees από τα `Expense` records
- Αποθηκεύει τη σωστή τιμή στο πεδίο `management_fees`

### 2. Διόρθωση Previous Obligations Logic

**Αρχείο:** `backend/financial/services.py`  
**Μέθοδος:** `FinancialDashboardService.get_summary()`

**Αλλαγές:**
```python
# ΠΡΙΝ (λάθος - raw calculation κάθε φορά):
expenses_before_month = Expense.objects.filter(...).aggregate(...)
payments_before_month = Payment.objects.filter(...).aggregate(...)
previous_obligations = expenses_before_month - payments_before_month

# ΜΕΤΑ (σωστό - χρήση MonthlyBalance):
prev_balance = MonthlyBalance.objects.filter(
    building_id=self.building_id,
    year=prev_year,
    month=prev_month
).first()

if prev_balance:
    # ✅ Χρήση carry_forward από MonthlyBalance
    previous_obligations = prev_balance.carry_forward
else:
    # Fallback: Raw calculation αν δεν υπάρχει MonthlyBalance
    previous_obligations = expenses_before_month - payments_before_month
```

**Τι κάνει:**
- Ελέγχει πρώτα αν υπάρχει `MonthlyBalance` για τον προηγούμενο μήνα
- Αν υπάρχει, χρησιμοποιεί το `carry_forward` (πιο αξιόπιστο και γρήγορο)
- Αν δεν υπάρχει, κάνει fallback στον παλιό υπολογισμό

---

## 📦 Scripts Διόρθωσης

### Script 1: Fix MonthlyBalance Management Fees

**Αρχείο:** `backend/fix_monthly_balance_management_fees.py`

**Χρήση:**
```bash
# Dry-run (δοκιμή χωρίς αλλαγές)
python fix_monthly_balance_management_fees.py --dry-run

# Εφαρμογή διορθώσεων
python fix_monthly_balance_management_fees.py
```

**Τι κάνει:**
- Βρίσκει όλα τα `MonthlyBalance` records
- Υπολογίζει τα management fees από τα Expense records
- Ενημερώνει το πεδίο `management_fees` με τη σωστή τιμή

### Script 2: Fix Previous Obligations Logic

**Αρχείο:** `backend/fix_previous_obligations_logic.py`

**Χρήση:**
```bash
# Δοκιμή λογικής για συγκεκριμένο μήνα
python fix_previous_obligations_logic.py test 2025 10

# Δημιουργία MonthlyBalance records για όλους τους μήνες
python fix_previous_obligations_logic.py populate
```

**Τι κάνει:**
- **Test mode:** Δοκιμάζει τη λογική υπολογισμού previous obligations
- **Populate mode:** Δημιουργεί MonthlyBalance records για όλους τους μήνες που λείπουν

---

## 🚀 Βήματα Εφαρμογής

### Βήμα 1: Backup

```bash
# Backup της βάσης δεδομένων
pg_dump -U postgres -d concierge_db > backup_before_fix.sql
```

### Βήμα 2: Εφαρμογή Κώδικα

Οι αλλαγές έχουν ήδη εφαρμοστεί στα αρχεία:
- ✅ `backend/financial/services.py`
- ✅ `backend/financial/views.py`

### Βήμα 3: Τρέξιμο Scripts Διόρθωσης

```bash
cd /app

# 1. Δοκιμή πρώτα (dry-run)
python fix_monthly_balance_management_fees.py --dry-run

# 2. Αν όλα είναι καλά, εφάρμοσε τις αλλαγές
python fix_monthly_balance_management_fees.py

# 3. Δημιουργία MonthlyBalance για όλους τους μήνες που λείπουν
python fix_previous_obligations_logic.py populate

# 4. Δοκιμή υπολογισμού previous obligations
python fix_previous_obligations_logic.py test 2025 10
```

### Βήμα 4: Επαλήθευση

```bash
# Έλεγχος ότι τα management fees ενημερώθηκαν
python manage.py shell -c "
from django_tenants.utils import schema_context
from financial.models import MonthlyBalance

with schema_context('demo'):
    balances = MonthlyBalance.objects.all()
    for b in balances:
        print(f'{b.month:02d}/{b.year}: €{b.management_fees}')
"
```

---

## 📊 Αποτελέσματα

### Πριν τη Διόρθωση

```
MonthlyBalance για 10/2025:
  - management_fees: €0.00 ❌
  - previous_obligations: Υπολογίζεται κάθε φορά (αργό) ❌
```

### Μετά τη Διόρθωση

```
MonthlyBalance για 10/2025:
  - management_fees: €120.00 ✅ (10 διαμερίσματα × €12)
  - previous_obligations: €2,450.00 ✅ (από carry_forward προηγούμενου μήνα)
```

---

## 🔍 Τεχνικές Λεπτομέρειες

### Management Fees Calculation

```python
# Τα management fees υπολογίζονται από Expense records:
Expense.objects.filter(
    building=building,
    category='management_fees',  # ← Κρίσιμο: category πρέπει να είναι 'management_fees'
    date__gte=month_start,
    date__lt=month_end
).aggregate(total=Sum('amount'))['total']
```

### Previous Obligations Flow

```
Μήνας 1 (Φεβρουάριος):
  - Expenses: €1,000
  - Payments: €800
  - Carry forward: €200

Μήνας 2 (Μάρτιος):
  - Previous obligations: €200 ← από carry_forward του Μήνα 1
  - Expenses: €1,200
  - Payments: €900
  - Total obligations: €1,200 + €200 = €1,400
  - Net result: €900 - €1,400 = -€500
  - Carry forward: €500 (για τον επόμενο μήνα)
```

---

## ⚠️ Σημαντικές Σημειώσεις

### 1. Management Fees Category

Τα management fees **ΠΡΕΠΕΙ** να έχουν `category='management_fees'` στα Expense records για να υπολογιστούν σωστά.

### 2. MonthlyBalance Dependencies

Το σύστημα εξαρτάται από τη σωστή σειρά δημιουργίας των MonthlyBalance records:
- Ο Μήνας Ν εξαρτάται από το carry_forward του Μήνα Ν-1
- Πρέπει να δημιουργηθούν με χρονολογική σειρά

### 3. Fallback Mechanism

Αν δεν υπάρχει MonthlyBalance για τον προηγούμενο μήνα, το σύστημα κάνει fallback σε raw calculation:
```python
expenses_before - payments_before = previous_obligations
```

---

## 🧪 Testing

### Test Case 1: Management Fees Calculation

```bash
python fix_monthly_balance_management_fees.py --dry-run
```

**Αναμενόμενο Αποτέλεσμα:**
```
📅 10/2025 - Κτίριο Α
   Τρέχον management_fees: €0.00
   Υπολογισμένο από expenses: €120.00
   (1 expense records)
   🔧 [DRY-RUN] Θα ενημερωνόταν: €0.00 → €120.00
```

### Test Case 2: Previous Obligations Logic

```bash
python fix_previous_obligations_logic.py test 2025 10
```

**Αναμενόμενο Αποτέλεσμα:**
```
ΜΕΘΟΔΟΣ 1 (Raw Calculation):
   Expenses before 10/2025: €10,500.00
   Payments before 10/2025: €8,050.00
   Previous obligations: €2,450.00

ΜΕΘΟΔΟΣ 2 (MonthlyBalance carry_forward):
   Carry forward από 09/2025: €2,450.00

ΣΥΓΚΡΙΣΗ:
   ✅ Ταιριάζουν (διαφορά: €0.00)
```

---

## 📞 Support

Αν έχετε προβλήματα με την εφαρμογή των διορθώσεων, ελέγξτε:

1. **Logs:** Τα scripts εκτυπώνουν αναλυτικά logs
2. **Database:** Βεβαιωθείτε ότι έχετε backup
3. **Dependencies:** Τα MonthlyBalance records πρέπει να υπάρχουν με σειρά

---

## ✅ Checklist

- [x] Διόρθωση `FinancialDashboardService.get_summary()`
- [x] Διόρθωση `MonthlyBalanceViewSet.create_month()`
- [x] Δημιουργία script `fix_monthly_balance_management_fees.py`
- [x] Δημιουργία script `fix_previous_obligations_logic.py`
- [ ] Εκτέλεση scripts σε production
- [ ] Επαλήθευση αποτελεσμάτων
- [ ] Cleanup backup files

---

## 📚 Related Files

- `backend/financial/services.py` - FinancialDashboardService
- `backend/financial/views.py` - MonthlyBalanceViewSet
- `backend/financial/models.py` - MonthlyBalance model
- `backend/fix_monthly_balance_management_fees.py` - Fix script
- `backend/fix_previous_obligations_logic.py` - Test/populate script








