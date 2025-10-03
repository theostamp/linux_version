# RECURRING EXPENSES SYSTEM

**Σύστημα Αυτόματης Δημιουργίας Επαναλαμβανόμενων Δαπανών**

Αυτό το έγγραφο περιγράφει το σύστημα που διασφαλίζει ότι οι δαπάνες διαχείρισης και αποθεματικού:
1. **Δημιουργούνται αυτόματα** για κάθε μήνα
2. **Σεβαστούν τις αλλαγές** στα ποσά από την ημερομηνία που ορίζονται
3. **Διατηρούν ιστορικό** αλλαγών για auditing

---

## 📋 Table of Contents

1. [Αρχιτεκτονική](#αρχιτεκτονική)
2. [RecurringExpenseConfig Model](#recurringexpenseconfig-model)
3. [Management Command](#management-command)
4. [Workflow & Usage](#workflow--usage)
5. [Validation Rules](#validation-rules)
6. [Examples](#examples)
7. [Testing](#testing)
8. [Critical Warnings](#critical-warnings)

---

## Αρχιτεκτονική

### Βασική Λογική

```
RecurringExpenseConfig (Ρυθμίσεις με Ιστορικό)
    ↓
generate_recurring_expenses (Management Command)
    ↓
Expense (Αυτόματη Δημιουργία Δαπανών)
    ↓
Transaction (Αυτόματη Δημιουργία Συναλλαγών μέσω Signal)
```

### Κύρια Components

1. **RecurringExpenseConfig Model** (`financial/models.py`)
   - Κρατά το ιστορικό ρυθμίσεων
   - Υποστηρίζει multiple configurations με `effective_from` / `effective_until`
   - 3 μέθοδοι υπολογισμού: `fixed_per_apartment`, `percentage_of_expenses`, `fixed_total`

2. **generate_recurring_expenses Command** (`financial/management/commands/`)
   - Τρέχει για όλα τα κτίρια ή συγκεκριμένο
   - Δημιουργεί δαπάνες βάσει των ενεργών ρυθμίσεων
   - Σεβαστεί το `effective_from` για κάθε μήνα

3. **Validators** (`financial/validators.py`)
   - `RecurringExpenseValidator`: Validation rules
   - `validate_recurring_expense_config()`: Full validation πριν save

---

## RecurringExpenseConfig Model

### Πεδία

| Field | Type | Description |
|-------|------|-------------|
| `building` | FK | Το κτίριο που αφορά |
| `expense_type` | Choice | `management_fee` ή `reserve_fund` |
| `effective_from` | Date | Ισχύει από (ΚΡΙΣΙΜΟ) |
| `effective_until` | Date | Ισχύει έως (null = διαρκώς) |
| `calculation_method` | Choice | Μέθοδος υπολογισμού |
| `amount_per_apartment` | Decimal | Για `fixed_per_apartment` |
| `percentage` | Decimal | Για `percentage_of_expenses` |
| `total_amount` | Decimal | Για `fixed_total` |
| `distribution_type` | Choice | `equal_share` ή `by_participation_mills` |
| `is_active` | Boolean | Αν False, δεν δημιουργούνται νέες δαπάνες |

### Μέθοδοι Υπολογισμού

#### 1. fixed_per_apartment (Συνηθέστερη)
```python
# Παράδειγμα: €1/διαμέρισμα
config = RecurringExpenseConfig(
    calculation_method='fixed_per_apartment',
    amount_per_apartment=Decimal('1.00'),
    distribution_type='equal_share'
)

# Αυτόματος υπολογισμός:
# Total = €1 × 10 διαμερίσματα = €10
```

#### 2. percentage_of_expenses
```python
# Παράδειγμα: 5% επί δαπανών για αποθεματικό
config = RecurringExpenseConfig(
    calculation_method='percentage_of_expenses',
    percentage=Decimal('5.00'),  # 5%
    distribution_type='by_participation_mills'
)

# Αυτόματος υπολογισμός:
# Total = Συνολικές Δαπάνες Μήνα × 5%
```

#### 3. fixed_total
```python
# Παράδειγμα: Σταθερό €100/μήνα
config = RecurringExpenseConfig(
    calculation_method='fixed_total',
    total_amount=Decimal('100.00'),
    distribution_type='equal_share'
)
```

### Κρίσιμες Μέθοδοι

#### get_active_config()
```python
# Βρίσκει την ενεργή ρύθμιση για συγκεκριμένη ημερομηνία
config = RecurringExpenseConfig.get_active_config(
    building_id=1,
    expense_type='management_fee',
    target_date=date(2026, 6, 15)
)
```

**Λογική:**
1. Φιλτράρει: `effective_from <= target_date`
2. Φιλτράρει: `effective_until >= target_date OR effective_until IS NULL`
3. Επιστρέφει την πιο πρόσφατη (`order_by('-effective_from')`)

#### calculate_total_amount()
```python
# Υπολογίζει το συνολικό ποσό για τον μήνα
total = config.calculate_total_amount(month_expenses=Decimal('500'))
```

---

## Management Command

### Σύνταξη

```bash
python manage.py generate_recurring_expenses [options]
```

### Options

| Option | Description | Example |
|--------|-------------|---------|
| `--building_id` | Συγκεκριμένο κτίριο | `--building_id 1` |
| `--from` | Μήνας έναρξης (YYYY-MM) | `--from 2025-10` |
| `--to` | Μήνας λήξης (YYYY-MM) | `--to 2026-12` |
| `--dry-run` | Δοκιμή χωρίς δημιουργία | `--dry-run` |
| `--force` | Δημιουργία ακόμη κι αν υπάρχει | `--force` |

### Παραδείγματα

```bash
# Δημιουργία για όλα τα κτίρια από financial_system_start_date
python manage.py generate_recurring_expenses

# Δημιουργία για κτίριο 1, Οκτ 2025 - Δεκ 2026
python manage.py generate_recurring_expenses --building_id 1 --from 2025-10 --to 2026-12

# Dry run (δοκιμή)
python manage.py generate_recurring_expenses --dry-run

# Force overwrite existing expenses
python manage.py generate_recurring_expenses --force
```

### Λογική Εκτέλεσης

```python
for month in range(from_month, to_month):
    # 1. Βρες την ενεργή config για αυτόν τον μήνα
    config = RecurringExpenseConfig.get_active_config(
        building_id=building.id,
        expense_type='management_fee',
        target_date=month_date
    )

    # 2. Υπολογισμός ποσού
    total_amount = config.calculate_total_amount()

    # 3. Ημερομηνία δαπάνης = ΤΕΛΕΥΤΑΙΑ του μήνα (ΚΡΙΣΙΜΟ!)
    last_day = calendar.monthrange(year, month)[1]
    expense_date = date(year, month, last_day)

    # 4. Δημιουργία δαπάνης
    Expense.objects.create(
        building=building,
        date=expense_date,
        due_date=expense_date,
        expense_type=config.expense_type,
        amount=total_amount,
        ...
    )
```

---

## Workflow & Usage

### Initial Setup (Μία Φορά)

#### 1. Δημιουργία Αρχικής Ρύθμισης

```python
from financial.models import RecurringExpenseConfig
from decimal import Decimal
from datetime import date

# Δαπάνες Διαχείρισης: €1/διαμέρισμα
config = RecurringExpenseConfig.objects.create(
    building_id=1,
    expense_type='management_fee',
    effective_from=date(2025, 10, 1),
    calculation_method='fixed_per_apartment',
    amount_per_apartment=Decimal('1.00'),
    distribution_type='equal_share',
    is_active=True,
    notes='Αρχική ρύθμιση'
)
```

#### 2. Δημιουργία Δαπανών για Παλιούς Μήνες

```bash
python manage.py generate_recurring_expenses \
  --building_id 1 \
  --from 2025-10 \
  --to 2026-03
```

### Αλλαγή Ποσού (Νέο Πακέτο)

#### Σενάριο: Αλλαγή από €1 σε €15 από 01/06/2026

```python
from financial.models import RecurringExpenseConfig
from decimal import Decimal
from datetime import date

# 1. Βρες την παλιά ρύθμιση
old_config = RecurringExpenseConfig.objects.get(
    building_id=1,
    expense_type='management_fee',
    effective_from=date(2025, 10, 1)
)

# 2. Θέσε effective_until (κλείσε την παλιά)
old_config.effective_until = date(2026, 5, 31)
old_config.save()

# 3. Δημιουργία νέας ρύθμισης
new_config = RecurringExpenseConfig.objects.create(
    building_id=1,
    expense_type='management_fee',
    effective_from=date(2026, 6, 1),  # Αρχίζει από 1η Ιουνίου
    calculation_method='fixed_per_apartment',
    amount_per_apartment=Decimal('15.00'),  # ΝΕΟ ποσό
    distribution_type='equal_share',
    is_active=True,
    notes='Αναβάθμιση σε premium πακέτο'
)

# 4. Δημιουργία δαπανών για μελλοντικούς μήνες
!python manage.py generate_recurring_expenses \
    --building_id 1 \
    --from 2026-06 \
    --to 2026-12
```

**Αποτέλεσμα:**
- Μάιος 2026: €10 (€1 × 10 διαμερίσματα)
- Ιούνιος 2026: €150 (€15 × 10 διαμερίσματα)
- Ιούλιος 2026: €150
- κ.λπ.

### Monthly Automation (Προαιρετικό)

Για αυτόματη δημιουργία κάθε μήνα, μπορείτε να χρησιμοποιήσετε cron job:

```bash
# Κάθε 1η του μήνα στις 00:00
0 0 1 * * cd /app && python manage.py generate_recurring_expenses --from $(date +\%Y-\%m)
```

---

## Validation Rules

### ⚠️ ΚΡΙΣΙΜΑ ΚΑΝΟΝΕΣ

#### 1. Ημερομηνία Δαπάνης = Τελευταία του Μήνα

```python
# ✅ ΣΩΣΤΟ
expense_date = date(2026, 2, 28)  # Τελευταία Φεβρουαρίου

# ❌ ΛΑΘΟΣ
expense_date = date(2026, 2, 1)   # Πρώτη του μήνα
```

**Λόγος:** Το historical balance query χρησιμοποιεί `date__lt=month_start`. Αν η δαπάνη είναι την 1η, δεν θα συμπεριληφθεί στο previous balance.

#### 2. date == due_date

```python
# ✅ ΣΩΣΤΟ
Expense.objects.create(
    date=date(2026, 2, 28),
    due_date=date(2026, 2, 28)
)

# ⚠️ Αποδεκτό αλλά δεν συνιστάται
Expense.objects.create(
    date=date(2026, 2, 28),
    due_date=None
)
```

#### 3. Δεν Επιτρέπονται Overlapping Configs

```python
# ❌ ΛΑΘΟΣ - Overlap!
config1 = RecurringExpenseConfig(
    effective_from=date(2025, 10, 1),
    effective_until=None  # Μέχρι σήμερα
)

config2 = RecurringExpenseConfig(
    effective_from=date(2026, 6, 1),  # Overlap με config1!
    effective_until=None
)

# ✅ ΣΩΣΤΟ - Κλείσε την παλιά πρώτα
config1.effective_until = date(2026, 5, 31)
config1.save()

config2 = RecurringExpenseConfig(
    effective_from=date(2026, 6, 1),
    effective_until=None
)
```

### Χρήση Validators

```python
from financial.validators import validate_recurring_expense_config

# Πριν από save
try:
    validate_recurring_expense_config(config)
    config.save()
except ValidationError as e:
    print(f"Validation Error: {e}")
```

---

## Examples

### Example 1: Απλή Ρύθμιση

```python
# Setup: €1/διαμέρισμα από 01/10/2025
config = RecurringExpenseConfig.objects.create(
    building_id=1,
    expense_type='management_fee',
    effective_from=date(2025, 10, 1),
    calculation_method='fixed_per_apartment',
    amount_per_apartment=Decimal('1.00'),
    distribution_type='equal_share',
    is_active=True
)

# Generate expenses
!python manage.py generate_recurring_expenses \
    --building_id 1 \
    --from 2025-10 \
    --to 2026-03

# Αποτέλεσμα:
# Oct 2025: €10 (date=2025-10-31)
# Nov 2025: €10 (date=2025-11-30)
# Dec 2025: €10 (date=2025-12-31)
# Jan 2026: €10 (date=2026-01-31)
# Feb 2026: €10 (date=2026-02-28)
# Mar 2026: €10 (date=2026-03-31)
```

### Example 2: Αλλαγή Ποσού

```python
# Αρχική: €1/διαμέρισμα
old_config = RecurringExpenseConfig.objects.get(...)
old_config.effective_until = date(2026, 5, 31)
old_config.save()

# Νέα: €15/διαμέρισμα από 01/06/2026
new_config = RecurringExpenseConfig.objects.create(
    building_id=1,
    expense_type='management_fee',
    effective_from=date(2026, 6, 1),
    calculation_method='fixed_per_apartment',
    amount_per_apartment=Decimal('15.00'),
    distribution_type='equal_share',
    is_active=True,
    notes='Premium package upgrade'
)

# Generate
!python manage.py generate_recurring_expenses \
    --building_id 1 \
    --from 2026-06 \
    --to 2026-12

# Αποτέλεσμα:
# May 2026: €10 (παλιό ποσό)
# Jun 2026: €150 (νέο ποσό!)
# Jul 2026: €150
# ...
```

### Example 3: Αποθεματικό με Ποσοστό

```python
# 5% επί δαπανών
config = RecurringExpenseConfig.objects.create(
    building_id=1,
    expense_type='reserve_fund',
    effective_from=date(2025, 10, 1),
    calculation_method='percentage_of_expenses',
    percentage=Decimal('5.00'),
    distribution_type='by_participation_mills',
    is_active=True
)

# Αποτέλεσμα:
# Αν μηνιαίες δαπάνες = €500
# Reserve fund = €500 × 5% = €25
```

---

## Testing

### Unit Tests

Θα δημιουργηθούν σε `financial/tests/test_recurring_expenses.py`:

```python
def test_get_active_config_with_overlapping_periods():
    """Τεστ ότι επιστρέφει τη σωστή config όταν υπάρχουν πολλές"""

def test_calculate_total_amount_fixed_per_apartment():
    """Τεστ υπολογισμού για fixed_per_apartment"""

def test_generate_recurring_expenses_respects_effective_from():
    """Τεστ ότι η αλλαγή ποσού εφαρμόζεται από τη σωστή ημερομηνία"""

def test_no_overlapping_configs_validation():
    """Τεστ ότι δεν επιτρέπονται overlapping configs"""
```

### Integration Test

```bash
# 1. Διαγραφή παλιών δαπανών
docker exec linux_version-backend-1 python /app/test_recurring_expenses_system.py

# 2. Δημιουργία νέων
docker exec linux_version-backend-1 python manage.py generate_recurring_expenses \
    --building_id 1 \
    --from 2025-10 \
    --to 2026-03

# 3. Verification
docker exec linux_version-backend-1 python /app/simple_feb_march_check.py
```

---

## Critical Warnings

### ⚠️ ΜΗΝ ΑΛΛΑΞΕΤΕ

1. **Ημερομηνία Δαπάνης = Τελευταία του Μήνα**
   - Βλέπε: `BALANCE_TRANSFER_ARCHITECTURE.md`
   - Αν αλλάξει, θα χαλάσει η μεταφορά υπολοίπων!

2. **date == due_date για Recurring Expenses**
   - Consistency με installments
   - Απαιτείται από balance transfer logic

3. **Validation πριν Save**
   - Πάντα χρησιμοποιείτε `validate_recurring_expense_config()`
   - Προστατεύει από overlapping configs

### ⚠️ ΠΡΟΣΟΧΗ

1. **Μη Διαγραφή Configs**
   - Μην διαγράφετε configs, θέστε `is_active=False`
   - Διατηρείτε το audit trail

2. **Overlapping Periods**
   - Κλείστε πάντα την παλιά config (θέστε `effective_until`)
   - Δημιουργήστε τη νέα με `effective_from = old_effective_until + 1 day`

3. **Timezone-Aware Dates**
   - Χρησιμοποιείτε `date` (όχι `datetime`)
   - Αποφύγετε timezone issues

---

## Integration με Υπάρχον Σύστημα

### Signals (Αυτόματο)

Όταν δημιουργείται `Expense` με `expense_type='management_fee'`:
```python
# financial/signals.py
@receiver(post_save, sender=Expense)
def create_transactions_for_expense(sender, instance, created, **kwargs):
    if created:
        # Αυτόματη δημιουργία Transactions
        # Αυτόματη ενημέρωση balances
```

### Balance Transfer Logic (Αυτόματο)

```python
# financial/services.py - _calculate_historical_balance()

# ⚠️ ΚΡΙΣΙΜΟ: date__lt (όχι date__lte)
expenses_before_month = Expense.objects.filter(
    building_id=apartment.building_id,
    date__gte=year_start,
    date__lt=month_start  # <-- ΚΡΙΣΙΜΟ!
)

# Αν δαπάνη έχει date=2026-02-28 και month_start=2026-03-01:
# ✅ 2026-02-28 < 2026-03-01 → Συμπεριλαμβάνεται!
```

---

## Summary

✅ **Τι Επιτυγχάνει:**
- Αυτόματη δημιουργία recurring expenses
- Σεβασμός αλλαγών ποσού από συγκεκριμένη ημερομηνία
- Ιστορικό αλλαγών για auditing
- Θωράκιση με validators

✅ **Πώς Δουλεύει:**
1. Δημιουργείτε `RecurringExpenseConfig` για κάθε αλλαγή
2. Τρέχετε `generate_recurring_expenses` command
3. Δημιουργούνται `Expense` objects αυτόματα
4. Signals δημιουργούν `Transaction` objects
5. Balance transfer logic λειτουργεί αυτόματα

✅ **Κρίσιμοι Κανόνες:**
- Expense date = τελευταία του μήνα
- date == due_date
- Κλείστε παλιά config πριν δημιουργήσετε νέα
- Πάντα validation πριν save

**Βλέπε Επίσης:**
- `BALANCE_TRANSFER_ARCHITECTURE.md` - Balance transfer logic
- `financial/validators.py` - Validation rules
- `financial/tests/test_balance_transfer_logic.py` - Tests
