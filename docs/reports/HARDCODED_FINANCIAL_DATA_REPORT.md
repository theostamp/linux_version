# Αναφορά Hardcoded Δεδομένων στα Financials

**Ημερομηνία:** 2025-10-08
**Σκοπός:** Εντοπισμός όλων των hardcoded ποσών και ημερομηνιών στα financial modules

---

## 📊 ΣΥΝΟΨΗ

### Κατηγορίες Hardcoded Δεδομένων:
1. **Ποσά σε Production Code** (Backend Models & Services)
2. **Ποσά σε Test/Debug Scripts**
3. **Ημερομηνίες σε Production Code**
4. **Ημερομηνίες σε Test/Debug Scripts**
5. **Default Values σε Database Migrations**
6. **Frontend Hardcoded Data**

---

## 🔴 ΚΡΙΣΙΜΑ: Production Code Hardcoded Values

### 1. Backend Models - Default Values

#### `/backend/buildings/models.py`

| Γραμμή | Field | Hardcoded Value | Σχόλια |
|--------|-------|-----------------|--------|
| 171 | `heating_fixed_percentage` | **30** | Default ποσοστό παγίου θέρμανσης (30%) |
| 180 | `reserve_contribution_per_apartment` | **0.0** | Default εισφορά αποθεματικού |
| 189 | `reserve_fund_goal` | **0** | Default στόχος αποθεματικού |
| 197 | `reserve_fund_duration_months` | **0** | Default διάρκεια συλλογής |
| 234 | `management_fee_per_apartment` | **Decimal('0.00')** | Default αμοιβή διαχείρισης |
| 241 | `grace_day_of_month` | **15** | Default ημέρα έναρξης οφειλής (15η του μήνα) |

#### Σημαντικές Παρατηρήσεις:
- ✅ Τα περισσότερα defaults είναι **0** (ουδέτερα)
- ⚠️ **heating_fixed_percentage = 30%** - Hardcoded επιχειρηματική λογική
- ⚠️ **grace_day_of_month = 15** - Hardcoded business rule

---

### 2. Database Migrations - Default Values

#### `/backend/buildings/migrations/0008_building_heating_fixed_percentage_and_more.py`
```python
# Line 16
default=30.0  # Ποσοστό Παγίου Θέρμανσης

# Line 21
default=5.0   # Πάγια Εισφορά Αποθεματικού ανά Διαμέρισμα
```

#### `/backend/buildings/migrations/0009_building_management_fee_per_apartment.py`
```python
# Line 16
default=15.0  # Μηνιαία αμοιβή διαχείρισης ανά διαμέρισμα
```

**⚠️ ΠΡΟΣΟΧΗ:** Τα migration defaults διαφέρουν από τα model defaults!
- Migration: `management_fee = 15.0€`
- Current Model: `management_fee = 0.00€`

---

### 3. Backend Services - Business Logic Amounts

#### `/backend/financial/balance_service.py`

| Γραμμή | Τιμή | Περιγραφή |
|--------|------|-----------|
| 277 | **Decimal('100.00')** | Threshold για warning σε balance changes |
| 315 | **Decimal('0.01')** | Tolerance για balance consistency check |

#### `/backend/financial/services.py`

| Γραμμή | Τιμή | Περιγραφή |
|--------|------|-----------|
| 2255 | `Decimal('100')` | Division για percentage conversion |
| 2258 | `Decimal('100')` | Division για percentage conversion |

**Σημείωση:** Αυτά τα 100 χρησιμοποιούνται για μετατροπές ποσοστών (π.χ. 30% → 30/100)

---

### 4. Frontend - Hardcoded Data

#### `/frontend/components/financial/ServicePackageModal.tsx`

```typescript
// Line 50-71: Hardcoded τιμές για service packages
- Βασικές Υπηρεσίες: 2.50-4.00€
- Επεκταμένες Υπηρεσίες: 1.00-3.00€
- Premium Υπηρεσίες: 1.50-4.00€
- Ειδικές Υπηρεσίες: 2.00-5.00€
```

