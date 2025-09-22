# 🗺️ Αρχιτεκτονική Ροής Δεδομένων: Προσφορές → Έργα → Δαπάνες

## 📋 Επισκόπηση Συστήματος

Το σύστημα διαχείρισης έργων του New Concierge υλοποιεί μια ολοκληρωμένη ροή από την υποβολή προσφοράς μέχρι την τελική δαπάνη, με κεντρικό άξονα τη σελίδα **Προγραμματισμός Έργου** (`/maintenance/scheduled/new`).

### 🎯 Βασικοί Στόχοι
1. **Ενιαία Διαχείριση**: Όλα τα δεδομένα ρέουν μέσω της κεντρικής φόρμας προγραμματισμού
2. **Αμφίδρομη Σύνδεση**: Τα πεδία συγχρονίζονται αυτόματα μεταξύ των οντοτήτων
3. **Αυτόματη Δημιουργία Δαπανών**: Από εγκεκριμένα έργα δημιουργούνται αυτόματα δαπάνες
4. **Διαφάνεια Κόστους**: Πλήρης ανάλυση πληρωμών και δόσεων

## ⚠️ ΚΡΙΣΙΜΟ ΠΡΟΒΛΗΜΑ & ΛΥΣΗ (Επαληθευμένο Σεπ 2025)

### 🔴 Το Πρόβλημα
**Η σύνδεση ΔΕΝ γίνεται αυτόματα!** Όταν εγκρίνεται μια προσφορά από το UI:
- ❌ ΔΕΝ δημιουργείται ScheduledMaintenance
- ❌ ΔΕΝ συγχρονίζονται τα πεδία πληρωμής
- ❌ ΔΕΝ δημιουργούνται δαπάνες

### 🟢 Η Λύση
Η συνάρτηση `update_project_schedule()` υπάρχει στο backend αλλά πρέπει να καλείται σωστά:

**Backend (`/backend/projects/views.py`):**
```python
@action(detail=True, methods=['post'])
def approve(self, request, pk=None):
    offer = self.get_object()
    with transaction.atomic():
        # 1. Εγκρίνει την προσφορά
        offer.status = 'accepted'
        offer.save()

        # 2. Ενημερώνει το έργο
        project = offer.project
        project.selected_contractor = offer.contractor_name
        project.final_cost = offer.amount
        project.payment_method = offer.payment_method
        project.installments = offer.installments
        project.advance_payment = offer.advance_payment
        project.status = 'approved'
        project.save()

        # 3. ΚΡΙΣΙΜΟ: Καλεί την update_project_schedule
        update_project_schedule(project, offer)
```

**Frontend ΠΡΕΠΕΙ να καλεί:**
```typescript
await makeRequestWithRetry({
  method: 'post',
  url: `/projects/offers/${offerId}/approve/`
});
```

### 📊 Επαληθευμένη Λειτουργία (Test Results)

**Input:**
- Εγκεκριμένη προσφορά: €6,500, 6 δόσεις, €2,000 προκαταβολή

**Output που δημιουργήθηκε:**
```
✅ ScheduledMaintenance ID: 1
   - Total Cost: €6,500.00
   - Contractor: αβφγ
   - Payment Method: installments
   - Installments: 6
   - Linked Project: eac13ada-4439-4759-acdb-5f29fa760069

✅ 7 Expenses δημιουργήθηκαν:
   - Προκαταβολή (31%): €2,000.00
   - Δόση 1/6: €750.00
   - Δόση 2/6: €750.00
   - Δόση 3/6: €750.00
   - Δόση 4/6: €750.00
   - Δόση 5/6: €750.00
   - Δόση 6/6: €750.00

✅ Transactions δημιουργήθηκαν για όλα τα διαμερίσματα
```

---

## 🏗️ Δομή Βάσης Δεδομένων

