# BALANCE CALCULATION AUDIT REPORT

**Ημερομηνία:** 2025-10-03
**Σκοπός:** Εντοπισμός διπλότυπων, ασυνεπειών και προβλημάτων στον υπολογισμό υπολοίπων

---

## 🔍 ΦΑΣΗ 1: ΕΝΤΟΠΙΣΜΟΣ ΟΛΩΝ ΤΩΝ BALANCE FUNCTIONS

### Α. Backend Functions (Python)

#### 1. **financial/services.py**

| Line | Function | Σκοπός | Status |
|------|----------|--------|--------|
| 53 | `_get_historical_balance()` | Historical balance για CommonExpenseCalculator | ⚠️ ΔΙΠΛΟΤΥΠΟ #1 |
| 968 | `get_apartment_balances()` | Apartment balances για period | ✅ High-level |
| 1142 | `_calculate_historical_balance()` | **ΚΡΙΣΙΜΟ**: Historical balance για balance transfer | ✅ ΚΥΡΙΑ |
| 1448 | `generate_apartment_balance_report()` | Report generation | ✅ Reporting |
| 2207 | `_get_historical_balance()` | Historical balance για CommonExpenseDistributor | ⚠️ ΔΙΠΛΟΤΥΠΟ #2 |
| 2817 | `_calculate_apartment_balance()` | Balance calculation για distributor | ⚠️ ΔΙΠΛΟΤΥΠΟ #3 |

#### 2. **financial/signals.py**

| Line | Function | Trigger | Purpose |
|------|----------|---------|---------|
| 17 | `update_apartment_balance_on_transaction()` | post_save Transaction | ✅ Real-time update |
| 60 | `recalculate_apartment_balance_on_transaction_delete()` | post_delete Transaction | ✅ Cleanup |
| 98 | `update_apartment_balance_on_payment()` | post_save Payment | ⚠️ OVERLAPPING |
| 170 | `recalculate_apartment_balance_on_payment_delete()` | post_delete Payment | ⚠️ OVERLAPPING |

#### 3. **apartments/models.py**

| Field/Method | Type | Purpose |
|--------------|------|---------|
| `current_balance` | DecimalField | ✅ Single source of truth |
| `get_balance()` | Method? | ⚠️ Να ελεγχθεί |

---

## 🚨 ΠΡΟΒΛΗΜΑΤΑ ΕΝΤΟΠΙΣΜΕΝΑ

### 1. **ΔΙΠΛΟΤΥΠΕΣ ΣΥΝΑΡΤΗΣΕΙΣ**

```python
# ΠΡΟΒΛΗΜΑ: 3 διαφορετικές _get_historical_balance() / _calculate_*_balance()

# financial/services.py:53
class CommonExpenseCalculator:
    def _get_historical_balance(self, apartment, end_date):
        # Υπολογίζει με ΕΝΑ τρόπο
        pass

# financial/services.py:2207
class CommonExpenseDistributor:
    def _get_historical_balance(self, apartment, end_date):
        # Υπολογίζει με ΑΛΛΟ τρόπο (πιθανώς)
        pass

# financial/services.py:1142 - Η ΚΥΡΙΑ
class BalanceTransferService:
    def _calculate_historical_balance(self, apartment, end_date):
        # Αυτή χρησιμοποιείται για balance transfers
        # ΚΡΙΣΙΜΗ ΛΟΓΙΚΗ!
        pass
```

**ΚΙΝΔΥΝΟΣ:** Αν οι 3 αυτές δεν συμφωνούν, έχουμε ασυνέπειες!

### 2. **OVERLAPPING SIGNALS**

```python
# ΠΡΟΒΛΗΜΑ: Και Transaction ΚΑΙ Payment έχουν signals που ενημερώνουν balance

# Signal 1: Transaction.post_save → update balance
@receiver(post_save, sender=Transaction)
def update_apartment_balance_on_transaction():
    # Recalculate από ΟΛΕΣ τις transactions
    pass

# Signal 2: Payment.post_save → update balance
@receiver(post_save, sender=Payment)
def update_apartment_balance_on_payment():
    # Recalculate από ΟΛΕΣ τις transactions
    # ⚠️ ΔΙΠΛΗ ΔΟΥΛΕΙΑ!
    pass
```

**ΚΙΝΔΥΝΟΣ:**
- Διπλός υπολογισμός
- Race conditions
- Πιθανές ασυνέπειες

### 3. **TRANSACTION TYPE CONFUSION**

