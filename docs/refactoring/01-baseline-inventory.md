# Baseline Inventory (Current State)

Date: 2026-02-05

## Scope
This baseline captures the current production‑relevant implementation for:
- Online Payments vs Financial Ledger
- Debt/Aging reporting
- Kiosk/Public Info privacy + QR onboarding
- Scheduling/automation for notifications
- Auth/Tenancy foundations

Everything below is referenced to concrete file paths and endpoints found in the repo.

---

## Tenancy & Routing

Backend
- Tenant models: `backend/tenants/models.py` (`Client`, `Domain`).
- Tenancy settings: `backend/new_concierge_backend/settings/base.py` (`TENANT_MODEL`, `TENANT_DOMAIN_MODEL`, `DATABASE_ROUTERS`, `PUBLIC_SCHEMA_URLCONF`).
- Tenant resolution middleware: `backend/core/middleware.py` (`CustomTenantMiddleware` using `X-Tenant-Host` / `X-Forwarded-Host`).
- Tenant access enforcement: `backend/core/cross_schema_auth.py` (`TenantAccessMiddleware`).

Frontend
- API proxy headers for tenant routing: `public-app/src/app/api/_utils/tenantProxy.ts` and `public-app/src/app/backend-proxy/[...path]/route.ts`.

---

## Auth (JWT + CSRF)

Backend
- JWT auth: `backend/new_concierge_backend/settings/base.py` (`REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES = JWTAuthentication`).
- Token endpoints: `backend/users/urls.py`
  - `POST /api/users/token/`
  - `POST /api/users/token/refresh/`
  - `POST /api/users/token/simple/`
- CSRF cookie endpoint: `backend/core/urls.py` + `backend/core/views.py` (`GET /api/csrf/`).
- Cross‑schema authentication: `backend/core/cross_schema_auth.py`.

Frontend
- Token storage + refresh flow: `public-app/src/lib/api.ts` (reads/writes `localStorage`, refresh on 401).
- CSRF fetch: `public-app/src/hooks/useCsrf.ts`, `public-app/src/hooks/useEnsureCsrf.ts`.

---

## P0.1 Online Payments → Financial Ledger

Current systems (parallel)
- Online payments domain (Stripe charges):
  - Models: `backend/online_payments/models.py` (`Charge`, `PaymentAttempt`, `Payment`, `ManualPayment`, `PayeeSettings`).
  - Endpoints: `backend/online_payments/urls.py`
    - `GET/POST /api/online-payments/charges/`
    - `GET/PATCH /api/online-payments/charges/<uuid>/`
    - `POST /api/online-payments/charges/<uuid>/mark-paid/`
    - `POST /api/online-payments/checkout/`
    - `GET /api/online-payments/payments/my/`
    - `GET /api/online-payments/payments/building/`
    - `GET /api/online-payments/reconciliation/summary/`
    - `GET /api/online-payments/exports/reconciliation.csv`
    - `GET/PUT /api/online-payments/settings/payee/`
  - Stripe webhook (public schema): `backend/online_payments_public/urls.py` + `backend/online_payments_public/views.py`
    - `POST /api/webhooks/stripe/`
    - Creates `online_payments.Payment`, updates `Charge.status`.

- Financial ledger domain:
  - Models: `backend/financial/models.py` (`Payment`, `Transaction`, `FinancialReceipt`, `MonthlyBalance`).
  - Endpoints: `backend/financial/urls.py`
    - `GET/POST/PATCH/DELETE /api/financial/payments/`
    - `GET/POST/PATCH/DELETE /api/financial/receipts/`
    - `GET /api/financial/receipts/by_payment/`
    - `GET /api/financial/receipts/receipt_types/`
  - Audit log: `backend/financial/audit.py` (`FinancialAuditLog`, `AuditMiddleware`).

Frontend
- Online payments UI: `public-app/src/app/(dashboard)/online-payments/page.tsx`.
- Financial receipts UI hook: `public-app/src/hooks/useReceipts.ts`.

Baseline gap
- No explicit mapping table or sync from `online_payments` to `financial` models exists in repo.

---

## P0.2 Debt Report / Aging

