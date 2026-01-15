# 📘 Financial SSoT Refactor Plan

**Σκοπός:** Δομικό refactoring των οικονομικών με Single Source of Truth (SSoT), ώστε να εξαλειφθούν αποκλίσεις, διπλές λογικές και ασαφείς ροές.

**Κατάσταση:** Draft (D1/D2/D3 κλειδωμένα)

---

## 1) Στόχοι

- Μία ενιαία πηγή αλήθειας για κάθε οικονομικό μέγεθος (μήνα, διαμέρισμα, σύνοψη, εξαγωγές).
- Εξάλειψη διπλο-υπολογισμών και fallback λογικών.
- Συνεπείς ορισμοί (π.χ. τι είναι “δαπάνες μήνα”, “παλαιότερες οφειλές”).
- Ανιχνεύσιμες αποκλίσεις με αυτοματοποιημένους ελέγχους.
- Καθαρή δομή, εύκολος έλεγχος/συντήρηση, ασφαλής εξέλιξη.

## 2) Non-goals (εκτός scope)

- UI redesign.
- Νέες επιχειρησιακές λειτουργίες (π.χ. νέες κατηγορίες δαπανών).
- Μεταβολές επιχειρησιακών κανόνων χωρίς απόφαση.

## 3) Κρίσιμες αποφάσεις (SSoT)

**D1: Canonical Ledger**
- ✅ **Απόφαση:** Επιλογή A — **Expense** ως canonical για χρεώσεις (management/reserve/scheduled) και **Transaction** μόνο ως audit/event log.
- Σημείωση: Μη εξοφλημένες δαπάνες εμφανίζονται ως **οφειλή** έως την πληρωμή.

**D2: Monthly Snapshot**
- ✅ **Απόφαση:** **MonthlyBalanceService** ως αποκλειστική πηγή για όλες τις monthly summaries (καθαρή μηνιαία εικόνα).

**D3: Historical Balance**
- **BalanceCalculationService** ως αποκλειστική πηγή για per‑apartment ιστορικά υπόλοιπα.
- ✅ **Backfill εύρος:** Από `financial_system_start_date` (1η του μήνα που ορίζεται/παράγεται).
- Σημείωση: Αν το πεδίο είναι κενό, ορίζεται αυτόματα με την 1η του μήνα της πρώτης δαπάνης.

**Επιβεβαίωση απαιτείται** πριν το Phase 2.

## 4) SSoT Boundaries (Single Source by Domain)

| Domain | Single Source | Κατανάλωση |
|---|---|---|
| Monthly snapshot | MonthlyBalanceService | Summary API, exports, UI totals |
| Apartment historical balance | BalanceCalculationService | Previous balances, net obligations |
| Charge creation | Canonical ledger (D1) | Management/reserve/maintenance |
| Expense breakdown | Expense records (canonical) | Αναλύσεις/ομαδοποιήσεις |

## 5) Canonical Data Contract (Ορισμοί)

### 5.1 MonthlyBalance (canonical)

- `total_expenses` = sum(Expense.amount) για μήνα **εξαιρώντας** management_fees & reserve_fund.
- `management_fees` = sum(χρεώσεις διαχείρισης) για μήνα (canonical από D1).
- `reserve_fund_amount` = sum(εισφοράς αποθεματικού) για μήνα (canonical από D1).
- `scheduled_maintenance_amount` = sum(PaymentInstallment.amount) για μήνα.
- `previous_obligations` = `carry_forward` προηγούμενου μήνα.
- `total_obligations` = total_expenses + management_fees + reserve_fund_amount + scheduled_maintenance_amount + previous_obligations.
- `carry_forward` = max(0, total_obligations - total_payments).

### 5.2 Dashboard Summary (canonical view)

- `current_month_expenses` = total_obligations - previous_obligations.
- `total_expenses_month` = total_expenses (όπως 5.1).
- `reserve_fund_contribution` = reserve_fund_amount.
- `total_management_cost` = management_fees.
- `previous_obligations` = previous_obligations.
- `current_reserve` = total_payments_all_time - total_expenses_all_time (σύμφωνα με agreed rule).