```python
# Από signals.py - transaction balance calculation

# Τύποι που ΠΡΟΣΘΕΤΟΥΝ (πληρωμές):
if trans.type in ['common_expense_payment', 'payment_received', 'refund']:
    new_balance += trans.amount

# Τύποι που ΑΦΑΙΡΟΥΝ (χρεώσεις):
elif trans.type in ['common_expense_charge', 'expense_created', 'expense_issued',
                    'interest_charge', 'penalty_charge']:
    new_balance -= trans.amount
```

**ΚΙΝΔΥΝΟΣ:**
- Τι γίνεται αν προστεθεί νέος type?
- Τι γίνεται αν κάποιος type λείπει?
- Δεν υπάρχει validation!

### 4. **DATE vs DATETIME INCONSISTENCY**

```python
# Transaction model
date = models.DateTimeField()  # ⚠️ DATETIME

# Expense model
date = models.DateField()  # ⚠️ DATE

# Στον υπολογισμό:
date__lt=month_start  # Τι type είναι το month_start?
```

**ΚΙΝΔΥΝΟΣ:** Timezone issues, comparison problems

---

## 📊 ΑΝΑΛΥΣΗ ΡΟΗΣ ΔΕΔΟΜΕΝΩΝ

### Current Flow (Προβληματική)

```
Expense Created
    ↓
Signal: post_save(Expense)
    ↓
_create_apartment_transactions()
    ↓
Creates Transaction objects
    ↓
Signal: post_save(Transaction) × N (ένα ανά apartment)
    ↓
update_apartment_balance_on_transaction() × N
    ↓
Recalculates από ΟΛΕΣ τις transactions × N
    ↓
⚠️ N × M queries (N apartments × M transactions each)
```

**ΠΡΟΒΛΗΜΑ:** O(N²) complexity!

### Payment Flow (Επίσης προβληματική)

```
Payment Created
    ↓
Signal: post_save(Payment)
    ↓
update_apartment_balance_on_payment()
    ↓
Creates Transaction
    ↓
Signal: post_save(Transaction)
    ↓
update_apartment_balance_on_transaction()
    ↓
⚠️ ΔΙΠΛΟΣ ΥΠΟΛΟΓΙΣΜΟΣ!
```

---

## 🔧 NEXT STEPS (ΦΑΣΗ 2)

Θα συνεχίσουμε με:

1. ✅ **Timezone Audit** - Έλεγχος consistency
2. ✅ **Code Duplication Analysis** - Εντοπισμός ακριβών duplicates
3. ✅ **Proposed Architecture** - Ενοποιημένο σύστημα
4. ✅ **Implementation Plan** - Βήμα-βήμα migration

---

## 🔬 ΦΑΣΗ 2: ΣΥΓΚΡΙΤΙΚΗ ΑΝΑΛΥΣΗ ΔΙΠΛΟΤΥΠΩΝ ΣΥΝΑΡΤΗΣΕΩΝ

### Α. Λεπτομερής Σύγκριση `_get_historical_balance()` Functions

#### 🔍 Function #1: CommonExpenseCalculator (Line 53)
```python
def _get_historical_balance(self, apartment, end_date):
    if not end_date:
        return apartment.current_balance or Decimal('0.00')

    # ⚠️ ΠΡΟΒΛΗΜΑ 1: Date → DateTime μετατροπή
    end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))

    # ✅ Υπολογισμός από Payment model
    total_payments = Payment.objects.filter(
        apartment=apartment,
        date__lt=end_date  # ⚠️ DateField (Payment)
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    # ⚠️ ΠΡΟΒΛΗΜΑ 2: apartment_number αντί για apartment object
    total_charges = Transaction.objects.filter(
        apartment_number=apartment.number,  # ⚠️ String comparison!
        date__lt=end_datetime,  # ⚠️ DateTimeField (Transaction)
        type__in=['common_expense_charge', 'expense_created', 'expense_issued',
                 'interest_charge', 'penalty_charge']
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    # ⚠️ ΠΡΟΒΛΗΜΑ 3: Διπλή μέτρηση πληρωμών
    additional_payments = Transaction.objects.filter(
        apartment_number=apartment.number,
        date__lt=end_datetime,
        type__in=['common_expense_payment', 'payment_received', 'refund']
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    # Formula: charges - (payments + additional_payments)
    return total_charges - (total_payments + additional_payments)
```

**ΠΡΟΒΛΗΜΑΤΑ:**
- ❌ Μετατρέπει DateField → DateTime (timezone complexity)
- ❌ Χρησιμοποιεί `apartment_number` (string) αντί για `apartment` (FK)
- ❌ Διπλή μέτρηση πληρωμών (Payment + Transaction payment types)
- ❌ Δεν ελέγχει financial_system_start_date