### 1️⃣ Projects (Έργα)
```python
# backend/projects/models.py
class Project:
    id = UUIDField (primary key)
    title = CharField
    description = TextField
    building = ForeignKey(Building)
    estimated_cost = DecimalField
    priority = CharField (low/medium/high/urgent)
    status = CharField (planning/tendering/evaluation/approved/in_progress/completed/cancelled)

    # Πεδία Πληρωμής (ευθυγραμμισμένα με ScheduledMaintenance)
    payment_terms = TextField
    payment_method = CharField
    installments = PositiveIntegerField
    advance_payment = DecimalField
    selected_contractor = CharField  # Ενημερώνεται από approved offer
    final_cost = DecimalField        # Ενημερώνεται από approved offer

    # Συνδέσεις
    linked_expense = ForeignKey(Expense)  # Σύνδεση με δαπάνη
```

### 2️⃣ Offers (Προσφορές)
```python
# backend/projects/models.py
class Offer:
    id = UUIDField (primary key)
    project = ForeignKey(Project)
    contractor_name = CharField
    contractor_contact = CharField
    contractor_phone = CharField
    contractor_email = EmailField
    amount = DecimalField

    # Πεδία Πληρωμής (ίδια με Project)
    payment_terms = TextField
    payment_method = CharField
    installments = PositiveIntegerField
    advance_payment = DecimalField

    status = CharField (submitted/under_review/accepted/rejected/withdrawn)
```

### 3️⃣ ScheduledMaintenance (Προγραμματισμένα Έργα)
```python
# backend/maintenance/models.py
class ScheduledMaintenance:
    id = AutoField (primary key)
    title = CharField
    description = TextField
    building = ForeignKey(Building)
    contractor = ForeignKey(Contractor)
    scheduled_date = DateField
    priority = CharField
    status = CharField

    # Ενοποιημένα Πεδία Κόστους
    estimated_cost = DecimalField
    actual_cost = DecimalField
    total_cost = DecimalField  # Κύριο πεδίο για UI

    # Πεδία Πληρωμής (από εγκεκριμένες προσφορές)
    payment_method = CharField
    installments = PositiveIntegerField
    advance_payment = DecimalField
    payment_terms = TextField

    # Στοιχεία Συνεργείου (απευθείας αποθήκευση)
    contractor_name = CharField
    contractor_contact = CharField
    contractor_phone = CharField
    contractor_email = EmailField

    # Συνδέσεις
    linked_project = ForeignKey(Project)  # Από εγκεκριμένη προσφορά
    linked_expense = ForeignKey(Expense)  # Δημιουργημένη δαπάνη
```

### 4️⃣ Expense (Δαπάνες)
```python
# backend/financial/models.py
class Expense:
    id = AutoField (primary key)
    building = ForeignKey(Building)
    title = CharField
    amount = DecimalField
    date = DateField
    category = CharField
    distribution_type = CharField

    # Συνδεδεμένα έργα
    scheduled_maintenance_tasks = reverse FK από ScheduledMaintenance
    linked_projects = reverse FK από Project
```

### 5️⃣ PaymentSchedule (Πρόγραμμα Πληρωμών)
```python
# backend/maintenance/models.py
class PaymentSchedule:
    scheduled_maintenance = OneToOneField(ScheduledMaintenance)
    payment_type = CharField (lump_sum/advance_installments/periodic/milestone_based)
    total_amount = DecimalField
    advance_percentage = IntegerField
    installment_count = IntegerField
    installment_frequency = CharField
    start_date = DateField
```

---

## 🔄 Ροή Δεδομένων (Επαληθευμένη)

### Βήμα 1: Δημιουργία Έργου & Συλλογή Προσφορών
```
[Δημιουργία Έργου] → [Project]
                          ↓
                   [Tender Deadline]
                          ↓
              [Συλλογή Προσφορών] → [Offers]
```

### Βήμα 2: Έγκριση Προσφοράς (ΚΡΙΣΙΜΟ)
```
[Frontend: Button "Έγκριση"]
            ↓
[POST /projects/offers/{id}/approve/]
            ↓
[Backend: approve() action]
            ↓
[Offer Status: accepted]
            ↓
[Update Project με fields από Offer]
            ↓
[ΚΑΛΕΙ update_project_schedule(project, offer)]
            ↓
[Δημιουργεί ScheduledMaintenance + Expenses]
```

