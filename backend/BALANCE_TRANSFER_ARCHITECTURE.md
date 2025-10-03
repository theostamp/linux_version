# Balance Transfer Architecture 🏗️

## 📋 Περιεχόμενα
- [Επισκόπηση](#επισκόπηση)
- [Κρίσιμη Λογική](#κρίσιμη-λογική)
- [Τύποι Δαπανών](#τύποι-δαπανών)
- [Validation Rules](#validation-rules)
- [Παραδείγματα](#παραδείγματα)
- [Testing](#testing)

---

## Επισκόπηση

Το σύστημα μεταφοράς υπολοίπων είναι **ΚΡΙΣΙΜΟ** για τη σωστή λειτουργία του financial module.

### 🎯 Βασική Αρχή

**Κάθε δαπάνη πρέπει να έχει `date` που να εξασφαλίζει εμφάνισή της ως "παλιά οφειλή" τον επόμενο μήνα.**

```python
# ✅ ΣΩΣΤΟ
expense.date = last_day_of_current_month  # π.χ. 2025-10-31
# Θα εμφανιστεί ως παλιά οφειλή στον 11ο μήνα

# ❌ ΛΑΘΟΣ
expense.date = first_day_of_current_month  # π.χ. 2025-10-01
# ΔΕΝ θα εμφανιστεί ως παλιά οφειλή στον 10ο μήνα (διπλή χρέωση!)
```

---

## Κρίσιμη Λογική

### Filter Query για Παλιές Οφειλές

```python
# Στο _calculate_historical_balance (financial/services.py)
expenses_before_month = Expense.objects.filter(
    building_id=apartment.building_id,
    date__gte=year_start,
    date__lt=month_start  # ⚠️ ΚΡΙΣΙΜΟ: < όχι <=
)
```

**⚠️ ΠΡΟΣΟΧΗ:**
- `date__lt=month_start` σημαίνει: δαπάνες με date **ΠΡΙΝ** την 1η του μήνα
- Αν δαπάνη έχει `date=2025-11-01`, **ΔΕΝ** συμπεριλαμβάνεται στις παλιές οφειλές του 11ου
- Αν δαπάνη έχει `date=2025-10-31`, **ΣΥΜΠΕΡΙΛΑΜΒΑΝΕΤΑΙ** στις παλιές οφειλές του 11ου

---

## Τύποι Δαπανών

### 1️⃣ Δόσεις Έργων (Project Installments)

**Αρχείο:** `backend/projects/views.py` → `update_project_schedule()`

**Κρίσιμες Γραμμές:** 155-188

```python
# ⚠️ ΚΡΙΣΙΜΗ ΛΟΓΙΚΗ - ΜΗΝ ΑΛΛΑΞΕΤΕ ΧΩΡΙΣ TESTING!

# ΔΙΟΡΘΩΣΗ V2: Η ημερομηνία δημιουργίας της δόσης είναι η τελευταία του μήνα πληρωμής
# Έτσι η δόση του 11ου θα έχει date=30/11, και θα εμφανίζεται ως παλιά οφειλή στον 12ο
# Αυτό εξασφαλίζει ότι η προκαταβολή (π.χ. 03/10) και η Δόση 1 (30/11) δεν εμφανίζονται μαζί

last_day = calendar.monthrange(payment_month_start.year, payment_month_start.month)[1]
installment_date = payment_month_start.replace(day=last_day)
due_date = installment_date  # Ίδια ημερομηνία για συνέπεια
```

**Παράδειγμα:**
```
Προκαταβολή:   03/10/2025 → Εμφανίζεται ως παλιά οφειλή στον 11ο
Δόση 1:        30/11/2025 → Εμφανίζεται ως παλιά οφειλή στον 12ο
Δόση 2:        31/12/2025 → Εμφανίζεται ως παλιά οφειλή στον 01/2026
```

**⚠️ ΠΡΟΣΟΧΗ:**
- Οι δόσεις ξεκινούν από τον **ΕΠΟΜΕΝΟ** μήνα μετά την προκαταβολή
- `month_offset = i + 1 if advance_payment > 0 else i`
- Αυτό αποτρέπει διπλή χρέωση του πρώτου μήνα

---

### 2️⃣ Δαπάνες Διαχείρισης (Management Fees)

**Αρχείο:** `backend/financial/management/commands/create_monthly_management_fees.py`

**Κρίσιμες Γραμμές:** 108-136

```python
# ⚠️ ΚΡΙΣΙΜΗ ΛΟΓΙΚΗ - ΜΗΝ ΑΛΛΑΞΕΤΕ ΧΩΡΙΣ TESTING!

# ΔΙΟΡΘΩΣΗ: Η ημερομηνία είναι η τελευταία του μήνα (όπως τις δόσεις έργων)
# Έτσι οι management fees εμφανίζονται ως παλιές οφειλές τον επόμενο μήνα

import calendar
last_day = calendar.monthrange(target_date.year, target_date.month)[1]
expense_date = date(target_date.year, target_date.month, last_day)

expense = Expense.objects.create(
    date=expense_date,              # ⚠️ ΚΡΙΣΙΜΟ: Τελευταία του μήνα
    due_date=expense_date,          # Όπως τις δόσεις
    distribution_type='equal_share' # ⚠️ ΚΡΙΣΙΜΟ: Ισόποσο, όχι χιλιοστά
)
```

**Παράδειγμα:**
```
Management Οκτ:  31/10/2025 → Εμφανίζεται ως παλιά οφειλή στον 11ο
Management Νοε:  30/11/2025 → Εμφανίζεται ως παλιά οφειλή στον 12ο
Management Δεκ:  31/12/2025 → Εμφανίζεται ως παλιά οφειλή στον 01/2026
```

---

### 3️⃣ Κανονικές Δαπάνες (Regular Expenses)

**Αρχείο:** `backend/financial/views.py` → `ExpenseViewSet.perform_create()`

**Κανόνας:**
```python
# Για κανονικές δαπάνες που καταχωρούνται μέσα στον μήνα:
# - Αν θέλεις να εμφανιστεί ως παλιά οφειλή τον ΙΔΙΟ μήνα → date = προηγούμενος μήνας
# - Αν θέλεις να εμφανιστεί ως τρέχουσα δαπάνη → date = τρέχων μήνας
# - Αν θέλεις να εμφανιστεί ως παλιά οφειλή τον ΕΠΟΜΕΝΟ μήνα → date = τέλος τρέχοντος μήνα
```

**Παράδειγμα:**
```python
# Δαπάνη που καταχωρείται στις 15/10/2025
expense.date = date(2025, 10, 15)  # Τρέχουσα δαπάνη Οκτωβρίου
# → Θα εμφανιστεί ως παλιά οφειλή στον 11ο (15/10 < 01/11) ✅
```

---

## Validation Rules

### ✅ Κανόνες που ΠΡΕΠΕΙ να τηρούνται

1. **Κάθε δαπάνη ΠΡΕΠΕΙ να έχει `date` και `due_date`**
   ```python
   if not expense.date or not expense.due_date:
       raise ValidationError("Expense must have both date and due_date")
   ```

2. **Για δόσεις: `date = due_date = τελευταία μήνα`**
   ```python
   if 'Δόση' in expense.title:
       assert expense.date == expense.due_date
       assert expense.date.day == calendar.monthrange(expense.date.year, expense.date.month)[1]
   ```

3. **Για management fees: `distribution_type = 'equal_share'`**
   ```python
   if expense.category == 'management_fees':
       assert expense.distribution_type == 'equal_share'
   ```

4. **Building ΠΡΕΠΕΙ να έχει `financial_system_start_date`**
   ```python
   if not building.financial_system_start_date:
       raise ValidationError("Building must have financial_system_start_date")
   ```

---

## Παραδείγματα

### Σενάριο 1: Νέο Έργο με Δόσεις

```python
# Έργο: €5000, 20% προκαταβολή, 4 δόσεις
# Ημερομηνία έγκρισης: 03/10/2025

# Προκαταβολή
date=2025-10-03, due_date=2025-10-18, amount=€1000

# Δόσεις (ξεκινούν από ΕΠΟΜΕΝΟ μήνα)
Δόση 1: date=2025-11-30, due_date=2025-11-30, amount=€1000
Δόση 2: date=2025-12-31, due_date=2025-12-31, amount=€1000
Δόση 3: date=2026-01-31, due_date=2026-01-31, amount=€1000
Δόση 4: date=2026-02-28, due_date=2026-02-28, amount=€1000

# Μεταφορά Υπολοίπων (για διαμ. 9.5% συμμετοχή):
Οκτ 2025: €0 παλιές + €95 προκ. = €95
Νοε 2025: €95 παλιές + €95 δόση1 = €190
Δεκ 2025: €190 παλιές + €95 δόση2 = €285
Ιαν 2026: €285 παλιές + €95 δόση3 = €380
Φεβ 2026: €380 παλιές + €95 δόση4 = €475
```

### Σενάριο 2: Management Fees

```python
# Management Fee: €1 ανά διαμέρισμα
# Δημιουργία: 1η κάθε μήνα

# Δημιουργημένα:
Οκτ: date=2025-10-31, amount=€10 (10 διαμ. × €1)
Νοε: date=2025-11-30, amount=€10
Δεκ: date=2025-12-31, amount=€10

# Μεταφορά Υπολοίπων (για 1 διαμέρισμα):
Οκτ 2025: €0 παλιές + €1 mgmt = €1
Νοε 2025: €1 παλιές + €1 mgmt = €2
Δεκ 2025: €2 παλιές + €1 mgmt = €3
```

---

## Testing

### Unit Tests

**Αρχείο:** `backend/financial/tests/test_balance_transfer_logic.py`

```bash
# Run tests
docker exec linux_version-backend-1 python manage.py test financial.tests.test_balance_transfer_logic
```

### Integration Tests

**Αρχείο:** `backend/test_all_balance_transfers.py`

```bash
# Run comprehensive test
docker exec linux_version-backend-1 python /app/test_all_balance_transfers.py
```

### Test Checklist

- [ ] Δόσεις έργων εμφανίζονται σωστά ως παλιές οφειλές
- [ ] Δεν υπάρχει διπλή χρέωση προκαταβολής + Δόσης 1
- [ ] Management fees μεταφέρονται σωστά από μήνα σε μήνα
- [ ] Κανονικές δαπάνες εμφανίζονται στον σωστό μήνα
- [ ] Building έχει financial_system_start_date

---

## 🚨 Προειδοποιήσεις

### ΜΗΝ ΑΛΛΑΞΕΤΕ:

1. **Το filter query στο `_calculate_historical_balance`**
   ```python
   # ⚠️ ΜΗΝ ΑΛΛΑΞΕΤΕ: date__lt=month_start
   expenses_before_month = Expense.objects.filter(date__lt=month_start)
   ```

2. **Τον τρόπο υπολογισμού `installment_date` στα projects**
   ```python
   # ⚠️ ΜΗΝ ΑΛΛΑΞΕΤΕ: Τελευταία του μήνα
   installment_date = payment_month_start.replace(day=last_day)
   ```

3. **Το `distribution_type` των management fees**
   ```python
   # ⚠️ ΜΗΝ ΑΛΛΑΞΕΤΕ: Πρέπει να είναι equal_share
   distribution_type='equal_share'
   ```

---

## 📚 Related Files

- `backend/projects/views.py` - Δημιουργία δόσεων έργων
- `backend/financial/management/commands/create_monthly_management_fees.py` - Δημιουργία management fees
- `backend/financial/services.py` - Υπολογισμός historical balance
- `backend/financial/views.py` - Δημιουργία κανονικών δαπανών

---

## 🔄 History

- **2025-10-03**: Initial implementation with incorrect dates
- **2025-10-03**: Fixed project installments (date = last day of month)
- **2025-10-03**: Fixed management fees (date = last day, distribution = equal_share)
- **2025-10-03**: Added comprehensive documentation and validation

---

**Τελευταία Ενημέρωση:** Οκτώβριος 2025
**Συντηρητής:** Claude Code
**Κρισιμότητα:** 🔴 ΥΨΗΛΗ - Οποιαδήποτε αλλαγή απαιτεί πλήρη regression testing