### 5.3 Apartment Balances (canonical view)

- `previous_balance` = μερίδιο `previous_obligations` (ή BalanceCalculationService στο month_start).
- `current_expenses` = μερίδιο τρέχοντος μήνα (σε resident/owner breakdown).
- `net_obligation` = previous_balance + current_expenses - month_payments.
- `resident_expenses` / `owner_expenses` = μόνο τρέχοντος μήνα.

### 5.4 Sign Conventions

- Όλα τα totals εκφράζονται ως **θετικά ποσά υποχρεώσεων**.
- `Apartment.current_balance` πρέπει να ακολουθεί **σταθερό** convention (θετικό = χρέος ή το αντίθετο) και να αποτυπώνεται στο contract.
- **financial_system_start_date**: baseline εκκίνησης οικονομικού συστήματος (1η του μήνα). Από εδώ και μετά “χτίζεται” η οικονομική πορεία.

## 6) Invariants (αυτόματοι έλεγχοι)

- **I1:** sum(apartment.current_expenses) == current_month_expenses (±0.01).
- **I2:** sum(apartment.previous_balance) == previous_obligations (±0.01).
- **I3:** total_obligations == total_expenses + management_fees + reserve_fund + scheduled_maintenance + previous_obligations.
- **I4:** previous_obligations(month N) == carry_forward(month N‑1).
- **I5:** No double counting of management/reserve across Expense/Transaction.

## 7) Φάσεις Υλοποίησης

### Phase 0 — Baseline & Safety
- Καταγραφή όλων των endpoints που επιστρέφουν οικονομικά.
- Διαγνωστικό report ανά κτίριο/μήνα (πριν αλλαγές).
- “Shadow” checks χωρίς αλλαγή συμπεριφοράς.

### Phase 1 — SSoT Contract & Tests
- Καταγραφή “Financial Data Contract” σε docs.
- Tests για invariants (unit + integration).
- Σημεία logs για αποκλίσεις.

### Phase 2 — Backend Consolidation
- ✅ `FinancialDashboardService` διαβάζει μόνο από `MonthlyBalanceService` για month summary.
- ✅ `get_apartment_balances` βασίζεται στο `BalanceCalculationService` για previous balances (month snapshot).
- ⏳ Αφαίρεση legacy fallback υπολογισμών (υπόλοιπα στο Phase 3).

### Phase 3 — Ledger Unification (D1)
- ✅ Expense-only για management/reserve charges (χωρίς transaction fallback).
- ✅ MonthlyChargeService υποστηρίζει reserve_contribution_per_apartment.
- ⏳ Κατάργηση λοιπών legacy ροών σε Expense/Transaction όπου υπάρχουν.

### Phase 4 — Frontend Alignment
- Κατάργηση τοπικών recomputations/fallbacks.
- Εξαγωγές (PDF/JPG/Excel) να βασίζονται στο same payload.
- UI validations να δείχνουν μόνο data-contract mismatch.

### Phase 5 — Verification & Rollout
- Regression tests + integrity suite.
- Staged rollout (feature flag ή tenant-by-tenant).
- Παρακολούθηση αποκλίσεων, rollback plan.

## 8) Απομάκρυνση “μπερδεμένων” διαδικασιών

- Αφαίρεση οποιουδήποτε υπολογισμού summary που δεν περνά από MonthlyBalanceService.
- Αφαίρεση management/reserve fallback σε πολλαπλά σημεία.
- Κατάργηση παλιών scripts ή duplicated calculation paths.

## 9) Παραδοτέα

- `docs/plans/FINANCIAL_SSoT_REFACTOR_PLAN.md` (this).
- `docs/reports/FINANCIAL_DATA_CONTRACT.md` (SSoT definitions & examples).
- Test suite: `backend/financial/tests/test_ssot_invariants.py`.
- Optional: `backend/financial/management/commands/verify_financial_integrity.py`.

---

## ✅ Next Steps

- Ξεκινάμε Phase 1 (data contract + invariants tests) και Phase 2 (backend consolidation).
