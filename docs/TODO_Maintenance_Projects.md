### TODO: Ενοποιημένη Αρχιτεκτονική για Projects και Maintenance

Στόχος: Ενοποίηση των `projects` και `maintenance` σε ένα ενιαίο domain (Projects) με ολοκληρωμένη ροή από την ανάδυση ανάγκης έως την τιμολόγηση, συμπεριλαμβανομένης της δυνατότητας απευθείας ανάθεσης (bypass procurement/voting).

---

### 1) Σκοπός και Κύριοι Στόχοι
- **Ενοποίηση ροής**: Ανάγκη → Ανακοίνωση/Κοινοποίηση → Προμήθεια/Προσφορές → Απόφαση (kiosk) → Ανάθεση → Εκτέλεση → Ολοκλήρωση → Τιμολόγηση/Παραστατικά.
- **Direct assignment**: Παράκαμψη προμηθειών/προσφορών/απόφασης όταν απαιτείται άμεση ανάθεση.
- **Σαφής state machine** με guards/δικαιώματα και deadlines.
- **Ενιαίος API χώρος ονομάτων** και adapters για backward compatibility.

---

### 2) State Machine (ενδεικτικό)
- Κανονική ροή:
  - Draft → Announced → Sourcing → Bidding → Decision → Awarded → InExecution → Completed → Billed → Archived
- Direct assignment:
  - Draft → Awarded → InExecution → Completed → Billed → Archived

Guards/κανόνες:
- Μετάβαση σε Bidding απαιτεί ενεργό ProcurementEvent.
- Decision απαιτεί αποτέλεσμα ψηφοφορίας/απόφασης εντός χρονικού ορίου.
- Awarded απαιτεί Assignment/Contract με προμηθευτή.
- Completed απαιτεί κλείσιμο όλων των milestones/tasks.
- Billed απαιτεί τουλάχιστον ένα παραστατικό (Invoice) συσχετισμένο με το project/contract.

---

### 3) Οντότητες και Σχέσεις (υψηλού επιπέδου)
- Project: building_id, title, description, type (maintenance/upgrade/etc), budget, status, created_by, dates, files.
- ProcurementEvent: project_id, strategy (open/invite), deadlines, criteria.
- Offer: project_id, vendor_id, amount, currency, validity, attachments, status.
- Decision (Vote/Meeting): project_id, mode (kiosk/board), result, minutes, attachments.
- Assignment/Contract: project_id, vendor_id, award_date, terms, guarantee, payment_terms.
- ProjectTask/Milestone: project_id, title, due_date, status, progress.
- Invoice/Receipt: project_id/contract_id, amount, issue_date, due_date, status, files.
- Vendor: name, type, contact, rating.
- Announcement: building_id, title, content, visibility, start/end, files.
- Meeting: project_id, schedule, agenda, participants, minutes, decisions.

Σημείωση: Υπάρχοντα modules (maintenance, collaborators, offers) χαρτογραφούνται στα παραπάνω.

---

### 4) API Σχεδιασμός (ενοποιημένο namespace)
- Βασικό namespace: `/api/projects/`
  - `GET/POST /projects/`
  - `GET/PUT/PATCH /projects/{id}/`
  - Tabs/resources:
    - `/projects/{id}/procurement/`
    - `/projects/{id}/offers/`
    - `/projects/{id}/decision/`
    - `/projects/{id}/assignment/`
    - `/projects/{id}/tasks/`
    - `/projects/{id}/billing/invoices/`, `/projects/{id}/billing/receipts/`
    - `/projects/{id}/files/`, `/projects/{id}/activity/`
  - Συνοπτικά endpoints λίστας/μετρήσεων: `/projects/dashboard/summary/`

Backward compatibility:
- Διατήρηση υφιστάμενων endpoints (`/maintenance/**`, `/projects/offers/**`, `/collaborators/**`) μέσω adapters που διαβάζουν/γράφουν στα νέα μοντέλα για μεταβατικό διάστημα.
- Versioning όπου χρειάζεται (`/v2/`).

---

