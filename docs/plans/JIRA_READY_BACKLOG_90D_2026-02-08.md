# Jira-Ready Backlog (90 Days)
**Window:** 09 Feb 2026 - 08 May 2026  
**Scope:** Collections OS, Hyper-Bulk Ops, Vote-to-Execution, Vendor Portal, Security/Compliance, Observability, Performance

## 1) Team & Capacity Assumptions
- BE: 2 engineers
- FE: 2 engineers
- QA: 1 engineer
- DevOps: 1 engineer (part-time)
- Product/Design: 1 owner
- Sprint length: 2 weeks
- Target capacity: 42-48 SP per sprint (team total)

## 2) Jira Setup (Project Metadata)
Use these labels/components from day 1:
- Components: `collections`, `bulk-ops`, `vote-automation`, `vendor-portal`, `security`, `observability`, `performance`, `payments`, `financial`, `notifications`, `office-analytics`
- Labels: `tenant-aware`, `feature-flag`, `idempotent`, `audit-trace`, `slo-kpi`
- Custom fields:
1. `Flag Name` (text)
2. `API Contract` (link/text)
3. `Tenant Scope` (enum: `global`, `building`, `apartment`)
4. `Rollback Plan` (text)
5. `KPI Impact` (text)

## 3) Epic List
1. `EPIC-A` Collections OS
2. `EPIC-B` Hyper-Bulk Operations
3. `EPIC-C` Vote-to-Execution Automation
4. `EPIC-D` Vendor & Procurement Portal
5. `EPIC-E` Security/Compliance Hardening
6. `EPIC-F` Observability & SLO
7. `EPIC-G` Performance & Scalability

## 4) Sprint Plan

### Sprint 1 (09 Feb - 20 Feb 2026)
**Goal:** Architecture freeze, data contracts, flags, observability baseline, perf baseline

1. `NC-101` (Story, 5 SP, BE) Collections domain RFC + API contracts  
Depends on: none  
AC:
- Approved data model for `DunningPolicy`, `DunningRun`, `DunningEvent`, `PromiseToPay`
- OpenAPI draft for `/api/collections/*`
- Backward-compatibility notes with `financial/debt-report`

2. `NC-102` (Story, 5 SP, BE) Bulk Ops domain RFC + dry-run contract  
Depends on: none  
AC:
- Approved model for `BulkJob`, `BulkJobItem`, `BulkTemplate`, `BulkJobError`
- Dry-run response schema includes `preview_diff`, `validation_errors`, `estimated_impact`

3. `NC-103` (Story, 3 SP, BE) Feature flag matrix implementation  
Depends on: none  
AC:
- Flags in settings/env:
  - `ENABLE_COLLECTIONS_OS`
  - `ENABLE_BULK_OPS`
  - `ENABLE_VOTE_AUTOMATION`
  - `ENABLE_VENDOR_PORTAL`
  - `ENABLE_HTTPONLY_AUTH`
  - `ENABLE_SLO_METRICS`
- Flags documented in `env.schema.example` and `backend/env.example`

4. `NC-104` (Story, 5 SP, DevOps) Observability baseline  
Depends on: none  
AC:
- Metrics emitted for:
  - webhook processing latency
  - dashboard overview latency
  - reminder delivery success/failure
  - bulk job duration/failure
- Dashboard panel with p50/p95 for key endpoints

5. `NC-105` (Story, 5 SP, BE) Collections app scaffold + migrations v1  
Depends on: `NC-101`, `NC-103`  
AC:
- New app `collections` with migrations for core entities
- Tenant-safe model constraints and indexes
- Basic admin registration

6. `NC-106` (Story, 3 SP, FE) Collections/Bulk navigation placeholders  
Depends on: `NC-101`, `NC-102`  
AC:
- Add routes:
  - `public-app/src/app/(dashboard)/office-finance/collections/page.tsx`
  - `public-app/src/app/(dashboard)/office-finance/bulk-center/page.tsx`
- Feature-flag aware visibility in sidebar

7. `NC-107` (Story, 5 SP, BE+FE) Performance baseline runbook  
Depends on: none  
AC:
- Baseline measurements for:
  - `/financial/dashboard/overview/`
  - `/financial/dashboard/summary/`
  - `/financial/dashboard/apartment_balances/`
