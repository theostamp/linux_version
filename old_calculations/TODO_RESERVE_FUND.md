# Reserve Fund - Notes (January 2025)

## UI/Exports Alignment
- Added visible column «ΑΠΟΘΕΜΑΤΙΚΟ» in the per-apartment table before «ΠΛΗΡΩΤΕΟ ΠΟΣΟ»
- Per-apartment reserve: monthly_amount × (participation_mills / 1000)
- Only applied when there are other expenses in the period (heating/elevator/other/coownership)
- Totals row shows the monthly reserve total (or 0 when not applicable)

## Validation
- Validation totals use the same logic as display: reserve included only when other expenses exist

## Excel Export
- Added columns: «ΠΟΣΟ_ΔΙΑΧΕΙΡΙΣΗ_ΕΝΟΙΚΙΑΣΤΩΝ», «ΑΠΟΘΕΜΑΤΙΚΟ»
- «ΠΛΗΡΩΤΕΟ_ΠΟΣΟ» includes management + reserve + other tenant expenses

## Next Steps
- Include reserve details in PDF export table
- Add toggle to include/exclude reserve for special periods
- Persist reserve inclusion rule in backend snapshot for audit

# TODO: Αποθεματικό (Reserve Fund) - Building Management System

## 📋 Επισκόπηση
Το αποθεματικό είναι ένα κρίσιμο τμήμα του οικονομικού συστήματος που επιτρέπει στα κτίρια να μαζεύουν χρήματα για μελλοντικές δαπάνες και επισκευές.

## 🏗️ Αρχιτεκτονική

### Backend (Django)

#### Models
- **`backend/buildings/models.py`**
  - `Building` model με πεδία αποθεματικού:
    - `reserve_contribution_per_apartment` (Decimal) - Μηνιαία εισφορά ανά διαμέρισμα
    - `reserve_fund_goal` (Decimal) - Στόχος αποθεματικού
    - `reserve_fund_duration_months` (Integer) - Διάρκεια σε μήνες
    - `reserve_fund_start_date` (Date) - Ημερομηνία έναρξης
    - `reserve_fund_target_date` (Date) - Ημερομηνία ολοκλήρωσης

- **`backend/financial/models.py`**
  - `Payment` model με πεδία:
    - `payment_type` - Περιλαμβάνει 'reserve_fund' ως επιλογή
    - `reserve_fund_amount` (Decimal) - Ποσό αποθεματικού στην πληρωμή
  - `Transaction` model - Για παρακολούθηση κινήσεων

#### Services
- **`backend/financial/services.py`**
  - `FinancialDashboardService`:
    - `get_summary()` - Επιστρέφει δεδομένα αποθεματικού
    - `_calculate_reserve_fund_contribution()` - Υπολογίζει εισφορά αποθεματικού
  - `AdvancedCommonExpenseCalculator`:
    - `_calculate_actual_reserve_collected()` - Υπολογίζει πραγματικά μαζεμένα χρήματα
    - `calculate_advanced_shares()` - Επιστρέφει δεδομένα για το modal

#### Serializers
- **`backend/buildings/serializers.py`**
  - `BuildingSerializer` - Περιλαμβάνει πεδία αποθεματικού
- **`backend/financial/serializers.py`**
  - `FinancialSummarySerializer` - Περιλαμβάνει δεδομένα αποθεματικού

#### Views
- **`backend/financial/views.py`**
  - `FinancialDashboardViewSet` - API για οικονομικό σύνοψη
  - `CommonExpenseCalculationViewSet` - API για υπολογισμούς

### Frontend (Next.js/React)

#### Components
- **`frontend/components/financial/calculator/CommonExpenseModal.tsx`**
  - `getReserveFundInfo()` - Υπολογίζει δεδομένα για εμφάνιση
  - Εμφάνιση προόδου αποθεματικού με progress bar
  - Δεδομένα: Μηνιαία Εισφορά, Στόχος, Διάρκεια, Συνολική Εισφορά, Μήνες Απομένουν, Μαζεμένα Χρήματα, Πρόοδος

- **`frontend/components/financial/calculator/ResultsStep.tsx`**
  - Περνάει δεδομένα αποθεματικού στο modal
  - Χρησιμοποιεί `useEffect` για υπολογισμούς

- **`frontend/components/financial/FinancialPage.tsx`**
  - Parent component που συνδέει όλα τα τμήματα
  - Περνάει `reserveFundMonthlyAmount` και `activeBuildingId`

- **`frontend/components/financial/calculator/BuildingOverviewSection.tsx`**
  - `fetchFinancialSummary()` - Καλεί API για δεδομένα αποθεματικού
  - `onReserveFundAmountChange` - Callback για αλλαγές

#### Hooks
- **`frontend/hooks/useApartmentsWithFinancialData.ts`**
  - `api.get(/buildings/list/${buildingId}/)` - Φορτώνει δεδομένα κτιρίου
  - Περιλαμβάνει ρυθμίσεις αποθεματικού

#### API Integration
- **`frontend/lib/api.ts`**
  - `makeRequestWithRetry()` - Για API calls
  - Endpoints:
    - `/financial/dashboard/summary/` - Οικονομικό σύνοψη
    - `/buildings/list/${buildingId}/` - Δεδομένα κτιρίου
    - `/financial/calculate-advanced-shares/` - Υπολογισμοί

## 🔄 Data Flow

