## TODO: Τεχνικά & Συντήρηση • Προσφορές & Έργα

Σκοπός: Ενοποίηση domains «Τεχνικά & Συντήρηση» και «Προσφορές & Έργα», χωρίς mocks/hardcoded δεδομένα, με πλήρη multi-tenancy, σύνδεση με την εφαρμογή TODOS (υπενθυμίσεις/ημερολόγιο), και realtime ενημερώσεις.

---

## 📚 Αρχιτεκτονική & Τεκμηρίωση - Index

### 🏗️ Production Readiness & Optimization
- **[PRODUCTION_DEPLOYMENT_CHECKLIST.md](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)** - Comprehensive production deployment checklist με infrastructure, security, performance validation
- **[backend/deployment_validator.py](./backend/deployment_validator.py)** - Automated deployment validation script για infrastructure, database, application, security checks
- **[backend/test_production_suite.py](./backend/test_production_suite.py)** - Complete production test suite με database, API, security, performance, integration tests

### ⚡ Performance & Monitoring
- **[backend/performance_analyzer.py](./backend/performance_analyzer.py)** - Database performance analyzer με slow queries detection, missing indexes analysis
- **[backend/monitoring_setup.py](./backend/monitoring_setup.py)** - Comprehensive monitoring setup με Prometheus, Grafana, alerting, structured logging
- **[backend/security_audit.py](./backend/security_audit.py)** - Security audit tool με Django settings, authentication, database, network security checks
- **[backend/security_hardening.py](./backend/security_hardening.py)** - Automated security hardening script με backup, settings optimization, rate limiting

### 🎨 Frontend Performance
- **[frontend/components/performance/LazyLoadWrapper.tsx](./frontend/components/performance/LazyLoadWrapper.tsx)** - Lazy loading wrapper με intersection observer support
- **[frontend/components/performance/PerformanceMonitor.tsx](./frontend/components/performance/PerformanceMonitor.tsx)** - Real-time performance monitoring component
- **[frontend/components/performance/CodeSplitting.tsx](./frontend/components/performance/CodeSplitting.tsx)** - Code splitting utilities για dynamic imports, role-based loading
- **[frontend/next.config.js](./frontend/next.config.js)** - Enhanced Next.js configuration με production optimizations

### 📖 API Documentation
- **[backend/api_documentation_generator.py](./backend/api_documentation_generator.py)** - OpenAPI/Swagger documentation generator

### 🔧 Database & Management Commands
- **[backend/management/commands/optimize_database.py](./backend/management/commands/optimize_database.py)** - Django management command για database optimization

### 📊 Development Planning
- **[NEXT_PHASE_DEVELOPMENT_PLAN.md](./NEXT_PHASE_DEVELOPMENT_PLAN.md)** - 16-week roadmap για Phase 2 development με infrastructure, security, advanced features

---

### Κανόνες Εργασίας (σύμφωνα με project rules)
- [ ] Όλες οι database ενέργειες μέσω Docker containers
- [ ] Ενεργοποίηση `.venv` για Python operations
- [ ] Καμία migration/DB ενέργεια εκτός Docker
- [ ] Multi-tenant context: `with schema_context('demo'):`
- [ ] JWT + DRF permissions ανά ρόλο (manager, tenant, vendor)

### Αρχιτεκτονική (σύνοψη)
- Maintenance: `MaintenanceTicket` → `WorkOrder`, με `Asset`, `Attachment`, `Comment`.
- Projects/Offers: `RFQ` → `Offer` → `Project` με `Milestone`.
- Γενικά: `Attachment`, `Comment` (generic), `TodoLink` για σύνδεση με TODOS.
- Realtime: Socket.io events σε status changes.

### Οντότητες & Καταστάσεις (σύντομη λίστα)
- MaintenanceTicket.status: open, triaged, in_progress, waiting_vendor, blocked, completed, closed, cancelled
- WorkOrder.status: scheduled, assigned, en_route, in_progress, paused, done, verified
- RFQ.status: draft, sent, received, closed
- Offer.status: received, accepted, rejected, expired
- Project.status: planned, in_progress, on_hold, completed, cancelled
- Milestone.status: pending, in_progress, awaiting_approval, approved, overdue

