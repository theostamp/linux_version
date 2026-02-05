# Release Notes (Refactoring Hardening)

Date: 2026-02-05

## Summary
This release focuses on production hardening: payment ledger sync, debt aging report, kiosk privacy + signed QR, and real scheduling.

## Feature Flags
- `ENABLE_LEDGER_SYNC`: enables Stripe webhook → ledger sync with idempotency.
- `ENABLE_KIOSK_SIGNED_QR`: enables server‑issued signed QR tokens.
- `ENABLE_SECURE_PUBLIC_INFO`: enforces backend sanitization for public info.
- `ENABLE_CELERY_BEAT`: enables scheduled notification tasks.

## Notable Changes (Implemented)
- Online payments map to financial ledger via idempotent link table (flag‑gated).
- Debt report endpoint with aging buckets available at `/api/financial/dashboard/debt-report/`.
- Kiosk/public info responses are sanitized in backend; signed QR tokens enabled via feature flag.
- Scheduling via Celery beat; health endpoint added for task runner.
- Auth hardening: refresh tokens now set in HttpOnly cookies; refresh endpoint accepts cookie fallback.
- Auth hardening: CSP headers added and access tokens prefer in‑memory storage when refresh cookies are enabled.
- Vote → task pipeline: managers can create an idempotent TodoItem from a vote.
- Permissions hardening: announcements read endpoints require auth when `ENABLE_SECURE_PUBLIC_INFO=true` and apply building scoping.
- Public endpoints throttled for vote results and apartment personal kiosks.

## Backward Compatibility
- Additive migrations only.
- Existing endpoints remain; new endpoints are added and old ones deprecated only after compatibility window.

## Operational Notes
- Ensure Redis/Celery worker + beat are running if `ENABLE_CELERY_BEAT=true`.
- Configure Stripe webhook secret and keys.
- Review public info privacy requirements before enabling `ENABLE_SECURE_PUBLIC_INFO`.
- Configure refresh cookie domain (`REFRESH_COOKIE_DOMAIN`) for cross‑subdomain flows if needed.

## Rollback Guidance
- Disable feature flags to revert to previous behavior:
  - `ENABLE_LEDGER_SYNC=false`
  - `ENABLE_KIOSK_SIGNED_QR=false`
  - `ENABLE_SECURE_PUBLIC_INFO=false`
  - `ENABLE_CELERY_BEAT=false`
