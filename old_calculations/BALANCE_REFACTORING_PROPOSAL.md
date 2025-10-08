# BALANCE REFACTORING PROPOSAL

**Ημερομηνία:** 2025-10-03
**Βάση:** BALANCE_CALCULATION_AUDIT.md
**Στόχος:** Ενοποίηση και θωράκιση του balance calculation system

---

## 🎯 EXECUTIVE SUMMARY

Μετά από comprehensive audit, εντοπίστηκαν **4 κρίσιμα προβλήματα** που προκαλούν επαναλαμβανόμενα bugs:

1. **3 διπλότυπες functions** (2 πλήρως ίδιες, 1 ελαφρώς διαφορετική)
2. **Overlapping signals** που κάνουν διπλή δουλειά
3. **Date/DateTime inconsistency** μεταξύ models
4. **Χωρίς Transaction type validation**

**Αποτέλεσμα:** Ασταθές σύστημα που «σπάει» κάθε φορά που γίνονται αλλαγές.

---

## 🏗️ ΠΡΟΤΕΙΝΟΜΕΝΗ ΑΡΧΙΤΕΚΤΟΝΙΚΗ

### Α. Single Source of Truth Pattern

```python
# ΚΑΝΟΝΑΣ #1: Ένα και μόνο ένα service για balance calculations
class BalanceCalculationService:
    """
    Κεντρικό service για ΟΛΟΥΣ τους υπολογισμούς υπολοίπων.
    Όλα τα άλλα components χρησιμοποιούν ΑΥΤΟ το service.
    """

    @staticmethod
    def calculate_historical_balance(
        apartment: Apartment,
        end_date: date,
        include_management_fees: bool = True
    ) -> Decimal:
        """
        ΜΟΝΗ ΚΕΝΤΡΙΚΗ FUNCTION για historical balance calculation

        Αντικαθιστά:
        - CommonExpenseCalculator._get_historical_balance() ❌
        - CommonExpenseDistributor._get_historical_balance() ❌
        - BalanceTransferService._calculate_historical_balance() ❌
        """
        pass

    @staticmethod
    def calculate_current_balance(apartment: Apartment) -> Decimal:
        """
        Υπολογισμός τρέχοντος υπολοίπου από transactions

        Αντικαθιστά:
        - _calculate_apartment_balance() ❌
        - Signal-based recalculation ❌
        """
        pass

    @staticmethod
    def update_apartment_balance(apartment: Apartment) -> Decimal:
        """
        Ενημέρωση apartment.current_balance με το σωστό υπόλοιπο

        Χρησιμοποιείται από:
        - Signals (post_save/post_delete) ✅
        - Manual recalculation ✅
        """
        new_balance = BalanceCalculationService.calculate_current_balance(apartment)
        apartment.current_balance = new_balance
        apartment.save(update_fields=['current_balance'])
        return new_balance
```

### Β. Signal Simplification

**ΤΩΡΑ (Προβληματικό):**
```python
# ❌ ΔΙΠΛΟΣ ΥΠΟΛΟΓΙΣΜΟΣ!
@receiver(post_save, sender=Payment)
def update_apartment_balance_on_payment():
    # Creates Transaction → triggers next signal
    pass

@receiver(post_save, sender=Transaction)
def update_apartment_balance_on_transaction():
    # Recalculates balance AGAIN!
    pass
```

**ΠΡΟΤΕΙΝΟΜΕΝΟ (Απλοποιημένο):**
```python
# ✅ ΜΟΝΟ ΕΝΑ SIGNAL
@receiver(post_save, sender=Transaction)
@receiver(post_delete, sender=Transaction)
def update_apartment_balance_on_transaction_change(sender, instance, **kwargs):
    """
    Μόνο αυτό το signal ενημερώνει balances.
    Χρησιμοποιεί το κεντρικό BalanceCalculationService.
    """
    if instance.apartment:
        BalanceCalculationService.update_apartment_balance(instance.apartment)

# ⚠️ ΑΦΑΙΡΟΥΜΕ το Payment signal - δεν χρειάζεται!
# Payment δημιουργεί Transaction, Transaction signal αναλαμβάνει.
```

### Γ. Date/DateTime Consistency

**ΠΡΟΒΛΗΜΑ:**
- Expense.date = DateField
- Transaction.date = DateTimeField
- Payment.date = DateField