### Σύνδεση με TODOS
- Δημιουργία/συγχρονισμός Todo σε Ticket/WorkOrder/Milestone με due/recurrence/reminders.
- Πίνακας `TodoLink(content_type, object_id, todo_id, primary_due_at, recurrence_rule)`.
- Κλείσιμο entity ⇒ αυτόματο completion στο αντίστοιχο Todo.

---

### Εργασίες (Backlog)
- [x] [arch-01] Define architecture for Maintenance and Projects domains
- [x] [be-01-models] Design Django models for Maintenance and Projects (multi-tenant)
- [x] [be-02-api] Create DRF serializers/viewsets with permissions and filtering
- [x] [be-03-todos-integration] Integrate Maintenance/Projects with TODOS app (reminders/calendar)
- [x] [be-04-events-realtime] Add eventing/webhooks and Socket.io updates for status changes
- [x] [be-05-files] Implement file uploads/attachments for tickets, offers, projects
- [x] [db-01-migrations] Create database migrations inside Docker containers
- [x] [fe-01-remove-mocks] Replace all frontend mocks with React Query data
- [x] [fe-02-maintenance-ui] Build Next.js route groups and pages for Maintenance
- [x] [fe-03-projects-ui] Build Next.js route groups and pages for Projects/Offers
- [x] [fe-04-forms] Implement forms with RHF + Zod (tickets, RFQs, offers, milestones)
- [x] [fe-05-reports] Projects Reports with filters, exports, aggregations, drill-down
- [x] [sec-01-perms] Add role-based permissions (manager, tenant, vendor) across API/UI
- [x] [sec-02-projects-perms] DRF permissions for Projects (read auth, write admin/manager)
- [x] [sec-03-maintenance-perms] DRF permissions for Maintenance (read auth, write admin/manager)
- [x] [test-01-backend] Write unit/integration tests for backend services and endpoints
- [x] [db-02-seed] Seed demo tenant data via Docker script (after confirmation)
- [ ] [docs-01] Document API contracts and UI data flows

<!-- Maintenance UI Enhancements (New) -->
- [x] [fe-12-maint-edit-delete] Add Edit/Delete actions to maintenance lists (contractors, receipts, scheduled)
- [x] [fe-ui-confirm-dialog-maint] Reusable ConfirmDialog and integration across maintenance pages
- [x] [fe-ui-loading-states-maint] Inline loading states + toasts for save/delete

<!-- Receipts ⇄ Expenses Auto-link (New) -->
- [x] [be-12-receipts-expenses-autolink] Auto-link ServiceReceipt → monthly Expense (create/update/delete) με ViewSet hooks + signals
- [x] [be-13-management-command-backfill] Management command: `backfill_service_receipts_to_expenses` (tenant-aware)
- [x] [devops-01-auto-makemigrations] AUTO_MAKEMIGRATIONS στο `entrypoint.sh` + `docker-compose.yml`

<!-- Phase 2 Backlog (New) -->
- [ ] [be-08-public-counters-hardening] Harden public maintenance counters (cache, throttling, safe fields)
- [ ] [be-09-contractors-building-link] Define contractors↔building strategy for accurate per-building counts
- [ ] [be-10-public-receipts-pending] Public pending receipts counter per building
- [ ] [be-11-todos-calendar] Integrate ScheduledMaintenance with TODOS calendar (create/update/complete, recurrence)
- [ ] [fe-08-remove-mocks-kiosk] Remove mocks/hardcoded numbers from Kiosk & Maintenance dashboard
- [ ] [fe-10-calendar-ui] Calendar UI for maintenance Todos (month/week/day, filters, deep-links)
- [ ] [rt-01-realtime-updates] Socket-based real-time updates for maintenance/project changes (per building channels)
- [ ] [sec-03-public-endpoints] Security review for public endpoints (CORS, rate limiting, PII)
- [ ] [test-02-public-private-parity] Tests for parity between private lists and public counters
- [ ] [doc-03-api-docs] Update OpenAPI/Swagger with new public endpoints

### Acceptance Criteria (ανά task)
- [be-01-models]
  - Ορισμένα models, indexes, choices/status, constraints
  - Admin registrations, type hints, docstrings
  - Μηδενικά mocks, μόνο DB paths
