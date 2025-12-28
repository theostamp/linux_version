## Subscription Packaging, Entitlements & Pricing (V2)

### Στόχος
Να ορίσουμε **ποια modules/features είναι διαθέσιμα** ανάλογα με τη συνδρομή και να υλοποιήσουμε **τιμολόγηση ανά διαμέρισμα** με δυνατότητα **Premium ανά πολυκατοικία** για γραφεία (mix: κάποια κτίρια Premium, κάποια μόνο Web).

---

## Βασικές Αποφάσεις (κλειδωμένες)

### Τι μετράει ως billable “apartment”
- **Μετράνε όλα τα διαμερίσματα**, συμπεριλαμβανομένων **κενών/κλειστών/archived**.
- **Source of truth**: `buildings.Building.apartments_count` (δηλώνει “πόσα διαμερίσματα έχει η πολυκατοικία” ανεξάρτητα αν έχουν καταχωρηθεί όλα ως `Apartment` records).

### Premium
- **Premium (Kiosk + AI) είναι ΜΟΝΟ για γραφεία** (office accounts).
- Premium ενεργοποιείται **ανά κτίριο** (building-level), όχι οριζόντια για όλο τον tenant.

### Free
- **Free** για μεμονωμένο διαχειριστή (individual/internal manager) με:
  - **1 κτίριο**
  - **έως 7 διαμερίσματα**

### Pricing model
- **Καθαρά per-apartment** (χωρίς minimum ανά κτίριο στην v1).
- Προτείνεται **κλιμάκωση** (volume discounts) σε μεγάλες ποσότητες.

---

## Ορολογία
- **Tenant / Client**: ο οργανισμός (γραφείο ή μεμονωμένος διαχειριστής) — 1 schema.
- **Building**: πολυκατοικία μέσα στον tenant.
- **Apartment**: διαμέρισμα (billable unit).
- **Account type**: `individual` ή `office` (πρέπει να αποθηκεύεται στο `tenants.Client`).

---

## Πακέτα & Entitlements

### Individual Free
- **Eligibility**: account_type=individual AND building_count=1 AND total_apartments<=7
- **Allowed**: Core Web (βασικές λειτουργίες/κοινόχρηστα)
- **Not allowed**: Kiosk, AI

### Individual Web (Pro)
- **Allowed**: Core Web (περισσότερα features/exports/automation — ορίζονται στο feature matrix)
- **Not allowed**: Kiosk, AI (Premium only for offices)

### Office Web
- **Allowed**: Core Web (multi-building, staff)
- **Not allowed**: Kiosk, AI

### Office Premium (per building)
- **Allowed**: Core Web + Premium features (Kiosk + AI) ΜΟΝΟ για τα κτίρια που έχουν `premium_enabled=true`

---

## Τιμολογιακή Λογική (κανόνας)

### Μετρήσεις
- `total_apartments` = sum όλων των `Building.apartments_count` στον tenant
- `premium_apartments` = sum `Building.apartments_count` ΜΟΝΟ για buildings με `premium_enabled=true`

### Χρέωση (μηνιαία)
Προτείνεται “Web base + Premium add-on”:
- **Web**: χρέωση ανά διαμέρισμα για ΟΛΑ τα διαμερίσματα
- **Premium add-on**: επιπλέον χρέωση ανά διαμέρισμα ΜΟΝΟ για `premium_apartments`

Τύπος:
- `monthly = web_cost(total_apartments) + premium_addon_cost(premium_apartments)`

Όπου κάθε cost μπορεί να είναι:
- `unit_price(count) * count` με **tiered unit price** (volume discount), ή
- Stripe tiered pricing (graduated/volume) με quantity=count.

> Σημείωση: Τα ακριβή € (π.χ. “1€/apt”) είναι business decision. Το spec κρατά το μοντέλο και αφήνει τα νούμερα configurable.

---

## UX / UI Gating (Sidebar “όλα εμφανή αλλά locked”)

### Κανόνας
- Όλες οι λειτουργίες φαίνονται στο sidebar.
- Αν ένα feature δεν επιτρέπεται:
  - **disabled** (οπτικά “locked”)
  - click → **Upgrade** σελίδα (με σωστό context: ποιο building θέλει Premium, τι κερδίζει)

### Κανόνας Premium ανά building
Για routes τύπου `/kiosk-management`, `/kiosk`, AI screens:
- αν `selectedBuilding.premium_enabled=false` → locked.

---

## Backend Enforcement (μη παρακάμπτεται με URL)

### Τι επιστρέφουμε στο frontend
Επέκταση του `GET /api/buildings/current-context/?building_id=X` ώστε να περιλαμβάνει:
- `account_type` (tenant-level)
- `subscription_status` (tenant-level)
- `building_entitlements`:
  - `premium_enabled` (building-level)
  - `kiosk_enabled` (=premium_enabled && account_type==office && subscription_active)
  - `ai_enabled` (=premium_enabled && account_type==office && subscription_active)
  - `read_only` (tenant-level αν lapsed/past_due)

### Enforcement σε endpoints
- Για Kiosk public endpoints (`/api/kiosk/public/...`, `/api/kiosk/register/`):
  - reject αν `premium_enabled=false` για το building.
- Για authenticated Kiosk management endpoints:
  - reject αν `premium_enabled=false` ή αν `account_type!=office`.
- Για write endpoints σε lapsed subscription:
  - return 402/403 με `code=READ_ONLY_MODE` (και message/CTA).

---

## Stripe Modeling (προτεινόμενο)

### 1 subscription ανά tenant
Subscription items:
- `web_per_apartment` (quantity = total_apartments)
- `premium_addon_per_apartment` (quantity = premium_apartments)

### Sync strategy
Όταν αλλάζουν:
- `Building.apartments_count`
- `Building.premium_enabled`
τότε update subscription item quantities στο Stripe (με audit log).

---

## Migration / Rollout

### Εισαγωγή account_type
- Προσθέτουμε `Client.account_type` με default ασφαλές (π.χ. `office` για υπάρχοντες tenants, και `individual` για νέες self-signups που είναι internal manager).

### Εισαγωγή premium_enabled
- Προσθέτουμε `Building.premium_enabled` default `false`.

---

## Implementation checklist (high-level)
- Backend: `Client.account_type`, `Building.premium_enabled`, επέκταση `buildings/current-context`.
- Backend: enforcement στα `kiosk` endpoints.
- Frontend: sidebar locked state + Upgrade page ανά building.
- Billing/Stripe: subscription items + quantity sync (total/premium apartments).


