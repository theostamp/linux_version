# newconcierge — Payments PRD (Stripe, Redirect Checkout + Webhooks, Two-IBAN)

Έκδοση: 0.1  
Phase: 1 (MVP)  
Provider: **Stripe Checkout** (κάρτα/SEPA)  
Στόχος: ασφαλής πληρωμή οφειλών + αυτόματη ενημέρωση μέσω webhooks + αναφορές/exports.

---

## 1) Problem / Why
Η σημερινή διαδικασία είσπραξης/καταγραφής κοινόχρηστων και αποθεματικών είναι συχνά χειρόγραφη. Προκύπτουν:
- καθυστερήσεις και ασάφειες (“ποιος πλήρωσε τι/πότε”),
- υψηλός φόρτος για το γραφείο,
- λάθη συμφωνίας με κινήσεις.

Η πλατφόρμα πρέπει να δώσει **ενιαίο σύστημα οφειλών + επιβεβαίωση πληρωμής** χωρίς να αγγίζει στοιχεία καρτών.

## 2) Scope (Phase 1)
### In scope
- Δημιουργία οφειλών (charges) με κατηγορίες: `operational`, `reserve`, `fee`
- Πληρωμή μέσω **Stripe Checkout** (redirect)
- Webhooks: ενημέρωση κατάστασης (paid/failed/cancelled/refunded)
- Απόδειξη/ιστορικό πληρωμών
- Dashboard συμφωνίας + εξαγωγές CSV
- Manual payments (μετρητά/κατάθεση) με audit

### Out of scope (Phase 1)
- Αυτόματη ανάγνωση τραπεζικών καταθέσεων (bank feeds)
- Split payouts/marketplace (Connect)
- Recurring χρεώσεις (Phase 3) — προετοιμασία μόνο (δομές)

## 3) Key decisions
### 3.1 Two-IBAN Mode (default)
- `operational` + `reserve` → “Client Funds”
- `fee` → “Office Fees”

### 3.2 Stripe integration style
- Hosted Checkout Session creation από backend.
- Όλα τα επιχειρησιακά IDs περνούν σε Stripe `metadata` (με σεβασμό στα όρια).
- Η “αλήθεια” πληρωμής προκύπτει από webhooks (όχι από redirect return).

## 4) Success metrics
- % επιτυχών πληρωμών / συνολικών attempts
- μέσος χρόνος από “εκδόθηκε οφειλή” → “πληρώθηκε”
- % manual payments (στόχος: πτωτική τάση)
- reconciliation mismatches (στόχος: ~0)

## 5) User stories
### Resident
- Βλέπω τις οφειλές μου και πληρώνω με 2-3 κλικ.
- Βλέπω “Πληρώθηκε” με timestamp και αναφορά συναλλαγής.

### Building Manager
- Βλέπω ανά κτίριο ποιοι πλήρωσαν/εκκρεμούν.
- Καταχωρώ μετρητά με audit (optional).

### Office Manager (Tenant)
- Ρυθμίσεις IBANs (Client Funds / Office Fees).
- Exports και report συμφωνίας ανά περίοδο.
- Ξέρω αν μια πληρωμή αφορά αμοιβή ή κεφάλαια πολυκατοικίας.

## 6) Stripe objects + Events
### 6.1 Checkout Session
- Δημιουργία `checkout.session` με `line_items` και `metadata`.

### 6.2 Webhook events (MVP set)
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded` / `checkout.session.async_payment_failed` (αν ενεργοποιηθούν delayed methods)
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- Προαιρετικά: refunds/disputes events

## 7) API Endpoints (backend)
### Charges
- `POST /api/charges/`
- `GET /api/charges/?building=&unit=&status=&period=&category=`
- `PATCH /api/charges/:id` (office/manager only + audit)
- `POST /api/charges/:id/mark-paid` (manual payment + audit)

### Payments
- `POST /api/payments/checkout` → επιστρέφει `checkout_url`
- `GET /api/payments/my`
- `GET /api/payments/building?building=`
- `GET /api/reconciliation/summary?building=&period=`
- `GET /api/exports/reconciliation.csv?building=&period=`

### Webhooks
- `POST /api/webhooks/stripe`
  - verify signature
  - idempotency on `event.id`
  - map objects via `metadata` ή `client_reference_id`
  - update `charges` + create `payments`

## 8) Metadata strategy (Stripe)
Στόχος: σύνδεση Stripe → newconcierge.
- `tenant_id`
- `building_id`
- `unit_id`
- `charge_id`
- `category`
- `period`

Constraints:
- έως 50 keys, key έως 40 chars, value έως 500 chars. (Stripe limits)

## 9) State machine (Charges & PaymentAttempts)
### Charge.status
- `unpaid` → `pending` όταν δημιουργηθεί checkout
- `pending` → `paid` μόνο από verified webhook
- `pending` → `failed` από webhook failure
- manual override μόνο από office manager με audit

## 10) Security requirements
- Webhook signature verification mandatory
- Idempotency: αποθήκευση `event.id` και no-op σε duplicates
- Encrypt at rest: αποθήκευση IBANs
- Rate limiting στο webhook endpoint
- Store only non-sensitive payment fields (όχι PAN)

## 11) UX requirements (frontend)
Resident:
- λίστα οφειλών + “Πληρωμή”
- κατάσταση: “Σε επεξεργασία” μέχρι να έρθει webhook
- σελίδες: `/payments/success`, `/payments/cancel`

Office/Manager:
- πίνακας συμφωνίας ανά building/period
- φίλτρα ανά κατηγορία
- εξαγωγή CSV

## 12) Phase 3 hooks (not implemented now)
- SEPA Direct Debit recurring (ενδεικτικά: χρέωση ανά επιτυχή χρέωση, σύμφωνα με Stripe pricing σελίδες).