**ΛΥΣΗ 1 (Συντηρητική):** Normalize στα queries
```python
def calculate_historical_balance(apartment: Apartment, end_date: date) -> Decimal:
    # Normalize end_date to start of day (00:00:00)
    if isinstance(end_date, datetime):
        end_date = end_date.date()

    # For DateTimeFields: use start of day
    end_datetime_start = timezone.make_aware(
        datetime.combine(end_date, datetime.min.time())
    )

    # For DateFields: use date directly
    total_payments = Payment.objects.filter(
        apartment=apartment,
        date__lt=end_date  # DateField comparison
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    total_charges = Transaction.objects.filter(
        apartment=apartment,
        date__lt=end_datetime_start  # DateTimeField comparison
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
```

**ΛΥΣΗ 2 (Μακροπρόθεσμη):** Migration σε DateTimeField
```python
# Migration για Expense.date και Payment.date
class Migration:
    def forwards(apps, schema_editor):
        # Μετατροπή DateField → DateTimeField
        # date=2025-11-01 → datetime=2025-11-01 00:00:00+02:00
        pass
```

### Δ. Transaction Type Validation

**ΠΡΟΤΕΙΝΟΜΕΝΟ:**
```python
# financial/models.py
class TransactionType(models.TextChoices):
    """Validated transaction types"""

    # Charges (increase debt - negative balance)
    EXPENSE_CHARGE = 'common_expense_charge', 'Χρέωση Κοινοχρήστων'
    EXPENSE_CREATED = 'expense_created', 'Δημιουργία Δαπάνης'
    EXPENSE_ISSUED = 'expense_issued', 'Έκδοση Δαπάνης'
    INTEREST_CHARGE = 'interest_charge', 'Χρέωση Τόκου'
    PENALTY_CHARGE = 'penalty_charge', 'Χρέωση Προστίμου'

    # Payments (decrease debt - positive balance)
    PAYMENT = 'common_expense_payment', 'Πληρωμή Κοινοχρήστων'
    PAYMENT_RECEIVED = 'payment_received', 'Είσπραξη Πληρωμής'
    REFUND = 'refund', 'Επιστροφή Χρημάτων'

    # Special
    BALANCE_ADJUSTMENT = 'balance_adjustment', 'Διόρθωση Υπολοίπου'

    @classmethod
    def is_charge(cls, transaction_type: str) -> bool:
        """Check if type is a charge (debt increase)"""
        return transaction_type in [
            cls.EXPENSE_CHARGE, cls.EXPENSE_CREATED, cls.EXPENSE_ISSUED,
            cls.INTEREST_CHARGE, cls.PENALTY_CHARGE
        ]

    @classmethod
    def is_payment(cls, transaction_type: str) -> bool:
        """Check if type is a payment (debt decrease)"""
        return transaction_type in [
            cls.PAYMENT, cls.PAYMENT_RECEIVED, cls.REFUND
        ]

class Transaction(TenantModelMixin):
    type = models.CharField(
        max_length=50,
        choices=TransactionType.choices,  # ✅ VALIDATED!
        verbose_name="Τύπος"
    )
```

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Foundation (1-2 μέρες)
✅ **Βήμα 1.1:** Create `BalanceCalculationService` class
✅ **Βήμα 1.2:** Implement `calculate_historical_balance()` βασισμένο στην BalanceTransferService logic
✅ **Βήμα 1.3:** Implement `calculate_current_balance()`
✅ **Βήμα 1.4:** Implement `update_apartment_balance()`

### Phase 2: Migration (2-3 μέρες)
✅ **Βήμα 2.1:** Refactor CommonExpenseCalculator να χρησιμοποιεί το νέο service
✅ **Βήμα 2.2:** Refactor CommonExpenseDistributor να χρησιμοποιεί το νέο service
✅ **Βήμα 2.3:** Refactor BalanceTransferService να χρησιμοποιεί το νέο service
✅ **Βήμα 2.4:** Delete duplicate `_get_historical_balance()` functions

### Phase 3: Signal Optimization (1 μέρα)
✅ **Βήμα 3.1:** Remove Payment signal (keep only Transaction signal)
✅ **Βήμα 3.2:** Update Transaction signal να χρησιμοποιεί το νέο service
✅ **Βήμα 3.3:** Add signal guards (avoid infinite loops)

### Phase 4: Validation (1 μέρα)
✅ **Βήμα 4.1:** Add TransactionType choices to model
✅ **Βήμα 4.2:** Create migration για existing data
✅ **Βήμα 4.3:** Update all code να χρησιμοποιεί TransactionType.choices

### Phase 5: Date Consistency (1-2 μέρες)
✅ **Βήμα 5.1:** Implement date normalization στο BalanceCalculationService
✅ **Βήμα 5.2:** (Optional) Create migration Expense.date → DateTimeField
✅ **Βήμα 5.3:** (Optional) Create migration Payment.date → DateTimeField

