1) Κείμενο Περιγραφής Υπηρεσίας και Βασικών Όρων Πληρωμών (Draft)
1. Σκοπός Υπηρεσίας

Η υπηρεσία πληρωμών του newconcierge παρέχει ψηφιακή οργάνωση οφειλών πολυκατοικίας και διευκολύνει την εξόφλησή τους μέσω πιστοποιημένου παρόχου πληρωμών (Payment Provider). Η πλατφόρμα λειτουργεί ως σύστημα δημιουργίας/ενημέρωσης οφειλών, καταγραφής εξοφλήσεων και συμφωνίας (reconciliation), με στόχο την μείωση χειρόγραφης εργασίας, λαθών και διαφωνιών.

2. Ρόλοι

Γραφείο Διαχείρισης (Office Manager / Tenant): Ορίζει πολιτική πληρωμών, δημιουργεί οφειλές, καθορίζει την κατηγορία κάθε οφειλής και εκδίδει τα νόμιμα παραστατικά για τις αμοιβές διαχείρισης όπου απαιτείται.

Εσωτερικός Διαχειριστής Πολυκατοικίας (Building Manager): Παρακολουθεί οφειλές/εξοφλήσεις, δύναται (εφόσον του επιτρέπεται) να καταχωρεί χειροκίνητα πληρωμές μετρητών/καταθέσεων με πλήρη ίχνος ενεργειών.

Ένοικος (Resident): Πληρώνει οφειλές μέσω του provider και ενημερώνεται για την κατάστασή τους.

3. Τι κάνει η Πλατφόρμα

Δημιουργεί/εμφανίζει οφειλές ανά διαμέρισμα, περίοδο και κατηγορία.

Παρέχει κουμπί “Πληρωμή” που οδηγεί σε ασφαλές redirect checkout του provider.

Λαμβάνει επιβεβαίωση πληρωμής μέσω webhooks και ενημερώνει αυτόματα την οφειλή (εξοφλήθηκε/απέτυχε/ακυρώθηκε).

Παρέχει ιστορικό συναλλαγών, timestamps, αναφορές και εξαγωγές για συμφωνία.

Τηρεί audit log αλλαγών (π.χ. αλλαγή κατηγορίας οφειλής, χειροκίνητες καταχωρίσεις, ακυρώσεις).

4. Τι δεν κάνει η Πλατφόρμα

Δεν λειτουργεί ως τράπεζα, ούτε ως φορολογικός μηχανισμός.

Δεν εκδίδει φορολογικά παραστατικά αντί του Γραφείου Διαχείρισης.

Δεν εγγυάται την τελική λογιστική/φορολογική ταξινόμηση των εισροών. Η ταξινόμηση καθορίζεται από το Γραφείο Διαχείρισης (κατηγορία οφειλής + παραστατικά).

5. Κατηγορίες Οφειλών

Η πλατφόρμα υποστηρίζει, κατ’ ελάχιστον, τις παρακάτω κατηγορίες:

Λειτουργικά πολυκατοικίας (Operational / Τρέχοντα)

Αποθεματικό πολυκατοικίας (Reserve / Αποθεματικό)

Αμοιβή διαχείρισης (Management Fee / Αμοιβή Γραφείου)

6. Πολιτική Δρομολόγησης Χρημάτων (Two-IBAN Mode – Προτεινόμενο)

Το Γραφείο Διαχείρισης ορίζει στην πλατφόρμα δύο τραπεζικούς προορισμούς (IBAN) για τον ίδιο tenant:

IBAN “Κεφάλαια Πολυκατοικιών (Client Funds)”: λαμβάνει πληρωμές λειτουργικών και αποθεματικού.

IBAN “Αμοιβές Διαχείρισης (Office Fees)”: λαμβάνει αποκλειστικά πληρωμές αμοιβής διαχείρισης.

Κατά τη δημιουργία της πληρωμής στον provider, η πλατφόρμα δρομολογεί αυτόματα την πληρωμή προς το αντίστοιχο IBAN βάσει της κατηγορίας οφειλής.

7. Ροή Πληρωμής

Ο ένοικος επιλέγει οφειλή και πατά “Πληρωμή”.

Η πλατφόρμα δημιουργεί συνεδρία πληρωμής στον provider και κάνει redirect στο ασφαλές checkout.

Ο provider ολοκληρώνει την πληρωμή και αποστέλλει webhook επιβεβαίωσης.

Η πλατφόρμα ενημερώνει την οφειλή και εμφανίζει στον ένοικο/διαχειριστή την κατάσταση και τα στοιχεία συναλλαγής.