### 5) Frontend (ενοποιημένο UI)
- Ενιαίο `Projects` dashboard με φίλτρα (κατάσταση, τύπος, κτίριο, ανάδοχος).
- Project Detail με tabs: Overview, Procurement, Offers, Decision, Execution (Tasks/Milestones), Billing, Files, Activity.
- Wizard δημιουργίας Project με επιλογή “Direct Assignment”.
- Kiosk integration (public read-only views) για Announcements/Voting/Decision.

---

### 6) Δικαιώματα/Ρόλοι
- Manager: πλήρη δικαιώματα (CRUD, transitions).
- Owner: ανάγνωση, συμμετοχή σε ψηφοφορίες/συνελεύσεις.
- Vendor: δημιουργία/ενημέρωση προσφορών δικών του, πρόσβαση σε έγγραφα διαγωνισμού.
- Kiosk: public (read-only) προβολές αποφάσεων/ανακοινώσεων.
- Staff/Superuser: εποπτεία.

---

### 7) Δεδομένα & Μεταναστεύσεις (DB)
- Νέα μοντέλα: Project, ProcurementEvent, Offer, Decision, Assignment/Contract, ProjectTask, Invoice, Receipt.
- Scripts migration από παλαιά tables/σχέσεις.
- Constraints & indexes: status, project_id, building_id, vendor_id, dates.
- Audit trail: activity log ανά Project και σημαντικά events.

---

### 8) Notifications & Automations
- Events: ProjectCreated, ProcurementOpened, OfferSubmitted, DecisionMade, Awarded, MilestoneDue, InvoiceDue, ProjectCompleted.
- Ειδοποιήσεις (email/push) ανά ρόλο/γεγονός.

---

### 9) Rollout Plan / Feature Flags
- FF: `projects_unified_flow`.
- Φάση Α: Direct assignment flow end-to-end.
- Φάση Β: Procurement/Offers integration.
- Φάση Γ: Kiosk Decision/Meetings integration.
- Φάση Δ: Billing unification και απόσυρση παλαιών endpoints.

---

### 10) Ρίσκα & Mitigations
- Πολυπλοκότητα ροής → αυστηρό state machine με guards.
- Συμβατότητα API/UI → adapters + versioning + σταδιακό rollout.
- Ιδιωτικότητα kiosk → διαχωρισμός public vs private fields/ενημέρωσης.
- Απόδοση → indexes, pagination, async jobs για βαριές λειτουργίες.

---

### 11) Άμεσα Βήματα (Implementation TODOs)
1. Απογραφή υφιστάμενων μοντέλων/endpoints (maintenance, projects, collaborators, invoices).
2. Οριστικοποίηση state machine & ERD.
3. Προσχέδιο συμβάσεων API (`/projects/**`).
4. Migration plan και adapters για παλαιά endpoints.
5. Frontend: νέο Projects dashboard + Project detail tabs + Wizard με Direct Assignment.
6. Kiosk public views για Decision.
7. Testing (unit/integration/e2e) και rollout με FF.

---

### 12) Ανοιχτά Θέματα για Επιβεβαίωση
- Κανόνες bypass (thresholds) για Direct Assignment.
- Τυποποίηση Decision (ψηφοφορία vs απόφαση διαχειριστή) και νομικά metadata.
- Τυποποίηση εγγυήσεων/πληρωμών σε Contract (π.χ. προκαταβολή, παρακράτηση).
- Σύνδεση οικονομικών με καθολικά οικονομικά (reports ανά κτίριο/project).

---

### 13) Απογραφή Υφιστάμενων Endpoints & Μοντέλων (WIP)

Affected apps: `projects`, `maintenance`, `collaborators`, `financial` (receipts), `announcements` (ανακοινώσεις/κοινοποιήσεις), πιθανή σύνδεση με public_info/kiosk.

• Projects (urls: `/api/projects/`)
  - Endpoints:
    - `GET/POST /api/projects/projects/` (ProjectViewSet)
    - `GET/PUT/PATCH/DELETE /api/projects/projects/{id}/`
    - `GET/POST /api/projects/offers/` (OfferViewSet)
    - `GET/PUT/PATCH/DELETE /api/projects/offers/{id}/`
    - `GET/POST /api/projects/contracts/` (ContractViewSet)
    - `GET/PUT/PATCH/DELETE /api/projects/contracts/{id}/`
    - `GET /api/projects/dashboard/` (ProjectsDashboardViewSet)
  - Models:
    - `projects.Project` (planning/bidding/awarded/in_progress/completed/cancelled)
    - `projects.Offer` (status: pending/under_review/accepted/rejected/withdrawn)
    - `projects.Contract` (status: draft/active/completed/terminated/expired)