- [be-02-api]
  - Endpoints CRUD, filters, ordering, permissions
  - OpenAPI docs ενημερωμένες
- [be-03-todos-integration]
  - Διπλής κατεύθυνσης sync με TODOs (create/update/complete)
  - Calendar queries ενιαία
- [fe-01-remove-mocks]
  - Όλα τα components να φορτώνουν από API μέσω React Query
  - Socket.io refresh σε status αλλαγές

- [fe-12-maint-edit-delete]
  - Όλες οι λίστες (contractors, receipts, scheduled) έχουν Προβολή/Επεξεργασία/Διαγραφή
  - Διαγραφή με modal confirm και ασφαλή επιστροφή/refresh δεδομένων
  - Ενέργειες ορατές μόνο για Admin/Manager

- [fe-ui-confirm-dialog-maint]
  - Ενιαίο `ConfirmDialog` component, χρήση σε όλες τις διαγραφές
  - Παραμετροποίηση τίτλου/κειμένου/φορτώματος

- [fe-ui-loading-states-maint]
  - Inline loading σε κουμπιά save/delete
  - Toasts επιτυχίας/σφάλματος

- [be-12-receipts-expenses-autolink]
  - Δημιουργία απόδειξης: σύνδεση/συσσώρευση σε μηνιαία Δαπάνη ανά κτίριο/μήνα/κατηγορία
  - Επεξεργασία απόδειξης: re-link όταν αλλάζει κατηγορία/μήνας/κτίριο, ανανέωση ποσού δαπάνης
  - Διαγραφή απόδειξης: ενημέρωση ποσού δαπάνης ή διαγραφή αν δεν υπάρχουν συνδέσεις
  - Υλοποίηση τόσο σε ViewSet (perform_create/update/destroy) όσο και σε signals (post_save/post_delete)

- [be-13-management-command-backfill]
  - Εντολή: `python manage.py backfill_service_receipts_to_expenses --schema demo`
  - Δημιουργεί/ενημερώνει μηνιαίες δαπάνες και συμπληρώνει `linked_expense` για υπάρχουσες αποδείξεις
  - Idempotent λειτουργία, ασφαλής για επανάληψη

- [devops-01-auto-makemigrations]
  - `entrypoint.sh`: conditional `makemigrations` πριν το `migrate` όταν `AUTO_MAKEMIGRATIONS=true`
  - `docker-compose.yml`: περιβάλλον `AUTO_MAKEMIGRATIONS=true` στο service `backend`

<!-- Acceptance Criteria (New) -->
- [fe-08-remove-mocks-kiosk]
  - Kiosk και Maintenance dashboard να μην έχουν hardcoded νούμερα/κείμενα
  - Όλες οι κάρτες να τροφοδοτούνται από public/private APIs με React Query
  - Σωστά loading states, retries και graceful error states

- [be-08-public-counters-hardening]
  - Public counters endpoint με cache TTL (60–120s) και throttling per IP
  - Επιστρέφει μόνο μη-ευαίσθητα πεδία, υποχρεωτικό validated `building`

- [be-09-contractors-building-link]
  - Καθορισμός μεθόδου per-building active contractors (M2M Contractor↔Building ή derive από WorkOrders/Receipts)
  - Public counters να εμφανίζουν έγκυρα active_contractors ανά κτίριο

- [be-10-public-receipts-pending]
  - Pending receipts counter ανά κτίριο διαθέσιμο δημόσια χωρίς ευαίσθητα δεδομένα

- [be-11-todos-calendar]
  - Δημιουργία/ενημέρωση Todo με due dates για ScheduledMaintenance
  - `TodoLink` συμπληρωμένο (content_type, object_id, todo_id, primary_due_at, recurrence_rule)
  - Auto-complete Todo όταν ολοκληρώνεται η εργασία
  - Υποστήριξη recurrence (monthly/yearly)

- [fe-10-calendar-ui]
  - Calendar view (month/week/day) με φίλτρα (building/priority/status)
  - Deep-links προς λεπτομέρειες maintenance

- [rt-01-realtime-updates]
  - Εκπομπή events σε create/update/status change
  - Kiosk/dashboard subscribe σε κανάλια ανά κτίριο χωρίς performance regressions