- Store baseline in `docs/performance/baseline-2026-02.md`

8. `NC-108` (Story, 3 SP, QA) Test strategy pack for 90-day program  
Depends on: none  
AC:
- Test matrix per epic (unit/integration/e2e)
- Risk-based test priorities

---

### Sprint 2 (23 Feb - 06 Mar 2026)
**Goal:** Collections OS v1 backend + scheduler + initial UI

1. `NC-201` (Story, 8 SP, BE) Collections policy engine core  
Depends on: `NC-105`  
AC:
- Bucket rules (0-30, 31-60, 61-90, 90+)
- Channel/frequency/escalation policy execution
- Idempotency key per run/apartment/channel

2. `NC-202` (Story, 5 SP, BE) Collections run executor + Celery scheduling  
Depends on: `NC-201`, `NC-103`  
AC:
- Celery task for policy runs
- Retry with backoff and dead-letter status
- `ENABLE_CELERY_BEAT` integration

3. `NC-203` (Story, 5 SP, BE) Collections APIs v1  
Depends on: `NC-201`  
AC:
- `/api/collections/policies/` CRUD
- `/api/collections/runs/` list/detail/trigger
- `/api/collections/promises/` CRUD
- Tenant/building permissions enforced

4. `NC-204` (Story, 3 SP, BE) Notifications integration  
Depends on: `NC-203`  
AC:
- Collections run can dispatch through existing notification channels
- Delivery events linked to `DunningEvent`

5. `NC-205` (Story, 5 SP, FE) Collections queue UI v1  
Depends on: `NC-203`  
AC:
- Queue table with statuses and retries
- Filters by bucket/status/building
- Run detail drawer with event timeline

6. `NC-206` (Story, 3 SP, FE) Promise-to-pay UI v1  
Depends on: `NC-203`  
AC:
- Create/update Promise-to-Pay
- Promise state transitions (active/kept/broken)

7. `NC-207` (Story, 5 SP, QA) Collections E2E happy path  
Depends on: `NC-205`, `NC-206`  
AC:
- Scenario: overdue apartment -> policy run -> notifications -> promise-to-pay -> resolution

---

### Sprint 3 (09 Mar - 20 Mar 2026)
**Goal:** Bulk Ops v1 (dry-run/execute/retry) + office dashboard widgets

1. `NC-301` (Story, 8 SP, BE) Bulk engine core with dry-run  
Depends on: `NC-102`, `NC-103`  
AC:
- Bulk action types: common-expense issue, recurring expenses, reminders, export
- Dry-run required before execute
- Validation and preview diff persisted

2. `NC-302` (Story, 5 SP, BE) Bulk APIs v1  
Depends on: `NC-301`  
AC:
- `/api/office-ops/bulk/jobs/`
- `/api/office-ops/bulk/templates/`
- `/api/office-ops/bulk/jobs/{id}/retry/`
- Idempotency on execute/retry

3. `NC-303` (Story, 3 SP, BE) Bulk audit log + trace id  
Depends on: `NC-301`  
AC:
- Every bulk job/item writes audit event
- Trace id visible in API/UI

4. `NC-304` (Story, 5 SP, FE) Bulk Center UI v1  
Depends on: `NC-302`  
AC:
- Wizard: Select scope -> Dry-run -> Execute
- Error list with item-level retry

5. `NC-305` (Story, 3 SP, FE) Office dashboard bulk widgets  
Depends on: `NC-302`  
AC:
- Widgets for active jobs, failures, avg completion time

6. `NC-306` (Story, 5 SP, QA) Bulk E2E idempotency suite  
Depends on: `NC-304`  
AC:
- Repeated execute does not duplicate effects
- Retry affects only failed items

---

### Sprint 4 (23 Mar - 03 Apr 2026)
**Goal:** Vote automation + vendor procurement core flow

1. `NC-401` (Story, 5 SP, BE) `VoteAutomationRule` model + CRUD API  
Depends on: `EPIC-C` start  
AC:
- Rule per building with threshold, assignee, SLA defaults

2. `NC-402` (Story, 8 SP, BE) Vote result trigger -> Todo/Project/WorkOrder  
Depends on: `NC-401`  
AC:
- Automatic action on approved vote
- Idempotency key to prevent double execution
- Audit chain vote->task->project