### Βήμα 3: Αυτόματη Δημιουργία από update_project_schedule()
```python
def update_project_schedule(project, offer=None):
    # 1. Δημιουργεί/Ενημερώνει ScheduledMaintenance
    scheduled_maintenance = ScheduledMaintenance.objects.get_or_create(
        linked_project=project,
        defaults={
            'title': project.title,
            'total_cost': project.final_cost,
            'contractor_name': offer.contractor_name,
            'contractor_phone': offer.contractor_phone,
            'contractor_email': offer.contractor_email,
            'payment_method': offer.payment_method,
            'installments': offer.installments,
            'advance_payment': offer.advance_payment
        }
    )

    # 2. Δημιουργεί Expenses για δόσεις
    if installments > 1:
        # Προκαταβολή
        create_expense(
            title=f"{project.title} - Προκαταβολή",
            amount=advance_payment
        )

        # Δόσεις
        for i in range(1, installments + 1):
            create_expense(
                title=f"{project.title} - Δόση {i}/{installments}",
                amount=installment_amount
            )
```

### Βήμα 4: Χειροκίνητη Δημιουργία Δαπανών (Εναλλακτικά)
```
[ScheduledMaintenance Status: completed] → [Receipt Modal]
                                                  ↓
                                           [Create Expense]
                                                  ↓
                                           [ServiceReceipt]
```

---

## 💻 Frontend Components

### 📄 ProjectOffersTab (`/frontend/app/(dashboard)/projects/[id]/page.tsx`)

**ΚΡΙΣΙΜΟ: Σωστή κλήση του approve endpoint:**
```typescript
// Γραμμή 254-268
onConfirm={async () => {
  if (!confirm.id) return;
  try {
    setIsApproving(true);
    // ΣΩΣΤΟ ENDPOINT
    await makeRequestWithRetry({
      method: 'post',
      url: `/projects/offers/${confirm.id}/approve/`,  // ← ΚΡΙΣΙΜΟ
      xToastSuppress: true
    });
    toast({ title: 'Επιτυχία', description: 'Η προσφορά εγκρίθηκε.' });
    setRefresh((n) => n + 1);
    onApproved && onApproved();
  } catch (e: any) {
    toast({ title: 'Σφάλμα', description: e?.message ?? 'Αποτυχία έγκρισης' });
  }
}}
```

### 📄 ScheduledMaintenanceForm (`/frontend/components/maintenance/ScheduledMaintenanceForm.tsx`)

**Λειτουργικότητα:**
- Κεντρική φόρμα για δημιουργία/επεξεργασία προγραμματισμένων έργων
- Auto-populate από εγκεκριμένες προσφορές (γραμμές 156-181)
- Διαχείριση πληρωμών μέσω `PaymentConfigurationSection`
- Modal για δημιουργία απόδειξης/δαπάνης (γραμμές 916-1039)

---

## 🔧 Backend API Endpoints

### Projects API
```python
# /api/projects/projects/
GET    - Λίστα έργων
POST   - Δημιουργία έργου
GET    /{id}/ - Λεπτομέρειες έργου με offers
PATCH  /{id}/ - Ενημέρωση έργου
DELETE /{id}/ - Διαγραφή έργου
```

### Offers API (ΚΡΙΣΙΜΟ)
```python
# /api/projects/offers/
GET    - Λίστα προσφορών
POST   - Υποβολή προσφοράς
GET    /{id}/ - Λεπτομέρειες προσφοράς
PATCH  /{id}/ - Ενημέρωση προσφοράς

# ΚΡΙΣΙΜΟ ENDPOINT
POST   /{id}/approve/ - Έγκριση προσφοράς & αυτόματη δημιουργία ScheduledMaintenance
POST   /{id}/reject/  - Απόρριψη προσφοράς
```

