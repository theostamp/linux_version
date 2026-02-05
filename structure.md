
Executive Summary

Υπάρχει πλήρης multi‑tenant στο backend με django‑tenants + custom tenant routing μέσω X‑Tenant‑Host (backend) και αντίστοιχο proxy στο Next.js (frontend).
Auth είναι JWT (SimpleJWT) με access/refresh αποθηκευμένα σε localStorage και refresh flow στον client· CSRF token γίνεται fetch από /api/csrf/, αλλά τα tokens δεν είναι HttpOnly (security risk).
Υπάρχουν δύο παράλληλα “οικονομικά”: financial (λογιστικό/ισοζύγια/αποδείξεις) και online_payments (Stripe charges/checkout). Δεν υπάρχει ορατή αυτόματη γέφυρα μεταξύ τους.
“Debt status” υπάρχει από financial (balances/status) και office analytics (top debtors + days overdue), αλλά λείπει ολοκληρωμένο “aging” και υπάρχει frontend call σε endpoint που δεν υλοποιείται.
Αυτοματοποιημένες υπενθυμίσεις υπάρχουν (monthly tasks, debt reminders, email/push/SMS providers), αλλά scheduling είναι πρακτικά “manual” αν δεν στηθεί Celery/cron.
Ροή “decision → assignment → completion” υπάρχει με Projects/Votes/Todos/Maintenance, αλλά δεν υπάρχει σαφής automation από αποτέλεσμα vote σε obligation/task.
InfoPoint/Kiosk υπάρχει (public info + kiosk display), αλλά το QR token είναι client‑side stub και η privacy προστασία βασίζεται σε frontend sanitization.
Υπάρχει Financial audit log και middleware για traceability οικονομικών ενεργειών.
Building scoping γίνεται με filter_queryset_by_user_and_building και TenantAccessMiddleware, αλλά υπάρχουν αρκετά AllowAny endpoints (π.χ. public info / kiosk) που θέλουν προσεκτικό hardening.
Συνολικά: πολλά κομμάτια “δουλεύουν”, αλλά απαιτούν ενοποίηση/σκληροποίηση για production‑ready.
A) High‑Level Mapping

A1. Αρχιτεκτονικό διάγραμμα (backend apps + frontend routes)
Backend (Django apps) — πηγές: base.py

