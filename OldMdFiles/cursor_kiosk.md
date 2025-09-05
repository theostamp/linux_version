# Οργάνωση περιεχομένου στο kiosk
_Exported on 8/3/2025 at 00:01:04 GMT+3 from Cursor (1.3.8)_

---

**User**

Υπάρχουν καποιες εμφανίσεις που θα πρέπει να γινονται  στο kiosk αλλα και στον τομεα των ανακοινώσεων . Για παράδειγμα η κατάσταση πληρωμών των κοινοχρήστων ,  η καταχώρηση αποδείξεων παροχής υπηρεσιων απο τα συνεργεάια επισκευης , καθαρισμου και αλλα, καθως επίσης και οι προσφορές που που συγκεντρώνονται για αξιολογηση σε διαφορα έργα. Πως προτεινεις να γινουν αυτα?  Να προσθέταμε καποιες ενότηταε στο μενου, οπως για παραδειγμα "Τεχνικα" , Οικονομικα, ή κατι ποιο αναλυτικό οπως Προσφορές, πληρωμες, εισπραξεις, συνεργεια.....   Ποια πιστευεις οτι ειναι η καλυτερη προσεγγιση?

---

**Cursor**

Θα εξετάσω την τρέχουσα δομή του project για να κατανοήσω καλύτερα το σύστημα και να προτείνω την καλύτερη προσέγγιση για τις νέες λειτουργίες.


Τώρα θα εξετάσω τη δομή του frontend για να κατανοήσω καλύτερα το σύστημα:


Με βάση την ανάλυση του συστήματος, μπορώ να προτείνω την καλύτερη προσέγγιση για τις νέες λειτουργίες που αναφέρετε. Το σύστημα έχει ήδη μια καλή βάση με τα υπάρχοντα modules και μπορούμε να το επεκτείνουμε με λογικό τρόπο.

## �� Προτεινόμενη Προσέγγιση

### 1. **Επεκταση του Υπάρχοντος Menu με Κατηγορίες**

Προτείνω να προσθέσουμε νέες ενότητες στο menu με την εξής δομή:

```typescript
// Νέα ενότητες στο Sidebar.tsx
const mainLinks = [
  // ... υπάρχοντα links ...
  
  // 🔧 Περιοδικές Υπηρεσίες
  {
    href: '/maintenance',
    label: 'Περιοδικές Υπηρεσίες',
    icon: <Wrench className="w-5 h-5" />,
    roles: ['manager', 'staff', 'superuser'],
  },
  
  // �� Οικονομικά
  {
    href: '/financial',
    label: 'Οικονομικά',
    icon: <Euro className="w-5 h-5" />,
    roles: ['manager', 'staff', 'superuser'],
  },
  
  // �� Προσφορές & Έργα
  {
    href: '/projects',
    label: 'Προσφορές & Έργα',
    icon: <FileText className="w-5 h-5" />,
    roles: ['manager', 'staff', 'superuser'],
  },
];
```

### 2. **Δομή των Νέων Modules**

#### **🔧 Περιοδικές Υπηρεσίες** (`/maintenance`)
- **Συνεργεία**: Διαχείριση συνεργείων επισκευών, καθαρισμού, ασφαλείας
- **Αποδείξεις Παροχής**: Upload και διαχείριση αποδείξεων από συνεργεία
- **Προγραμματισμένα Έργα**: Προγραμματισμός συντηρήσεων
- **Ιστορικό Έργων**: Παρακολούθηση ολοκληρωμένων έργων

#### **💰 Οικονομικά** (`/financial`)
- **Κατάσταση Πληρωμών**: Επισκόπηση πληρωμών κοινοχρήστων
- **Εισπράξεις**: Διαχείριση εισπράξεων και αποδείξεων
- **Λογαριασμοί**: Διαχείριση λογαριασμών κτιρίου
- **Reports**: Οικονομικά reports και αναλύσεις

#### **�� Προσφορές & Έργα** (`/projects`)
- **Προσφορές**: Διαχείριση προσφορών για έργα
- **Αξιολογήσεις**: Συγκέντρωση και αξιολόγηση προσφορών
- **Έργα**: Διαχείριση ενεργών έργων
- **Συμβόλαια**: Διαχείριση συμβολαίων με συνεργεία

### 3. **Επεκταση του Kiosk Mode**

Το kiosk mode μπορεί να εμφανίζει:

#### **📊 Οικονομική Επισκόπηση**
- Κατάσταση πληρωμών (ποσοστό πληρωμένων)
- Εκκρεμότητες διαχείρισης
- Προσεχείς ληξιπρόθεσμες πληρωμές

#### **🔧 Τεχνική Κατάσταση**
- Ενεργά αιτήματα συντήρησης
- Προγραμματισμένα έργα
- Κατάσταση συνεργείων

#### **📋 Ενεργά Έργα**
- Προσεχείς προσφορές για αξιολόγηση
- Ενεργά έργα με προόδους
- Σημαντικές ημερομηνίες

### 4. **Προτεινόμενη Υλοποίηση**

#### **Backend Models** (νέα Django apps):

```python
# backend/maintenance/models.py
class Contractor(models.Model):
    name = models.CharField(max_length=255)
    service_type = models.CharField(max_length=100)  # repair, cleaning, security
    contact_info = models.JSONField()
    rating = models.DecimalField(max_digits=3, decimal_places=2)
    
class ServiceReceipt(models.Model):
    contractor = models.ForeignKey(Contractor, on_delete=models.CASCADE)
    building = models.ForeignKey(Building, on_delete=models.CASCADE)
    service_date = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    receipt_file = models.FileField(upload_to='receipts/')
    description = models.TextField()

# backend/financial/models.py
class Payment(models.Model):
    apartment = models.ForeignKey(Apartment, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=20)  # paid, pending, overdue
    payment_date = models.DateField(null=True, blank=True)

# backend/projects/models.py
class Project(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    building = models.ForeignKey(Building, on_delete=models.CASCADE)
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20)  # planning, bidding, in_progress, completed

class Offer(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    contractor = models.ForeignKey(Contractor, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    submitted_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20)  # pending, accepted, rejected
```

#### **Frontend Structure**:

```
frontend/app/(dashboard)/
├── maintenance/
│   ├── page.tsx              # Main maintenance dashboard
│   ├── contractors/
│   ├── receipts/
│   └── scheduled/
├── financial/
│   ├── page.tsx              # Financial overview
│   ├── payments/
│   ├── receipts/
│   └── reports/
└── projects/
    ├── page.tsx              # Projects overview
    ├── offers/
    ├── active/
    └── contracts/
```

### 5. **Πλεονεκτήματα αυτής της Προσέγγισης**

✅ **Λογική Οργάνωση**: Κάθε ενότητα έχει ξεκάθαρο σκοπό
✅ **Επεκτασιμότητα**: Εύκολη προσθήκη νέων λειτουργιών
✅ **User Experience**: Διαισθητικό menu με κατηγορίες
✅ **Kiosk Integration**: Αυτόματη εμφάνιση σημαντικών πληροφοριών
✅ **Role-based Access**: Διαφορετικά δικαιώματα ανά ρόλο
✅ **Consistency**: Ακολουθεί την υπάρχουσα αρχιτεκτονική

### 6. **Επόμενα Βήματα**

1. **Δημιουργία των νέων Django apps** (maintenance, financial, projects)
2. **Σχεδιασμός των models** και relationships
3. **Υλοποίηση των APIs** για κάθε module
4. **Δημιουργία των frontend pages** με responsive design
5. **Επεκταση του kiosk mode** με νέες πληροφορίες
6. **Testing και optimization**

Αυτή η προσέγγιση παρέχει μια **ολοκληρωμένη λύση** που επεκτείνει το υπάρχον σύστημα με λογικό τρόπο, διατηρώντας την καλή αρχιτεκτονική και user experience.

```typescript
// Νέα ενότητες στο Sidebar.tsx
const mainLinks = [
  // ... υπάρχοντα links ...
  
  // 🔧 Περιοδικές Υπηρεσίες
  {
    href: '/maintenance',
    label: 'Περιοδικές Υπηρεσίες',
    icon: <Wrench className="w-5 h-5" />,
    roles: ['manager', 'staff', 'superuser'],
  },
  
  // �� Οικονομικά
  {
    href: '/financial',
    label: 'Οικονομικά',
    icon: <Euro className="w-5 h-5" />,
    roles: ['manager', 'staff', 'superuser'],
  },
  
  // �� Προσφορές & Έργα
  {
    href: '/projects',
    label: 'Προσφορές & Έργα',
    icon: <FileText className="w-5 h-5" />,
    roles: ['manager', 'staff', 'superuser'],
  },
];
```

