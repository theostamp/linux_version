# Refactoring Overview

Date: 2026-02-05
Owner: Principal Engineer / Refactoring Lead

## Goals (P0 → P2)

**P0 — Must‑have πριν από production rollout**
1. **Online Payments → Financial Ledger (single source of truth)**
2. **Debt Report / Aging endpoint** (fix missing endpoint)
3. **Kiosk/Public Info privacy + Signed QR** (backend‑enforced)
4. **Scheduling/Automation** (Celery beat ή cron)

**P1 — Σημαντικά**
1. **Auth hardening** (reduce XSS risk)
2. **Permissions hardening** (tighten AllowAny)
3. **Decision → Task pipeline** (vote → task linking)

**P2 — Nice‑to‑have**
1. **UX clarity** (ledger vs online charges)
2. **Observability** (webhook failure alerts, retries)

## Scope
- Backend: Django + DRF + django‑tenants
- Frontend: Next.js App Router
- DB: Postgres
- Infra: docker‑compose, Celery, Stripe

## Non‑Goals
- Re‑architecting tenant model
- Breaking API changes
- Removing existing endpoints without compatibility

## Risks
- Dual sources of truth for payments
- Public info leakage if backend sanitization is missing
- Scheduling not actually running in production

## Safety Strategy
- Feature flags for all high‑risk changes:
  - `ENABLE_LEDGER_SYNC`
  - `ENABLE_KIOSK_SIGNED_QR`
  - `ENABLE_SECURE_PUBLIC_INFO`
  - `ENABLE_CELERY_BEAT`
- Additive migrations only
- Idempotent processing for all webhook/event flows
- Deploy in small, independent change sets

## Deliverables
- Baseline inventory and 30/60/90 plan
- ADRs for critical decisions
- QA checklist and release notes
- ChangeLog entries per change set