- [sec-03-public-endpoints]
  - Strict CORS για kiosk origins, rate limiting ενεργό
  - Καμία διαρροή PII (τηλέφωνα/email/notes/costs)

- [test-02-public-private-parity]
  - Seeded data → public counters συμφωνούν με ιδιωτικές λίστες
  - Tests σε tenant context (`schema_context('demo')`)

- [doc-03-api-docs]
  - OpenAPI/Swagger entries για `/api/maintenance/public/scheduled/` και `/api/maintenance/public/counters/`

### Decision Log
- 2025-09-04: Εγκρίθηκε αρχιτεκτονική domains και σύνδεση με TODOS.
- 2025-09-04: Υλοποιήθηκαν models για Tickets/WorkOrders/Milestones, migrations ολοκληρώθηκαν.
- 2025-09-04: Δημιουργήθηκαν DRF serializers/viewsets και routes για maintenance/projects.
- 2025-09-04: Ολοκληρώθηκε συγχρονισμός με TODOS μέσω `TodoLink` και signals.
- 2025-09-04: Προστέθηκε publisher `publish_building_event` και broadcast μέσω ChatConsumer.
- 2025-09-04: Frontend dashboards συνδέθηκαν με API (React Query) και realtime (WS events).
- 2025-09-04: Φόρμες δημιουργίας Ticket/WorkOrder/Project/Milestone (RHF + Zod).
- 2025-09-04: UI guards βάσει ρόλου (admin/manager) για create actions.
- 2025-09-04: Ολοκληρώθηκαν Projects Reports (filters/exports/aggregations/drill-down).
- 2025-09-04: Προστέθηκαν DRF permissions για Projects & Maintenance (read για authenticated, write για admin/manager).
- 2025-09-04: Προστέθηκαν attachments σε Tickets/Projects/Offers και migrations εφαρμόστηκαν.
- 2025-09-05: **Ολοκληρώθηκε seeding demo data** - Δημιουργήθηκε comprehensive script `seed_maintenance_projects_data.py` που προσθέτει 4 contractors, 4 maintenance tickets, 3 work orders, 2 service receipts, 2 scheduled maintenance, 2 projects, 1 RFQ με 2 offers, 3 milestones, 4 todo categories και 3 todo items. Δημιουργήθηκαν demo users (admin@demo.com, manager@demo.com, tenant@demo.com) με proper tenant context.
- 2025-09-05: **Διορθώθηκε URL routing για backend tests** - Προστέθηκε `todo_management.urls` στο κύριο URLConf για επίλυση 404 errors σε 5 failing tests. Δημιουργήθηκε διαγνωστικό test για URL validation. Συγχρονίστηκαν URL configurations μεταξύ `new_concierge_backend.urls` και `tenant_urls.py`.
- 2025-09-05: **Ολοκληρώθηκαν backend tests** - Επιβεβαιώθηκε ότι υπάρχουν comprehensive unit/integration tests για maintenance και projects modules με TenantTestCase, role-based permissions testing και proper schema context usage.
- 2025-09-05: **Phase 1 Completed** - Ολοκληρώθηκε η Phase 1 ανάπτυξης με πλήρη maintenance & projects system. Δημιουργήθηκε comprehensive development plan για Phase 2 (Production Readiness & Enhancement) στο `NEXT_PHASE_DEVELOPMENT_PLAN.md`.

- 2025-09-05: Maintenance UI enhancements (Edit/Delete + guards)
  - Προστέθηκαν Edit/Delete στις λίστες συνεργείων, αποδείξεων, προγραμματισμένων έργων
  - Role guards (Admin/Manager) για τις ενέργειες
  - Reusable `ConfirmDialog` + toasts, inline loading

- 2025-09-05: Προστέθηκαν public maintenance endpoints και Kiosk wiring
  - GET `/api/maintenance/public/scheduled/?building=<id>&priority=&status=&ordering=` (limited fields)
  - GET `/api/maintenance/public/counters/?building=<id>` → { scheduled_total, urgent_total, pending_receipts, active_contractors }
  - Frontend: `apiPublic.ts` methods + Kiosk page wired σε counters
