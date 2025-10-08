# BALANCE ARCHITECTURE - CURRENT vs PROPOSED

---

## 🔴 CURRENT ARCHITECTURE (Προβληματική)

```
┌─────────────────────────────────────────────────────────────────┐
│                       BALANCE CALCULATION                        │
│                    (Multiple Implementations)                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
        ┌────────────────────────┴────────────────────────┐
        │                                                  │
        ▼                                                  ▼
┌───────────────────┐                            ┌───────────────────┐
│ CommonExpense     │                            │ CommonExpense     │
│ Calculator        │                            │ Distributor       │
│                   │                            │                   │
│ Line 53:          │                            │ Line 2207:        │
│ _get_historical   │ ◄─── 100% DUPLICATE! ────► │ _get_historical   │
│ _balance()        │                            │ _balance()        │
│                   │                            │                   │
│ ❌ BUGS:          │                            │ ❌ BUGS:          │
│ • apartment_number│                            │ • apartment_number│
│ • Double payment  │                            │ • Double payment  │
│ • No system_start │                            │ • No system_start │
└───────────────────┘                            └───────────────────┘
        │                                                  │
        └────────────────────┬─────────────────────────────┘
                             │
                             ▼
                ┌────────────────────────┐
                │ BalanceTransferService │
                │                        │
                │ Line 1142:             │
                │ _calculate_historical  │
                │ _balance()             │
                │                        │
                │ ✅ CORRECT:            │
                │ • Uses apartment FK    │
                │ • No double payment    │
                │ • Checks system_start  │
                │ • Well documented      │
                └────────────────────────┘
                             │
                             │ (Not used by others!)
                             ▼
                ┌────────────────────────┐
                │ _calculate_apartment   │
                │ _balance()             │
                │                        │
                │ Line 2817 (Legacy)     │
                │                        │
                │ ⚠️ ISSUES:             │
                │ • apartment_number     │
                │ • No date filtering    │
                └────────────────────────┘
```

### Signal Processing (Current - O(N²) Complexity!)

```
Payment Created
    │
    ▼
┌─────────────────────────┐
│ Signal: post_save       │
│ (Payment)               │
│                         │
│ 1. Create Transaction   │ ◄──┐
└─────────────────────────┘    │
    │                          │
    │ Triggers...              │
    ▼                          │
┌─────────────────────────┐    │
│ Signal: post_save       │    │
│ (Transaction)           │    │
│                         │    │
│ 2. Recalculate balance  │ ───┘ DOUBLE WORK!
│    from ALL transactions│
└─────────────────────────┘
    │
    │ Result: O(N²) complexity
    ▼
┌─────────────────────────┐
│ Apartment.current_balance│
│ Updated TWICE!           │
└─────────────────────────┘
```

---

## ✅ PROPOSED ARCHITECTURE (Ενοποιημένη)

```
┌─────────────────────────────────────────────────────────────────┐
│              BALANCE CALCULATION SERVICE                         │
│                  (Single Source of Truth)                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
        ┌────────────────────────┴────────────────────────┐
        │                                                  │
        ▼                                                  ▼
┌─────────────────────────┐                    ┌─────────────────────────┐
│ calculate_historical    │                    │ calculate_current       │
│ _balance()              │                    │ _balance()              │
│                         │                    │                         │
│ Args:                   │                    │ Args:                   │
│ • apartment: Apartment  │                    │ • apartment: Apartment  │
│ • end_date: date        │                    │                         │
│ • include_mgmt: bool    │                    │ Returns:                │
│                         │                    │ • Decimal (balance)     │
│ Returns:                │                    │                         │
│ • Decimal (balance)     │                    │ ✅ Features:            │
│                         │                    │ • From ALL transactions │
│ ✅ Features:            │                    │ • Proper type handling  │
│ • Date normalization    │                    │ • Running balance       │
│ • Timezone-safe         │                    │ • Balance adjustments   │
│ • Validated types       │                    └─────────────────────────┘
│ • System start check    │                                │
│ • No duplicates         │                                │
└─────────────────────────┘                                │
              │                                            │
              └──────────────────┬─────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ update_apartment       │
                    │ _balance()             │
                    │                        │
                    │ 1. Calculate balance   │
                    │ 2. Save to DB          │
                    │ 3. Return new balance  │
                    │                        │
                    │ Used by:               │
                    │ • Signals ✅           │
                    │ • Manual recalc ✅     │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ Apartment.current      │
                    │ _balance               │
                    │                        │
                    │ Single Source of Truth │
                    └────────────────────────┘
```