#### 🔍 Function #2: CommonExpenseDistributor (Line 2207)
```python
def _get_historical_balance(self, apartment, end_date):
    # ⚠️ ΙΔΙΟΣ ΚΩΔΙΚΑΣ ΜΕ #1 - 100% DUPLICATE!

    if not end_date:
        return apartment.current_balance or Decimal('0.00')

    end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))

    total_payments = Payment.objects.filter(
        apartment=apartment,
        date__lt=end_date
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    total_charges = Transaction.objects.filter(
        apartment_number=apartment.number,  # ⚠️ ΙΔΙΟ ΛΑΘΟΣ
        date__lt=end_datetime,
        type__in=['common_expense_charge', 'expense_created', 'expense_issued',
                 'interest_charge', 'penalty_charge']
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    additional_payments = Transaction.objects.filter(
        apartment_number=apartment.number,  # ⚠️ ΙΔΙΟ ΛΑΘΟΣ
        date__lt=end_datetime,
        type__in=['common_expense_payment', 'payment_received', 'refund']
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    return total_charges - (total_payments + additional_payments)
```

**ΣΥΜΠΕΡΑΣΜΑ:**
- ❌ **100% ΑΠΟΛΥΤΟ ΔΙΠΛΟΤΥΠΟ** του Function #1
- ❌ Περιέχει ΟΛΑ τα ίδια bugs!
- ❌ Δεν υπάρχει λόγος ύπαρξης - πρέπει να διαγραφεί!

#### 🔍 Function #3: BalanceTransferService (Line 1142) - **Η ΚΥΡΙΑ FUNCTION**
```python
def _calculate_historical_balance(self, apartment, end_date) -> Decimal:
    """
    ⚠️ ΚΡΙΣΙΜΟ: BALANCE TRANSFER LOGIC - ΜΗΝ ΑΛΛΑΞΕΤΕ ΧΩΡΙΣ TESTING!
    """

    # ✅ Type checking
    if isinstance(end_date, datetime):
        end_date = end_date.date()

    # ✅ Month start calculation
    month_start = end_date.replace(day=1)

    # ✅ Ελέγχει financial_system_start_date
    system_start_date = self.building.financial_system_start_date
    if system_start_date is None:
        return Decimal('0.00')

    # ✅ Βρίσκει δαπάνες που δημιουργήθηκαν ΠΡΙΝ από month_start
    expenses_before_month = Expense.objects.filter(
        building_id=apartment.building_id,
        date__gte=system_start_date,  # ✅ Από την έναρξη συστήματος
        date__lt=month_start  # ✅ ΚΡΙΣΙΜΟ: < όχι <=
    )

    # ✅ Χρησιμοποιεί apartment object (FK)
    total_charges = Transaction.objects.filter(
        apartment=apartment,  # ✅ ΣΩΣΤΟ!
        reference_type='expense',
        reference_id__in=[str(exp_id) for exp_id in non_management_expense_ids],
        type__in=['common_expense_charge', 'expense_created', 'expense_issued',
                 'interest_charge', 'penalty_charge']
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    # ✅ Μόνο Payment model (ΟΧΙ διπλή μέτρηση)
    total_payments = Payment.objects.filter(
        apartment=apartment,
        date__lt=end_date
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    # ✅ Χειρίζεται management_fees ξεχωριστά
    # ✅ Formula: total_charges - total_payments
```

**ΠΛΕΟΝΕΚΤΗΜΑΤΑ:**
- ✅ Σωστή χρήση `apartment` object (FK) αντί για `apartment_number`
- ✅ Ελέγχει `financial_system_start_date`
- ✅ Δεν κάνει διπλή μέτρηση πληρωμών
- ✅ Χειρίζεται management fees ξεχωριστά
- ✅ Έχει extensive documentation και tests
- ✅ Σωστή λογική με `date__lt` (όχι `date__lte`)

#### 🔍 Function #4: `_calculate_apartment_balance()` (Line 2817)
```python
def _calculate_apartment_balance(self, apartment: Apartment) -> Decimal:
    """Υπολογισμός υπολοίπου διαμερίσματος από transactions"""

    # ⚠️ ΠΡΟΒΛΗΜΑ: Χρησιμοποιεί apartment_number
    transactions = Transaction.objects.filter(
        apartment_number=apartment.number  # ⚠️ String comparison
    ).order_by('date', 'id')

    running_balance = Decimal('0.00')

    for transaction in transactions:
        if transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
            running_balance += transaction.amount
        elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued',
                                'interest_charge', 'penalty_charge']:
            running_balance -= transaction.amount
        elif transaction.type == 'balance_adjustment' and transaction.balance_after is not None:
            running_balance = transaction.balance_after

    return running_balance
```

**ΠΡΟΒΛΗΜΑΤΑ:**
- ❌ Χρησιμοποιεί `apartment_number` (string) αντί για `apartment` (FK)
- ❌ Υπολογίζει από ΟΛΕΣ τις συναλλαγές (δεν ελέγχει ημερομηνίες)
- ⚠️ Χρησιμοποιείται μόνο για verification, όχι για production logic

