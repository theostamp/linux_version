## TODO: Τεχνικά & Συντήρηση • Προσφορές & Έργα

Σκοπός: Ενοποίηση domains «Τεχνικά & Συντήρηση» και «Προσφορές & Έργα», χωρίς mocks/hardcoded δεδομένα, με πλήρη multi-tenancy, σύνδεση με την εφαρμογή TODOS (υπενθυμίσεις/ημερολόγιο), και realtime ενημερώσεις.

### Prompt Template (για επόμενα βήματα)
Χρησιμοποίησε τα παρακάτω:
1) Context: Αυτό το αρχείο, επιλεγμένο task ID από Backlog
2) Κανόνες Project (Docker/venv/multi-tenancy)
3) Acceptance Criteria του task

Ζήτημα προς υλοποίηση: <περιγραφή>
Task ID: <id από Backlog>
Απαιτήσεις: <bullets>
Deliverables: <bullets>

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
- [ ] [fe-02-maintenance-ui] Build Next.js route groups and pages for Maintenance
- [ ] [fe-03-projects-ui] Build Next.js route groups and pages for Projects/Offers
- [x] [fe-04-forms] Implement forms with RHF + Zod (tickets, RFQs, offers, milestones)
- [x] [fe-05-reports] Projects Reports with filters, exports, aggregations, drill-down
- [ ] [sec-01-perms] Add role-based permissions (manager, tenant, vendor) across API/UI
- [x] [sec-02-projects-perms] DRF permissions for Projects (read auth, write admin/manager)
- [x] [sec-03-maintenance-perms] DRF permissions for Maintenance (read auth, write admin/manager)
- [ ] [test-01-backend] Write unit/integration tests for backend services and endpoints
- [ ] [db-02-seed] Seed demo tenant data via Docker script (after confirmation)
- [ ] [docs-01] Document API contracts and UI data flows

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