```python
# backend/maintenance/models.py
class Contractor(models.Model):
    name = models.CharField(max_length=255)
    service_type = models.CharField(max_length=100)  # repair, cleaning, security
    contact_info = models.JSONField()
    rating = models.DecimalField(max_digits=3, decimal_places=2)
    
class ServiceReceipt(models.Model):
    contractor = models.ForeignKey(Contractor, on_delete=models.CASCADE)
    building = models.ForeignKey(Building, on_delete=models.CASCADE)
    service_date = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    receipt_file = models.FileField(upload_to='receipts/')
    description = models.TextField()

# backend/financial/models.py
class Payment(models.Model):
    apartment = models.ForeignKey(Apartment, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=20)  # paid, pending, overdue
    payment_date = models.DateField(null=True, blank=True)

# backend/projects/models.py
class Project(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    building = models.ForeignKey(Building, on_delete=models.CASCADE)
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20)  # planning, bidding, in_progress, completed

class Offer(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    contractor = models.ForeignKey(Contractor, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    submitted_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20)  # pending, accepted, rejected
```

```plaintext
frontend/app/(dashboard)/
├── maintenance/
│   ├── page.tsx              # Main maintenance dashboard
│   ├── contractors/
│   ├── receipts/
│   └── scheduled/
├── financial/
│   ├── page.tsx              # Financial overview
│   ├── payments/
│   ├── receipts/
│   └── reports/
└── projects/
    ├── page.tsx              # Projects overview
    ├── offers/
    ├── active/
    └── contracts/
```

---

**User**

ωραια ας προχωρήσουμε την υλοποιηση των προτασεων που εκανες και μου φαινονται οργανωτικα σωστες

---

**Cursor**

Εξαιρετικά! Ας ξεκινήσουμε με την υλοποίηση των προτάσεων μου. Θα προχωρήσω με λογική σειρά, ξεκινώντας από το backend και μετά το frontend.

## �� Ξεκινάμε την Υλοποίηση

### 1. Πρώτα, ας δημιουργήσουμε τα νέα Django apps


### 2. Ας ελέγξουμε ότι δημιουργήθηκαν τα apps


Τέλεια! Τα apps δημιουργήθηκαν. Τώρα ας ξεκινήσουμε με το **maintenance app**.

### 3. Υλοποίηση του Maintenance App


```python
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from buildings.models import Building
from django.contrib.auth import get_user_model

User = get_user_model()

class Contractor(models.Model):
    """Μοντέλο για συνεργεία επισκευών, καθαρισμού, ασφαλείας κλπ"""
    
    SERVICE_TYPES = [
        ('repair', 'Επισκευές'),
        ('cleaning', 'Καθαριότητα'),
        ('security', 'Ασφάλεια'),
        ('electrical', 'Ηλεκτρολογικά'),
        ('plumbing', 'Υδραυλικά'),
        ('heating', 'Θέρμανση/Κλιματισμός'),
        ('elevator', 'Ανελκυστήρες'),
        ('landscaping', 'Κηπουρική'),
        ('other', 'Άλλο'),
    ]
    
    name = models.CharField(max_length=255, verbose_name="Όνομα Συνεργείου")
    service_type = models.CharField(
        max_length=20, 
        choices=SERVICE_TYPES,
        verbose_name="Τύπος Υπηρεσίας"
    )
    contact_person = models.CharField(max_length=255, verbose_name="Επικοινωνία")
    phone = models.CharField(max_length=20, verbose_name="Τηλέφωνο")
    email = models.EmailField(blank=True, verbose_name="Email")
    address = models.TextField(blank=True, verbose_name="Διεύθυνση")
    tax_number = models.CharField(max_length=20, blank=True, verbose_name="ΑΦΜ")
    rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        default=0,
        verbose_name="Αξιολόγηση"
    )
    is_active = models.BooleanField(default=True, verbose_name="Ενεργό")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Συνεργείο"
        verbose_name_plural = "Συνεργεία"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_service_type_display()})"

class ServiceReceipt(models.Model):
    """Μοντέλο για αποδείξεις παροχής υπηρεσιών από συνεργεία"""
    
    contractor = models.ForeignKey(
        Contractor, 
        on_delete=models.CASCADE,
        related_name='receipts',
        verbose_name="Συνεργείο"
    )
    building = models.ForeignKey(
        Building, 
        on_delete=models.CASCADE,
        related_name='service_receipts',
        verbose_name="Κτίριο"
    )
    service_date = models.DateField(verbose_name="Ημερομηνία Υπηρεσίας")
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        verbose_name="Ποσό"
    )
    receipt_file = models.FileField(
        upload_to='receipts/%Y/%m/',
        verbose_name="Απόδειξη"
    )
    description = models.TextField(verbose_name="Περιγραφή Υπηρεσίας")
    invoice_number = models.CharField(
        max_length=50, 
        blank=True,
        verbose_name="Αριθμός Τιμολογίου"
    )
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Εκκρεμεί'),
            ('paid', 'Πληρωμένο'),
            ('overdue', 'Ληξιπρόθεσμο'),
        ],
        default='pending',
        verbose_name="Κατάσταση Πληρωμής"
    )
    payment_date = models.DateField(
        null=True, 
        blank=True,
        verbose_name="Ημερομηνία Πληρωμής"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_receipts',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Απόδειξη Υπηρεσίας"
        verbose_name_plural = "Αποδείξεις Υπηρεσιών"
        ordering = ['-service_date']
    
    def __str__(self):
        return f"{self.contractor.name} - {self.service_date} - €{self.amount}"

class ScheduledMaintenance(models.Model):
    """Μοντέλο για προγραμματισμένα έργα συντήρησης"""
    
    PRIORITY_CHOICES = [
        ('low', 'Χαμηλή'),
        ('medium', 'Μέτρια'),
        ('high', 'Υψηλή'),
        ('urgent', 'Επείγουσα'),
    ]
    
    STATUS_CHOICES = [
        ('scheduled', 'Προγραμματισμένο'),
        ('in_progress', 'Σε Εξέλιξη'),
        ('completed', 'Ολοκληρωμένο'),
        ('cancelled', 'Ακυρώθηκε'),
    ]
    
    title = models.CharField(max_length=255, verbose_name="Τίτλος")
    description = models.TextField(verbose_name="Περιγραφή")
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='scheduled_maintenance',
        verbose_name="Κτίριο"
    )
    contractor = models.ForeignKey(
        Contractor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='scheduled_work',
        verbose_name="Συνεργείο"
    )
    scheduled_date = models.DateField(verbose_name="Προγραμματισμένη Ημερομηνία")
    estimated_duration = models.IntegerField(
        help_text="Διάρκεια σε ώρες",
        verbose_name="Εκτιμώμενη Διάρκεια"
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name="Προτεραιότητα"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='scheduled',
        verbose_name="Κατάσταση"
    )
    estimated_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Εκτιμώμενο Κόστος"
    )
    actual_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Πραγματικό Κόστος"
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Τοποθεσία"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_maintenance',
        verbose_name="Δημιουργήθηκε από"
    )
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Ολοκλήρωσης")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Προγραμματισμένη Συντήρηση"
        verbose_name_plural = "Προγραμματισμένες Συντηρήσεις"
        ordering = ['scheduled_date', 'priority']
    
    def __str__(self):
        return f"{self.title} - {self.building.name} - {self.scheduled_date}"
```

### 4. Δημιουργία του Financial App