8. Προμήθειες / Κόστη

Τυχόν προμήθειες συναλλαγών ορίζονται από τον εκάστοτε provider και/ή από την εμπορική πολιτική του Γραφείου Διαχείρισης. Η πλατφόρμα δύναται να ενσωματώνει το κόστος λειτουργίας του μηχανισμού πληρωμών στη συνδρομή της.

9. Ασφάλεια και Ευθύνη

Η πλατφόρμα δεν συλλέγει/αποθηκεύει στοιχεία καρτών. Η πληρωμή εκτελείται στο checkout του provider. Η πλατφόρμα καταγράφει μόνο τεχνικά/λογιστικά δεδομένα συναλλαγής (π.χ. ποσό, ώρα, κατάσταση, αναφορά provider). Σε περίπτωση αστοχίας/αμφισβήτησης, ισχύουν οι διαδικασίες του provider και η πλατφόρμα παρέχει ιστορικό και ίχνος ενεργειών.

Αν θες να το κάνουμε “έτοιμο για υπογραφή”, μπορώ να το προσαρμόσω σε μορφή σύμβασης SaaS (με ορισμούς, διάρκεια, ακυρώσεις, GDPR annex), αλλά θα χρειαστεί νομικός έλεγχος πριν χρησιμοποιηθεί ως τελικό νομικό κείμενο.

2) Τεχνικό PRD για Payments (Redirect + Webhooks + Two-IBAN)
2.1 Στόχος (MVP)

Υλοποίηση πληρωμών οφειλών με:

Hosted checkout (redirect) σε provider

Webhooks για επιβεβαίωση

Αυτόματη ενημέρωση οφειλών, ιστορικού, dashboard συμφωνίας

Two-IBAN routing (client funds vs office fees)

Manual payments (μετρητά/κατάθεση) με audit

2.2 Πεδίο (In scope)

Δημιουργία οφειλών/charges (operational/reserve/fee)

Checkout session creation

Webhook receiver + idempotency

Receipts (επιβεβαίωση/αναφορά)

Exports CSV

RBAC permissions

Audit log

Out of scope (MVP):

Αυτόματη ανάγνωση τραπεζικών καταθέσεων (bank feed)

Payouts/marketplace split (Connect-style)

Disputes automation (μόνο προβολή καταστάσεων)

Recurring / SEPA Direct Debit (Phase 3)

2.3 Provider Strategy

1 provider αρχικά (π.χ. Viva ή Stripe)

Χρήση hosted checkout για PCI/3DS offload

Όλα τα “δέσιματα” να μπαίνουν σε metadata

2.4 Data Model (Προτεινόμενα tables)
payee_settings

id

tenant_id

mode = two_iban | one_iban

client_funds_iban (encrypted at rest)

office_fees_iban (encrypted at rest)

provider (enum)

provider_account_ref (optional)

created_at, updated_at

charges

id (internal UUID)

tenant_id

building_id

unit_id (διαμέρισμα)

resident_id (optional)

category = operational | reserve | fee

amount

currency (EUR)

period (e.g. 2025-12)

description

status = unpaid | pending | paid | cancelled | failed | refunded

due_date

created_by_user_id

created_at, updated_at

payment_attempts

id

charge_id

tenant_id, building_id

provider

provider_session_id / provider_intent_id

status = created | redirected | succeeded | failed | cancelled

amount, currency

routed_to = client_funds | office_fees (derived from category)

created_at, updated_at

payments

id

charge_id

provider

provider_payment_id

paid_at (timestamp)

amount, currency

method (card/iris/bank_transfer/unknown)

raw_summary (safe subset)

created_at

manual_payments

id

charge_id

method = cash | bank_deposit | other

recorded_by_user_id

recorded_at

note

attachment_url (optional proof)

audit_hash (optional)

webhook_events

id

provider

event_id (provider unique)

received_at

signature_valid bool

payload_json (encrypted or stored securely)

processed_at

processing_status = ok | duplicate | failed

error_message

audit_logs

id

tenant_id

actor_user_id

action (enum)

entity_type, entity_id

before, after (json)

created_at

2.5 API Endpoints (Backend)
Charges

POST /api/charges/ (create)

GET /api/charges/?building=&unit=&status=&period=&category=

PATCH /api/charges/:id (admin only, with audit)

POST /api/charges/:id/cancel (admin)

POST /api/charges/:id/mark-paid (manual payment → admin/building manager)

Payments

POST /api/payments/checkout

body: charge_id

server:

validate permissions + charge unpaid

compute routing from charge.category

create provider session

persist payment_attempt

return checkout_url

GET /api/payments/my (resident history)