- 2025-09-05: Fallback στο Maintenance dashboard όταν private endpoints επιστρέφουν 401
- 2025-09-05: Alias route για συμβατότητα: `/api/maintenance/scheduled/`
- 2025-09-05: Cleanup/ρυθμίσεις: αφαίρεση django-silk/django-cachalot, διόρθωση DB DSN/Redis host/ROOT_URLCONF, Next.js config updates

- 2025-09-05: Αυτόματη σύνδεση Αποδείξεων → Δαπάνες
  - Προστέθηκαν ViewSet hooks και signals για auto-link, aggregation, και cleanup
  - Νέα σχέση `ServiceReceipt.linked_expense` και προαιρετικό `receipt_file`

- 2025-09-05: Backfill management command
  - `backfill_service_receipts_to_expenses` για linking υπαρχουσών αποδείξεων
  - Εκτέλεση σε tenant schema (`--schema demo`)

- 2025-09-05: AUTO_MAKEMIGRATIONS στο startup
  - Ενεργοποίηση `makemigrations` στο container startup όταν έχει οριστεί η env var

### Phase 1 - COMPLETED 
**Maintenance & Projects System Implementation**

Η Phase 1 ολοκληρώθηκε επιτυχώς με όλα τα core features:
- Multi-tenant backend architecture (Django + DRF + PostgreSQL)
- Maintenance management (Tickets, Work Orders, Contractors, Scheduled Maintenance)
- Projects management (RFQs, Offers, Projects, Milestones)
- TODO system integration με συγχρονισμό
- Frontend dashboards (Next.js + React Query + Socket.io)
- Role-based authentication & permissions
- Real-time updates & notifications
- File uploads & attachments
- Greek localization & UTF-8 support
- Comprehensive testing suite
- Demo data seeding

### Phase 2 - NEXT STEPS 
**Production Readiness & Enhancement**

Δείτε το αναλυτικό σχέδιο στο `NEXT_PHASE_DEVELOPMENT_PLAN.md`:

**Άμεσες Προτεραιότητες:**
1. **Infrastructure & Performance** (INFRA-01, PERF-01, CACHE-01)
2. **Security Hardening** (SEC-01, SEC-02)
3. **Monitoring & Observability** (MON-01, LOG-01)
4. **Documentation** (DOC-01, DOC-02)

#### Immediate Next Steps (Actionable)
- [ ] Κάθαρση mocks/hardcoded σε Kiosk & Maintenance dashboard (fe-08)
- [ ] Hardening public counters: cache + throttling (be-08)
- [ ] Ορισμός per-building active contractors (be-09)
- [ ] Public pending receipts counter (be-10)
- [ ] Σύνδεση ScheduledMaintenance με TODOS calendar (be-11)
- [ ] Calendar UI για maintenance Todos (fe-10)
- [ ] Realtime updates για maintenance/project (rt-01)
- [ ] Security review public endpoints (sec-03)

**Timeline**: 16-week roadmap με 4 sub-phases
**Success Metrics**: Performance, UX, και technical targets

## Προσφορές & Έργα — Enhancement Plan (New)

### Στόχος
- Συστηματική διαχείριση έργων με πλήρη κύκλο: RFQ → Προσφορές → Επιλογή/Έγκριση → Έναρξη Έργου → Milestones → Ολοκλήρωση.
- Δέσιμο με «Τεχνικά & Συντήρηση» (Tickets/Work Orders) και προβολές στο Kiosk όπου χρειάζεται.
- Ενιαία UX με BackButton, Edit/Delete, ConfirmDialog/toasts, role guards.

### Αρχιτεκτονική & Συνδέσεις
- Οντότητες (υπάρχουσες/ενισχυμένες):
  - Project: έχει πολλά Offers, έχει Milestones, συνδέσεις με MaintenanceTickets/WorkOrders (προαιρετικά).
  - RFQ: οδηγεί σε Offers (1→Ν), συνδέεται με Project (π.χ. ένα RFQ ανά Project ή πολλαπλά RFQs ανά Project — να οριστεί).
  - Offer: ανήκει σε RFQ/Project, έχει status (received/accepted/rejected/expired), cost breakdown.
  - Milestone: ανήκει σε Project, με due/status/amount.