```python
from django.db import models
from django.core.validators import MinValueValidator
from buildings.models import Building
from apartments.models import Apartment
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class Payment(models.Model):
    """Μοντέλο για πληρωμές κοινοχρήστων"""
    
    PAYMENT_TYPES = [
        ('common_expenses', 'Κοινοχρήστων'),
        ('heating', 'Θέρμανση'),
        ('electricity_common', 'Ηλεκτρικό Κοινοχρήστων'),
        ('cleaning', 'Καθαριότητα'),
        ('security', 'Ασφάλεια'),
        ('elevator', 'Ανελκυστήρες'),
        ('other', 'Άλλο'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί'),
        ('paid', 'Πληρωμένο'),
        ('overdue', 'Ληξιπρόθεσμο'),
        ('partial', 'Μερική Πληρωμή'),
    ]
    
    apartment = models.ForeignKey(
        Apartment,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name="Διαμέρισμα"
    )
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPES,
        verbose_name="Τύπος Πληρωμής"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Ποσό"
    )
    due_date = models.DateField(verbose_name="Ημερομηνία Λήξης")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Κατάσταση"
    )
    payment_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Ημερομηνία Πληρωμής"
    )
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Ποσό που Πληρώθηκε"
    )
    payment_method = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Μέθοδος Πληρωμής"
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Αριθμός Αναφοράς"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_payments',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Πληρωμή"
        verbose_name_plural = "Πληρωμές"
        ordering = ['-due_date']
    
    def __str__(self):
        return f"{self.apartment} - {self.get_payment_type_display()} - €{self.amount}"
    
    @property
    def is_overdue(self):
        """Ελέγχει αν η πληρωμή είναι ληξιπρόθεσμη"""
        return self.due_date < timezone.now().date() and self.status != 'paid'
    
    @property
    def remaining_amount(self):
        """Υπολογίζει το υπόλοιπο ποσό"""
        return self.amount - self.amount_paid

class FinancialReceipt(models.Model):
    """Μοντέλο για αποδείξεις εισπράξεων"""
    
    RECEIPT_TYPES = [
        ('cash', 'Μετρητά'),
        ('bank_transfer', 'Τραπεζική Μεταφορά'),
        ('check', 'Επιταγή'),
        ('online', 'Online Πληρωμή'),
        ('other', 'Άλλο'),
    ]
    
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='receipts',
        verbose_name="Πληρωμή"
    )
    receipt_type = models.CharField(
        max_length=20,
        choices=RECEIPT_TYPES,
        verbose_name="Τύπος Απόδειξης"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Ποσό"
    )
    receipt_date = models.DateField(verbose_name="Ημερομηνία Απόδειξης")
    receipt_file = models.FileField(
        upload_to='financial_receipts/%Y/%m/',
        blank=True,
        verbose_name="Αρχείο Απόδειξης"
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Αριθμός Αναφοράς"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_financial_receipts',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Απόδειξη Εισπράξεως"
        verbose_name_plural = "Αποδείξεις Εισπράξεων"
        ordering = ['-receipt_date']
    
    def __str__(self):
        return f"{self.payment.apartment} - {self.receipt_date} - €{self.amount}"

class BuildingAccount(models.Model):
    """Μοντέλο για λογαριασμούς κτιρίου"""
    
    ACCOUNT_TYPES = [
        ('operating', 'Λειτουργικός'),
        ('reserve', 'Αποθεματικό'),
        ('special', 'Ειδικός'),
    ]
    
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='accounts',
        verbose_name="Κτίριο"
    )
    account_type = models.CharField(
        max_length=20,
        choices=ACCOUNT_TYPES,
        verbose_name="Τύπος Λογαριασμού"
    )
    account_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Αριθμός Λογαριασμού"
    )
    bank_name = models.CharField(
        max_length=100,
        verbose_name="Όνομα Τράπεζας"
    )
    current_balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name="Τρέχον Υπόλοιπο"
    )
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    is_active = models.BooleanField(default=True, verbose_name="Ενεργός")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Λογαριασμός Κτιρίου"
        verbose_name_plural = "Λογαριασμοί Κτιρίου"
        unique_together = ['building', 'account_type']
    
    def __str__(self):
        return f"{self.building.name} - {self.get_account_type_display()} - €{self.current_balance}"

class FinancialTransaction(models.Model):
    """Μοντέλο για οικονομικές συναλλαγές"""
    
    TRANSACTION_TYPES = [
        ('income', 'Έσοδο'),
        ('expense', 'Έξοδο'),
    ]
    
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='financial_transactions',
        verbose_name="Κτίριο"
    )
    account = models.ForeignKey(
        BuildingAccount,
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name="Λογαριασμός"
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPES,
        verbose_name="Τύπος Συναλλαγής"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Ποσό"
    )
    description = models.TextField(verbose_name="Περιγραφή")
    transaction_date = models.DateField(verbose_name="Ημερομηνία Συναλλαγής")
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Αριθμός Αναφοράς"
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Κατηγορία"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_transactions',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Οικονομική Συναλλαγή"
        verbose_name_plural = "Οικονομικές Συναλλαγές"
        ordering = ['-transaction_date']
    
    def __str__(self):
        return f"{self.building.name} - {self.get_transaction_type_display()} - €{self.amount}"
    
    def save(self, *args, **kwargs):
        """Ενημέρωση του υπολοίπου του λογαριασμού"""
        if self.transaction_type == 'income':
            self.account.current_balance += self.amount
        else:
            self.account.current_balance -= self.amount
        self.account.save()
        super().save(*args, **kwargs)
```

---

**User**

Failed to save 'models.py': Unable to write file 'vscode-remote://wsl+ubuntu/home/theo/projects/linux_version/backend/financial/models.py' (NoPermissions (FileSystemError): Error: EACCES: permission denied, open '/home/theo/projects/linux_version/backend/financial/models.py')  ...   Failed to save 'models.py': Unable to write file 'vscode-remote://wsl+ubuntu/home/theo/projects/linux_version/backend/maintenance/models.py' (NoPermissions (FileSystemError): Error: EACCES: permission denied, open '/home/theo/projects/linux_version/backend/maintenance/models.py')

---

**Cursor**

Βλέπω ότι υπάρχει πρόβλημα με τα permissions στα αρχεία. Ας το διορθώσουμε πρώτα και μετά να συνεχίσουμε με την υλοποίηση.


Τώρα ας ελέγξουμε αν τα αρχεία δημιουργήθηκαν σωστά:


Τέλεια! Τα models δημιουργήθηκαν σωστά. Τώρα ας συνεχίσουμε με το **Projects app**:

### 5. Δημιουργία του Projects App