GET /api/payments/building?building= (manager/office manager)

GET /api/reconciliation/summary?building=&period=

GET /api/exports/reconciliation.csv?building=&period=

Webhooks

POST /api/webhooks/:provider

verify signature

idempotency on event_id

map provider payment to payment_attempt

create payment record

update charge.status=paid + timestamps

write audit log

2.6 Webhook Rules (Must-have)

Signature verification mandatory

Idempotency: αν ξαναέρθει ίδιο event → no-op

State machine: charge can’t go paid→unpaid χωρίς admin action + audit

Late events: handle out-of-order (e.g. created→failed→succeeded)

2.7 Routing Rules (Two-IBAN)

category in (operational, reserve) → route = client_funds

category == fee → route = office_fees

Provider-side υλοποίηση routing:

Αν provider υποστηρίζει πολλαπλούς “destinations” ανά checkout → χρησιμοποιούμε αντίστοιχο destination.

Αν όχι, χρησιμοποιούμε 2 διαφορετικά merchant accounts/checkout configs ή 2 διαφορετικά payment links templates (ανά route).

2.8 Permissions (RBAC)

Resident: view own charges, pay own charges, view own payments

Building Manager: view building charges/payments, create operational/reserve charges (optional), record manual payments (optional)

Office Manager: full building scope for tenant, set IBAN policy, exports, adjustments

Superuser: global admin

2.9 UI Pages (Frontend)

Resident:

/payments (ιστορικό)

/charges (λίστα οφειλών + “Πληρωμή”)

payment-success / payment-cancel (informational)

Manager/Office:

/buildings/:id/reconciliation?period=

/buildings/:id/charges/new

/exports (CSV)

UI states:

pending confirmation (“πληρωμή σε επεξεργασία”)

succeeded

failed/cancelled

manual paid

2.10 Exports (CSV)

Columns (ελάχιστα):

building, unit, resident (masked if needed)

charge_id, category, period, amount

status, paid_at

method, provider_payment_id

routed_to (client_funds/office_fees)

created_by, recorded_by (manual)

2.11 Security & Compliance (τεχνικά)

Encrypt IBAN fields at rest

Webhook endpoints rate-limited

Store only safe payment metadata (no card PAN, no sensitive)

Audit for category changes & manual mark-paid

Admin actions require 2FA (αν έχετε) ή re-auth

2.12 Rollout Plan

Feature flag per tenant

Pilot σε 1–2 γραφεία

Παρακολούθηση metrics:

payment success rate

average time-to-pay

percent of manual payments

reconciliation mismatches (should be ~0)

Πρόταση βελτίωσης (σημαντική)

Για να μειώσεις το “λογιστικό μπέρδεμα” που ανέφερες, προτείνω να είναι default το Two-IBAN Mode και να κρύβεται το One-IBAN πίσω από “Advanced / Legacy”. Έτσι δεν αφήνεις το λάθος να γίνει by accident.

Αν θέλεις, στο επόμενο βήμα το μετατρέπω αυτούσιο σε:

έτοιμο PRD markdown για repo (/docs/payments-prd.md)

και ξεχωριστό Terms markdown (/docs/payments-terms-draft.md) ώστε να το δώσεις άμεσα στον agent/Cursor.

ok

Τέλεια. Για να το “κλειδώσουμε” πρακτικά, ιδού τα επόμενα 3 βήματα που προτείνω (χωρίς να αλλάξουμε τη λογική που συμφωνήσαμε):

Οριστικοποίηση πολιτικής: κάνουμε default το Two-IBAN Mode

IBAN “Client Funds” = λειτουργικά + αποθεματικό

IBAN “Office Fees” = μόνο αμοιβές διαχείρισης

Επιλογή provider για Phase 1

Αν θες IRIS + κάρτα άμεσα στην Ελλάδα → Viva Smart Checkout

Αν θες πιο “global/dev-first” και Phase 3 με SEPA πιο εύκολα → Stripe (με κάρτα/SEPA, χωρίς native IRIS)

Μετατροπή σε αρχεία repo

/docs/payments-terms-draft.md (το κείμενο όρων/περιγραφής υπηρεσίας)

/docs/payments-prd.md (το τεχνικό PRD)

προαιρετικά /docs/payments-data-model.md (σχήμα πινάκων + enums)

Αν μου πεις ποιον provider βάζουμε πρώτα (Viva ή Stripe), θα σου δώσω αμέσως και το “provider mapping” (ποια πεδία μπαίνουν σε metadata, ποια webhook events ακούμε, και ποια statuses χαρτογραφούμε στο δικό μας state machine).