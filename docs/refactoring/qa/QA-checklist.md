# QA Checklist (Manual)

Date: 2026-02-05

## Preconditions
- Backend running with tenant headers (`X-Tenant-Host`).
- Stripe test keys configured (`STRIPE_*`).
- Feature flags set as needed:
  - `ENABLE_LEDGER_SYNC`
  - `ENABLE_KIOSK_SIGNED_QR`
  - `ENABLE_SECURE_PUBLIC_INFO`
  - `ENABLE_CELERY_BEAT`
- Test tenant/building seeded with at least 1 apartment and a resident user.

## P0.1 Online Payments → Ledger Sync
1. Create a charge (manager):
   - POST `/api/online-payments/charges/` (check in admin UI or API).
2. Start checkout (resident):
   - UI: `/online-payments` → “Pay” button → POST `/api/online-payments/checkout/`.
3. Complete Stripe checkout (test card) → webhook hits `/api/webhooks/stripe/`.
4. Verify ledger payment created:
   - GET `/api/financial/payments/` for the building; confirm new `financial.Payment`.
   - Verify mapping record exists (link table) and no duplicates on webhook retry.
5. Reconciliation:
   - GET `/api/online-payments/reconciliation/summary/` and new drift endpoint (if added) to verify counts.

## P0.2 Debt Report / Aging
1. Open office financial dashboard:
   - UI route: `/financial` (manager view) → load debt report widget.
2. Call endpoint directly:
   - GET `/api/financial/dashboard/debt-report/`.
3. Validate buckets:
   - Ensure `0-30`, `31-60`, `61-90`, `90+` reflect `days_overdue` based on last payment date.
4. CSV export (if enabled):
   - GET `/api/financial/dashboard/debt-report.csv`.

## P0.3 Kiosk/Public Info Privacy + Signed QR
1. Request a signed QR token:
   - UI: `/kiosk/connect` or kiosk management page generates token from backend endpoint.
2. Validate token usage:
   - Use token to call `/api/kiosk/connect/` and verify success.
   - Try expired/forged token → expect 400/403.
3. Public info sanitization:
   - GET `/api/public-info/<building_id>/` without token → verify only aggregates (no apartment numbers/PII).
   - With valid kiosk token → verify expanded data if allowed.
4. Rate limiting:
   - Rapid calls to `/api/kiosk/connect/` should return throttled response.

## P0.4 Scheduling/Automation
1. Ensure Celery worker + beat running.
2. Check health endpoint for scheduler:
   - GET `/api/notifications/health/` (or equivalent) shows last run status.
3. Trigger task manually:
   - POST `/api/notifications/notifications/send_debt_reminders/` and confirm delivery.
4. Verify scheduled runs:
   - Confirm `MonthlyNotificationTask` entries updated after scheduled run.

## P1 Decision → Task Pipeline
1. Open a vote detail page as manager/internal manager.
2. Click “Create task”.
3. Verify a Todo item appears in `/calendar` or `/todos`.
4. Click “Create task” again and confirm no duplicate is created.

## P1 Auth/Permissions Hardening (if enabled)
1. Verify refresh token storage change (HttpOnly or CSP fallback).
2. Login via `/api/users/token/simple/` or `/api/users/login/` and confirm `Set-Cookie` for `refresh_token`.
3. Clear `refresh_token` from localStorage and call `/api/users/token/refresh/` with cookies; ensure a new access token is issued.
4. Attempt access to previously `AllowAny` endpoints without token; verify expected denial (except kiosk/public with valid token).
5. With refresh cookies enabled, verify `localStorage` does not contain `access_token`.

## Public Endpoint Throttling
1. Call `/api/votes/public/{id}/results` repeatedly; expect 429 after burst.
2. Call apartment personal endpoints repeatedly; expect 429 after burst.

## Regression Smoke
- Basic login/logout.
- `/dashboard`, `/financial`, `/online-payments`, `/kiosk-display` load without errors.
- API proxy routes in `public-app/src/app/api/*` still forward correctly.