3. `NC-403` (Story, 5 SP, FE) Vote automation settings UI  
Depends on: `NC-401`  
AC:
- Create/edit rules and preview expected actions

4. `NC-404` (Story, 8 SP, BE) Vendor profile expansion + scoring model  
Depends on: `EPIC-D` start  
AC:
- Supplier SLA/certification/performance fields
- KPI aggregation (response time, overrun, quality)

5. `NC-405` (Story, 5 SP, FE) Tender pipeline + Preferred Vendors UI  
Depends on: `NC-404`  
AC:
- Compare offers table
- Vendor KPI cards

6. `NC-406` (Story, 5 SP, QA) Vote-to-execution and vendor flow E2E  
Depends on: `NC-402`, `NC-405`  
AC:
- End-to-end flow with approvals and completion proof

---

### Sprint 5 (06 Apr - 17 Apr 2026)
**Goal:** Security hardening, auth migration, tenant/public hardening

1. `NC-501` (Story, 8 SP, BE+FE) HttpOnly auth migration  
Depends on: `EPIC-E` start  
AC:
- Refresh token moved to HttpOnly cookie
- Rotation and invalidation implemented
- Backward-compatible phased rollout via `ENABLE_HTTPONLY_AUTH`

2. `NC-502` (Story, 5 SP, BE) Public endpoints signed-token hardening  
Depends on: `NC-103`  
AC:
- Signed tokens for high-risk public routes
- Strict tenant scope checks

3. `NC-503` (Story, 3 SP, BE) Rate-limit and abuse controls tuning  
Depends on: none  
AC:
- Policy documented and applied for public and auth-sensitive endpoints

4. `NC-504` (Story, 5 SP, DevOps) Security observability  
Depends on: `NC-104`  
AC:
- Dashboards for auth failures, suspicious patterns, token errors

5. `NC-505` (Story, 5 SP, QA) Security regression suite  
Depends on: `NC-501`, `NC-502`  
AC:
- Auth flow and tenant isolation negative tests

---

### Sprint 6 (20 Apr - 01 May 2026)
**Goal:** UAT + pilot rollout (3-5 tenants) + fixes

1. `NC-601` (Story, 5 SP, Product+QA) Pilot tenant selection + rollout checklist  
2. `NC-602` (Story, 8 SP, BE+FE) UAT bug-fix wave #1  
3. `NC-603` (Story, 5 SP, BE+FE) UAT bug-fix wave #2  
4. `NC-604` (Story, 3 SP, DevOps) Canary release and rollback drills  
5. `NC-605` (Story, 3 SP, QA) KPI instrumentation validation

---

### Sprint 7 (04 May - 08 May 2026)
**Goal:** Production rollout + KPI validation + stabilization

1. `NC-701` (Story, 3 SP, DevOps) Production cutover runbook execution  
2. `NC-702` (Story, 5 SP, BE+FE) Hypercare fixes (P1/P2)  
3. `NC-703` (Story, 3 SP, Data/Analytics) KPI scorecard publication  
4. `NC-704` (Story, 2 SP, Product) Post-mortem + next-quarter roadmap handoff

## 5) Cross-Cutting NFR Tickets (run in parallel)
1. `NC-NFR-01` Endpoint p95 budget guardrails
2. `NC-NFR-02` Idempotency contract tests for every mutating bulk/automation endpoint
3. `NC-NFR-03` Audit trace completeness checker (nightly)
4. `NC-NFR-04` Tenant-isolation security tests in CI
5. `NC-NFR-05` Performance smoke on `dashboard` and `financial` critical paths

## 6) KPI Mapping to Jira
- `Collection rate +12%`: `EPIC-A` (`NC-201..207`)
- `Manager time -35%`: `EPIC-B` (`NC-301..306`) + `EPIC-G`
- `Reconciliation mismatches <0.2%`: `EPIC-A` + `EPIC-F`
- `Vote-to-task <5 min`: `EPIC-C` (`NC-401..406`)
- `Vendor SLA breaches -25%`: `EPIC-D` (`NC-404..406`)

## 7) Definition of Done (Enforced)
1. Unit tests + API integration tests + 1 E2E happy path per story group
2. Feature-flag gated release with documented rollback
3. Audit event + trace id for each financial side effect
4. Idempotency validated for retries/replays
5. SLO metric visible in monitoring dashboard before production enablement