• Maintenance (urls: `/api/maintenance/`)
  - Endpoints:
    - `GET/POST /api/maintenance/contractors/`
    - `GET/PUT/PATCH/DELETE /api/maintenance/contractors/{id}/`
    - `GET/POST /api/maintenance/receipts/`
    - `GET/PUT/PATCH/DELETE /api/maintenance/receipts/{id}/`
    - `GET/POST /api/maintenance/scheduled-maintenance/`
    - `GET/PUT/PATCH/DELETE /api/maintenance/scheduled-maintenance/{id}/`
  - Models:
    - `maintenance.Contractor`
    - `maintenance.ServiceReceipt`
    - `maintenance.ScheduledMaintenance`

• Collaborators (urls: `/api/collaborators/`)
  - Endpoints:
    - `GET/POST /api/collaborators/collaborators/`
    - `GET/POST /api/collaborators/projects/`
    - `GET/POST /api/collaborators/contracts/`
    - `GET/POST /api/collaborators/invoices/`
    - `GET/POST /api/collaborators/meetings/`
    - `GET /api/collaborators/performance/`
  - Models: (στο app collaborators)
    - Συνεργάτες/έργα/συμβόλαια/τιμολόγια/συναντήσεις (να χαρτογραφηθούν με το unified Project schema)

• Financial (urls: `/api/financial/receipts`)
  - Endpoints:
    - `GET/POST /api/financial/receipts/` (FinancialReceiptViewSet)
    - `GET /api/financial/receipts/?payment_id=`
  - Models:
    - `financial.FinancialReceipt` (linked to `financial.Payment`)

• Announcements (urls: `/api/announcements/`)
  - Endpoints:
    - `GET/POST /api/announcements/`
    - `GET/PUT/PATCH/DELETE /api/announcements/{id}/`
  - Models:
    - Ανακοίνωση (για κοινοποιήσεις/ενημερώσεις έργων και συνελεύσεων)

• Public/Kiosk
  - Endpoints:
    - `/api/public-info/{building_id}/` (δημόσιες πληροφορίες, πιθανή ένταξη αποφάσεων/ψηφοφορίας)

Σημεία ενοποίησης/μεταφοράς:
- Projects ↔ Maintenance: `ScheduledMaintenance` ως `Project` τύπου maintenance (migration με mapping πεδίων).
- Projects ↔ Offers: ήδη συνδεδεμένα (models: Offer, Contract) με `maintenance.Contractor`.
- Projects ↔ Collaborators: πιθανή σύγκρουση/επικάλυψη με δικά τους projects/contracts/invoices → adapters ή migration για ενιαία πηγή αλήθειας.
- Projects ↔ Financial: invoices/receipts να δένονται στο project/contract για αναφορές.
- Projects ↔ Announcements: αυτόματες ανακοινώσεις στα status changes (Announced, Decision, Awarded, Completed).

Επόμενα (για το Inventory):
- Λεπτομερής λίστα πεδίων σε κάθε model και χρήση τους στα serializers/views.
- Επαλήθευση permissions ανά endpoint.
- Χαρτογράφηση frontend κλήσεων που θα επηρεαστούν.

---

### 14) Λεπτομερές State Machine (Transitions/Guards/Side-effects)

Καταστάσεις:
- Draft, Announced, Sourcing, Bidding, Decision, Awarded, InExecution, Completed, Billed, Archived