---

### Β. Timezone Consistency Audit

#### Django Settings
```python
TIME_ZONE = 'Europe/Athens'  # ✅ Σωστή ρύθμιση
USE_TZ = True  # ✅ Timezone-aware datetimes
CELERY_TIMEZONE = TIME_ZONE  # ✅ Consistent
```

#### Model Fields - **ΚΡΙΣΙΜΗ ΑΣΥΝΕΠΕΙΑ ΒΡΕΘΗΚΕ!**

| Model | Field | Type | Timezone |
|-------|-------|------|----------|
| **Expense** | date | `DateField` | ❌ NO TIMEZONE |
| **Transaction** | date | `DateTimeField` | ✅ Timezone-aware |
| **Payment** | date | `DateField` | ❌ NO TIMEZONE |
| MeterReading | reading_date | `DateField` | ❌ NO TIMEZONE |
| InstallmentPlan | start_date, end_date | `DateField` | ❌ NO TIMEZONE |

**ΠΡΟΒΛΗΜΑ:**
- **Expense.date** = DateField (NO timezone)
- **Transaction.date** = DateTimeField (WITH timezone)
- Όταν συγκρίνουμε `expense.date < transaction.date` → **TIMEZONE MISMATCH!**

**ΚΙΝΔΥΝΟΣ:**
```python
# Expense: date = 2025-11-01 (DateField - no timezone)
# Transaction: date = 2025-11-01 02:00:00+02:00 (DateTimeField - Athens timezone)

# Σύγκριση:
expense.date < transaction.date  # ⚠️ UNPREDICTABLE!

# Μετατροπή που γίνεται τώρα:
end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
# date=2025-11-01 → datetime=2025-11-01 23:59:59.999999+02:00
# ⚠️ Αυτό μπορεί να προκαλέσει λάθη σε edge cases!
```

---

### Γ. Transaction Type Validation

#### Τρέχον Σύστημα - **ΧΩΡΙΣ VALIDATION!**

```python
# Τύποι που ΠΡΟΣΘΕΤΟΥΝ:
if trans.type in ['common_expense_payment', 'payment_received', 'refund']:
    # ...

# Τύποι που ΑΦΑΙΡΟΥΝ:
elif trans.type in ['common_expense_charge', 'expense_created', 'expense_issued',
                    'interest_charge', 'penalty_charge']:
    # ...
```

**ΠΡΟΒΛΗΜΑΤΑ:**
- ❌ Δεν υπάρχει validation σε model level
- ❌ Τι γίνεται αν προστεθεί νέος type;
- ❌ Τι γίνεται αν γίνει typo στο type;
- ❌ Το Transaction model δέχεται οποιαδήποτε string!

#### Model Definition (Τωρινή)
```python
class Transaction(models.Model):
    type = models.CharField(max_length=50, verbose_name="Τύπος")
    # ⚠️ Δεν υπάρχει choices=[] - ΟΤΙΔΗΠΟΤΕ γίνεται δεκτό!
```

**ΛΥΣΗ:**
Πρέπει να προστεθούν `choices` στο Transaction model:
```python
class TransactionType(models.TextChoices):
    # Charges (αφαίρεση από υπόλοιπο)
    EXPENSE_CHARGE = 'common_expense_charge', 'Common Expense Charge'
    EXPENSE_CREATED = 'expense_created', 'Expense Created'
    EXPENSE_ISSUED = 'expense_issued', 'Expense Issued'
    INTEREST_CHARGE = 'interest_charge', 'Interest Charge'
    PENALTY_CHARGE = 'penalty_charge', 'Penalty Charge'

    # Payments (προσθήκη στο υπόλοιπο)
    PAYMENT = 'common_expense_payment', 'Common Expense Payment'
    PAYMENT_RECEIVED = 'payment_received', 'Payment Received'
    REFUND = 'refund', 'Refund'

    # Special
    BALANCE_ADJUSTMENT = 'balance_adjustment', 'Balance Adjustment'

type = models.CharField(
    max_length=50,
    choices=TransactionType.choices,
    verbose_name="Τύπος"
)
```

---

## 📝 ΣΗΜΕΙΩΣΕΙΣ

- Το `current_balance` στο Apartment model είναι το **single source of truth**
- Όλες οι άλλες functions πρέπει να το **ενημερώνουν** ή να το **διαβάζουν**
- ΔΕΝ πρέπει να υπάρχουν πολλαπλοί τρόποι υπολογισμού

---

*Συνεχίζεται στο BALANCE_REFACTORING_PROPOSAL.md*
