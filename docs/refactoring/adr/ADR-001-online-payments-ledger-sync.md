# ADR-001: Online Payments → Ledger Sync Strategy

Date: 2026-02-05  
Status: Accepted

## Context
- Payments are split between `online_payments` (Stripe charges/checkout) and `financial` (ledger, receipts).  
- Stripe webhook handler: `backend/online_payments_public/views.py` (`/api/webhooks/stripe/`).  
- Online payments models: `backend/online_payments/models.py` (`Charge`, `PaymentAttempt`, `Payment`, `ManualPayment`).  
- Ledger models: `backend/financial/models.py` (`Payment`, `FinancialReceipt`, `Transaction`).  
- UI uses both: `/online-payments` fetches `/api/online-payments/charges/` and `/api/financial/my-apartment/` in `public-app/src/app/(dashboard)/online-payments/page.tsx`.

Problem: dual sources of truth and no idempotent linkage between Stripe events and ledger records.

## Options
1. **Webhook‑driven ledger write (idempotent)**  
   - On Stripe webhook, write/update `financial.Payment` and optionally `FinancialReceipt`.  
   - Maintain a mapping table (e.g., `OnlinePaymentLedgerLink`) to enforce idempotency.  
   - Feature‑flag with `ENABLE_LEDGER_SYNC`.
2. **Batch reconciliation job only**  
   - Keep Stripe and ledger separate, reconcile via scheduled job; no immediate ledger write.
3. **Frontend‑driven ledger write**  
   - Client calls backend to “confirm” payment and then writes ledger.

## Decision
Adopt **Option 1: webhook‑driven ledger write with idempotent mapping**.

## Consequences
- **Pros**: single source of truth (ledger), immediate consistency after Stripe success, idempotent by design, auditability.  
- **Cons**: requires additive schema (mapping table), careful idempotency on webhook retry, and audit logging for sync events.  
- **Mitigations**: feature flag `ENABLE_LEDGER_SYNC`; store raw webhook event and use event id to dedupe; reconciliation endpoint for drift detection.

## References
- `backend/online_payments_public/urls.py` (`/api/webhooks/stripe/`)  
- `backend/online_payments_public/views.py` (webhook handler)  
- `backend/online_payments/models.py` (charge/payment models)  
- `backend/financial/models.py` (ledger models)
