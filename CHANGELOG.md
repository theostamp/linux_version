# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Change Set 1: Feature Flags + Refactor Scaffolding
- Added feature flags (`ENABLE_LEDGER_SYNC`, `ENABLE_KIOSK_SIGNED_QR`, `ENABLE_CELERY_BEAT`, `ENABLE_SECURE_PUBLIC_INFO`) and env schema entries.

### Change Set 2: Ledger Sync Mapping + Audit Trail (Online Payments)
- Added mapping model `OnlinePaymentLedgerLink` and audit log `OnlinePaymentAuditLog`.
- Manual mark‑paid now records audit entries.

### Change Set 3: Webhook‑Driven Ledger Sync (Idempotent)
- Stripe webhook now triggers idempotent ledger sync behind `ENABLE_LEDGER_SYNC`.
- Added ledger sync service and unit tests for idempotency.

### Change Set 4: Reconciliation Report (Charges vs Ledger)
- Added `GET /api/online-payments/reconciliation/ledger/` endpoint for mismatch reporting.

### Change Set 5: Debt Report + Aging Buckets
- Implemented `/api/financial/dashboard/debt-report/` with aging buckets.
- Added debt aging bucket tests.

### Change Set 6: Secure Public Info + Signed QR
- Added signed kiosk QR tokens and backend sanitization for public info (flag‑gated).
- Added kiosk audit log model and public endpoint throttling.
- Frontend now requests kiosk token and forwards it to public‑info.

### Change Set 7: Scheduling/Automation Runner
- Added Celery beat heartbeat task and status endpoint.
- Added optional docker-compose services for Celery worker/beat.

### Change Set 8: Auth + Permission Hardening
- Added HttpOnly refresh-cookie support for auth flows (login, token, OAuth, invitations, free tenant).
- Token refresh now accepts refresh token from cookie; logout clears cookie.
- Frontend prefers cookie-based refresh and avoids storing refresh tokens when cookie is set.
- Added CSP headers and in-memory access token handling when refresh cookies are enabled.
- Announcements read endpoints require auth when `ENABLE_SECURE_PUBLIC_INFO=true` and enforce building scoping.

### Change Set 9: Vote → Task Pipeline
- Added `POST /api/votes/{id}/create-task/` to create (idempotently) a TodoItem linked to the vote.
- Added minimal UI action on vote detail page for managers/internal managers.
- Added vote task creation tests.

### Change Set 10: Public Endpoint Throttling
- Added `KioskPublicThrottle` to public vote results endpoint.
- Added `KioskPublicThrottle` to apartment personal endpoints.