Βασικές μεταβάσεις:
- create → Draft (role: Manager)
- publish_announcement: Draft → Announced (role: Manager)
- open_procurement: Announced → Sourcing (role: Manager, guard: έχει οριστεί ProcurementEvent)
- start_bidding: Sourcing → Bidding (role: Manager, guard: procurement active, deadlines set)
- submit_offer: Bidding → Bidding (role: Vendor, side-effect: create Offer)
- close_bidding: Bidding → Decision (role: Manager, guard: minimum offers or bypass)
- record_decision: Decision → Awarded (role: Manager/Board, guard: meeting/vote result stored)
- direct_assign: Draft|Announced → Awarded (role: Manager, guard: policy threshold/justification)
- start_execution: Awarded → InExecution (role: Manager, guard: Contract created/active)
- complete_execution: InExecution → Completed (role: Manager, guard: all tasks/milestones done)
- issue_invoice: Completed → Billed (role: Manager, guard: at least one invoice linked)
- archive: Billed → Archived (role: Manager)

Validation/Guards (ενδεικτικά):
- ProcurementEvent απαιτεί dates, criteria, documents.
- Decision απαιτεί minutes, decision_type (vote/board), quorum/threshold όπου ισχύει.
- Contract απαιτεί vendor, amount, dates, payment_terms, warranty_terms.
- Completed απαιτεί 100% milestones done, acceptance checklist.
- Billed απαιτεί invoices with totals ≤ contract amount (ή justification για overruns).

Side-effects/Notifications:
- Announced: δημιουργία Announcement, ειδοποιήσεις σε owners.
- Bidding: ενημέρωση vendors/invitees.
- Awarded: ειδοποίηση vendor, έκδοση/υπογραφή συμβολαίου, δημιουργία initial tasks.
- Completed: ενημέρωση stakeholders, προετοιμασία billing.
- Billed: ενημέρωση λογιστηρίου/οικονομικών.

Error handling:
- Απαγόρευση skip καταστάσεων χωρίς guards (π.χ. Decision → InExecution χωρίς Awarded).
- Rollback transitions όπου χρειάζεται (π.χ. Awarded → Decision σε ακύρωση ανάθεσης, με audit trail).

Direct Assignment flow:
- Draft → Awarded (με justification, policy checks) → InExecution → Completed → Billed → Archived.

Kiosk coupling:
- Decision state υποστηρίζει kiosk voting sessions με public endpoints και public serializers.

---

### 15) ERD Outline (Entities & Relationships)

- Project (1) — (N) Offer
- Project (1) — (N) Contract (συνήθως 1 ενεργό ανά award)
- Project (1) — (N) ProjectTask/Milestone
- Project (1) — (1?) ProcurementEvent
- Project (1) — (N) Announcement
- Project (1) — (N) Meeting/Decision
- Contract (1) — (N) Invoice
- Contract (1) — (N) Receipt (αν απαιτείται, ή ενιαίο με financial receipts)
- Vendor (Contractor) (1) — (N) Offer / (N) Contract

Κρίσιμα πεδία:
- Project: building_id, status, project_type, budget, dates, files, created_by.
- ProcurementEvent: strategy, deadlines, documents, invitees.
- Offer: project_id, contractor_id, amount, specs, warranty_period, status, files.
- Decision: project_id, mode (kiosk/board), result, minutes, attachments, quorum/threshold.
- Contract: project_id, contractor_id, offer_id?, contract_number, amount, dates, payment_terms, warranty_terms, status, files.
- Task/Milestone: project_id, title, due_date, status, progress, assignee.
- Invoice: contract_id, amount, issue_date, due_date, status, file.

Indexes/Απόδοση:
- project_id, building_id, status σε Projects/Offers/Contracts.
- date fields για αναφορές/φιλτράρισμα.

---

### 16) Roles/Permissions Matrix (σύνοψη)

- Manager: πλήρη transitions, CRUD σε Project/Procurement/Offers/Decision/Contract/Tasks/Billing.
- Owner: read Project, συμμετοχή σε Decision (kiosk), πρόσβαση σε ανακοινώσεις.
- Vendor: create/update Offer (στο δικό του scope), read procurement docs/invites.
- Kiosk: public read-only views (Decision/Announcements), χωρίς ευαίσθητα πεδία.

Transition rules by role:
- Offers: μόνο Vendors και μόνο σε Bidding, ορατότητα περιορισμένη.
- Decision: μόνο Manager/Board για καταγραφή αποτελέσματος, kiosk για ψηφοφορία.
- Awarded/Contract: μόνο Manager.

---

### 17) Προτεινόμενες Αλλαγές Data Model (Schema Changes)