### ScheduledMaintenance API
```python
# /api/maintenance/scheduled/
GET    - Λίστα προγραμματισμένων έργων
POST   - Δημιουργία έργου
GET    /{id}/ - Λεπτομέρειες έργου
PATCH  /{id}/ - Ενημέρωση έργου
DELETE /{id}/ - Διαγραφή έργου

# Custom endpoints
POST   /{id}/create_payment_schedule/ - Δημιουργία προγράμματος πληρωμών
```

---

## 🚀 Οδηγίες Υλοποίησης

### 1. Έγκριση Προσφοράς (Σωστή Διαδικασία)

**Frontend:**
```typescript
// ΣΩΣΤΟ - Καλεί το approve endpoint
await api.post(`/projects/offers/${offerId}/approve/`);

// ΛΑΘΟΣ - Απλή ενημέρωση status
await api.patch(`/projects/offers/${offerId}/`, { status: 'accepted' });
```

**Backend (αυτόματη εκτέλεση):**
```python
# Στο OfferViewSet.approve():
1. offer.status = 'accepted'
2. project.selected_contractor = offer.contractor_name
3. project.final_cost = offer.amount
4. project.payment_method = offer.payment_method
5. project.installments = offer.installments
6. project.advance_payment = offer.advance_payment
7. project.status = 'approved'
8. update_project_schedule(project, offer)  # ΚΡΙΣΙΜΟ!
```

### 2. Χειροκίνητη Διόρθωση (αν χρειάζεται)

**Python Script:**
```python
from projects.views import update_project_schedule
from projects.models import Project, Offer

# Βρες εγκεκριμένη προσφορά που δεν έχει ScheduledMaintenance
offer = Offer.objects.filter(status='accepted').first()
project = offer.project

# Ενημέρωσε το project
project.selected_contractor = offer.contractor_name
project.final_cost = offer.amount
project.payment_method = offer.payment_method
project.installments = offer.installments
project.advance_payment = offer.advance_payment
project.status = 'approved'
project.save()

# Κάλεσε τη συνάρτηση
update_project_schedule(project, offer)
```

---

## 🐛 Αντιμετώπιση Προβλημάτων

### Πρόβλημα 1: Δεν δημιουργείται ScheduledMaintenance
**Αιτία:** Το frontend δεν καλεί το `/approve/` endpoint
**Λύση:** Βεβαιωθείτε ότι χρησιμοποιείται το σωστό endpoint

### Πρόβλημα 2: Διπλές Δαπάνες
**Αιτία:** Η `update_project_schedule()` καλείται πολλές φορές
**Λύση:** Χρήση `get_or_create` και έλεγχος για existing expenses

### Πρόβλημα 3: Ασυγχρόνιστα Πεδία
**Αιτία:** Το Project δεν ενημερώνεται από την Offer
**Λύση:** Βεβαιωθείτε ότι όλα τα πεδία αντιγράφονται στο approve()

---

## ✅ Checklist Ελέγχου

### Έγκριση Προσφοράς
- [ ] Frontend καλεί `/projects/offers/{id}/approve/`
- [ ] Offer status γίνεται 'accepted'
- [ ] Project ενημερώνεται με όλα τα πεδία από Offer
- [ ] Project status γίνεται 'approved'
- [ ] Καλείται η `update_project_schedule()`

### Δημιουργία ScheduledMaintenance
- [ ] Δημιουργείται με `linked_project` reference
- [ ] Αντιγράφονται όλα τα contractor fields
- [ ] Αντιγράφονται όλα τα payment fields
- [ ] `total_cost` = `offer.amount`

### Δημιουργία Δαπανών
- [ ] Δημιουργείται προκαταβολή (αν installments > 1)
- [ ] Δημιουργούνται δόσεις για κάθε μήνα
- [ ] Κάθε expense έχει σωστό amount
- [ ] Δημιουργούνται transactions για διαμερίσματα

---

## 📚 Σχετικά Αρχεία