### 1. Backend Data Flow
```
Building Model → FinancialDashboardService → AdvancedCommonExpenseCalculator → API Response
```

### 2. Frontend Data Flow
```
API Response → useApartmentsWithFinancialData → BuildingOverviewSection → ResultsStep → CommonExpenseModal
```

### 3. Reserve Fund Calculation Flow
```
Payment Model (reserve_fund) → _calculate_actual_reserve_collected() → actual_reserve_collected → Modal Display
```

## 📊 Δεδομένα που Εμφανίζονται

### Στο Modal "Φύλλο Κοινοχρήστων"
- **Μηνιαία Εισφορά**: `reserveFundGoal / reserveFundDuration`
- **Στόχος**: `reserveFundGoal` (από building settings)
- **Διάρκεια**: `reserveFundDuration` (από building settings)
- **Συνολική Εισφορά**: `reserveFundGoal` (ο στόχος)
- **Μήνες Απομένουν**: Υπολογίζεται από start_date και duration
- **Μαζεμένα Χρήματα**: `actualReserveCollected` (μόνο reserve fund payments)
- **Πρόοδος**: `(actualReserveCollected / reserveFundGoal) * 100`

## 🧪 Test Scripts

### Backend Tests
- **`test_reserve_fund_modal_data.py`** - Ελέγχει δεδομένα modal
- **`check_all_buildings_reserve.py`** - Ελέγχει όλα τα κτίρια
- **`update_alkmanos_reserve.py`** - Ενημερώνει δεδομένα κτιρίου
- **`test_alkmanos_modal.py`** - Ελέγχει modal μετά ενημέρωση
- **`test_actual_reserve.py`** - Ελέγχει πραγματικά μαζεμένα χρήματα

### Docker Commands
```bash
# Copy test script to container
docker cp script.py linux_version-backend-1:/app/

# Run test inside container
docker exec -it linux_version-backend-1 python script.py

# Restart backend if needed
docker-compose restart backend
```

## 🔧 Βασικές Λειτουργίες

### 1. Υπολογισμός Εισφοράς Αποθεματικού
```python
# Backend
monthly_amount = reserve_fund_goal / reserve_fund_duration
```

### 2. Υπολογισμός Πραγματικών Μαζεμένων Χρημάτων
```python
# Backend
reserve_payments = Payment.objects.filter(
    apartment__building_id=building_id,
    payment_type='reserve_fund',
    amount__gt=0
)
total_collected = reserve_payments.aggregate(total=Sum('amount'))
```

### 3. Υπολογισμός Προόδου
```javascript
// Frontend
progressPercentage = (actualReserveCollected / reserveFundGoal) * 100
```

## 🎯 Κλειδιά Χαρακτηριστικά

### ✅ Υλοποιημένα
- [x] Διαχώριση αποθεματικού από οφειλές
- [x] Υπολογισμός πραγματικών μαζεμένων χρημάτων
- [x] Εμφάνιση προόδου με progress bar
- [x] Υπολογισμός μηνών που απομένουν
- [x] API integration για όλα τα δεδομένα
- [x] Test scripts για επαλήθευση

### 🔄 Τρέχουσες Βελτιώσεις
- [x] Διόρθωση υπολογισμού "Συνολική Εισφορά"
- [x] Προσθήκη πεδίων αποθεματικού στα serializers
- [x] Δημιουργία `_calculate_actual_reserve_collected()` method
- [x] Ενημέρωση frontend για χρήση πραγματικών δεδομένων

## 📝 Σημειώσεις Ανάπτυξης

### Backend Guidelines
- Πάντα χρησιμοποιήστε `django_tenants.utils.schema_context` για multi-tenancy
- Εκτελέστε scripts μέσα στο Docker container
- Χρησιμοποιήστε `Decimal` για οικονομικούς υπολογισμούς
- Ελέγξτε tenant isolation για όλες τις queries

### Frontend Guidelines
- Χρησιμοποιήστε `formatAmount()` για εμφάνιση ποσών
- Ελέγξτε για `null/undefined` πριν από υπολογισμούς
- Χρησιμοποιήστε `useMemo` για βαρείς υπολογισμούς
- Εφαρμόστε proper error handling

### Database Guidelines
- Όλες οι database operations μέσα στο Docker container
- Χρησιμοποιήστε migrations για schema changes
- Ελέγξτε indexes για performance
- Test tenant isolation thoroughly

## 🚀 Επόμενα Βήματα

### Προτεινόμενες Βελτιώσεις
- [ ] Προσθήκη notifications για προσεγγίζοντα στόχους
- [ ] Εξαγωγή reports αποθεματικού
- [ ] Προσθήκη charts για προοδικότητα
- [ ] Email notifications για εισπράξεις αποθεματικού
- [ ] Dashboard widgets για αποθεματικό

### Performance Optimizations
- [ ] Caching για συχνά χρησιμοποιούμενα δεδομένα
- [ ] Database query optimization
- [ ] Frontend lazy loading για μεγάλα datasets
- [ ] API response compression

### Testing Enhancements
- [ ] Unit tests για όλες τις methods
- [ ] Integration tests για API endpoints
- [ ] E2E tests για user workflows
- [ ] Performance tests για μεγάλα datasets

---

**Τελευταία Ενημέρωση**: 2025-08-17
**Κατάσταση**: ✅ Λειτουργικό - Όλες οι βασικές λειτουργίες υλοποιημένες
**Επόμενο Review**: Μετά από user testing