Νέα/Τροποποιημένα μοντέλα (backend):
- Project (νέο unified hub)
  - Επιπλέον πεδία: `decision_mode` ('kiosk'|'board'|'direct'), `direct_assignment_reason` (text), `policy_threshold_exceeded` (bool), `visibility` (internal/public), `files` (attachments)
  - Καταστάσεις όπως ορίστηκαν στο state machine
- ProcurementEvent (νέο)
  - Fields: `project`, `strategy` ('open'|'invite'), `invited_vendors` (M2M → Contractor), `start_date`, `end_date`, `documents` (files), `criteria` (json)
  - Indexes: `project_id`, `end_date`
- Offer (υπάρχει)
  - Προσθήκες: `currency` (ISO), `tax_included` (bool), `valid_until` (date), `scoring_breakdown` (json), `is_awarded` (bool)
- Decision (νέο)
  - Fields: `project`, `mode` ('kiosk'|'board'), `result` ('approved'|'rejected'|'postponed'), `quorum` (int), `threshold` (percent), `minutes` (file/text), `occurred_at` (datetime)
- Contract (υπάρχει)
  - Προσθήκες: `advance_amount`, `retention_percent`, `guarantee_terms`, `deliverables` (json), `po_number`
- ProjectTask/Milestone (νέο)
  - Fields: `project`, `title`, `description`, `due_date`, `status`, `progress`, `assignee` (User/Contractor), `evidence_files`
- Billing
  - Invoice (νέο, ή ενοποίηση με financial): `contract`, `project`, `amount`, `tax_amount`, `total_amount`, `currency`, `issue_date`, `due_date`, `status`, `file`
  - Receipt (σύνδεση με existing `financial.FinancialReceipt`): προσθήκη `project`, `contract` ως optional FKs για αναφορές
- Vendor/Contractor
  - Χρήση υπάρχοντος `maintenance.Contractor` ως Vendor. Προσθήκες: `vendor_rating_agg`, `completed_projects_count`

Mappings από υφιστάμενα:
- `maintenance.ScheduledMaintenance` → `projects.Project` (type=maintenance)
- `maintenance.ServiceReceipt` → Billing (ως Invoice ή Receipt αναλόγως χρήσης)
- `projects.Offer`, `projects.Contract` παραμένουν, με πρόσθετα πεδία
- `financial.FinancialReceipt` διατηρείται και αποκτά προαιρετικά links σε `project`/`contract`

Μοντελοποιήσεις για privacy/public:
- Public serializers περιορισμένων πεδίων για kiosk/announcements
- Private serializers για εσωτερική διαχείριση

Indexes/Constraints που προστίθενται:
- Composite: `(project_id, status)` σε Offers/Contracts/Tasks
- Unique: `Contract.contract_number`
- Foreign keys με `on_delete` = PROTECT όπου θέλουμε ακεραιότητα (π.χ. contract σε invoice)

---

### 18) Migration Plan (Σταδιακό, με Adapters & FF)

Φάση 1 — Schema intro (non-breaking):
- Προσθήκη νέων πινάκων: `ProcurementEvent`, `Decision`, `ProjectTask`, `Invoice` (αν νέο), προσθήκη FKs `project`/`contract` σε `financial.FinancialReceipt` (nullable)
- Προσθήκη νέων πεδίων σε `Project`, `Offer`, `Contract`
- Feature flag: `projects_unified_flow`

Φάση 2 — Data backfill:
- Map `ScheduledMaintenance` → `Project` (type=maintenance), διατήρηση original IDs σε mapping table (για ιχνηλασιμότητα)
- Συνδέσεις υπαρχόντων `Offer`/`Contract` με νέα πεδία (defaults)
- `ServiceReceipt` → αν χρησιμοποιείται ως παραστατικό, backfill σε `Invoice` ή link σε `FinancialReceipt`

Φάση 3 — Adapters/Compatibility:
- Διατήρηση παλαιών endpoints (`/maintenance/**`, `/projects/offers/**`, `/collaborators/**`) με adapters που γράφουν στα νέα μοντέλα
- Read-path από unified schema, write-path διπλό όπου χρειάζεται μέχρι την απόσυρση