```python
from django.db import models
from django.core.validators import MinValueValidator
from buildings.models import Building
from maintenance.models import Contractor
from django.contrib.auth import get_user_model

User = get_user_model()

class Project(models.Model):
    """Μοντέλο για έργα και projects"""
    
    PROJECT_TYPES = [
        ('maintenance', 'Συντήρηση'),
        ('renovation', 'Ανακαίνιση'),
        ('construction', 'Κατασκευή'),
        ('installation', 'Εγκατάσταση'),
        ('repair', 'Επισκευή'),
        ('upgrade', 'Αναβάθμιση'),
        ('other', 'Άλλο'),
    ]
    
    STATUS_CHOICES = [
        ('planning', 'Σχεδιασμός'),
        ('bidding', 'Διαγωνισμός'),
        ('awarded', 'Ανατεθειμένο'),
        ('in_progress', 'Σε Εξέλιξη'),
        ('completed', 'Ολοκληρωμένο'),
        ('cancelled', 'Ακυρώθηκε'),
    ]
    
    title = models.CharField(max_length=255, verbose_name="Τίτλος Έργου")
    description = models.TextField(verbose_name="Περιγραφή")
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='projects',
        verbose_name="Κτίριο"
    )
    project_type = models.CharField(
        max_length=20,
        choices=PROJECT_TYPES,
        verbose_name="Τύπος Έργου"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='planning',
        verbose_name="Κατάσταση"
    )
    budget = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Προϋπολογισμός"
    )
    actual_cost = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Πραγματικό Κόστος"
    )
    start_date = models.DateField(null=True, blank=True, verbose_name="Ημερομηνία Έναρξης")
    end_date = models.DateField(null=True, blank=True, verbose_name="Ημερομηνία Ολοκλήρωσης")
    estimated_duration = models.IntegerField(
        null=True,
        blank=True,
        help_text="Διάρκεια σε ημέρες",
        verbose_name="Εκτιμώμενη Διάρκεια"
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Τοποθεσία"
    )
    specifications = models.TextField(blank=True, verbose_name="Προδιαγραφές")
    requirements = models.TextField(blank=True, verbose_name="Απαιτήσεις")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_projects',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Έργο"
        verbose_name_plural = "Έργα"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.building.name} ({self.get_status_display()})"
    
    @property
    def progress_percentage(self):
        """Υπολογίζει το ποσοστό προόδου του έργου"""
        if self.status == 'completed':
            return 100
        elif self.status == 'planning':
            return 10
        elif self.status == 'bidding':
            return 25
        elif self.status == 'awarded':
            return 50
        elif self.status == 'in_progress':
            return 75
        return 0

class Offer(models.Model):
    """Μοντέλο για προσφορές σε έργα"""
    
    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί'),
        ('under_review', 'Υπό Αξιολόγηση'),
        ('accepted', 'Αποδεκτή'),
        ('rejected', 'Απορριφθείσα'),
        ('withdrawn', 'Αποσυρθείσα'),
    ]
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='offers',
        verbose_name="Έργο"
    )
    contractor = models.ForeignKey(
        Contractor,
        on_delete=models.CASCADE,
        related_name='offers',
        verbose_name="Συνεργείο"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Ποσό Προσφοράς"
    )
    description = models.TextField(verbose_name="Περιγραφή Προσφοράς")
    technical_specifications = models.TextField(blank=True, verbose_name="Τεχνικές Προδιαγραφές")
    delivery_time = models.IntegerField(
        help_text="Χρόνος παράδοσης σε ημέρες",
        verbose_name="Χρόνος Παράδοσης"
    )
    warranty_period = models.IntegerField(
        help_text="Περίοδος εγγύησης σε μήνες",
        verbose_name="Περίοδος Εγγύησης"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Κατάσταση"
    )
    submitted_date = models.DateTimeField(auto_now_add=True, verbose_name="Ημερομηνία Υποβολής")
    evaluation_date = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Αξιολόγησης")
    evaluation_notes = models.TextField(blank=True, verbose_name="Σημειώσεις Αξιολόγησης")
    evaluation_score = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), models.MaxValueValidator(10)],
        verbose_name="Βαθμολογία Αξιολόγησης"
    )
    offer_file = models.FileField(
        upload_to='offers/%Y/%m/',
        blank=True,
        verbose_name="Αρχείο Προσφοράς"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_offers',
        verbose_name="Δημιουργήθηκε από"
    )
    
    class Meta:
        verbose_name = "Προσφορά"
        verbose_name_plural = "Προσφορές"
        ordering = ['-submitted_date']
        unique_together = ['project', 'contractor']
    
    def __str__(self):
        return f"{self.contractor.name} - {self.project.title} - €{self.amount}"

class Contract(models.Model):
    """Μοντέλο για συμβόλαια με συνεργεία"""
    
    CONTRACT_TYPES = [
        ('service', 'Υπηρεσίες'),
        ('construction', 'Κατασκευή'),
        ('maintenance', 'Συντήρηση'),
        ('consulting', 'Σύμβουλος'),
        ('other', 'Άλλο'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Πρόχειρο'),
        ('active', 'Ενεργό'),
        ('completed', 'Ολοκληρωμένο'),
        ('terminated', 'Λυμένο'),
        ('expired', 'Ληγμένο'),
    ]
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='contracts',
        verbose_name="Έργο"
    )
    contractor = models.ForeignKey(
        Contractor,
        on_delete=models.CASCADE,
        related_name='contracts',
        verbose_name="Συνεργείο"
    )
    offer = models.ForeignKey(
        Offer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contracts',
        verbose_name="Προσφορά"
    )
    contract_type = models.CharField(
        max_length=20,
        choices=CONTRACT_TYPES,
        verbose_name="Τύπος Συμβολαίου"
    )
    contract_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Αριθμός Συμβολαίου"
    )
    title = models.CharField(max_length=255, verbose_name="Τίτλος Συμβολαίου")
    description = models.TextField(verbose_name="Περιγραφή")
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Ποσό Συμβολαίου"
    )
    start_date = models.DateField(verbose_name="Ημερομηνία Έναρξης")
    end_date = models.DateField(verbose_name="Ημερομηνία Λήξης")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name="Κατάσταση"
    )
    payment_terms = models.TextField(blank=True, verbose_name="Όροι Πληρωμής")
    warranty_terms = models.TextField(blank=True, verbose_name="Όροι Εγγύησης")
    contract_file = models.FileField(
        upload_to='contracts/%Y/%m/',
        blank=True,
        verbose_name="Αρχείο Συμβολαίου"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_contracts',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Συμβόλαιο"
        verbose_name_plural = "Συμβόλαια"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.contract_number} - {self.contractor.name} - {self.title}"
    
    @property
    def is_active(self):
        """Ελέγχει αν το συμβόλαιο είναι ενεργό"""
        from django.utils import timezone
        today = timezone.now().date()
        return (self.status == 'active' and 
                self.start_date <= today <= self.end_date)
    
    @property
    def days_remaining(self):
        """Υπολογίζει τις ημέρες που απομένουν"""
        from django.utils import timezone
        today = timezone.now().date()
        if self.end_date > today:
            return (self.end_date - today).days
        return 0
```

### 6. Τώρα ας προσθέσουμε τα νέα apps στο Django settings


```python
TENANT_APPS = [
    'rest_framework',
    'django_filters',

    'buildings',
    'apartments',
    'announcements',
    'user_requests',
    'votes',
    'residents',
    'obligations',
    'public_info',
    'core',
    'chat',
]

->

TENANT_APPS = [
    'rest_framework',
    'django_filters',

    'buildings',
    'apartments',
    'announcements',
    'user_requests',
    'votes',
    'residents',
    'obligations',
    'public_info',
    'core',
    'chat',
    
    # 🔧 Νέα apps για επέκταση λειτουργιών
    'maintenance',
    'financial',
    'projects',
]
```

### 7. Δημιουργία των admin.py files για τα νέα apps


```python
from django.contrib import admin
from .models import Contractor, ServiceReceipt, ScheduledMaintenance

@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
    list_display = ['name', 'service_type', 'contact_person', 'phone', 'rating', 'is_active']
    list_filter = ['service_type', 'is_active', 'rating']
    search_fields = ['name', 'contact_person', 'phone', 'email']
    list_editable = ['is_active', 'rating']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('name', 'service_type', 'contact_person', 'phone', 'email')
        }),
        ('Επιπλέον Πληροφορίες', {
            'fields': ('address', 'tax_number', 'rating', 'notes')
        }),
        ('Κατάσταση', {
            'fields': ('is_active',)
        }),
        ('Χρονικές Στιγμές', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ServiceReceipt)
class ServiceReceiptAdmin(admin.ModelAdmin):
    list_display = ['contractor', 'building', 'service_date', 'amount', 'payment_status', 'created_by']
    list_filter = ['payment_status', 'service_date', 'contractor__service_type']
    search_fields = ['contractor__name', 'building__name', 'description', 'invoice_number']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'service_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('contractor', 'building', 'service_date', 'amount')
        }),
        ('Περιγραφή', {
            'fields': ('description', 'invoice_number')
        }),
        ('Αρχείο', {
            'fields': ('receipt_file',)
        }),
        ('Κατάσταση Πληρωμής', {
            'fields': ('payment_status', 'payment_date')
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ScheduledMaintenance)
class ScheduledMaintenanceAdmin(admin.ModelAdmin):
    list_display = ['title', 'building', 'scheduled_date', 'priority', 'status', 'contractor']
    list_filter = ['status', 'priority', 'scheduled_date', 'building']
    search_fields = ['title', 'building__name', 'contractor__name', 'location']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'scheduled_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('title', 'description', 'building', 'scheduled_date')
        }),
        ('Συνεργείο & Προτεραιότητα', {
            'fields': ('contractor', 'priority', 'status')
        }),
        ('Χρόνος & Κόστος', {
            'fields': ('estimated_duration', 'estimated_cost', 'actual_cost')
        }),
        ('Τοποθεσία & Σημειώσεις', {
            'fields': ('location', 'notes')
        }),
        ('Ολοκλήρωση', {
            'fields': ('completed_at',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
```