Backend
- Building-level balances: `backend/financial/services.py` (`FinancialDashboardService.get_apartment_balances`).
- Endpoint: `GET /api/financial/dashboard/apartment_balances/` in `backend/financial/views.py`.
- Office-level “Top Debtors” with days overdue:
  - Service: `backend/office_analytics/services.py` (`get_top_debtors` computes `days_overdue`).
  - Endpoint: `GET /api/office-analytics/top-debtors/` and `GET /api/office-analytics/dashboard/` in `backend/office_analytics/urls.py`.

Frontend
- Building financial debt UI: `public-app/src/components/financial/ApartmentOverviewIntegrated.tsx` and `public-app/src/components/financial/ApartmentBalances.tsx`.
- Office dashboard debt UI: `public-app/src/components/office-dashboard/TopDebtorsCard.tsx` + `public-app/src/hooks/useOfficeDashboard.ts`.
- Missing endpoint call in frontend: `public-app/src/hooks/useFinancialDashboard.ts` calls `/financial/dashboard/debt-report/` which does not exist in backend.

---

## P0.3 Kiosk / Public Info Privacy + QR

Backend
- Public info endpoint (AllowAny): `backend/public_info/views.py` + `backend/public_info/urls.py`.
  - `GET /api/public-info/<building_id>/`
- Kiosk endpoints: `backend/kiosk/urls.py` + `backend/kiosk/views.py`
  - `GET /api/kiosk/public/configs/`
  - `GET /api/kiosk/public/scenes/`
  - `GET /api/kiosk/public/configs/get_by_building/`
  - `POST /api/kiosk/register/` and `/api/kiosk/connect/` (same view)
- Kiosk registration logic: `backend/kiosk/views.py` (`kiosk_register`).

Frontend
- Kiosk display route: `public-app/src/app/kiosk-display/page.tsx`.
- Kiosk data hook uses public info: `public-app/src/hooks/useKioskData.ts`.
- Public info proxy sanitization: `public-app/src/app/api/public-info/[buildingId]/route.ts`.
- QR generation on client: `public-app/src/components/kiosk/widgets/QRCodeWidget.tsx`.
- Kiosk connect page: `public-app/src/app/kiosk/connect/page.tsx`.

Baseline gap
- QR token is generated client‑side and validated only by building_id in backend (`validate_kiosk_token` in `backend/kiosk/views.py`).
- Privacy masking is done in frontend proxy (`public-app/src/app/api/public-info/[buildingId]/route.ts`), not enforced in backend `public_info` view.

---

## P0.4 Scheduling/Automation

Backend
- Notifications tasks: `backend/notifications/tasks.py`.
- Monthly notification task model: `backend/notifications/models.py` (`MonthlyNotificationTask`).
- Debt reminder endpoints: `backend/notifications/views.py` (`send_debt_reminders`).
- Celery settings: `backend/new_concierge_backend/settings/base.py` (default `CELERY_TASK_ALWAYS_EAGER=True`).
- Cron guidance only: `backend/new_concierge_backend/AUTOMATED_CRON_JOBS.md`.

Frontend
- Monthly tasks UI: `public-app/src/components/notifications/MonthlyTasksManager.tsx`.

Baseline gap
- No repo‑level production runner configuration (Celery beat/worker or cron) is present; tasks run eagerly by default when triggered.

---

## Feature Flags (requested by refactor)

Search results
- No occurrences found for:
  - `ENABLE_LEDGER_SYNC`
  - `ENABLE_KIOSK_SIGNED_QR`
  - `ENABLE_CELERY_BEAT`
  - `ENABLE_SECURE_PUBLIC_INFO`

Search command used: `rg -n "ENABLE_LEDGER_SYNC|ENABLE_KIOSK_SIGNED_QR|ENABLE_CELERY_BEAT|ENABLE_SECURE_PUBLIC_INFO" -S`

---

## Relevant Settings & Env Schema

- Backend settings: `backend/new_concierge_backend/settings/base.py`
  - `STRIPE_*`, `VAPID_*`, `MAILERSEND_*`, CORS/CSRF settings.
- Env schema: `env.schema.example` and `backend/env.example`.

---

## Current Risks (Evidence‑based)

- Dual source of truth for payments (online vs ledger) with no mapping table or sync logic present.
- Frontend calls a missing debt report endpoint (`/financial/dashboard/debt-report/`).
- Kiosk QR tokens are client‑generated and only validated by building id; privacy enforcement is frontend‑side.
- Notifications scheduling depends on eager tasks unless external runner is configured.