Φάση 4 — Enable unified flow:
- Ενεργοποίηση FF για συγκεκριμένα κτίρια/tenants
- Παρακολούθηση logs/metrics, έλεγχοι συμφωνίας οικονομικών

Φάση 5 — Decommission old paths:
- Σταδιακή απόσυρση legacy endpoints, migration των UI σημείων
- Καθαρισμοί/αφαίρεση adapters

Rollback plan:
- Κρατάμε transactional migrations, snapshots και reversible data migrations
- FF off για άμεση επιστροφή

Testing:
- Unit για models/serializers/state transitions
- Integration για adapters/old endpoints
- E2E για βασικές ροές (direct assignment και procurement)

---

### 19) API Αλλαγές & Backward Compatibility

Unified namespace (νέα): `/api/projects/`
- `POST /projects/` (create with direct/standard flag)
- `POST /projects/{id}/procurement/` (create/activate event)
- `POST /projects/{id}/offers/` (vendor scope)
- `POST /projects/{id}/decision/` (store decision/vote result)
- `POST /projects/{id}/assignment/` (create contract from offer or direct)
- `POST /projects/{id}/tasks/` (create milestones)
- `POST /projects/{id}/billing/invoices/`, `GET /projects/{id}/billing/summary/`
- `GET /projects/dashboard/summary/`

Adapters (legacy paths):
- `/api/maintenance/scheduled-maintenance/` ↔ create Project(type=maintenance)
- `/api/projects/offers/` ↔ redirect to `/projects/{id}/offers/`
- `/api/collaborators/*` ↔ map σε unified Project/Contract/Invoice όπου εφαρμόζεται

Auth/Permissions:
- RBAC rules ανά endpoint/transition (Manager/Owner/Vendor/Kiosk)

Versioning:
- `/api/v2/projects/**` αν χρειαστεί breaking αλλαγή, με παράλληλη λειτουργία έως decommission

Frontend impact:
- Νέα σελίδα Projects (unified), προοδευτική μετανάστευση tabs
- Kiosk public views για Decision/Announcements

---

### 20) Frontend Plan (Next.js App Router, TS strict, React Query, RHF/Zod)

Στόχοι:
- Ενιαίο UI για Projects, με tabs ανά στάδιο και wizard δημιουργίας (με επιλογή Direct Assignment)
- Προοδευτική μετανάστευση από υπάρχοντα routes (`/maintenance`, `/projects/offers`) σε `/projects`
- Kiosk υποστήριξη για δημόσια προβολή αποφάσεων/ανακοινώσεων

Routes (App Router):
- `/projects` (list)
  - Filters: building, status, type, vendor, period
  - Columns: title, building, status badge, progress, vendor, updated_at
- `/projects/new` (wizard)
  - Steps: Basic info → Mode (standard/direct) → Procurement (optional) → Tasks/Milestones → Review
  - RHF + Zod, optimistic UI, error boundaries
- `/projects/[id]` (detail with tabs)
  - Tabs:
    - Overview: βασικά στοιχεία, status, timeline/activity
    - Procurement: event details, documents, invited vendors
    - Offers: list/table, upload/download, compare matrix, accept/reject
    - Decision: results, minutes, meeting data (kiosk hooks)
    - Execution: tasks/milestones kanban + checklist
    - Billing: invoices/receipts summary, links σε financial
    - Files: attachments with preview
    - Activity: audit trail
- `/kiosk/projects/[id]/decision` (public)
  - Read-only view για συνελεύσεις/αποφάσεις/ανακοινώσεις

State & Data:
- React Query v5 για server state, query keys ανά project/building
- Mutations με optimistic updates (accept offer, change status), invalidations ανά tab
- Error boundaries ανά tab

Components (shared):
- `ProjectStatusBadge`, `VendorBadge`, `MoneyCell`, `ProgressBar`
- `OffersTable`, `OfferCompareMatrix`, `DecisionCard`
- `MilestonesBoard`, `InvoiceList`, `AttachmentsGrid`, `ActivityFeed`

Forms/Validation:
- RHF + Zod schemas για Project/Offer/Decision/Contract/Task
- File uploads με progress και retry