#### `/frontend/components/financial/FinancialSearch.tsx`

```typescript
// Lines 128, 138: Hardcoded test dates
date: '2024-08-01'
date: '2024-08-05'
```

---

## 🟡 ΜΕΤΡΙΑ ΠΡΟΤΕΡΑΙΟΤΗΤΑ: Test & Debug Scripts

### Test Data - Hardcoded Amounts

#### `/backend/financial_audit_step2_test_data.py`
```python
# Line 95
amount=Decimal('1000.00')  # Test expense

# Line 110
amount=Decimal('500.00')   # Test payment

# Line 126
amount=Decimal('250.00')   # Test transaction

# Line 150
base_amount = Decimal('150.00')  # Βασικό ποσό ανά διαμέρισμα

# Line 156
reserve_fund_amount=Decimal('25.00')  # Test reserve fund
```

#### `/backend/simple_financial_analysis.py`
```python
# Lines 160, 164, 167-171
monthly_per_apt = Decimal('334.85') / apartments.count()
target = Decimal('334.85')
```

**⚠️ ΚΡΙΣΙΜΟ:** Το ποσό **334.85€** εμφανίζεται πολλές φορές ως "target amount"

#### Άλλα Scripts με 334.85€:
- `/backend/auto_issued_financial_analysis.py:181`
- `/backend/financial_report_arachovis12.py:231`
- `/backend/financial_analysis_arachovis.py:273, 304`

---

### Test Data - Hardcoded Dates

#### `/backend/financial_audit_step7_comprehensive_analysis.py`
```python
# Line 103
month_end = date(2025, 1, 1) - timedelta(days=1)

# Line 137
end_date_2023 = date(2023, 12, 31)

# Line 141
end_date_jan_2024 = date(2024, 1, 31)

# Line 145
end_date_may_2024 = date(2024, 5, 31)
```

#### `/backend/financial_audit_step6_balance_transfer_analysis.py`
```python
# Line 74
end_date_2023 = date(2023, 12, 31)

# Line 80
end_date_jan_2024 = date(2024, 1, 31)

# Line 86
end_date_feb_2024 = date(2024, 2, 29)  # 2024 είναι leap year

# Lines 98-99
jan_start = date(2024, 1, 1)
jan_end = date(2024, 1, 31)

# Lines 111-112
feb_start = date(2024, 2, 1)
feb_end = date(2024, 2, 29)
```

#### `/backend/debug_financial_status.py`
```python
# Line 25
current_month = date(2025, 10, 1)

# Line 88
date__lt=date(2025, 10, 1)
```

#### `/backend/verify_financial_flow.py`
```python
# Lines 77-78
period_start_date='2025-06-01'
period_end_date='2025-06-30'

# Lines 92-93
period_start_date='2025-07-01'
period_end_date='2025-07-31'
```

---

## 🟢 ΧΑΜΗΛΗ ΠΡΟΤΕΡΑΙΟΤΗΤΑ: Test Files

### Financial Test Files - Hardcoded Dates

Τα test files περιέχουν **πολλές** hardcoded ημερομηνίες για testing purposes:

#### `/backend/financial/tests/test_advanced_calculator.py`
- Lines 86-477: Πολλαπλές ημερομηνίες το 2025-08

#### `/backend/financial/tests/test_balance_transfer_logic.py`
- Lines 32-216: Test dates στο 2025-10, 2025-11, 2025-12

#### `/backend/financial/tests/test_balance_service.py`
- Lines 46-390: Test dates με datetime και date objects

#### Test Files με Hardcoded Amounts:
```python
# /backend/financial/tests/test_unified_receipts.py
amount=100  # Line 26
amount=50   # Line 53
amount=10   # Line 82
```

---

## 📋 ΕΙΔΙΚΕΣ ΠΕΡΙΠΤΩΣΕΙΣ

### 1. "Magic Number" - Decimal('100.00')

**Τοποθεσία:** `/backend/financial/balance_service.py:277`