Core/Tenancy/Auth: tenants, core, users, office_staff, billing, online_payments_public, email_webhooks.
Residential Ops: buildings, apartments, announcements, user_requests, votes, assemblies, residents.
Financial: financial, online_payments, office_finance, office_analytics.
Maintenance/Projects/Tasks: maintenance, projects, todo_management, events.
Comms: notifications, chat.
Public/Guest: public_info, kiosk, marketplace_public, ad_portal.
Integrations/IoT/AI: integrations, iot_heating, ai_agent, document_parser, archive, data_migration, collaborators, teams.
Frontend (Next.js App Router) — public-app/src/app/*

Public: /, /login, /signup, /pricing, /plans, /forgot-password, /auth/*, /verify-payment/[session_id], /vote-by-email/[token], /tenant/accept, /accept-invitation, /marketplace/*, /advertise/*, /kiosk-display, /kiosk/connect, /kiosk/complete-registration.
Dashboard group: /dashboard, /financial, /online-payments, /votes, /requests, /projects, /maintenance, /announcements, /assemblies, /my-apartment, /my-profile, /my-subscription, /office-dashboard, /office-finance, /kiosk-management/*, /documents, /archive, /data-migration, /notifications, /calendar, /buildings, /apartments, /users, /admin/*.
API routes proxying backend: public-app/src/app/api/* (catch‑all proxy + specific routes).
A2. Auth Mechanism (JWT/refresh/CSRF, interceptors)
Backend

JWT auth: REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES = SimpleJWT in base.py.
Token endpoints: POST /api/users/token/, POST /api/users/token/refresh/, POST /api/users/token/simple/ in urls.py.
Cross‑schema auth: cross_schema_auth.py (auth against public schema + tenant access checks).
CSRF cookie endpoint: GET /api/csrf/ in urls.py + views.py.
Frontend

Token storage & refresh flow in api.ts
Access token read from localStorage and Authorization: Bearer … added to requests.
401 triggers refresh via POST /api/users/token/refresh/ in api.ts.
CSRF handling: useCsrf / useEnsureCsrf calls /api/csrf/ and api.ts adds X‑CSRFToken for mutating requests.
Axios interceptors: none for main API; only apiPublic (axios) for public endpoints in apiPublic.ts.
A3. Multi‑tenant (django‑tenants)
Backend

Tenant models: tenants.Client, tenants.Domain in models.py.
Tenancy settings: TENANT_MODEL, TENANT_DOMAIN_MODEL, DATABASE_ROUTERS in base.py.
Tenant resolution: CustomTenantMiddleware in middleware.py using X‑Tenant‑Host / X‑Forwarded‑Host.
Tenant access enforcement: TenantAccessMiddleware in cross_schema_auth.py.
Frontend

Proxy sets Host, X‑Forwarded‑Host, X‑Tenant‑Host: tenantProxy.ts and route.ts.
B) Feature‑by‑Feature Audit (5 κρίσιμες δυνατότητες)

1) Payment links + κατάσταση οφειλής + απόδειξη πληρωμής
Status: ΜΕΡΙΚΩΣ

Backend evidence

Online payment links (Stripe):
Models: Charge, PaymentAttempt, Payment, ManualPayment in models.py.
Endpoints:
GET/POST /api/online-payments/charges/
GET/PATCH /api/online-payments/charges/<uuid>/
POST /api/online-payments/charges/<uuid>/mark-paid/
POST /api/online-payments/checkout/
GET /api/online-payments/payments/my/
GET /api/online-payments/payments/building/
GET /api/online-payments/reconciliation/summary/
reconciliation.csv
GET/PUT /api/online-payments/settings/payee/
Paths in urls.py, logic in views.py.
Stripe webhook: POST /api/webhooks/stripe/ in urls.py with processing in views.py (creates Payment, updates Charge.status).
Debt status (financial ledger):
Model: financial.Payment + Transaction and current_balance logic in models.py + services.py (get_apartment_balances).
Endpoints: GET /api/financial/my-apartment/ (views.py), GET /api/financial/dashboard/apartment_balances/ (views.py).
Status logic: current_balance > 0 → “Οφειλή”, > 100 → “Κρίσιμο” in services.py.
Receipts:
Model: FinancialReceipt with receipt_file, receipt_number in models.py.
Endpoints: GET/POST/PATCH/DELETE /api/financial/receipts/ + GET /api/financial/receipts/by_payment/ + GET /api/financial/receipts/receipt_types/ in views.py and urls.py.
Audit log: FinancialAuditLog + middleware in audit.py.
Frontend evidence

Online payment UI: page.tsx
Reads debt from GET /api/financial/my-apartment/ and lists charges from GET /api/online-payments/charges/.
Starts checkout via POST /api/online-payments/checkout/ and redirects to checkout_url.
Debt status for residents: page.tsx uses /financial/my-apartment/.
Receipts UI: useReceipts.ts uses /financial/receipts/ endpoints.
Δεδομένα / Ορισμοί

“Οφειλή” = current_balance > 0 από FinancialDashboardService.get_apartment_balances (services.py).
“Πληρωμή” στο ledger = financial.Payment με amount, date, method, payer_type, receipt.
“Online payment” = online_payments.Payment συνδεδεμένη με Charge μέσω Stripe webhook.
Config

Stripe keys: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY (base.py, env.schema.example).
Online payments mock: STRIPE_MOCK_MODE (base.py).
Frontend base URLs: API_BASE_URL, NEXT_PUBLIC_API_URL (env.schema.example).
Happy path

Resident:
Login, ανοίγει /online-payments (page.tsx).
Βλέπει συνολική οφειλή από /financial/my-apartment/.
Επιλέγει charge → POST /online-payments/checkout/ → redirect to Stripe.
Webhook /api/webhooks/stripe/ κάνει Charge.status=paid.
Manager/Staff:
Δημιουργεί charges μέσω POST /api/online-payments/charges/.
Παρακολουθεί reconciliations από /online-payments/reconciliation/summary/.
Καταχωρεί manual πληρωμή με POST /charges/<id>/mark-paid/.
Δημιουργεί απόδειξη με /financial/receipts/.
Edge cases + security

Role permissions: Online payments ελέγχει office-level σε views.py (_is_office_level).
Financial endpoints προστατεύονται από PaymentPermission (permissions.py).
Tenant scoping γίνεται από middleware + per‑building filters.
Audit log υπάρχει για ledger, όχι για online payments.
Cross‑system ασυνέχεια: online_payments δεν ενημερώνει το financial ledger ή FinancialReceipt (δεν υπάρχει evidence σύνδεσης).
Παρατηρήσεις/Κίνδυνοι

“Payment links” υπάρχουν, αλλά δεν υπάρχει σύνδεση online payments → financial ledger/receipts.
Resident βλέπει “οφειλή” από financial, αλλά πληρώνει online_payments charge: τα ποσά μπορεί να μη συγχρονίζονται.
Κίνδυνος διπλής πηγής αλήθειας.
Ελάχιστες διορθώσεις (Top 5)

Ενοποίηση: Μετά από successful webhook, δημιουργία financial.Payment + FinancialReceipt ή mapping από Charge σε ledger.
Καθαρός data model: ένα authoritative “debt” source (π.χ. financial), τα charges να παράγονται από ledger.
Προσθήκη audit log για online_payments (ιδίως manual mark_paid).
UI: εμφανές “λογιστικό υπόλοιπο” vs “online charges” και reconcile mismatch.
Εισαγωγή idempotent sync job (π.χ. nightly reconcile).
2) Aging/arrears dashboard (ποιοι χρωστάνε, πόσο, πόσο καιρό)
Status: ΜΕΡΙΚΩΣ

Backend evidence

GET /api/financial/dashboard/apartment_balances/ returns per‑apartment balances + status, last payment date (views.py, services.py).
Office analytics “Top Debtors” with days overdue:
GET /api/office-analytics/top-debtors/ and GET /api/office-analytics/dashboard/ (urls.py, services.py).
Fields include balance, last_payment_date, days_overdue.
Public kiosk summaries: views.py builds apartment_statuses (apartment number + pending flag).
Frontend evidence

Building-level arrears: useFinancialDashboard.ts calls /financial/dashboard/apartment_balances/.
UI: ApartmentOverviewIntegrated.tsx and ApartmentBalances.tsx show debt statuses.
Office dashboard: useOfficeDashboard.ts + TopDebtorsCard for days overdue.
Missing: frontend calls /financial/dashboard/debt-report/ in useFinancialDashboard.ts, but δεν υπάρχει endpoint στο backend.
Δεδομένα / Ορισμοί

current_balance > 0 = debt (“Οφειλή”), >100 = “Κρίσιμο” (services.py).
days_overdue υπολογίζεται από last_payment_date (services.py).
Edge cases + security

Tenant scoping καλύπτεται από middleware και building filters.
Residents δεν έχουν office analytics πρόσβαση (office endpoints).
Gap: missing /financial/dashboard/debt-report/ → frontend feature unusable.
Παρατηρήσεις/Κίνδυνοι

Δεν υπάρχουν explicit aging buckets (30/60/90) στο financial dashboard.
Debt report endpoint referenced στο UI αλλά λείπει.
Ελάχιστες διορθώσεις (Top 5)

Υλοποίηση /financial/dashboard/debt-report/ ή αφαίρεση από frontend.
Προσθήκη aging buckets (0‑30/31‑60/61‑90/90+) στο FinancialDashboardService.
Πλήρης σύνδεση office analytics metrics στο building financial UI.
Αποφυγή double sources (kiosk/public info vs financial dashboard).
Tests για debt calculations (unit + API).
3) Αυτοματοποιημένες υπενθυμίσεις (email/push/SMS)
Status: ΜΕΡΙΚΩΣ

Backend evidence

Notifications system models: NotificationTemplate, Notification, MonthlyNotificationTask, UserDeviceToken in models.py.
Actions:
POST /api/notifications/notifications/send_debt_reminders/ in views.py.
POST /api/notifications/notifications/send_common_expenses/
POST /api/notifications/notifications/send_personalized_common_expenses/
POST /api/notifications/notifications/send_personalized_common_expenses_bulk/
Router endpoints: /api/notifications/templates/, /notifications/notifications/, /notifications/monthly-tasks/, /notifications/devices/, etc. (urls.py).
Debt reminder services: debt_reminder_service.py and debt_reminder_breakdown_service.py.
Background tasks: tasks.py includes scheduled senders.
SMS providers (Twilio/Vonage/Apifon etc): sms_providers.py.
Web push config: VAPID_* in base.py (warning if missing).
Frontend evidence

Monthly tasks UI: MonthlyTasksManager.tsx.
Debt reminders UI: DebtReminderSender.tsx uses /notifications/send_debt_reminders/.
Device token/push: firebase.ts + /api/notifications/devices/ (from urls.py).
Config

Email provider: MAILERSEND_* in base.py and env.schema.example.
Push: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
SMS: providers exist but require external configuration (no global settings in base.py).
Edge cases + security

SMS reserved for debt reminders flag in notifications code (SMS_ONLY_FOR_DEBT_REMINDERS in settings_example.py).
Celery configured CELERY_TASK_ALWAYS_EAGER=True by default (base.py), άρα background jobs εκτελούνται sync και όχι scheduled.
Παρατηρήσεις/Κίνδυνοι

Scheduling/automation εξαρτάται από Celery beat/cron που δεν φαίνεται ρυθμισμένο.
Push/SMS μπορεί να είναι disabled αν δεν υπάρχουν keys/config.
Ελάχιστες διορθώσεις (Top 5)

Ενεργοποίηση Celery worker + beat (ή cron) για tasks.py.
Centralized scheduling UI ↔ actual job runner (status, retries).
Επιβεβαίωση email provider (MailerSend webhook + error handling).
VAPID + Push device tokens production setup.
SMS provider επιλογή + rate limits + compliance.
4) Ροή “απόφαση → ανάθεση → ολοκλήρωση” (vote → request/obligation/task)
Status: ΜΕΡΙΚΩΣ

Backend evidence

Votes: Vote model (models.py) + endpoints /api/votes/ with actions vote, submit, results, etc. (views.py, urls.py).
Assemblies: linked votes via AgendaItem.linked_vote (models.py).
Projects & offers: approvals create maintenance schedules and expenses (update_project_schedule in views.py).
Todos: TodoItem, TodoLink, linking service ensure_linked_todo in services.py.
User requests: UserRequest with assigned_to, status in models.py + viewset actions change_status, support (views.py).
Obligations: simple Obligation model + /api/obligations/summary/ (models.py, views.py).
Frontend evidence

Votes UI: /votes, /votes/[id], /votes/new in public-app/src/app/(dashboard)/votes/*.
Requests UI: /requests, /requests/[id], /requests/new.
Todos UI: /calendar and todo components in public-app/src/components/todos/*.
Projects UI: /projects/*, offers, approvals in public-app/src/app/(dashboard)/projects/*.
Maintenance UI: /maintenance/*.
Gap

Δεν υπάρχει ορατή αυτόματη σύνδεση vote αποτέλεσμα → δημιουργία obligation/task.
Obligation app είναι ανεξάρτητο (summary μόνο) και δεν συνδέεται με votes/requests.
Happy path

Resident:
Βλέπει ψηφοφορία /votes/[id] και υποβάλλει ψήφο (POST /api/votes/<id>/submit/).
Υποβάλλει αίτημα /requests/new (POST /api/user-requests/).
Manager/Staff:
Δημιουργεί project (POST /api/projects/projects/).
Αποδέχεται offer (POST /api/projects/offers/<id>/approve/) → δημιουργεί ScheduledMaintenance + Expenses (update_project_schedule).
Παρακολουθεί todo items από todo_management.
Edge cases + security

user_requests filtering per building (filter_queryset_by_user_and_building in utils.py).
Votes have per‑building filtering in viewsets but χρειάζεται συνεπής building_id param.
No explicit policy mapping for vote result to status change.
Ελάχιστες διορθώσεις (Top 5)

Καθορισμένη pipeline: vote αποτέλεσμα → state change (Project/Request/Obligation).
Μοναδικό “decision record” (π.χ. AssemblyVote → Task/Obligation event).
Audit trail για αποφάσεις (VoteSubmission → Task).
UI σύνδεση “decision → task” (linking from vote to todo/request).
Tests για vote-to-project/maintenance flow.
5) InfoPoint adoption pack (QR onboarding + guest mode + privacy rules)
Status: ΜΕΡΙΚΩΣ

Backend evidence

Public info endpoint: GET /api/public-info/<building_id>/ (views.py) with AllowAny, returns building info, announcements, votes, financial summaries.
Kiosk public endpoints:
/api/kiosk/public/configs/
/api/kiosk/public/scenes/
/api/kiosk/public/configs/get_by_building/
/api/kiosk/apartment-debts/
/api/kiosk/register/ and /api/kiosk/connect/ (urls.py).
Premium gating for kiosk: _require_kiosk_premium in views.py.
QR onboarding backend: kiosk_register in views.py (phone verification, invite flow).
Frontend evidence

Kiosk display: /kiosk-display (page.tsx) uses useKioskData.
Public info proxy and sanitization: route.ts removes apartment_balances & top_debtors.
QR widget: QRCodeWidget.tsx generates QR token client-side (comment says “should come from backend”).
Kiosk connect UI: /kiosk/connect (page.tsx) posts to /api/kiosk/connect/.
Privacy safeguards

Frontend proxy sanitizes apartment_balances/top_debtors and masks apartment statuses (route.ts).
Backend public_info still exposes apartment numbers (views.py), άρα direct backend access μπορεί να παρακάμψει frontend sanitization.
Παρατηρήσεις/Κίνδυνοι

QR token is not server‑issued and validation is minimal (validate_kiosk_token only checks building id).
Guest mode depends on frontend proxy sanitization.
Public info endpoint is AllowAny.
Ελάχιστες διορθώσεις (Top 5)

Server‑issued, time‑limited QR token (signed) + strict validation.
Move privacy sanitization to backend public_info (not only frontend).
Rate‑limit/abuse protection on /api/kiosk/connect/.
Audit logging for kiosk registrations.
Clear privacy policy UI for guest mode.
C) Concrete Inventory & Evidence

C1. API endpoints (URL configs + key actions)
Base routing: urls.py

/api/users/, /api/buildings/, /api/buildings/public/, /api/apartments/, /api/announcements/, /api/user-requests/, /api/obligations/, /api/votes/, /api/financial/, /api/archive/, /api/online-payments/, /api/public-info/, /api/ad-portal/, /api/marketplace/, /api/tenants/, /api/residents/, /api/chat/, /api/teams/, /api/collaborators/, /api/maintenance/, /api/projects/, /api/todos/, /api/events/, /api/data-migration/, /api/parser/, /api/integrations/, /api/kiosk/, /api/notifications/, /api/ai/, /api/iot/, /api/billing/, /api/admin/, /api/office/, /api/office-analytics/, /api/office-finance/, /api/ (assemblies + core).
Users (urls.py)

Auth: POST /api/users/register/, POST /api/users/login/, POST /api/users/logout/, POST /api/users/token/, POST /api/users/token/refresh/, POST /api/users/token/simple/.
Email/verification: GET/POST /api/users/verify-email/, POST /api/users/resend-verification/, POST /api/users/send-verification-email/.
Profile: GET /api/users/me/, PATCH /api/users/office-details/, GET/POST /api/users/profile/*.
Invitations: /api/users/invitations/*, /api/users/invite/, /api/users/accept-invitation/.
OAuth: /api/users/auth/google/, /api/users/auth/microsoft/, /api/users/auth/callback/.
Router CRUD: GET/POST /api/users/ + GET/PATCH/DELETE /api/users/<id>/.
Buildings (urls.py, public_urls.py)

GET /api/buildings/current-context/, GET /api/buildings/my-buildings/, POST /api/buildings/actions/add-membership/, POST /api/buildings/actions/remove-membership/.
Router: GET/POST /api/buildings/list/, GET/PATCH/DELETE /api/buildings/list/<id>/.
Service packages: /api/buildings/service-packages/.
Public: GET /api/buildings/public/, GET /api/buildings/public/test/.
Apartments (urls.py)

Router: GET/POST /api/apartments/ + GET/PATCH/DELETE /api/apartments/<id>/.
Token‑based: /api/apartments/personal/<token>/dashboard/, /api/apartments/personal/<token>/common-expenses/, /api/apartments/personal/validate-token/.
Announcements (urls.py)

Router: GET/POST /api/announcements/ + GET/PATCH/DELETE /api/announcements/<id>/.
User Requests (urls.py, views.py)

Router: GET/POST /api/user-requests/ + GET/PATCH/DELETE /api/user-requests/<id>/.
Actions:
GET /api/user-requests/top/
POST /api/user-requests/<id>/change_status/
POST /api/user-requests/<id>/support/.
Obligations (urls.py)

GET /api/obligations/summary/.
Votes (urls.py, views.py)

Router: GET/POST /api/votes/ + GET/PATCH/DELETE /api/votes/<id>/.
Actions:
POST /api/votes/<id>/vote/
POST /api/votes/<id>/submit/
GET /api/votes/<id>/my-submission/
GET /api/votes/<id>/context/
GET /api/votes/<id>/results/
GET /api/votes/<id>/evidence-package/
GET /api/votes/<id>/verify/
GET /api/votes/active/
GET /api/votes/urgent/
POST /api/votes/<id>/activate/
POST /api/votes/<id>/deactivate/
Public: GET /api/votes/public/<id>/results/.
Financial (urls.py)

Router resources:
/api/financial/expenses/, /expense-payments/, /cash-fundings/, /transactions/, /payments/, /suppliers/, /dashboard/, /common-expenses/, /meter-readings/, /reports/, /apartments/, /receipts/, /monthly-balances/.
Extra endpoints:
POST /api/financial/expenses/scan/
GET /api/financial/apartments/<id>/transactions/
GET /api/financial/building/<id>/apartments-summary/
GET /api/financial/system-health/
POST /api/financial/auto-fix/
GET /api/financial/overview/
POST /api/financial/tests/*
GET /api/financial/my-apartment/
POST /api/financial/admin/* (cleanup/backup/restore).
Key custom actions used by features:
GET /api/financial/payments/balances/
POST /api/financial/payments/validate_balance/
POST /api/financial/payments/<id>/validate_payment/
GET /api/financial/payments/monthly_summary/
POST /api/financial/payments/refresh_balances/
GET /api/financial/payments/methods/
GET /api/financial/dashboard/summary/
GET /api/financial/dashboard/improved-summary/
GET /api/financial/dashboard/apartment_balances/.
Online Payments (urls.py)

Charges/checkout/payments/reconciliation/payee settings (βλ. Feature 1).
Online Payments Public (urls.py)

POST /api/webhooks/stripe/.
Notifications (urls.py)

Router: /api/notifications/templates/, /notifications/notifications/, /notifications/recipients/, /notifications/monthly-tasks/, /notifications/events/, /notifications/email-batches/, /notifications/devices/.
Actions: /notifications/send_common_expenses/, /notifications/send_personalized_common_expenses/, /notifications/send_personalized_common_expenses_bulk/, /notifications/notifications/send_debt_reminders/.
Viber: /notifications/viber/link/, /notifications/viber/subscription/.
Kiosk & Public Info (urls.py, urls.py)

/api/kiosk/configs/, /display-configs/, /scenes/.
Public: /api/kiosk/public/configs/, /public/scenes/, /public/configs/get_by_building/.
Registration: /api/kiosk/register/, /api/kiosk/connect/.
/api/public-info/<building_id>/.
Office Analytics (urls.py)

/api/office-analytics/dashboard/, /portfolio/, /buildings-status/, /top-debtors/, /pending-maintenance/, /cash-flow/, /alerts/, /residents/.
Office Finance (urls.py)

/api/office-finance/expense-categories/, /income-categories/, /expenses/, /incomes/, /dashboard/, /yearly-summary/, /init-categories/.
Projects (urls.py)

/api/projects/projects/, /offers/, /offer-files/, /project-votes/, /project-expenses/.
Public: /api/projects/public/approved-in-progress/.
Maintenance (urls.py)

/api/maintenance/contractors/, /receipts/, /scheduled-maintenance/, /scheduled/, /tickets/, /work-orders/, /payment-schedules/, /payment-installments/, /payment-receipts/, /marketplace-partners/.
Public: /api/maintenance/public/scheduled/, /maintenance/public/counters/.
Assemblies (urls.py)

/api/assemblies/assemblies/, /agenda-items/, /assembly-attendees/, /assembly-votes/, /minutes-templates/, /community-polls/, /poll-votes/.
GET /api/assemblies/upcoming/, GET/POST /api/assemblies/vote-by-email/<token>/.
Other apps (router‑only; CRUD endpoints)

archive, document_parser, events, chat, teams, collaborators, residents, iot_heating, marketplace_public, ad_portal, ad_portal_public, billing, admin, office_staff, integrations, ai_agent, data_migration, email_webhooks, tenants.
Paths are in respective urls.py.
C2. DB models ανά app (βασικά)
Πηγή: rg "^class " στα models.py

tenants: Client, Domain (tenant + domain).
users: CustomUser, UserInvitation, PasswordResetToken, UserLoginAttempt.
buildings: Building, ServicePackage, BuildingMembership.
apartments: Apartment.
announcements: Announcement.
votes: Vote, VoteSubmission, VoteSubmissionEvent.
assemblies: Assembly, AgendaItem, AssemblyAttendee, AssemblyVote, AssemblyMinutesTemplate, CommunityPoll, PollOption, PollVote.
user_requests: UserRequest, UrgentRequestLog.
obligations: Obligation.
financial: Expense, Transaction, Payment, ExpensePayment, CashFunding, CommonExpensePeriod, ApartmentShare, FinancialReceipt, MonthlyBalance, Supplier, MeterReading, RecurringExpenseConfig.
online_payments: Charge, PaymentAttempt, Payment, ManualPayment, PayeeSettings.
online_payments_public: WebhookEvent.
billing: PricingTier, SubscriptionPlan, UserSubscription, BillingCycle, UsageTracking, PaymentMethod.
notifications: NotificationTemplate, Notification, MonthlyNotificationTask, NotificationEvent, NotificationRecipient, EmailBatch, UserDeviceToken, UserViberSubscription, NotificationPreference.
maintenance: Contractor, ServiceReceipt, ScheduledMaintenance, MaintenanceTicket, WorkOrder, PaymentSchedule, PaymentInstallment, PaymentReceipt, MarketplacePartner.
projects: Project, Offer, OfferFile, ProjectVote, ProjectExpense.
todo_management: TodoCategory, TodoItem, TodoTemplate, TodoNotification, TodoLink.
kiosk: KioskWidget, KioskDisplaySettings, KioskScene, WidgetPlacement.
public_info: (no models).
office_analytics: (service‑only).
office_finance: OfficeExpenseCategory, OfficeIncomeCategory, OfficeExpense, OfficeIncome, OfficeFinancialSummary.
events: Event, EventNote.
chat: ChatRoom, ChatMessage, ChatParticipant, ChatNotification, DirectConversation, DirectMessage, OnlineStatus, MessageReaction, DirectMessageReaction, PushSubscription, ChatNotificationPreference.
teams: Team, TeamRole, TeamMember, TeamTask, TeamMeeting, TeamPerformance.
collaborators: Collaborator, CollaborationProject, CollaborationContract, CollaborationInvoice, CollaborationMeeting, CollaboratorPerformance.
marketplace_public: MarketplaceProvider, MarketplaceOfferRequest, MarketplaceCommissionPolicy, MarketplaceCommission.
ad_portal: AdLandingToken, AdPlacementType, AdLead, AdContract, AdCreative, AdBillingRecord, AdEvent, AdDailySnapshot.
ad_portal_public: WebhookEvent.
archive: ArchiveDocument.
document_parser: DocumentUpload.
iot_heating: HeatingDevice, HeatingSession, TelemetryLog, HeatingControlProfile.
email_webhooks: EmailWebhookEvent.
C3. Σημαντικά frontend pages/routes

Public/auth: /login, /login/resident, /login/office, /signup, /forgot-password, /auth/verify-email, /auth/callback, /verify-payment/[session_id], /vote-by-email/[token], /tenant/accept, /accept-invitation.
Resident/manager dashboard: /dashboard, /financial, /my-apartment, /online-payments, /requests, /votes, /projects, /maintenance, /announcements, /assemblies, /documents, /archive, /notifications, /calendar, /my-profile, /my-subscription.
Office command center: /office-dashboard, /office-finance.
Admin pages: /admin/marketplace, /admin/backup-restore, /admin/database-cleanup, /admin/network-usage, /admin/ad-portal.
Kiosk: /kiosk-display, /kiosk/connect, /kiosk/complete-registration, /kiosk-management/*.
C4. Production‑impacting config (CORS/CSRF, cookies, env, providers, stripe)

base.py
CORS: CORS_ALLOWED_ORIGINS, CORS_ALLOWED_ORIGIN_REGEXES.
CSRF: CSRF_TRUSTED_ORIGINS, CSRF_COOKIE_*.
JWT lifetimes in SIMPLE_JWT.
Email provider: EMAIL_BACKEND, MAILERSEND_*, SENDGRID_*, RESEND_*.
Push: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
Stripe: STRIPE_*, STRIPE_MOCK_MODE, PER_APARTMENT_BILLING_ENABLED.
Celery: CELERY_TASK_ALWAYS_EAGER (default True).
.env schema: env.schema.example and env.example.
Docker: docker-compose.local.yml (db + redis).
C5. InfoPoint specifics

Backend code: views.py, views.py, urls.py.
Guest mode: AllowAny public info + kiosk public endpoints.
QR onboarding: QRCodeWidget.tsx (client‑generated token) + page.tsx + views.py (kiosk_register).
Privacy safeguards: route.ts sanitizes per‑apartment data.
D) Τελικό αποτέλεσμα

D1. Executive Summary (10 bullets)

Multi‑tenant routing είναι λειτουργικό, με σωστό headers‑based resolution.
JWT auth/refresh δουλεύει, αλλά storage σε localStorage αυξάνει XSS risk.
Online payments δουλεύουν (charges + Stripe checkout + webhook).
Financial ledger δουλεύει (payments, receipts, balances), αλλά είναι αποσυνδεδεμένο από Stripe charges.
Debt dashboard υπάρχει, αλλά aging/reporting είναι ελλιπές (missing endpoint).
Automated reminders υπάρχουν, αλλά scheduling είναι μη ολοκληρωμένο (Celery eager).
Decision‑to‑task flow είναι μερικό (Projects → Maintenance → Expenses, όχι από vote αποτέλεσμα).
InfoPoint/Kiosk λειτουργεί με guest mode, αλλά QR security είναι stub και privacy είναι frontend‑dependent.
Audit logs υπάρχουν για financial, όχι για online payments.
Production readiness απαιτεί ενοποίηση οικονομικών, σκληροποίηση QR + auth, και ενεργοποίηση background jobs.
D2. Capability score

Payment links + debt status + receipts: 60/100
Aging/arrears dashboard: 55/100
Automated reminders: 60/100
Decision → assignment → completion: 50/100
InfoPoint adoption pack: 55/100
Overall: 56/100
D3. Roadmap 30/60/90 ημερών
30 ημέρες

Ενοποίηση online payments με financial ledger (webhook → financial.Payment + FinancialReceipt).
Υλοποίηση /financial/dashboard/debt-report/ ή cleanup frontend calls.
Server‑issued QR tokens + validation.
Βασικό audit logging για online payments.
Enable Celery worker + beat (ή cron) για notifications tasks.
60 ημέρες

Aging buckets + debtor report (30/60/90/120).
Decision → Task pipeline (vote result → project status/todo/obligation).
Backend privacy enforcement στο public_info (no apartment numbers unless authorized).
Push & SMS providers production config + rate limits.
End‑to‑end tests για payments + reminders.
90 ημέρες

Office dashboard + financial dashboard ενοποίηση (single source of debt truth).
Full reconciliation UI: online payments vs ledger.
Role/permission hardening (default AllowAny risk mitigation).
Kiosk adoption pack polished UX + consent/privacy notices.
Monitoring + alerting (webhook failures, payment drift, reminder delivery).
