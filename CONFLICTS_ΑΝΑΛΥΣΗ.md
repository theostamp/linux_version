# ⚠️ Ανάλυση Conflicts στο Οικονομικό Μοντέλο

## 📋 Περιεχόμενα
1. [Κρίσιμα Conflicts](#κρίσιμα-conflicts)
2. [Διπλότυπες Υλοποιήσεις](#διπλότυπες-υλοποιήσεις)
3. [Race Conditions](#race-conditions)
4. [Ασυνέπειες Λογικής](#ασυνέπειες-λογικής)
5. [Συστάσεις Επίλυσης](#συστάσεις-επίλυσης)

---

## 🔴 Κρίσιμα Conflicts

### 1. **Πολλαπλές Ενημερώσεις του `apartment.current_balance`**

**Πρόβλημα:** 13+ διαφορετικά σημεία στον κώδικα ενημερώνουν απευθείας το `apartment.current_balance`

#### Εντοπισμένες Θέσεις:

```python
# 1. Expense._create_apartment_transactions() - models.py:359
apartment.current_balance = new_balance
apartment.save()

# 2. Transaction._create_apartment_transactions() - models.py:502
apartment.current_balance = new_balance
apartment.save()

# 3. Payment._create_payment_transaction() - models.py:613
self.apartment.current_balance = new_balance
self.apartment.save()

# 4. BalanceCalculationService.update_apartment_balance() - balance_service.py:266
apartment.current_balance = new_balance
apartment.save(update_fields=['current_balance'])

# 5. PaymentService._update_apartment_balance() - payment_service.py:158
apartment.current_balance = total_payments - total_charges
apartment.save(update_fields=['current_balance'])

# 6. BalanceCalculator (payment_service.py) - ΔΙΑΦΟΡΕΤΙΚΗ ΛΟΓΙΚΗ!
# Χρησιμοποιεί apartment_number αντί για apartment FK

# 7. ExpenseViewSet.perform_create() - views.py:228
apartment.current_balance = (apartment.current_balance or Decimal('0.00')) - expense_share
apartment.save()

# 8. PaymentViewSet.perform_create() - views_payment.py:360
apartment.current_balance = new_balance
apartment.save()

# 9. PaymentViewSet.perform_destroy() - views.py:738
apartment.current_balance = previous_balance + payment.amount
apartment.save()

# 10. CommonExpenseCalculator - services.py:2082
apartment.current_balance = total_due
apartment.save()

# 11. BalanceIntegrityService.fix_apartment_balance() - balance_integrity_service.py:264
apartment.current_balance = correct_balance
apartment.save()

# 12. Management Commands (4 διαφορετικές)
# - fix_payment_signals.py:69
# - validate_payments.py:225
# - monitor_balance_consistency.py:61
# - fix_apartment_balance.py:21
```

**Συνέπειες:**
- **Race Conditions:** Παράλληλες ενημερώσεις μπορούν να αντικαταστήσουν η μία την άλλη
- **Ασυνέπεια Δεδομένων:** Διαφορετική λογική → διαφορετικά αποτελέσματα
- **Lost Updates:** Τελευταία ενημέρωση κερδίζει, προηγούμενες χάνονται
- **Δύσκολο Debugging:** Αδύνατον να εντοπιστεί ποιο component άλλαξε το balance

---

### 2. **Διπλότυπες Υλοποιήσεις Υπολογισμού Balance**

**Πρόβλημα:** 7+ διαφορετικές συναρτήσεις υπολογίζουν το ίδιο πράγμα με διαφορετικό τρόπο

#### Συναρτήσεις:

```python
# 1. BalanceCalculationService.calculate_historical_balance()
# Αρχείο: balance_service.py:46-186
# Λογική: Χρεώσεις (date__lt month_start) - Πληρωμές
# Χρησιμοποιεί: apartment (FK), TransactionType validation

# 2. BalanceCalculationService.calculate_current_balance()
# Αρχείο: balance_service.py:189-230
# Λογική: Running balance από transactions (χρονολογικά)
# Χρησιμοποιεί: TransactionType.is_payment(), is_charge()

# 3. PaymentService._update_apartment_balance()
# Αρχείο: payment_service.py:141-159
# Λογική: total_payments - total_charges
# Χρησιμοποιεί: apartment_number (string!), hardcoded types

# 4. BalanceCalculator.calculate_apartment_balance()
# Αρχείο: payment_service.py:317-353
# Λογική: total_payments - total_charges (με διαφορετικά types)
# Χρησιμοποιεί: apartment_number (string!)

# 5. BalanceIntegrityService._calculate_balance_from_transactions()
# Αρχείο: balance_integrity_service.py:147-162
# Λογική: balance += payments, balance -= charges
# Χρησιμοποιεί: apartment (FK), διαφορετικά types

# 6. PaymentSerializer.get_current_balance()
# Αρχείο: serializers.py:223-259
# Λογική: Running balance με διαφορετικά transaction types
# Χρησιμοποιεί: apartment (FK)

# 7. calculate_apartment_balance() (standalone function)
# Αρχείο: create_missing_management_fees_fixed.py
# Λογική: Μη τεκμηριωμένη standalone υλοποίηση
```

#### Διαφορές:

| Συνάρτηση | apartment_number vs FK | Transaction Types | Date Filtering | Management Fees |
|-----------|------------------------|-------------------|----------------|-----------------|
| BalanceCalculationService | FK | Validated | date__lt | Separate calc |
| PaymentService | **string!** | Hardcoded | date__lt | Not handled |
| BalanceCalculator | **string!** | Hardcoded | date__lte | Not handled |
| BalanceIntegrityService | FK | Hardcoded | All dates | Not separated |
| PaymentSerializer | FK | Hardcoded | All dates | Mixed |

**Συνέπειες:**
- **Διαφορετικά Αποτελέσματα:** Κάθε συνάρτηση δίνει διαφορετικό balance
- **apartment_number vs FK:** Κάποιες χρησιμοποιούν string, άλλες ForeignKey
- **Transaction Type Conflicts:** Διαφορετικές λίστες types → διαφορετικά totals
- **Date Filtering:** `date__lt` vs `date__lte` → διπλή χρέωση

---

### 3. **Διπλότυπες Υλοποιήσεις `_create_*_transaction()`**

**Πρόβλημα:** Πολλαπλές μέθοδοι δημιουργούν transactions με διαφορετικούς τρόπους

#### Μέθοδοι:

```python
# 1. Expense._create_apartment_transactions()
# Αρχείο: models.py:320-360
# Δημιουργεί: Transaction με type='expense_created'
# Ενημερώνει: apartment.current_balance
# Χρησιμοποιεί: apartment FK

# 2. Transaction._create_apartment_transactions()
# Αρχείο: models.py:470-503
# ⚠️ ΠΡΟΒΛΗΜΑ: Η ίδια μέθοδος στο Transaction model!
# Δημιουργεί: Νέα Transaction records
# Ενημερώνει: apartment.current_balance

# 3. Payment._create_payment_transaction()
# Αρχείο: models.py:589-614
# Δημιουργεί: Transaction με type='payment_received'
# Ενημερώνει: apartment.current_balance

# 4. PaymentService._create_payment_transaction()
# Αρχείο: payment_service.py:114-139
# Δημιουργεί: Transaction με διαφορετικά types (category-based)
# ΔΕΝ ενημερώνει: balance (το κάνει ξεχωριστά)
# Χρησιμοποιεί: apartment_number (string!)

# 5. Management Command: validate_payments._create_missing_transactions()
# Αρχείο: financial/management/commands/validate_payments.py
# Δημιουργεί: Transactions για payments που λείπουν
# Ενημερώνει: apartment.current_balance
```

**Conflicts:**

1. **Transaction model έχει `_create_apartment_transactions()`**
   - Αυτό ΔΕΝ έχει νόημα! Το Transaction δεν πρέπει να δημιουργεί transactions
   - Πιθανόν copy-paste bug από Expense model

2. **Διαφορετικά transaction types:**
   ```python
   # Expense model
   type='expense_created'

   # Payment model
   type='payment_received'

   # PaymentService
   type_map = {
       'common_expenses': 'common_expense_payment',
       'previous_obligations': 'payment_received',
       'reserve_fund': 'reserve_fund_payment'
   }
   ```

3. **Διαφορετική χρήση apartment:**
   ```python
   # Models (Expense, Payment)
   apartment=apartment  # FK

   # PaymentService
   apartment_number=apartment.number  # String!
   ```

**Συνέπειες:**
- **Διπλές Transactions:** Κάποιες μέθοδοι μπορεί να καλούνται πολλές φορές
- **Ασυνεπή Types:** Διαφορετικά types για την ίδια ενέργεια
- **apartment_number vs FK:** Δυσκολία σε queries και joins

---

### 4. **Ασυνέπεια στον Υπολογισμό Previous Obligations**

**Πρόβλημα:** Διαφορετικές υλοποιήσεις για τον υπολογισμό παλαιότερων οφειλών

#### Υλοποιήσεις:

```python
# 1. BalanceCalculationService.calculate_historical_balance()
# Αρχείο: balance_service.py:110-113
# Λογική: date__lt month_start (ΚΡΙΣΙΜΟ: < όχι <=)
expenses_before_month = Expense.objects.filter(
    date__gte=system_start_date,
    date__lt=month_start  # ⚠️ Αποφυγή διπλής χρέωσης
)

# 2. PaymentService._get_previous_obligations()
# Αρχείο: payment_service.py:161-180
# Λογική: date__lt reference_date
charges = Transaction.objects.filter(
    date__lt=reference_date,  # Σωστό
    type__in=['common_expense_charge', 'expense_created', 'expense_issued']
)

# 3. BalanceCalculator.calculate_monthly_balance()
# Αρχείο: payment_service.py:355-404
# Λογική: Υπολογίζει previous_balance με calculate_apartment_balance()
previous_balance = self.calculate_apartment_balance(
    apartment_id,
    month_start - timezone.timedelta(days=1)  # ⚠️ Διαφορετική προσέγγιση
)

# 4. CommonExpenseCalculator._get_historical_balance()
# Αρχείο: services.py
# ⚠️ DEPRECATED: Αντικαταστάθηκε από BalanceCalculationService
# Αλλά ίσως ακόμα χρησιμοποιείται σε κάποια σημεία
```

**Κρίσιμη Διαφορά:**

```python
# ΣΩΣΤΟ (BalanceCalculationService)
expenses_before_month = Expense.objects.filter(date__lt=month_start)
# Αν month_start = 2025-11-01, θα πάρει μέχρι 2025-10-31 ✅

# ΛΑΘΟΣ (αν χρησιμοποιηθεί date__lte)
expenses = Expense.objects.filter(date__lte=month_start)
# Θα πάρει και την 2025-11-01 → ΔΙΠΛΗ ΧΡΕΩΣΗ! ❌
```

**Συνέπειες:**
- **Διπλή Χρέωση:** Αν χρησιμοποιηθεί `date__lte` αντί για `date__lt`
- **Ασυνέπεια στα Reports:** Διαφορετικά previous_obligations σε διαφορετικά endpoints
- **Λάθος Balance Transfer:** Μεταφορά λάθος ποσού στον επόμενο μήνα

---

## 🔄 Race Conditions

### 1. **Παράλληλες Δημιουργίες Expense**

**Σενάριο:**
```
Thread 1: ExpenseViewSet.create() για Expense A
Thread 2: ExpenseViewSet.create() για Expense B

Χρόνος T1:
- Thread 1: Διαβάζει apartment.current_balance = -100€
- Thread 2: Διαβάζει apartment.current_balance = -100€

Χρόνος T2:
- Thread 1: Υπολογίζει new_balance = -100€ - 50€ = -150€
- Thread 2: Υπολογίζει new_balance = -100€ - 30€ = -130€

Χρόνος T3:
- Thread 1: Γράφει apartment.current_balance = -150€
- Thread 2: Γράφει apartment.current_balance = -130€ ❌ (ΧΑΝΕΤΑΙ Η ΑΛΛΑΓΗ ΤΟΥ T1!)

Αναμενόμενο: -180€
Πραγματικό: -130€
Διαφορά: +50€ λάθος!
```

**Θέσεις με Race Condition:**
- `ExpenseViewSet.perform_create()` (views.py:228)
- `PaymentViewSet.perform_create()` (views_payment.py:360)
- `Expense._create_apartment_transactions()` (models.py:359)
- `Payment._create_payment_transaction()` (models.py:613)

**Λύση:** Χρήση `select_for_update()` ή atomic transactions

---

### 2. **Παράλληλες Πληρωμές**

**Σενάριο:**
```
Thread 1: Payment για 100€
Thread 2: Payment για 50€

Χρόνος T1:
- Thread 1: current_balance = -200€
- Thread 2: current_balance = -200€

Χρόνος T2:
- Thread 1: new_balance = -200€ + 100€ = -100€
- Thread 2: new_balance = -200€ + 50€ = -150€

Χρόνος T3:
- Thread 1: apartment.current_balance = -100€
- Thread 2: apartment.current_balance = -150€ ❌

Αναμενόμενο: -50€
Πραγματικό: -150€
Διαφορά: -100€ χάθηκε!
```

---

### 3. **Ταυτόχρονη Ενημέρωση από Signals**

**Πρόβλημα:** Signals μπορεί να ενεργοποιηθούν ταυτόχρονα:

```python
# Αν υπάρχουν signals για post_save Expense, Payment:

@receiver(post_save, sender=Expense)
def update_balance_on_expense(sender, instance, **kwargs):
    apartment = instance.apartment
    apartment.current_balance -= instance.share_amount
    apartment.save()

@receiver(post_save, sender=Payment)
def update_balance_on_payment(sender, instance, **kwargs):
    apartment = instance.apartment
    apartment.current_balance += instance.amount
    apartment.save()

# Αν Expense και Payment σωθούν ταυτόχρονα:
# Race condition στο apartment.current_balance
```

---

## 🔀 Ασυνέπειες Λογικής

### 1. **Πρόσημο Balance (Sign Convention)**

**Πρόβλημα:** Διαφορετικές conventions για θετικό/αρνητικό balance

```python
# BalanceCalculationService (balance_service.py)
# Θετικό = Χρέος, Αρνητικό = Πίστωση
balance = total_charges - total_payments
# Αν charges=100, payments=50 → balance=+50 (χρέος)

# PaymentService (payment_service.py)
# Αντίστροφο! Θετικό = Πίστωση, Αρνητικό = Χρέος
balance = total_payments - total_charges
# Αν payments=50, charges=100 → balance=-50 (χρέος)

# BalanceIntegrityService (balance_integrity_service.py)
# Θετικό = Πίστωση
balance += payments  # Προσθήκη
balance -= charges   # Αφαίρεση
```

**Συνέπειες:**
- Σύγχυση στην ερμηνεία αποτελεσμάτων
- Λάθος εμφάνιση στο UI (χρέος εμφανίζεται ως πίστωση)
- Λάθος υπολογισμοί σε reports

---

### 2. **Transaction Types Inconsistency**

**Πρόβλημα:** Κάθε service χρησιμοποιεί διαφορετικά transaction types

```python
# BalanceCalculationService
CHARGE_TYPES = ['common_expense_charge', 'expense_created', 'expense_issued',
                'interest_charge', 'penalty_charge']
PAYMENT_TYPES = ['payment_received', 'refund']

# PaymentService
CHARGE_TYPES = ['common_expense_charge', 'expense_created', 'expense_issued',
                'interest_charge', 'penalty_charge']
PAYMENT_TYPES = ['common_expense_payment', 'payment_received', 'reserve_fund_payment', 'refund']

# BalanceIntegrityService
PAYMENT_TYPES = ['payment', 'common_expense_payment', 'payment_received', 'refund']
CHARGE_TYPES = ['common_expense_charge', 'expense_created', 'expense_issued',
                'interest_charge', 'penalty_charge']

# PaymentSerializer
PAYMENT_TYPES = ['common_expense_payment', 'payment_received', 'refund']
CHARGE_TYPES = ['common_expense_charge', 'expense_created', 'expense_issued',
                'interest_charge', 'penalty_charge']
```

**Λείπουν από κάποιες υλοποιήσεις:**
- `'reserve_fund_payment'` (μόνο σε PaymentService)
- `'expense_payment'` (πουθενά)
- `'balance_adjustment'` (ειδικός τύπος, δεν υπάρχει παντού)

**Συνέπειες:**
- Κάποια transactions αγνοούνται σε υπολογισμούς
- Διαφορετικά totals σε διαφορετικά endpoints
- Reserve fund payments μπορεί να χαθούν

---

### 3. **apartment_number (String) vs apartment (ForeignKey)**

**Πρόβλημα:** Κάποια models/services χρησιμοποιούν string, άλλα FK

```python
# Models (Expense, Payment) - Χρησιμοποιούν FK
Transaction.objects.create(
    apartment=apartment,  # FK
    building=building,    # FK
    ...
)

# PaymentService - Χρησιμοποιεί String!
Transaction.objects.create(
    apartment_number=apartment.number,  # String! ❌
    ...
)

# BalanceCalculator - Χρησιμοποιεί String!
transactions = Transaction.objects.filter(
    apartment_number=apartment.number  # String! ❌
)
```

**Πρόβλημα στο Transaction Model:**
```python
class Transaction(models.Model):
    apartment_number = models.CharField(...)  # Deprecated field
    apartment = models.ForeignKey(...)        # Νέο field
```

**Συνέπειες:**
- **Data Inconsistency:** Κάποια transactions έχουν apartment_number, άλλα apartment FK
- **Query Issues:** Queries με apartment_number μπορεί να χάσουν records με apartment FK
- **Δύσκολο Maintenance:** Πρέπει να ελέγχεις και τα δύο fields

---

### 4. **Management Fees Υπολογισμός**

**Πρόβλημα:** Διαφορετική αντιμετώπιση management fees

```python
# BalanceCalculationService.calculate_historical_balance()
# Ξεχωριστός υπολογισμός με include_management_fees flag
if include_management_fees:
    management_expenses = Expense.objects.filter(category='management_fees', ...)
    management_fee_charges = total_management_expenses / total_apartments

# PaymentService - ΔΕΝ χειρίζεται management fees ξεχωριστά
# Τα μετράει μαζί με όλες τις άλλες χρεώσεις

# BalanceIntegrityService - ΔΕΝ διαχωρίζει management fees
# Όλα μαζί στο balance
```

**Συνέπειες:**
- Διαφορετικά balances αν συμπεριληφθούν ή όχι management fees
- Σύγχυση στο τι περιλαμβάνει το "previous_obligations"
- Reports μπορεί να είναι λάθος

---

## 📊 Σύνοψη Conflicts

### Πίνακας Conflicts:

| # | Conflict Type | Κρισιμότητα | Affected Components | Impact |
|---|---------------|-------------|---------------------|--------|
| 1 | Πολλαπλές Ενημερώσεις `current_balance` | 🔴 ΚΡΙΣΙΜΟ | 13+ locations | Race conditions, Lost updates |
| 2 | Διπλότυπες υλοποιήσεις `calculate_balance` | 🔴 ΚΡΙΣΙΜΟ | 7 functions | Διαφορετικά αποτελέσματα |
| 3 | Διπλότυπες `_create_transaction` μέθοδοι | 🟠 ΥΨΗΛΟ | 5 methods | Διπλές transactions |
| 4 | Ασυνέπεια `previous_obligations` | 🟠 ΥΨΗΛΟ | 4 implementations | Λάθος balance transfers |
| 5 | Balance Sign Convention | 🟠 ΥΨΗΛΟ | 3 services | Σύγχυση θετικού/αρνητικού |
| 6 | Transaction Types Inconsistency | 🟡 ΜΕΤΡΙΟ | 5+ locations | Χαμένα transactions |
| 7 | `apartment_number` vs `apartment` FK | 🟡 ΜΕΤΡΙΟ | PaymentService, BalanceCalculator | Data inconsistency |
| 8 | Management Fees Handling | 🟡 ΜΕΤΡΙΟ | 3 services | Ασυνεπή reports |

---

## ✅ Συστάσεις Επίλυσης

### 1. **Single Source of Truth για Balance Updates**

**Προτεινόμενη Λύση:**

```python
# Μόνο αυτή η μέθοδος πρέπει να ενημερώνει το balance
class BalanceCalculationService:
    @staticmethod
    @transaction.atomic
    def update_apartment_balance(apartment: Apartment) -> Decimal:
        # Lock apartment για παράλληλες ενημερώσεις
        apartment = Apartment.objects.select_for_update().get(id=apartment.id)

        new_balance = BalanceCalculationService.calculate_current_balance(apartment)

        apartment.current_balance = new_balance
        apartment.save(update_fields=['current_balance'])

        return new_balance

# Όλα τα άλλα components καλούν ΜΟΝΟ αυτή τη μέθοδο
```

**Αλλαγές:**
- Αφαίρεση όλων των άλλων `apartment.current_balance = ...`
- Όλοι καλούν `BalanceCalculationService.update_apartment_balance()`
- Χρήση `select_for_update()` για locking

---

### 2. **Κατάργηση Διπλότυπων Υλοποιήσεων**

**Αφαίρεση:**
```python
# ❌ Αφαίρεση
- PaymentService._update_apartment_balance()
- BalanceCalculator.calculate_apartment_balance()
- BalanceIntegrityService._calculate_balance_from_transactions()
- PaymentSerializer.get_current_balance()
- Transaction._create_apartment_transactions() (bug!)

# ✅ Χρήση
- BalanceCalculationService.calculate_current_balance()
- BalanceCalculationService.calculate_historical_balance()
```

---

### 3. **Ενοποίηση Transaction Types**

**Δημιουργία Κεντρικού Registry:**

```python
# financial/transaction_types.py
class TransactionType:
    # Charge Types
    COMMON_EXPENSE_CHARGE = 'common_expense_charge'
    EXPENSE_CREATED = 'expense_created'
    EXPENSE_ISSUED = 'expense_issued'
    INTEREST_CHARGE = 'interest_charge'
    PENALTY_CHARGE = 'penalty_charge'

    # Payment Types
    COMMON_EXPENSE_PAYMENT = 'common_expense_payment'
    PAYMENT_RECEIVED = 'payment_received'
    RESERVE_FUND_PAYMENT = 'reserve_fund_payment'
    EXPENSE_PAYMENT = 'expense_payment'
    REFUND = 'refund'

    # Special Types
    BALANCE_ADJUSTMENT = 'balance_adjustment'

    @classmethod
    def get_charge_types(cls):
        return [
            cls.COMMON_EXPENSE_CHARGE,
            cls.EXPENSE_CREATED,
            cls.EXPENSE_ISSUED,
            cls.INTEREST_CHARGE,
            cls.PENALTY_CHARGE
        ]

    @classmethod
    def get_payment_types(cls):
        return [
            cls.COMMON_EXPENSE_PAYMENT,
            cls.PAYMENT_RECEIVED,
            cls.RESERVE_FUND_PAYMENT,
            cls.EXPENSE_PAYMENT,
            cls.REFUND
        ]

    @classmethod
    def is_charge(cls, transaction_type):
        return transaction_type in cls.get_charge_types()

    @classmethod
    def is_payment(cls, transaction_type):
        return transaction_type in cls.get_payment_types()
```

**Χρήση:**
```python
# Όλα τα services χρησιμοποιούν
from financial.transaction_types import TransactionType

charges = Transaction.objects.filter(
    type__in=TransactionType.get_charge_types()
)
```

---

### 4. **Καθορισμός Sign Convention**

**Απόφαση:** Χρησιμοποιούμε την convention του BalanceCalculationService

```python
# ΚΑΝΟΝΑΣ:
# Θετικό balance = Χρέος (apartment owes money)
# Αρνητικό balance = Πίστωση (apartment has credit)

balance = total_charges - total_payments

# Παράδειγμα:
# charges = 100€, payments = 50€
# balance = 100€ - 50€ = +50€ (χρέος 50€)

# charges = 100€, payments = 150€
# balance = 100€ - 150€ = -50€ (πίστωση 50€)
```

**Αλλαγή σε PaymentService, BalanceIntegrityService:**
```python
# ❌ Παλιό (αντίστροφο)
balance = total_payments - total_charges

# ✅ Νέο (σωστό)
balance = total_charges - total_payments
```

---

### 5. **Κατάργηση `apartment_number` Field**

**Migration:**
```python
# 1. Συμπληρώνουμε apartment FK για records με apartment_number
Transaction.objects.filter(apartment__isnull=True).update(
    apartment=Apartment.objects.get(number=F('apartment_number'))
)

# 2. Κάνουμε apartment required
# 3. Αφαιρούμε apartment_number field (deprecated)
```

**Αλλαγές:**
```python
# ❌ Παλιό
Transaction.objects.filter(apartment_number=apartment.number)

# ✅ Νέο
Transaction.objects.filter(apartment=apartment)
```

---

### 6. **Ενοποίηση Previous Obligations Logic**

**Κανόνας:**
```python
# ΠΑΝΤΑ χρησιμοποιούμε date__lt (όχι date__lte)
expenses_before_month = Expense.objects.filter(
    date__lt=month_start  # ⚠️ ΚΡΙΣΙΜΟ: < όχι <=
)

# Λόγος: Αποφυγή διπλής χρέωσης
# Αν month_start = 2025-11-01:
# - date__lt: Θα πάρει μέχρι 2025-10-31 ✅
# - date__lte: Θα πάρει και 2025-11-01 ❌ (διπλή χρέωση!)
```

---

### 7. **Transaction Creation Rules**

**Κανόνες:**

1. **Expense Model:**
   - Δημιουργεί Transaction με `type='expense_created'`
   - Καλεί `BalanceCalculationService.update_apartment_balance()` μετά

2. **Payment Model:**
   - Δημιουργεί Transaction με `type='payment_received'`
   - Καλεί `BalanceCalculationService.update_apartment_balance()` μετά

3. **PaymentService:**
   - Αφαιρείται η δική του `_create_payment_transaction()`
   - Χρησιμοποιεί το Payment model

4. **Transaction Model:**
   - Αφαιρείται το `_create_apartment_transactions()` (bug!)

---

### 8. **Management Fees Standard**

**Απόφαση:** Πάντα συμπεριλαμβάνουμε management fees στους υπολογισμούς

```python
# Αφαιρούμε το include_management_fees flag
# Πάντα τα υπολογίζουμε

def calculate_historical_balance(apartment, end_date):
    # Management fees υπολογίζονται πάντα
    # Όχι optional flag
```

---

## 🔧 Plan Επίλυσης (Προτεραιότητες)

### Phase 1: Κρίσιμα Fixes (Άμεσα)

1. ✅ Δημιουργία `TransactionType` registry
2. ✅ Ενοποίηση sign convention
3. ✅ Αφαίρεση διπλότυπων balance calculations
4. ✅ Χρήση `select_for_update()` για race conditions

### Phase 2: Refactoring (1-2 εβδομάδες)

1. ✅ Migration: apartment_number → apartment FK
2. ✅ Ενοποίηση transaction creation logic
3. ✅ Αφαίρεση deprecated methods
4. ✅ Ενοποίηση previous_obligations logic

### Phase 3: Testing & Validation (1 εβδομάδα)

1. ✅ Unit tests για BalanceCalculationService
2. ✅ Integration tests για transaction creation
3. ✅ Performance tests για race conditions
4. ✅ Data migration validation

---

**Τελευταία Ενημέρωση:** 2025-10-09
**Συντάκτης:** Claude Code Analysis
**Status:** 🔴 ΚΡΙΣΙΜΑ CONFLICTS - ΑΜΕΣΗ ΕΠΙΛΥΣΗ ΑΠΑΙΤΕΙΤΑΙ
