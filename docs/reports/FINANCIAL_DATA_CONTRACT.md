# Financial Data Contract (SSoT)

**Version:** 0.1 (SSoT rollout)

**Σκοπός:** Ενιαίοι ορισμοί, πηγές αλήθειας, και μαθηματικές σχέσεις για όλα τα οικονομικά μεγέθη. Αυτό το contract είναι το μοναδικό σημείο αναφοράς για backend, frontend, exports, και tests.

---

## 1) Αποφάσεις SSoT

- **Canonical charges ledger:** `Expense` (D1)
- **Monthly snapshot:** `MonthlyBalanceService` (D2)
- **Historical apartment balance:** `BalanceCalculationService` (D3)
- **Backfill baseline:** `financial_system_start_date` (1η του μήνα, default: 1η του μήνα της πρώτης δαπάνης)

---

## 2) Χρονικές Περίοδοι

- **Monthly window:** `[month_start, month_end)` (inclusive start, exclusive end)
- **Current month snapshot:** `[month_start, today)` (exclude future‑dated expenses)
- **Backfill:** από `financial_system_start_date` και μετά

---

## 3) Οντότητες & Ρόλοι

### 3.1 Expense (Canonical charge)
- Εκφράζει **υποχρέωση** (accrual), όχι πληρωμή.
- Κατηγορίες `management_fees` και `reserve_fund` είναι **κανονικές χρεώσεις**.
- Μη εξοφλημένες δαπάνες εμφανίζονται ως **οφειλή**.

### 3.2 Payment (Cash inflow)
- Εκφράζει **εισπράξεις**.
- Χρησιμοποιείται για κάλυψη οφειλών και υπολογισμό `total_payments`.

### 3.3 Transaction (Event log)
- Είναι **audit/event log**, όχι canonical source για χρεώσεις.
- Μπορεί να κρατά historical movements/receipts, αλλά δεν καθορίζει totals.

### 3.4 MonthlyBalance (Canonical monthly snapshot)
- Παράγεται αποκλειστικά από `MonthlyBalanceService`.
- Είναι το SSoT για κάθε monthly summary.

---

## 4) Canonical Definitions

### 4.1 MonthlyBalance Fields

- `total_expenses`
  - `sum(Expense.amount)` για τον μήνα **εξαιρώντας** `management_fees` & `reserve_fund`.

- `management_fees`
  - `sum(Expense.amount where category='management_fees')` για τον μήνα.

- `reserve_fund_amount`
  - `sum(Expense.amount where category='reserve_fund')` για τον μήνα.

- `scheduled_maintenance_amount`
  - `sum(PaymentInstallment.amount)` για τον μήνα.

- `previous_obligations`
  - `carry_forward` του προηγούμενου μήνα.

- `total_obligations`
  - `total_expenses + management_fees + reserve_fund_amount + scheduled_maintenance_amount + previous_obligations`

- `total_payments`
  - `sum(Payment.amount)` για τον μήνα.

- `carry_forward`
  - `max(0, total_obligations - total_payments)`

### 4.2 Summary API (Canonical view)

- `current_month_expenses`
  - `total_obligations - previous_obligations`

- `total_expenses_month`
  - = `total_expenses`

- `reserve_fund_contribution`
  - = `reserve_fund_amount`

- `total_management_cost`
  - = `management_fees`

- `previous_obligations`
  - = `previous_obligations`

- `current_reserve`
  - `total_payments_all_time - total_expenses_all_time` (excludes future‑dated expenses)

### 4.3 Apartment Balances (Canonical view)

- `previous_balance`
  - μερίδιο `previous_obligations` ή `BalanceCalculationService(apartment, month_start)`

- `current_expenses`
  - μερίδιο τρέχοντος μήνα (resident/owner split)

- `net_obligation`
  - `previous_balance + current_expenses - month_payments`

- `resident_expenses` / `owner_expenses`
  - μόνο τρέχοντος μήνα

---

## 5) Sign Conventions

**Confirmed SSoT convention:**
- **Θετικό = οφειλή**, **αρνητικό = πίστωση**.

> Σημείωση: Κατά τη μετάβαση, οπουδήποτε υπάρχουν αποκλίσεις (π.χ. legacy negative debt) εφαρμόζουμε adapter μετατροπή πριν από SSoT υπολογισμούς.

---

## 6) Invariants (Automated Checks)

- **I1:** `sum(apartment.current_expenses) == current_month_expenses` (±0.01)
- **I2:** `sum(apartment.previous_balance) == previous_obligations` (±0.01)
- **I3:** `total_obligations == total_expenses + management_fees + reserve_fund + scheduled_maintenance + previous_obligations`
- **I4:** `previous_obligations(month N) == carry_forward(month N‑1)`
- **I5:** No double counting of `management_fees` / `reserve_fund` across Expense/Transaction

---

## 7) Known Transition Rules

- `financial_system_start_date` is the **baseline**. No calculations before it.
- Current month uses `[month_start, today)` window (excludes future expenses).
- Any legacy calculations outside these rules are deprecated.
- Management/reserve charges are **Expense-only**. Transaction-based charges are ignored by monthly snapshots.

---

## 8) Examples (Pseudo‑formula)

```text
monthly_obligations = total_expenses + management_fees + reserve_fund + scheduled_maintenance + previous_obligations
current_month_expenses = monthly_obligations - previous_obligations
carry_forward = max(0, monthly_obligations - total_payments)
net_obligation(apartment) = previous_balance + current_expenses - month_payments
```

---

## 9) Change Control

- Any modification to this contract requires:
  - Update to `MonthlyBalanceService` and `BalanceCalculationService`
  - Updated invariants tests
  - Explicit approval