```python
from django.contrib import admin
from .models import Payment, FinancialReceipt, BuildingAccount, FinancialTransaction

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['apartment', 'payment_type', 'amount', 'due_date', 'status', 'amount_paid']
    list_filter = ['payment_type', 'status', 'due_date']
    search_fields = ['apartment__number', 'apartment__building__name', 'reference_number']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'due_date'
    list_editable = ['status', 'amount_paid']
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('apartment', 'payment_type', 'amount', 'due_date')
        }),
        ('Κατάσταση Πληρωμής', {
            'fields': ('status', 'payment_date', 'amount_paid')
        }),
        ('Πληροφορίες Πληρωμής', {
            'fields': ('payment_method', 'reference_number')
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(FinancialReceipt)
class FinancialReceiptAdmin(admin.ModelAdmin):
    list_display = ['payment', 'receipt_type', 'amount', 'receipt_date', 'created_by']
    list_filter = ['receipt_type', 'receipt_date']
    search_fields = ['payment__apartment__number', 'reference_number']
    readonly_fields = ['created_at']
    date_hierarchy = 'receipt_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('payment', 'receipt_type', 'amount', 'receipt_date')
        }),
        ('Αρχείο & Αναφορά', {
            'fields': ('receipt_file', 'reference_number')
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(BuildingAccount)
class BuildingAccountAdmin(admin.ModelAdmin):
    list_display = ['building', 'account_type', 'account_number', 'bank_name', 'current_balance', 'is_active']
    list_filter = ['account_type', 'is_active', 'bank_name']
    search_fields = ['building__name', 'account_number', 'bank_name']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['is_active']
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('building', 'account_type', 'account_number', 'bank_name')
        }),
        ('Οικονομικά', {
            'fields': ('current_balance', 'description')
        }),
        ('Κατάσταση', {
            'fields': ('is_active',)
        }),
        ('Χρονικές Στιγμές', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(FinancialTransaction)
class FinancialTransactionAdmin(admin.ModelAdmin):
    list_display = ['building', 'account', 'transaction_type', 'amount', 'transaction_date', 'category']
    list_filter = ['transaction_type', 'transaction_date', 'category', 'building']
    search_fields = ['building__name', 'description', 'reference_number']
    readonly_fields = ['created_at']
    date_hierarchy = 'transaction_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('building', 'account', 'transaction_type', 'amount', 'transaction_date')
        }),
        ('Περιγραφή', {
            'fields': ('description', 'category', 'reference_number')
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )
```

```python
from django.contrib import admin
from .models import Project, Offer, Contract

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'building', 'project_type', 'status', 'budget', 'start_date']
    list_filter = ['project_type', 'status', 'start_date', 'building']
    search_fields = ['title', 'building__name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'start_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('title', 'description', 'building', 'project_type')
        }),
        ('Κατάσταση & Ημερομηνίες', {
            'fields': ('status', 'start_date', 'end_date', 'estimated_duration')
        }),
        ('Οικονομικά', {
            'fields': ('budget', 'actual_cost')
        }),
        ('Περιγραφή', {
            'fields': ('location', 'specifications', 'requirements', 'notes')
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ['project', 'contractor', 'amount', 'delivery_time', 'status', 'submitted_date']
    list_filter = ['status', 'submitted_date', 'project__project_type']
    search_fields = ['project__title', 'contractor__name', 'description']
    readonly_fields = ['submitted_date', 'created_at']
    date_hierarchy = 'submitted_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('project', 'contractor', 'amount', 'description')
        }),
        ('Τεχνικές Προδιαγραφές', {
            'fields': ('technical_specifications', 'delivery_time', 'warranty_period')
        }),
        ('Κατάσταση & Αξιολόγηση', {
            'fields': ('status', 'evaluation_date', 'evaluation_notes', 'evaluation_score')
        }),
        ('Αρχείο', {
            'fields': ('offer_file',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'submitted_date', 'created_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ['contract_number', 'title', 'contractor', 'contract_type', 'status', 'amount']
    list_filter = ['contract_type', 'status', 'start_date', 'end_date']
    search_fields = ['contract_number', 'title', 'contractor__name', 'project__title']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'start_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('contract_number', 'title', 'description', 'project', 'contractor')
        }),
        ('Συμβόλαιο', {
            'fields': ('offer', 'contract_type', 'amount')
        }),
        ('Ημερομηνίες & Κατάσταση', {
            'fields': ('start_date', 'end_date', 'status')
        }),
        ('Όροι', {
            'fields': ('payment_terms', 'warranty_terms')
        }),
        ('Αρχείο', {
            'fields': ('contract_file',)
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
```

### 8. Τώρα ας δημιουργήσουμε τα migrations και τα εφαρμόσουμε


Υπάρχει ένα πρόβλημα με το import. Το projects app προσπαθεί να import το Contractor από το maintenance app, αλλά πρέπει να το κάνουμε με διαφορετικό τρόπο. Ας το διορθώσουμε:


```python
from maintenance.models import Contractor

->

# Import Contractor with lazy loading to avoid circular imports
```

```python
    contractor = models.ForeignKey(
        Contractor,
        on_delete=models.CASCADE,
        related_name='offers',
        verbose_name="Συνεργείο"
    )

->

    contractor = models.ForeignKey(
        'maintenance.Contractor',
        on_delete=models.CASCADE,
        related_name='offers',
        verbose_name="Συνεργείο"
    )
```

```python
    contractor = models.ForeignKey(
        Contractor,
        on_delete=models.CASCADE,
        related_name='contracts',
        verbose_name="Συνεργείο"
    )

->

    contractor = models.ForeignKey(
        'maintenance.Contractor',
        on_delete=models.CASCADE,
        related_name='contracts',
        verbose_name="Συνεργείο"
    )
```

Τώρα ας δοκιμάσουμε ξανά να δημιουργήσουμε τα migrations:


Υπάρχει ένα λάθος στο import. Ας το διορθώσουμε:


```python
from django.core.validators import MinValueValidator

->

from django.core.validators import MinValueValidator, MaxValueValidator
```

```python
        validators=[MinValueValidator(0), models.MaxValueValidator(10)],

->

        validators=[MinValueValidator(0), MaxValueValidator(10)],
```

Τώρα ας δοκιμάσουμε ξανά:


Φαίνεται ότι υπάρχει πρόβλημα με το models.py του maintenance. Ας ελέγξουμε τι συμβαίνει:


Το models.py φαίνεται σωστό. Το πρόβλημα μπορεί να είναι ότι το Django προσπαθεί να φορτώσει όλα τα apps ταυτόχρονα. Ας δοκιμάσουμε να δημιουργήσουμε τα migrations ένα-ένα:


Το πρόβλημα είναι στο admin.py. Ας ελέγξουμε αν υπάρχει κάποιο syntax error στο models.py:


Ας ελέγξουμε αν υπάρχει syntax error στο models.py:


Το models.py φορτώνει σωστά. Ας ελέγξουμε τι συμβαίνει με το import:


Φαίνεται ότι το models.py δεν έχει τα classes. Ας ελέγξουμε το περιεχόμενο του αρχείου:


Α! Το πρόβλημα είναι ότι το αρχείο στο container δεν έχει ενημερωθεί. Ας κάνουμε restart το container:


Τώρα ας ελέγξουμε ξανά:


Το container δεν τρέχει. Ας το ξεκινήσουμε:


Τώρα ας ελέγξουμε ξανά:


Ας ελέγξουμε την κατάσταση των containers:


Το backend container δεν τρέχει. Ας δούμε τα logs:


Το πρόβλημα είναι ότι το models.py στο container δεν έχει ενημερωθεί. Ας κάνουμε rebuild το container:


Τέλεια! Τώρα ας ελέγξουμε αν τα containers τρέχουν:


Τέλεια! Τώρα ας ελέγξουμε αν το models.py έχει ενημερωθεί:


Ας περιμένουμε λίγο να ξεκινήσει το backend:


Το backend container δεν τρέχει. Ας δούμε τα logs:


Ας δοκιμάσουμε να ξεκινήσουμε μόνο το backend:


Τώρα ας ελέγξουμε:


Φαίνεται ότι υπάρχει πρόβλημα. Ας δοκιμάσουμε να κάνουμε ένα πλήρες reset:


---

**User**

✅ Postgres is up!


🎯 Running automatic initialization...

Traceback (most recent call last):

File "/app/scripts/auto_initialization.py", line 19, in <module>

django.setup()

File "/usr/local/lib/python3.12/site-packages/django/__init__.py", line 24, in setup

apps.populate(settings.INSTALLED_APPS)

File "/usr/local/lib/python3.12/site-packages/django/apps/registry.py", line 124, in populate

app_config.ready()

File "/usr/local/lib/python3.12/site-packages/django/contrib/admin/apps.py", line 27, in ready

self.module.autodiscover()

File "/usr/local/lib/python3.12/site-packages/django/contrib/admin/__init__.py", line 52, in autodiscover

autodiscover_modules("admin", register_to=site)

File "/usr/local/lib/python3.12/site-packages/django/utils/module_loading.py", line 58, in autodiscover_modules