### Frontend
- `/frontend/app/(dashboard)/projects/[id]/page.tsx` - Project details με Offers tab
- `/frontend/components/maintenance/ScheduledMaintenanceForm.tsx` - Κεντρική φόρμα
- `/frontend/components/maintenance/PaymentConfigurationSection.tsx` - Διαμόρφωση πληρωμών

### Backend
- `/backend/projects/views.py` - **ΚΡΙΣΙΜΟ: approve() & update_project_schedule()**
- `/backend/maintenance/models.py` - Models για ScheduledMaintenance
- `/backend/projects/models.py` - Models για Project, Offer
- `/backend/financial/models.py` - Model για Expense

### Test Scripts
- `/test_and_fix_offer_flow.py` - Script για έλεγχο και διόρθωση της ροής
- `/check_offer_project_connection.py` - Script για έλεγχο συνδέσεων

---

## 🔄 Μελλοντικές Βελτιώσεις

1. **Automated Trigger**: Signal που καλεί `update_project_schedule()` όταν offer.status='accepted'
2. **UI Feedback**: Progress indicator κατά τη δημιουργία expenses
3. **Validation**: Pre-check πριν την έγκριση για required fields
4. **Rollback**: Μηχανισμός ακύρωσης αν αποτύχει κάποιο βήμα
5. **Audit Trail**: Log για κάθε βήμα της διαδικασίας

---

## 📞 Επικοινωνία & Support

Για οποιαδήποτε απορία ή πρόβλημα στην υλοποίηση, ανατρέξτε στο CLAUDE.md ή χρησιμοποιήστε τα test scripts για διάγνωση.

---

## 7. Επαλήθευση Λειτουργίας (22 Σεπτεμβρίου 2025)

### ✅ ΤΕΛΙΚΗ ΕΠΙΤΥΧΗΣ ΕΠΑΛΗΘΕΥΣΗ

Μετά τις διορθώσεις, η ροή λειτουργεί ΠΛΗΡΩΣ:

```
🎯 ΤΕΛΙΚΗ ΕΠΑΛΗΘΕΥΣΗ ΡΟΗΣ: OFFER → PROJECT → SCHEDULED → EXPENSES
======================================================================
1️⃣ PROJECT:
   • Status: approved ✅
   • Final Cost: 6500.00€ ✅
   • Contractor: αβφγ ✅

2️⃣ ACCEPTED OFFER:
   • Status: accepted ✅
   • Amount: 6500.00€
   • Advance: 2000.00€
   • Installments: 6

3️⃣ SCHEDULED MAINTENANCE:
   • ID: 1 ✅
   • Total Cost: 6500.00€
   • Linked to Project ✅

4️⃣ EXPENSES (Total: 7):
   1. Προκαταβολή: 2000.00€
   2-7. Δόσεις 1-6: 750.00€ each

   📊 ΣΥΝΟΛΟ: 6500.00€ ✅

🎉 ΟΛΕΣ ΟΙ ΕΠΑΛΗΘΕΥΣΕΙΣ ΠΕΡΑΣΑΝ!
```

### 🛡️ ΠΡΟΣΤΑΣΙΑ ΚΩΔΙΚΑ

Για την προστασία της κρίσιμης ροής έχουν προστεθεί:

1. **Warning Comments** σε κρίσιμες συναρτήσεις:
   - `backend/projects/views.py::approve()`
   - `backend/projects/views.py::update_project_schedule()`
   - `frontend/app/(dashboard)/projects/[id]/page.tsx`

2. **Unit Tests**:
   - `backend/projects/tests/test_offer_approval_flow.py`

3. **Git Pre-commit Hook**:
   - `.githooks/pre-commit-offer-flow`

4. **Expense Deletion Protection**:
   - `frontend/components/financial/ExpenseList.tsx`
   - Εμποδίζει διαγραφή δαπανών από προγραμματισμένα έργα
   - Ανακατευθύνει στη σελίδα του έργου

---

*Τελευταία ενημέρωση: 22 Σεπτεμβρίου 2025*
*Επαληθεύτηκε με πραγματικά δεδομένα στη βάση demo*