### Signal Processing (Proposed - O(N) Complexity)

```
Payment Created
    │
    ▼
┌─────────────────────────┐
│ Payment.save()          │
│                         │
│ Creates Transaction     │
│ (via save() method)     │
└─────────────────────────┘
    │
    │ Triggers ONLY...
    ▼
┌─────────────────────────┐
│ Signal: post_save       │
│ (Transaction)           │
│                         │
│ Calls:                  │
│ BalanceCalculationService│
│ .update_apartment_balance│
└─────────────────────────┘
    │
    │ Result: O(N) complexity - ONCE!
    ▼
┌─────────────────────────┐
│ Apartment.current_balance│
│ Updated ONCE!            │
└─────────────────────────┘
```

---

## 📊 KEY DIFFERENCES

| Feature | Current (Προβληματικό) | Proposed (Ενοποιημένο) |
|---------|----------------------|----------------------|
| **Balance Functions** | 4 διαφορετικές | 1 κεντρική |
| **Code Duplication** | 200+ lines | 0 lines |
| **Signals** | 2 (overlap) | 1 (efficient) |
| **Complexity** | O(N²) | O(N) |
| **Type Validation** | ❌ None | ✅ Full |
| **Timezone Handling** | ⚠️ Inconsistent | ✅ Normalized |
| **Testing** | ⚠️ Partial | ✅ Comprehensive |
| **Maintenance** | 🔴 Hard | ✅ Easy |
| **Bug Risk** | 🔴 High | ✅ Low |

---

## 🔄 MIGRATION PATH

### Phase 1: Create New Service (No Breaking Changes)
```python
# Create BalanceCalculationService
# Old code continues to work
```

### Phase 2: Internal Migration (Transparent)
```python
# Old functions call new service internally
def _get_historical_balance(self, apartment, end_date):
    """Deprecated: Use BalanceCalculationService instead"""
    return BalanceCalculationService.calculate_historical_balance(
        apartment, end_date
    )
```

### Phase 3: Direct Migration (Update Callers)
```python
# Before:
balance = self._get_historical_balance(apartment, date)

# After:
balance = BalanceCalculationService.calculate_historical_balance(
    apartment, date
)
```

### Phase 4: Cleanup (Remove Old Code)
```python
# Delete all deprecated functions
# Only BalanceCalculationService remains
```

---

## 🧪 TESTING STRATEGY

### Unit Tests (New Service)
```python
class TestBalanceCalculationService:
    def test_historical_balance_basic()
    def test_historical_balance_with_mgmt_fees()
    def test_historical_balance_timezone_edge_cases()
    def test_current_balance_all_types()
    def test_transaction_type_validation()
```

### Integration Tests (Signals)
```python
class TestBalanceSignals:
    def test_payment_updates_balance_once()  # Not twice!
    def test_expense_updates_all_apartments()
    def test_transaction_delete_updates_balance()
```

### Regression Tests (Production Data)
```python
class TestBalanceConsistency:
    def test_all_apartments_balance_consistent()
    def test_historical_vs_current_balance()
    def test_signal_vs_manual_calculation()
```

---

## 🎯 EXPECTED OUTCOMES

### Immediate Benefits (Week 1)
✅ Κεντρικό service για όλα τα balance calculations
✅ Comprehensive tests (unit + integration)
✅ No code duplication

### Short-term Benefits (Month 1)
✅ Simplified signal processing (no overlaps)
✅ Transaction type validation
✅ Timezone-consistent date handling

### Long-term Benefits (Quarter 1)
✅ Stable balance calculations (no recurring bugs)
✅ Easy maintenance (one place to update)
✅ Better performance (O(N) instead of O(N²))
✅ Confidence in financial data

---

## 🚀 ROLLOUT CHECKLIST

### Pre-implementation
- [ ] Review architecture proposal
- [ ] Approve refactoring plan
- [ ] Create feature branch
- [ ] Set up test environment

### Implementation
- [ ] Create BalanceCalculationService
- [ ] Write comprehensive tests
- [ ] Migrate existing code
- [ ] Simplify signals
- [ ] Add type validation
- [ ] Fix date consistency

### Verification
- [ ] All tests pass (100%)
- [ ] Verification script shows 0 discrepancies
- [ ] Performance benchmarks meet targets
- [ ] Code review approved

### Deployment
- [ ] Deploy to staging
- [ ] Monitor for 1 week
- [ ] Deploy to production
- [ ] Monitor for 1 month
- [ ] Document lessons learned

---

*Architecture Version: 2.0*
*Status: PROPOSED*
*Approval: PENDING*