import_module("%s.%s" % (app_config.name, module_to_search))

File "/usr/local/lib/python3.12/importlib/__init__.py", line 90, in import_module

return _bootstrap._gcd_import(name[level:], package, level)

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

File "<frozen importlib._bootstrap>", line 1387, in _gcd_import

File "<frozen importlib._bootstrap>", line 1360, in _find_and_load

File "<frozen importlib._bootstrap>", line 1331, in _find_and_load_unlocked

File "<frozen importlib._bootstrap>", line 935, in _load_unlocked

File "<frozen importlib._bootstrap_external>", line 999, in exec_module

File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed

File "/app/maintenance/admin.py", line 2, in <module>

from .models import Contractor, ServiceReceipt, ScheduledMaintenance

ImportError: cannot import name 'Contractor' from 'maintenance.models' (/app/maintenance/models.py)

---

**Cursor**

Βλέπω ότι το πρόβλημα παραμένει. Το Django δεν μπορεί να import τα models από το maintenance app. Ας ελέγξουμε τι συμβαίνει και να το διορθώσουμε.


Τώρα ας ελέγξουμε το περιεχόμενο του maintenance/models.py στο container:


Το backend container δεν τρέχει. Ας δούμε τα logs:


Ας ελέγξουμε την κατάσταση των containers:


Το backend container έχει κλείσει με exit code 1. Ας δούμε τα logs:


Το πρόβλημα είναι ότι το maintenance/models.py στο container δεν έχει τα models που δημιουργήσαμε. Ας ελέγξουμε τι υπάρχει στο τοπικό αρχείο:


Το τοπικό αρχείο έχει τα models. Το πρόβλημα είναι ότι το container δεν έχει ενημερωθεί. Ας κάνουμε ένα πλήρες rebuild:


Τέλεια! Τώρα ας περιμένουμε λίγο να ξεκινήσουν τα containers και μετά να ελέγξουμε:


Το backend container δεν τρέχει. Ας δούμε τα logs:


Το πρόβλημα παραμένει. Ας ελέγξουμε τι υπάρχει στο container:


Το backend container δεν τρέχει. Ας δοκιμάσουμε μια διαφορετική προσέγγιση. Ας αφαιρέσουμε προσωρινά τα νέα apps από τα settings και να τα προσθέσουμε σταδιακά:


```python
TENANT_APPS = [
    'rest_framework',
    'django_filters',

    'buildings',
    'apartments',
    'announcements',
    'user_requests',
    'votes',
    'residents',
    'obligations',
    'public_info',
    'core',
    'chat',
    
    # 🔧 Νέα apps για επέκταση λειτουργιών
    'maintenance',
    'financial',
    'projects',
]

->

TENANT_APPS = [
    'rest_framework',
    'django_filters',

    'buildings',
    'apartments',
    'announcements',
    'user_requests',
    'votes',
    'residents',
    'obligations',
    'public_info',
    'core',
    'chat',
]
```

Φαίνεται ότι υπάρχει πρόβλημα με τα tools. Ας δοκιμάσουμε μια διαφορετική προσέγγιση. Ας δημιουργήσουμε ένα απλό models.py αρχείο πρώτα:


```python
from django.db import models

# Create your models here.
```

Τώρα ας κάνουμε το ίδιο για τα άλλα apps:


```python
from django.db import models

# Create your models here.
```

```python
from django.db import models

# Create your models here.
```

Τώρα ας αφαιρέσουμε τα admin.py αρχεία προσωρινά:


```python
from django.contrib import admin

# Register your models here.
```

```python
from django.contrib import admin

# Register your models here.
```

```python
from django.contrib import admin

# Register your models here.
```

Τώρα ας προσθέσουμε τα apps στα settings:


Τώρα ας ελέγξουμε αν το backend τρέχει:


Τέλεια! Το backend τρέχει τώρα. Ας ελέγξουμε τα logs για να δούμε αν όλα πήγαν καλά:


Ας δοκιμάσουμε να δούμε τα logs:


Φαίνεται ότι δεν υπάρχουν logs. Ας ελέγξουμε αν το backend λειτουργεί:


---

**User**

διεγραψα ολα τα παλια containers και τα ξαναδημιουργησα... ας προσπαθησουμε ξανα

---

**Cursor**

Τέλεια! Βλέπω ότι έχετε διαγράψει τα παλιά containers και τα ξαναδημιουργήσατε. Ας ξεκινήσουμε ξανά με την υλοποίηση των νέων λειτουργιών, αλλά αυτή τη φορά με πιο σταδιακή προσέγγιση.

## 🚀 Ξεκινάμε Ξανά - Σταδιακή Υλοποίηση

### 1. Πρώτα, ας ελέγξουμε την κατάσταση των containers


Τέλεια! Όλα τα containers τρέχουν. Τώρα ας ξεκινήσουμε με την υλοποίηση των νέων λειτουργιών με πιο σταδιακή προσέγγιση.

### 2. Ξεκινάμε με το Maintenance App - Πρώτα το βασικό model


```python
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from buildings.models import Building
from django.contrib.auth import get_user_model

User = get_user_model()

class Contractor(models.Model):
    """Μοντέλο για συνεργεία επισκευών, καθαρισμού, ασφαλείας κλπ"""
    
    SERVICE_TYPES = [
        ('repair', 'Επισκευές'),
        ('cleaning', 'Καθαριότητα'),
        ('security', 'Ασφάλεια'),
        ('electrical', 'Ηλεκτρολογικά'),
        ('plumbing', 'Υδραυλικά'),
        ('heating', 'Θέρμανση/Κλιματισμός'),
        ('elevator', 'Ανελκυστήρες'),
        ('landscaping', 'Κηπουρική'),
        ('other', 'Άλλο'),
    ]
    
    name = models.CharField(max_length=255, verbose_name="Όνομα Συνεργείου")
    service_type = models.CharField(
        max_length=20, 
        choices=SERVICE_TYPES,
        verbose_name="Τύπος Υπηρεσίας"
    )
    contact_person = models.CharField(max_length=255, verbose_name="Επικοινωνία")
    phone = models.CharField(max_length=20, verbose_name="Τηλέφωνο")
    email = models.EmailField(blank=True, verbose_name="Email")
    address = models.TextField(blank=True, verbose_name="Διεύθυνση")
    tax_number = models.CharField(max_length=20, blank=True, verbose_name="ΑΦΜ")
    rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        default=0,
        verbose_name="Αξιολόγηση"
    )
    is_active = models.BooleanField(default=True, verbose_name="Ενεργό")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Συνεργείο"
        verbose_name_plural = "Συνεργεία"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_service_type_display()})"
```

### 3. Δημιουργία του απλού admin για το Contractor


```python
from django.contrib import admin
from .models import Contractor

@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
    list_display = ['name', 'service_type', 'contact_person', 'phone', 'rating', 'is_active']
    list_filter = ['service_type', 'is_active', 'rating']
    search_fields = ['name', 'contact_person', 'phone', 'email']
    list_editable = ['is_active', 'rating']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('name', 'service_type', 'contact_person', 'phone', 'email')
        }),
        ('Επιπλέον Πληροφορίες', {
            'fields': ('address', 'tax_number', 'rating', 'notes')
        }),
        ('Κατάσταση', {
            'fields': ('is_active',)
        }),
        ('Χρονικές Στιγμές', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
```

### 4. Προσθήκη του maintenance app στα settings


```python
TENANT_APPS = [
    'rest_framework',
    'django_filters',

    'buildings',
    'apartments',
    'announcements',
    'user_requests',
    'votes',
    'residents',
    'obligations',
    'public_info',
    'core',
    'chat',
]

->

TENANT_APPS = [
    'rest_framework',
    'django_filters',

    'buildings',
    'apartments',
    'announcements',
    'user_requests',
    'votes',
    'residents',
    'obligations',
    'public_info',
    'core',
    'chat',
    
    # 🔧 Νέα apps για επέκταση λειτουργιών
    'maintenance',
]
```

### 5. Δημιουργία και εφαρμογή του migration


Φαίνεται ότι υπάρχει ήδη ένα migration. Ας δημιουργήσουμε ένα νέο migration για το Contractor model:


Ας εφαρμόσουμε τα υπάρχοντα migrations:


Τέλεια! Τώρα ας ελέγξουμε αν το backend λειτουργεί:


Εξαιρετικά! Το backend τρέχει κανονικά. Τώρα ας ελέγξουμε αν μπορούμε να δημιουργήσουμε ένα Contractor:


Τέλεια! Το Contractor model λειτουργεί. Τώρα ας προσθέσουμε τα υπόλοιπα models στο maintenance app:

### 6. Προσθήκη των υπόλοιπων models στο maintenance


```python
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from buildings.models import Building
from django.contrib.auth import get_user_model

User = get_user_model()

class Contractor(models.Model):
    """Μοντέλο για συνεργεία επισκευών, καθαρισμού, ασφαλείας κλπ"""
    
    SERVICE_TYPES = [
        ('repair', 'Επισκευές'),
        ('cleaning', 'Καθαριότητα'),
        ('security', 'Ασφάλεια'),
        ('electrical', 'Ηλεκτρολογικά'),
        ('plumbing', 'Υδραυλικά'),
        ('heating', 'Θέρμανση/Κλιματισμός'),
        ('elevator', 'Ανελκυστήρες'),
        ('landscaping', 'Κηπουρική'),
        ('other', 'Άλλο'),
    ]
    
    name = models.CharField(max_length=255, verbose_name="Όνομα Συνεργείου")
    service_type = models.CharField(
        max_length=20, 
        choices=SERVICE_TYPES,
        verbose_name="Τύπος Υπηρεσίας"
    )
    contact_person = models.CharField(max_length=255, verbose_name="Επικοινωνία")
    phone = models.CharField(max_length=20, verbose_name="Τηλέφωνο")
    email = models.EmailField(blank=True, verbose_name="Email")
    address = models.TextField(blank=True, verbose_name="Διεύθυνση")
    tax_number = models.CharField(max_length=20, blank=True, verbose_name="ΑΦΜ")
    rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        default=0,
        verbose_name="Αξιολόγηση"
    )
    is_active = models.BooleanField(default=True, verbose_name="Ενεργό")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Συνεργείο"
        verbose_name_plural = "Συνεργεία"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_service_type_display()})"

class ServiceReceipt(models.Model):
    """Μοντέλο για αποδείξεις παροχής υπηρεσιών από συνεργεία"""
    
    contractor = models.ForeignKey(
        Contractor, 
        on_delete=models.CASCADE,
        related_name='receipts',
        verbose_name="Συνεργείο"
    )
    building = models.ForeignKey(
        Building, 
        on_delete=models.CASCADE,
        related_name='service_receipts',
        verbose_name="Κτίριο"
    )
    service_date = models.DateField(verbose_name="Ημερομηνία Υπηρεσίας")
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        verbose_name="Ποσό"
    )
    receipt_file = models.FileField(
        upload_to='receipts/%Y/%m/',
        verbose_name="Απόδειξη"
    )
    description = models.TextField(verbose_name="Περιγραφή Υπηρεσίας")
    invoice_number = models.CharField(
        max_length=50, 
        blank=True,
        verbose_name="Αριθμός Τιμολογίου"
    )
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Εκκρεμεί'),
            ('paid', 'Πληρωμένο'),
            ('overdue', 'Ληξιπρόθεσμο'),
        ],
        default='pending',
        verbose_name="Κατάσταση Πληρωμής"
    )
    payment_date = models.DateField(
        null=True, 
        blank=True,
        verbose_name="Ημερομηνία Πληρωμής"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_receipts',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Απόδειξη Υπηρεσίας"
        verbose_name_plural = "Αποδείξεις Υπηρεσιών"
        ordering = ['-service_date']
    
    def __str__(self):
        return f"{self.contractor.name} - {self.service_date} - €{self.amount}"

class ScheduledMaintenance(models.Model):
    """Μοντέλο για προγραμματισμένα έργα συντήρησης"""
    
    PRIORITY_CHOICES = [
        ('low', 'Χαμηλή'),
        ('medium', 'Μέτρια'),
        ('high', 'Υψηλή'),
        ('urgent', 'Επείγουσα'),
    ]
    
    STATUS_CHOICES = [
        ('scheduled', 'Προγραμματισμένο'),
        ('in_progress', 'Σε Εξέλιξη'),
        ('completed', 'Ολοκληρωμένο'),
        ('cancelled', 'Ακυρώθηκε'),
    ]
    
    title = models.CharField(max_length=255, verbose_name="Τίτλος")
    description = models.TextField(verbose_name="Περιγραφή")
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='scheduled_maintenance',
        verbose_name="Κτίριο"
    )
    contractor = models.ForeignKey(
        Contractor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='scheduled_work',
        verbose_name="Συνεργείο"
    )
    scheduled_date = models.DateField(verbose_name="Προγραμματισμένη Ημερομηνία")
    estimated_duration = models.IntegerField(
        help_text="Διάρκεια σε ώρες",
        verbose_name="Εκτιμώμενη Διάρκεια"
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name="Προτεραιότητα"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='scheduled',
        verbose_name="Κατάσταση"
    )
    estimated_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Εκτιμώμενο Κόστος"
    )
    actual_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Πραγματικό Κόστος"
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Τοποθεσία"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_maintenance',
        verbose_name="Δημιουργήθηκε από"
    )
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Ολοκλήρωσης")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Προγραμματισμένη Συντήρηση"
        verbose_name_plural = "Προγραμματισμένες Συντηρήσεις"
        ordering = ['scheduled_date', 'priority']
    
    def __str__(self):
        return f"{self.title} - {self.building.name} - {self.scheduled_date}"
```

### 7. Ενημέρωση του admin για όλα τα models


```python
from django.contrib import admin
from .models import Contractor, ServiceReceipt, ScheduledMaintenance

@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
    list_display = ['name', 'service_type', 'contact_person', 'phone', 'rating', 'is_active']
    list_filter = ['service_type', 'is_active', 'rating']
    search_fields = ['name', 'contact_person', 'phone', 'email']
    list_editable = ['is_active', 'rating']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('name', 'service_type', 'contact_person', 'phone', 'email')
        }),
        ('Επιπλέον Πληροφορίες', {
            'fields': ('address', 'tax_number', 'rating', 'notes')
        }),
        ('Κατάσταση', {
            'fields': ('is_active',)
        }),
        ('Χρονικές Στιγμές', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ServiceReceipt)
class ServiceReceiptAdmin(admin.ModelAdmin):
    list_display = ['contractor', 'building', 'service_date', 'amount', 'payment_status', 'created_by']
    list_filter = ['payment_status', 'service_date', 'contractor__service_type']
    search_fields = ['contractor__name', 'building__name', 'description', 'invoice_number']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'service_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('contractor', 'building', 'service_date', 'amount')
        }),
        ('Περιγραφή', {
            'fields': ('description', 'invoice_number')
        }),
        ('Αρχείο', {
            'fields': ('receipt_file',)
        }),
        ('Κατάσταση Πληρωμής', {
            'fields': ('payment_status', 'payment_date')
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ScheduledMaintenance)
class ScheduledMaintenanceAdmin(admin.ModelAdmin):
    list_display = ['title', 'building', 'scheduled_date', 'priority', 'status', 'contractor']
    list_filter = ['status', 'priority', 'scheduled_date', 'building']
    search_fields = ['title', 'building__name', 'contractor__name', 'location']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'scheduled_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('title', 'description', 'building', 'scheduled_date')
        }),
        ('Συνεργείο & Προτεραιότητα', {
            'fields': ('contractor', 'priority', 'status')
        }),
        ('Χρόνος & Κόστος', {
            'fields': ('estimated_duration', 'estimated_cost', 'actual_cost')
        }),
        ('Τοποθεσία & Σημειώσεις', {
            'fields': ('location', 'notes')
        }),
        ('Ολοκλήρωση', {
            'fields': ('completed_at',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
```

### 8. Δημιουργία και εφαρμογή των migrations


Τέλεια! Τώρα ας ελέγξουμε αν όλα λειτουργούν:


Εξαιρετικά! Το maintenance app λειτουργεί τέλεια. Τώρα ας συνεχίσουμε με το **Financial app**:

### 9. Υλοποίηση του Financial App