### Phase 6: Testing & Verification (2-3 μέρες)
✅ **Βήμα 6.1:** Comprehensive unit tests για BalanceCalculationService
✅ **Βήμα 6.2:** Integration tests για signals
✅ **Βήμα 6.3:** Verification script για όλα τα apartments
✅ **Βήμα 6.4:** Regression testing με production data

---

## 🧪 TESTING STRATEGY

### Unit Tests
```python
# tests/test_balance_calculation_service.py
class TestBalanceCalculationService:
    def test_calculate_historical_balance_basic(self):
        """Test basic historical balance calculation"""
        pass

    def test_calculate_historical_balance_with_management_fees(self):
        """Test with management fees inclusion"""
        pass

    def test_calculate_historical_balance_timezone_edge_cases(self):
        """Test DateField/DateTimeField edge cases"""
        pass

    def test_transaction_type_validation(self):
        """Test TransactionType.is_charge() and is_payment()"""
        pass
```

### Integration Tests
```python
# tests/test_balance_signals.py
class TestBalanceSignals:
    def test_payment_creates_transaction_and_updates_balance(self):
        """Ensure Payment → Transaction → Balance update works"""
        pass

    def test_expense_creates_transactions_and_updates_balances(self):
        """Ensure Expense → Transactions → Balances update works"""
        pass

    def test_no_duplicate_balance_updates(self):
        """Ensure no double processing"""
        pass
```

### Verification Script
```python
# verify_balance_consistency.py
def verify_all_apartments():
    """Verify all apartment balances match calculation"""
    apartments = Apartment.objects.filter(building_id=1)

    for apartment in apartments:
        stored = apartment.current_balance
        calculated = BalanceCalculationService.calculate_current_balance(apartment)

        if abs(stored - calculated) > Decimal('0.01'):
            print(f"❌ {apartment.number}: {stored} ≠ {calculated}")
        else:
            print(f"✅ {apartment.number}: {stored} = {calculated}")
```

---

## 🚀 ROLLOUT STRATEGY

### Step 1: Development Branch
```bash
git checkout -b feature/unified-balance-calculation
```

### Step 2: Implement με Backward Compatibility
- Δημιουργία νέου service **χωρίς** διαγραφή παλιού code
- Παλιές functions καλούν το νέο service internally
- Έτσι δεν σπάει τίποτα

### Step 3: Gradual Migration
- Week 1: Create service + tests
- Week 2: Migrate calculators να χρησιμοποιούν το νέο service
- Week 3: Optimize signals
- Week 4: Cleanup παλιού code

### Step 4: Production Deployment
- Deploy σε staging environment
- Run verification script
- Monitor για 1 εβδομάδα
- Deploy σε production

---

## 📊 EXPECTED BENEFITS

### Immediate Benefits
✅ **Μία κεντρική function** για balance calculation
✅ **Μείωση code duplication** κατά ~60%
✅ **Transaction type validation** (αποφυγή typos)
✅ **Consistent date handling** (timezone-safe)

### Long-term Benefits
✅ **Ευκολότερη maintenance** (ένα σημείο αλλαγών)
✅ **Λιγότερα bugs** (validated types, tested logic)
✅ **Καλύτερη performance** (όχι διπλοί υπολογισμοί)
✅ **Comprehensive testing** (unit + integration tests)

### Risk Mitigation
✅ **Backward compatible** migration
✅ **Incremental rollout** (δεν αλλάζει όλα μαζί)
✅ **Verification scripts** (έλεγχος consistency)
✅ **Rollback plan** (git revert αν χρειαστεί)

---

## 🎯 SUCCESS CRITERIA

Το refactoring θα θεωρηθεί επιτυχημένο όταν:

1. ✅ **Μία και μόνο μία** balance calculation function υπάρχει
2. ✅ **Όλα τα tests** περνάνε (100% pass rate)
3. ✅ **Verification script** δείχνει 0 inconsistencies
4. ✅ **Production data** επαληθεύεται σωστή
5. ✅ **Δεν υπάρχουν duplicate** balance calculations
6. ✅ **Transaction types** είναι validated
7. ✅ **Date/DateTime** handling είναι consistent

---

## 📝 NEXT STEPS

**Άμεση ενέργεια:**
1. Review αυτού του proposal
2. Approval για implementation
3. Δημιουργία feature branch
4. Start Phase 1 implementation

**Questions να απαντηθούν:**
- Προτιμάς Λύση 1 (normalize dates) ή Λύση 2 (migration) για Date/DateTime?
- Θέλεις gradual rollout (4 weeks) ή aggressive (2 weeks)?
- Υπάρχουν specific test cases που θέλεις να προστεθούν;

---

*Document Version: 1.0*
*Created: 2025-10-03*
*Status: **PENDING APPROVAL***