```python
if abs(new_balance - old_balance) > Decimal('100.00'):
    # Trigger warning for large balance changes
```

**Σκοπός:** Threshold για ειδοποίηση μεγάλων αλλαγών υπολοίπου

**Πρόταση:** Μετατροπή σε configuration setting

---

### 2. Mills Distribution - Expected Total = 1000

**Τοποθεσία:** `/backend/financial/management/commands/fix_mills_distribution.py:65`

```python
expected_total = 1000
```

**Σημείωση:** Το 1000 είναι το σύστημα χιλιοστών (mills), όχι currency

---

### 3. Tolerance Value - Decimal('0.01')

**Τοποθεσία:** Multiple locations για float comparison

```python
# Balance consistency check
is_consistent = abs(difference) < Decimal('0.01')

# Balance discrepancy check
if abs(stored_balance - calculated_balance) > Decimal('0.01'):
```

**Σημείωση:** Standard tolerance για decimal comparisons (1 cent)

---

## 🎯 ΣΥΣΤΑΣΕΙΣ

### Υψηλής Προτεραιότητας:

1. **Migration Defaults vs Model Defaults**
   - ⚠️ Διόρθωση ασυνέπειας: Migration έχει `management_fee=15.0` αλλά Model έχει `0.00`
   - Απαιτεί data migration για existing records

2. **Hardcoded Business Rules**
   - `heating_fixed_percentage = 30%` → Πρέπει να είναι configurable
   - `grace_day_of_month = 15` → Πρέπει να είναι configurable per building

3. **Frontend Service Package Prices**
   - Μετακίνηση σε database-driven configuration
   - Δημιουργία admin interface για τιμές πακέτων

4. **Balance Threshold (100.00€)**
   - Μετατροπή σε system setting με default value

### Μεσαίας Προτεραιότητας:

1. **Test Data με 334.85€**
   - Φαίνεται να είναι specific test case για building "Αραχώβης 12"
   - Καλό να γίνει parameterized στα tests

2. **Test Dates**
   - Χρήση relative dates αντί για hardcoded (π.χ. `today()`, `relativedelta()`)

### Χαμηλής Προτεραιότητας:

1. **Decimal('0.00') και Decimal('0.0')**
   - Είναι αποδεκτά ως initialization values
   - Δεν χρειάζεται αλλαγή

2. **Decimal('0.01') tolerance**
   - Standard practice για currency comparisons
   - Μπορεί να μείνει hardcoded

---

## 📍 ΣΥΝΟΠΤΙΚΟΣ ΠΙΝΑΚΑΣ ΚΡΙΣΙΜΩΝ HARDCODED VALUES

| Τιμή | Αρχείο | Γραμμή | Προτεραιότητα | Πρόταση |
|------|---------|--------|---------------|---------|
| 30% | buildings/models.py | 171 | 🔴 Υψηλή | Configuration setting |
| 15 (ημέρα) | buildings/models.py | 241 | 🔴 Υψηλή | Configuration setting |
| 15.0€ | migrations/0009_*.py | 16 | 🔴 Υψηλή | Fix migration inconsistency |
| 100.00€ | balance_service.py | 277 | 🟡 Μέση | System setting |
| 2.50-5.00€ | ServicePackageModal.tsx | 50-71 | 🔴 Υψηλή | Database-driven |
| 334.85€ | Multiple test files | Various | 🟡 Μέση | Parameterize tests |
| 0.01€ | Multiple | Various | 🟢 Χαμηλή | OK as tolerance |

---

## 📌 ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ

1. **Άμεση δράση:**
   - Διόρθωση migration inconsistency για management_fee
   - Review και documentation για 30% heating default
   - Review για grace_day_of_month=15

2. **Μεσοπρόθεσμα:**
   - Refactoring frontend service packages → database
   - Configuration για balance threshold (100€)
   - Parameterization test dates

3. **Μακροπρόθεσμα:**
   - Δημιουργία comprehensive configuration system
   - Admin UI για όλα τα business rules
   - Migration strategy για existing data

---

**Τέλος Αναφοράς**