```python
from django.db import models
from django.core.validators import MinValueValidator
from buildings.models import Building
from apartments.models import Apartment
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class Payment(models.Model):
    """Μοντέλο για πληρωμές κοινοχρήστων"""
    
    PAYMENT_TYPES = [
        ('common_expenses', 'Κοινοχρήστων'),
        ('heating', 'Θέρμανση'),
        ('electricity_common', 'Ηλεκτρικό Κοινοχρήστων'),
        ('cleaning', 'Καθαριότητα'),
        ('security', 'Ασφάλεια'),
        ('elevator', 'Ανελκυστήρες'),
        ('other', 'Άλλο'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί'),
        ('paid', 'Πληρωμένο'),
        ('overdue', 'Ληξιπρόθεσμο'),
        ('partial', 'Μερική Πληρωμή'),
    ]
    
    apartment = models.ForeignKey(
        Apartment,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name="Διαμέρισμα"
    )
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPES,
        verbose_name="Τύπος Πληρωμής"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Ποσό"
    )
    due_date = models.DateField(verbose_name="Ημερομηνία Λήξης")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Κατάσταση"
    )
    payment_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Ημερομηνία Πληρωμής"
    )
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Ποσό που Πληρώθηκε"
    )
    payment_method = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Μέθοδος Πληρωμής"
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Αριθμός Αναφοράς"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_payments',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Πληρωμή"
        verbose_name_plural = "Πληρωμές"
        ordering = ['-due_date']
    
    def __str__(self):
        return f"{self.apartment} - {self.get_payment_type_display()} - €{self.amount}"
    
    @property
    def is_overdue(self):
        """Ελέγχει αν η πληρωμή είναι ληξιπρόθεσμη"""
        return self.due_date < timezone.now().date() and self.status != 'paid'
    
    @property
    def remaining_amount(self):
        """Υπολογίζει το υπόλοιπο ποσό"""
        return self.amount - self.amount_paid

class FinancialReceipt(models.Model):
    """Μοντέλο για αποδείξεις εισπράξεων"""
    
    RECEIPT_TYPES = [
        ('cash', 'Μετρητά'),
        ('bank_transfer', 'Τραπεζική Μεταφορά'),
        ('check', 'Επιταγή'),
        ('online', 'Online Πληρωμή'),
        ('other', 'Άλλο'),
    ]
    
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='receipts',
        verbose_name="Πληρωμή"
    )
    receipt_type = models.CharField(
        max_length=20,
        choices=RECEIPT_TYPES,
        verbose_name="Τύπος Απόδειξης"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Ποσό"
    )
    receipt_date = models.DateField(verbose_name="Ημερομηνία Απόδειξης")
    receipt_file = models.FileField(
        upload_to='financial_receipts/%Y/%m/',
        blank=True,
        verbose_name="Αρχείο Απόδειξης"
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Αριθμός Αναφοράς"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_financial_receipts',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Απόδειξη Εισπράξεως"
        verbose_name_plural = "Αποδείξεις Εισπράξεων"
        ordering = ['-receipt_date']
    
    def __str__(self):
        return f"{self.payment.apartment} - {self.receipt_date} - €{self.amount}"

class BuildingAccount(models.Model):
    """Μοντέλο για λογαριασμούς κτιρίου"""
    
    ACCOUNT_TYPES = [
        ('operating', 'Λειτουργικός'),
        ('reserve', 'Αποθεματικό'),
        ('special', 'Ειδικός'),
    ]
    
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='accounts',
        verbose_name="Κτίριο"
    )
    account_type = models.CharField(
        max_length=20,
        choices=ACCOUNT_TYPES,
        verbose_name="Τύπος Λογαριασμού"
    )
    account_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Αριθμός Λογαριασμού"
    )
    bank_name = models.CharField(
        max_length=100,
        verbose_name="Όνομα Τράπεζας"
    )
    current_balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name="Τρέχον Υπόλοιπο"
    )
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    is_active = models.BooleanField(default=True, verbose_name="Ενεργός")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Λογαριασμός Κτιρίου"
        verbose_name_plural = "Λογαριασμοί Κτιρίου"
        unique_together = ['building', 'account_type']
    
    def __str__(self):
        return f"{self.building.name} - {self.get_account_type_display()} - €{self.current_balance}"

class FinancialTransaction(models.Model):
    """Μοντέλο για οικονομικές συναλλαγές"""
    
    TRANSACTION_TYPES = [
        ('income', 'Έσοδο'),
        ('expense', 'Έξοδο'),
    ]
    
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='financial_transactions',
        verbose_name="Κτίριο"
    )
    account = models.ForeignKey(
        BuildingAccount,
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name="Λογαριασμός"
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPES,
        verbose_name="Τύπος Συναλλαγής"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Ποσό"
    )
    description = models.TextField(verbose_name="Περιγραφή")
    transaction_date = models.DateField(verbose_name="Ημερομηνία Συναλλαγής")
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Αριθμός Αναφοράς"
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Κατηγορία"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_transactions',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Οικονομική Συναλλαγή"
        verbose_name_plural = "Οικονομικές Συναλλαγές"
        ordering = ['-transaction_date']
    
    def __str__(self):
        return f"{self.building.name} - {self.get_transaction_type_display()} - €{self.amount}"
    
    def save(self, *args, **kwargs):
        """Ενημέρωση του υπολοίπου του λογαριασμού"""
        if self.transaction_type == 'income':
            self.account.current_balance += self.amount
        else:
            self.account.current_balance -= self.amount
        self.account.save()
        super().save(*args, **kwargs)
```

### 10. Προσθήκη του financial app στα settings


```python
    # 🔧 Νέα apps για επέκταση λειτουργιών
    'maintenance',

->

    # 🔧 Νέα apps για επέκταση λειτουργιών
    'maintenance',
    'financial',
```

### 11. Δημιουργία και εφαρμογή των migrations για το financial app


Φαίνεται ότι δεν υπάρχουν αλλαγές. Ας δοκιμάσουμε να δημιουργήσουμε ένα migration με όνομα:


Ας ελέγξουμε αν υπάρχουν ήδη migrations στο financial app:


Υπάρχει ήδη ένα migration. Ας εφαρμόσουμε τα migrations:


Ας ελέγξουμε αν το financial app λειτουργεί:


Τέλεια! Τώρα ας ενημερώσουμε το admin για το financial app:


```python
from django.contrib import admin
from .models import Payment, FinancialReceipt, BuildingAccount, FinancialTransaction

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['apartment', 'payment_type', 'amount', 'due_date', 'status', 'amount_paid']
    list_filter = ['payment_type', 'status', 'due_date']
    search_fields = ['apartment__number', 'apartment__building__name', 'reference_number']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'due_date'
    list_editable = ['status', 'amount_paid']
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('apartment', 'payment_type', 'amount', 'due_date')
        }),
        ('Κατάσταση Πληρωμής', {
            'fields': ('status', 'payment_date', 'amount_paid')
        }),
        ('Πληροφορίες Πληρωμής', {
            'fields': ('payment_method', 'reference_number')
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(FinancialReceipt)
class FinancialReceiptAdmin(admin.ModelAdmin):
    list_display = ['payment', 'receipt_type', 'amount', 'receipt_date', 'created_by']
    list_filter = ['receipt_type', 'receipt_date']
    search_fields = ['payment__apartment__number', 'reference_number']
    readonly_fields = ['created_at']
    date_hierarchy = 'receipt_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('payment', 'receipt_type', 'amount', 'receipt_date')
        }),
        ('Αρχείο & Αναφορά', {
            'fields': ('receipt_file', 'reference_number')
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(BuildingAccount)
class BuildingAccountAdmin(admin.ModelAdmin):
    list_display = ['building', 'account_type', 'account_number', 'bank_name', 'current_balance', 'is_active']
    list_filter = ['account_type', 'is_active', 'bank_name']
    search_fields = ['building__name', 'account_number', 'bank_name']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['is_active']
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('building', 'account_type', 'account_number', 'bank_name')
        }),
        ('Οικονομικά', {
            'fields': ('current_balance', 'description')
        }),
        ('Κατάσταση', {
            'fields': ('is_active',)
        }),
        ('Χρονικές Στιγμές', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(FinancialTransaction)
class FinancialTransactionAdmin(admin.ModelAdmin):
    list_display = ['building', 'account', 'transaction_type', 'amount', 'transaction_date', 'category']
    list_filter = ['transaction_type', 'transaction_date', 'category', 'building']
    search_fields = ['building__name', 'description', 'reference_number']
    readonly_fields = ['created_at']
    date_hierarchy = 'transaction_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('building', 'account', 'transaction_type', 'amount', 'transaction_date')
        }),
        ('Περιγραφή', {
            'fields': ('description', 'category', 'reference_number')
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )
```