- Συνδέσεις με «Τεχνικά & Συντήρηση»:
  - Project ↔ MaintenanceTicket/WorkOrder: προαιρετική σύνδεση για τεχνικά έργα.
  - Όταν εγκρίνεται Offer ⇒ δημιουργία ScheduledMaintenance ή WorkOrder (configurable flow).
- Kiosk:
  - Public endpoints για “εγκεκριμένα/σε εξέλιξη” έργα (μόνο τίτλος/ημερομηνίες/κατάσταση, χωρίς ευαίσθητα ποσά).

### Backend Εργασίες
- [ ] [be-proj-01] Επιβεβαίωση/επέκταση μοντέλων (Project/RFQ/Offer/Milestone) με type hints, constraints, indexes.
- [ ] [be-proj-02] Endpoints: Projects, RFQs, Offers, Milestones (CRUD, filters, ordering, search).
- [ ] [be-proj-03] ViewSet actions: approve_offer (κλειδώνει offers, στήνει project flow), start_project, complete_project.
- [ ] [be-proj-04] Signals/Events: publish events για changes (project.updated, offer.approved).
- [ ] [be-proj-05] Permissions: IsAuthenticated (read), Admin/Manager (write), vendor-limited actions όπου χρειάζεται.
- [ ] [be-proj-06] Public (Kiosk) endpoints: λίστα εγκεκριμένων/σε εξέλιξη έργων (safe fields, throttling, cache TTL).

### Frontend Εργασίες
- [ ] [fe-proj-01] Λίστα Έργων: στήλες (τίτλος, κατάσταση, προϋπολογισμός, vendor/offer επιλεγμένη), BackButton, New Project (guarded).
- [ ] [fe-proj-02] Project Detail: tabs (Overview, Offers, Milestones, Activity), Edit/Delete με ConfirmDialog, toasts.
- [ ] [fe-proj-03] RFQ/Offers UI: δημιουργία RFQ, προσθήκη/επεξεργασία προσφορών, επιλογή/έγκριση.
- [ ] [fe-proj-04] Milestones UI: CRUD milestones, progress, due alerts.
- [ ] [fe-proj-05] Reuse BackButton + role guards σε όλες τις σελίδες.
- [ ] [fe-proj-06] Kiosk: προβολή approved/in-progress έργων (κατάλογος/slider), χωρίς ποσά.

### Αποδοτικά Flows
- Approve Offer ⇒ (option) δημιουργία ScheduledMaintenance/WorkOrder και σύνδεση με Project.
- Completion Milestone ⇒ (option) ενημέρωση Project status και δημιουργία ειδοποίησης.

### Acceptance Criteria
- Projects list/detail με πλήρη CRUD και inline feedback (loading/toasts/errors).
- Offers list ανά Project με approve action που κλειδώνει άλλες προσφορές.
- Milestones με due/status και εμφανές progress.
- Role guards: μόνο Admin/Manager τροποποιούν∙ vendors βλέπουν/υποβάλλουν Offers όπου επιτρέπεται.
- Public kiosk endpoints/σελίδα εμφανίζει μόνο ασφαλή πεδία εγκεκριμένων/σε εξέλιξη έργων.

### Testing
- Unit/integration tests για Projects/RFQs/Offers/Milestones (CRUD, permissions, approve flow).
- Tenant context tests (`schema_context('demo')`).
- Public endpoints parity tests (μόνο safe fields).

### Παρατηρήσεις Υλοποίησης
- Χρήση React Query keys ανά οντότητα: ['projects'], ['projects', id], ['projects', id, 'offers']...
- ConfirmDialog/toasts σε destructive/approve actions.
- BackButton παντού για συνέπεια UX.

### Glossary
- RFQ: Αίτημα Προσφοράς
- Offer: Προσφορά προμηθευτή
- Work Order: Εκτελέσιμη εντολή εργασίας
- Milestone: Ορόσημο έργου

### Οδηγίες Υλοποίησης (σύντομα)
- Backend
  - Models: tenants-aware, indexes σε `building`, `status`, `due_at`, `vendor`.
  - Serializers/ViewSets: φίλτρα, ordering, search, permissions ανά ρόλο.
  - Events: publish on create/update/status change.
  - TODOS integration: service για create/update/complete.