Feature Flags & Migration:
- FF `projects_unified_flow` σε layout provider (hide legacy nav, show unified)
- Σταδιακή ανακατεύθυνση:
  - `/maintenance/scheduled-maintenance/*` → `/projects/*` (όταν FF on)
  - `/projects/offers/*` → `/projects/[id]/offers`
- Διατήρηση παλιών σελίδων μέχρι ολοκλήρωση μετάβασης

API Integration:
- Χρήση `frontend/lib/api.ts` με ενιαίο baseURL
- Προσθήκη νέων κλήσεων: `createProject`, `createProcurementEvent`, `submitOffer`, `recordDecision`, `createContract`, `createTask`, `listProjectInvoices`
- Αντιστοίχιση legacy calls σε adapters όπου χρειάζεται

UX/Accessibility:
- Breadcrumbs, consistent empty states, skeleton loaders
- Keyboard navigation, ARIA labels σε tables/forms

Observability:
- Client logs (debuggable), success/error toasts
- Metrics: query error rates, mutation failures per tab

---

### 21) Permissions & RBAC Matrix

Ρόλοι:
- Manager: Διαχειριστής κτιρίου/έργων (πλήρη δικαιώματα εντός κτιρίου)
- Owner: Ιδιοκτήτης (ανάγνωση έργων, συμμετοχή σε αποφάσεις/kiosk)
- Vendor: Συνεργείο/Ανάδοχος (υποβολή/διαχείριση προσφορών του)
- Kiosk: Δημόσιος/περιορισμένος ρόλος για προβολή συνελεύσεων/αποφάσεων
- Staff/Superuser: Εποπτεία/υπερ-δικαιώματα (προσοχή στο scoping ανά building)

Scoping/Όρια Πρόσβασης:
- Όλα τα endpoints/πόροι φιλτράρονται με βάση `building_id` του χρήστη/αιτήματος
- Vendors βλέπουν μόνο δικές τους προσφορές/συμβάσεις/έγγραφα
- Kiosk endpoints είναι public read-only και εκθέτουν μόνο public fields

RBAC ανά πόρο:
- Projects
  - Manager: create/read/update/delete στο κτίριο, transitions status
  - Owner: read στο κτίριο
  - Vendor: read (μόνο public/project summary όταν σχετίζεται μέσω procurement invite)
  - Kiosk: read-only public (μέσω ειδικών public serializers)
- ProcurementEvent
  - Manager: create/update/close, invite vendors, upload docs
  - Owner: read (summary)
  - Vendor: read προσκλήσεις/έγγραφα όταν έχει πρόσκληση
  - Kiosk: none
- Offers
  - Manager: read all, evaluate, accept/reject
  - Vendor: create/update/delete μόνο της δικής του προσφοράς, read κατάσταση αξιολόγησης
  - Owner: read (summary μετά τη λήξη υποβολών)
  - Kiosk: none
- Decision (Meetings/Votes)
  - Manager: create/update decision record, publish minutes
  - Owner: συμμετοχή σε ψηφοφορία (kiosk/app), read results όταν δημοσιευθούν
  - Kiosk: read-only public decision snapshots
- Contracts (Assignment)
  - Manager: create/update/activate/terminate, link με offer/vendor
  - Vendor: read μόνο τα συμβόλαιά του, upload τυχόν παραδοτέα/έγγραφα
  - Owner/Kiosk: read summary (π.χ. ανάδοχος, τίτλος, status) εφόσον public
- Tasks/Milestones
  - Manager: full CRUD, assign
  - Vendor: update progress/evidence στα ανατιθέμενα tasks
  - Owner/Kiosk: read-only summary
- Billing (Invoices/Receipts)
  - Manager: create/read/update invoices (ή σύνδεση με financial receipts), export
  - Vendor: upload invoice docs για το δικό του contract
  - Owner/Kiosk: read-only totals/summary (αν public)

Transitions Authorization (ενδεικτικά):
- Draft → Announced: Manager
- Announced → Sourcing: Manager (guard: ProcurementEvent set)
- Sourcing → Bidding: Manager
- Bidding → Decision: Manager (guard: bidding closed)
- Decision → Awarded: Manager/Board (guard: result recorded)
- Direct Assign (Draft|Announced → Awarded): Manager (guard: policy threshold/justification)
- Awarded → InExecution: Manager (guard: active Contract)
- InExecution → Completed: Manager (guard: milestones complete)
- Completed → Billed: Manager (guard: invoice exists)
- Billed → Archived: Manager