- Frontend
  - Route groups: `/maintenance`, `/projects`.
  - React Query keys ανά οντότητα, Socket.io invalidate/update.
  - RHF + Zod validation, χωρίς mocks.

### Σημειώσεις
- Ελληνική κωδικοποίηση UTF-8 (π.χ. διαμερίσματα Α1 vs A1) όπου σχετικό.
- Προσοχή σε ισοδυναμίες ποσών (offers breakdown = amount, milestones total ≤ budget).

### Σφάλμα: 404 στα backend tests για `user_requests` και `todo_management`

- **Task ID**: bugs-backend-tests-404
- **Τρέχουσα κατάσταση**: 5 failed, 4 passed (εντολή: `pytest -q -k 'user_requests or todo_management' --reuse-db`)

- **Αστοχίες**:
  - **user_requests**:
    - `test_create_user_request`: POST `reverse('userrequest-list')` ⇒ 404 στο `/api/user-requests/`
    - `test_support_user_request`: POST `reverse('userrequest-support', pk)` ⇒ 404 στο `/api/user-requests/<id>/support/`
    - `test_list_user_requests`: GET `reverse('userrequest-list')` ⇒ 404 στο `/api/user-requests/`
  - **todo_management**:
    - `test_sync_financial_overdues_endpoint`: POST `/api/todos/items/sync-financial-overdues/` ⇒ 404
    - `test_sync_maintenance_schedule_endpoint`: POST `/api/todos/items/sync-maintenance-schedule/` ⇒ 404

- **Ενέργειες που έγιναν**:
  - Προστέθηκαν autouse fixtures στο `backend/conftest.py`: διασφάλιση ύπαρξης tenant `demo` και εκτέλεση tests σε `schema_context('demo')` (με `migrate_schemas`).
  - Προστέθηκε `path('api/todos/', include('todo_management.urls'))` στο `tenant_urls.py` (tenant URLConf).
  - Διορθώθηκε το router basename στο `backend/user_requests/urls.py` σε `basename='userrequest'` ώστε τα names να είναι `userrequest-list`, `userrequest-detail`, κ.λπ.
  - Διορθώθηκε το `UserRequestFactory` για το M2M `supporters` μέσω `@factory.post_generation` hook (αντί για direct assignment).

- **Ενδείξεις**:
  - Τα Django logs καταγράφουν `Not Found` για `/api/user-requests/` και `/api/todos/items/sync-*/` κατά τη διάρκεια των tests.
  - Τα `reverse('userrequest-list')`/`reverse('userrequest-support')` επιλύονται σε path αλλά το response είναι 404.

- **Υποθέσεις**:
  1) Αντιστοίχιση URLConf/tenant στο test περιβάλλον: ο test client ίσως χρειάζεται `HTTP_HOST='demo.localhost'` για σωστή tenant δρομολόγηση ή χρήση `TenantTestCase`.
  2) Ενδεχόμενη αλληλουχία/σειρά των `include(...)` στους tenant URLs (σκιάσεις)· χαμηλή πιθανότητα, αλλά θα επιβεβαιωθεί.
  3) Middleware/permissions πιθανώς επιστρέφουν 404 αντί για 401/403 (παρότι γίνεται `force_authenticate`).
  4) Διαφορά μεταξύ `new_concierge_backend.urls` και `tenant_urls` στο ενεργό `ROOT_URLCONF` κατά τα tests.

- **Επόμενα βήματα**:
  - Προσθήκη διαγνωστικού test που τυπώνει ενεργά `resolver.url_patterns` και επιβεβαιώνει match για `/api/user-requests/` και `/api/todos/items/sync-financial-overdues/`.
  - Δοκιμή κλήσεων χωρίς auth για έλεγχο αν αλλάζει το status (403/401 vs 404).
  - Επιβεβαίωση ότι `settings.ROOT_URLCONF == 'new_concierge_backend.urls'` στα tests και ότι περιλαμβάνει τα `user_requests`/`todo_management`.
  - Ρύθμιση `APIClient(HTTP_HOST='demo.localhost')` ή υιοθέτηση `TenantTestCase` για πλήρη tenant routing στα API tests.
  - Όταν απαντούν τα routes, εκτέλεση πλήρους suite εντός Docker.