DRF Permissions (ενδεικτική χαρτογράφηση):
- IsAuthenticated & IsInBuilding(building_param)
- IsManagerOfBuilding, IsOwnerOfBuilding, IsVendorForOffer/Contract
- IsPublicKiosk (για public endpoints)
- Per-action permission classes στα ViewSets (π.χ. create/update μόνο για Manager)

Security/Privacy:
- Public serializers για kiosk με whitelisted fields
- Audit trail (who/when/action) σε transitions και κρίσιμα updates
- CSRF/JWT όπως υφίσταται, με έλεγχο token scopes/claims για ρόλους

Testing Permissions:
- Unit tests per endpoint/action/role
- E2E σενάρια για βασικές ροές (Vendor offer submit, Manager award, Owner kiosk view)

---

### 22) Integration Points (Announcements, Offers, Voting, Assignments)

Announcements ↔ Projects:
- Trigger: `Announced`, `Decision`, `Awarded`, `Completed`
- Action: Δημιουργία/ενημέρωση Announcement (title, summary, links to project)
- Public scope: kiosk-safe serializers χωρίς ευαίσθητα οικονομικά

Offers/Procurement ↔ Projects:
- ProcurementEvent ορίζει προσκεκλημένους vendors, documents
- Vendors υποβάλλουν Offers με αρχεία/τεχνικά specs
- Manager αξιολογεί (scoring_breakdown), αποδέχεται/απορρίπτει
- Σύνδεση Offer → Contract κατά το Awarded (set `is_awarded`)

Voting/Decision ↔ Projects:
- Bidding close → Decision state
- Decision record: mode (kiosk/board), result, minutes, quorum/threshold
- Kiosk: public session (αν χρειάζεται), μετά δημοσίευση αποτελέσματος και μετάβαση σε Awarded

Assignment/Contract ↔ Projects:
- From accepted Offer ή Direct assignment (χωρίς Offer)
- Contract constraints: dates, amount, payment_terms, guarantee_terms
- Side-effects: δημιουργία initial tasks, ενημέρωση vendors

Billing ↔ Financial:
- Contract → Invoices (νέο) ή σύνδεση FinancialReceipt με project/contract
- Billing tab δείχνει σύνολα/κατάσταση, links στα documents
- Reports: ανά έργο/κτίριο, με φίλτρα κατάστασης/ημερομηνιών

Activity/Audit:
- Καταγραφή γεγονότων: created, announcement_published, procurement_opened, offer_submitted, decision_recorded, awarded, task_updated, completed, invoice_issued
- Feed στο Project detail

Notifications:
- Owners: Announced/Decision/Completed (opt-in)
- Vendors: invitation, bidding open/close, award
- Managers: deadlines, overdue tasks, invoice due

Error/Conflict Handling:
- Διπλές προσφορές vendor για ίδιο project: unique constraint (project, contractor)
- Award χωρίς valid offer: επιτρέπεται μόνο για direct assignment με justification
- Απόφαση χωρίς quorum: block transition ή mark `postponed`

Performance:
- Pagination σε offers, lazy-load files, caching σε dashboard summaries

Telemetry:
- Μετρήσεις: time-to-award, number-of-offers, time-in-state, overdue tasks, invoice cycle time

---

### 23) Testing & Rollout Plan

Testing:
- Unit: serializers, permissions, state transitions
- Integration: adapters μεταξύ legacy και unified endpoints
- E2E: 2 βασικές ροές
  - Direct assignment (Draft → Awarded → InExecution → Completed → Billed)
  - Procurement (Announced → Sourcing → Bidding → Decision → Awarded → ...)
- Kiosk: public views, privacy checks (no sensitive fields)

Rollout:
- FF `projects_unified_flow` per-tenant/building
- Pilot σε ένα κτίριο
- Παρακολούθηση logs/metrics, feedback loop
- Σταδιακή ανακατεύθυνση legacy routes → unified
- Decommission όταν σταθεροποιηθεί
