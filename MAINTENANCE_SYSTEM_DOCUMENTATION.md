# 🔧 New Concierge - Maintenance System Documentation

## 📋 Επισκόπηση Συστήματος

Το **Maintenance System** του New Concierge είναι ένα ολοκληρωμένο σύστημα διαχείρισης συντήρησης που συνδυάζει:
- **Προγραμματισμό έργων** με πλήρη payment schedules
- **Αυτόματη δημιουργία δαπανών** από installments 
- **Real-time form validation** με Greek error messages
- **Multi-tenant architecture** με schema-based isolation

---

## 🏗️ Αρχιτεκτονική Συστήματος

### **Core Models**

```python
ScheduledMaintenance
├── PaymentSchedule (1:1)
│   ├── PaymentInstallment (1:N)
│   │   └── PaymentReceipt (1:1)
│   │       └── Expense (linked_expense)
└── Expense (legacy linked_expense)
```

### **Data Flow**

```
1. User creates ScheduledMaintenance
2. PaymentSchedule created with installments
3. PaymentInstallments created with due dates
4. sync_payment_expenses creates Expenses
5. PaymentReceipts link Installments to Expenses
```

---

## 🛠️ Backend Architecture

### **Models** (`maintenance/models.py`)

#### **ScheduledMaintenance**
```python
# Key fields
title: CharField              # Τίτλος έργου
estimated_cost: DecimalField  # Εκτιμώμενο κόστος
total_cost: DecimalField      # Πραγματικό κόστος
scheduled_date: DateField     # Προγραμματισμένη ημερομηνία
status: CharField             # scheduled, in_progress, completed, cancelled
priority: CharField           # low, medium, high, urgent

# Key methods
create_or_update_expense()    # Smart expense creation (avoids duplicates)
_determine_expense_category() # Auto-categorization logic
```

#### **PaymentSchedule**
```python
# Payment types
LUMP_SUM = 'lump_sum'                    # Εφάπαξ
ADVANCE_INSTALLMENTS = 'advance_installments'  # Προκαταβολή + Δόσεις
PERIODIC = 'periodic'                    # Περιοδικές καταβολές
MILESTONE_BASED = 'milestone_based'      # Βάσει ορόσημων

# Key fields
total_amount: DecimalField
advance_percentage: DecimalField         # Ποσοστό προκαταβολής
installment_count: IntegerField          # Αριθμός δόσεων
start_date: DateField                    # Ημερομηνία έναρξης
```

#### **PaymentInstallment**
```python
# Installment types
ADVANCE = 'advance'          # Προκαταβολή
INSTALLMENT = 'installment'  # Δόση
PERIODIC = 'periodic'        # Περιοδική καταβολή

# Status tracking
PENDING = 'pending'          # Εκκρεμεί
PAID = 'paid'               # Εξοφλήθηκε
OVERDUE = 'overdue'         # Ληξιπρόθεσμη
CANCELLED = 'cancelled'      # Ακυρώθηκε
```

#### **PaymentReceipt**
```python
# Links installments to expenses
installment: ForeignKey → PaymentInstallment
linked_expense: ForeignKey → Expense
receipt_type: CharField      # advance, installment, periodic
status: CharField            # issued, paid, cancelled
```

### **Management Commands**

#### **sync_payment_expenses**
```bash
# Usage examples
python manage.py sync_payment_expenses --dry-run
python manage.py sync_payment_expenses --building-id 1
python manage.py sync_payment_expenses --create-only
```

**Key Features:**
- **Tenant-aware**: Uses `schema_context('demo')`
- **Time window**: Processes installments due within 120 days
- **Idempotent**: Won't create duplicate expenses
- **Error handling**: Comprehensive logging and rollback
- **Category mapping**: Smart expense categorization

**Processing Logic:**
```python
1. Find pending installments (due within 120 days)
2. Check for existing PaymentReceipt
3. Create Expense with proper category
4. Create PaymentReceipt to link installment→expense
5. Update installment status if needed
```

---

## 🎨 Frontend Architecture

### **Core Components**

#### **ScheduledMaintenanceForm.tsx**
**Location:** `frontend/components/maintenance/ScheduledMaintenanceForm.tsx`

**Key Features:**
- **Zod validation** με Greek field names
- **React Hook Form** integration
- **Real-time error display** with visual indicators
- **Change detection** για edit mode
- **Payment configuration** integration

**Validation Schema:**
```typescript
const schema = z.object({
  title: z.string().min(1, "Το πεδίο είναι απαραίτητο"),
  price: z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  }, z.number().min(0).optional()),
  payment_config: z.object({
    advance_percentage: z.preprocess((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      const n = Number(v);
      return isNaN(n) ? undefined : n;
    }, z.number().optional()),
    // ... other payment fields
  })
});
```

**Error Handling:**
```typescript
const fieldNameMap: Record<string, string> = {
  'title': 'Τίτλος',
  'description': 'Περιγραφή', 
  'price': 'Συνολικό Κόστος',
  'scheduled_date': 'Ημερομηνία Προγραμματισμού',
  'payment_config.advance_percentage': 'Ποσοστό Προκαταβολής',
  // ... more mappings
};
```

#### **PaymentConfigurationSection.tsx**
**Location:** `frontend/components/maintenance/PaymentConfigurationSection.tsx`

**Key Features:**
- **Auto-calculation** of advance amounts and installments
- **Real-time preview** of payment breakdown
- **Display-only total amount** (synced with main form)
- **Multi-payment type support**

---

## 💰 Payment Integration System

### **Payment Types Supported**

#### **1. Advance + Installments** (`advance_installments`)
```
Example: €224 project with 30% advance, 3 installments
├── Προκαταβολή: €67.20 (September)
├── Δόση 1: €52.27 (October) 
├── Δόση 2: €52.27 (November)
└── Δόση 3: €52.27 (December)
```

#### **2. Periodic Payments** (`periodic`)
```
Example: €300 project, €100/month for 3 months
├── Περίοδος 1: €100 (Month 1)
├── Περίοδος 2: €100 (Month 2)
└── Περίοδος 3: €100 (Month 3)
```

#### **3. Lump Sum** (`lump_sum`)
```
Single payment on completion
└── Full Amount: €224 (Completion date)
```

### **Expense Creation Logic**

```python
# In sync_payment_expenses command
for installment in pending_installments:
    # Create expense
    expense = Expense.objects.create(
        building=building,
        title=f"{maintenance.title} ({installment_type})",
        amount=installment.amount,
        date=installment.due_date,
        category=determine_category(maintenance),
        distribution_type='by_participation_mills',
        expense_type='regular'
    )
    
    # Link via PaymentReceipt
    PaymentReceipt.objects.create(
        installment=installment,
        linked_expense=expense,
        receipt_type=installment.installment_type,
        amount=installment.amount,
        status='issued'
    )
```

---

## 🔧 Configuration & Setup

### **Environment Requirements**

**Backend:**
- Django 5.2+
- django-tenants (multi-tenancy)
- PostgreSQL 12+ (schema support)
- python-dateutil (date calculations)

**Frontend:**
- Next.js 15+ (App Router)
- React Hook Form + Zod validation
- TypeScript (strict mode)
- Tailwind CSS + Radix UI

### **CORS Configuration**
```python
# backend/new_concierge_backend/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://demo.localhost:3000",
    "http://demo.localhost:3001",  # Added for maintenance app
    # ... other origins
]
```

### **Database Migrations**
```bash
# Key migrations applied
0013_paymentinstallment_paymentreceipt_paymentschedule
0016_add_total_cost_field

# Schema verification
python manage.py showmigrations maintenance
```

---

## 🚀 Usage Guide

### **Creating Maintenance with Payments**

#### **1. Standard Workflow**
```
1. Navigate to /maintenance/scheduled/new
2. Fill basic info (title, description, cost)
3. Configure payment schedule:
   - Type: "Προκαταβολή + Δόσεις"
   - Advance %: 30%
   - Installments: 3
   - Frequency: Monthly
4. Save → PaymentSchedule + Installments created
5. Run: python manage.py sync_payment_expenses
6. ✅ Monthly expenses created automatically
```

#### **2. Automated Processing**
```bash
# Setup cron job for automatic processing
# Run every day at 9 AM
0 9 * * * cd /app && python manage.py sync_payment_expenses

# Or use the provided automation script
python /app/setup_payment_cron.py
```

### **Monitoring & Maintenance**

#### **Check System Status**
```bash
# View payment installments
docker exec -it backend python -c "
from django_tenants.utils import schema_context
from maintenance.models import PaymentInstallment
with schema_context('demo'):
    for pi in PaymentInstallment.objects.all():
        print(f'{pi.id}: {pi.description} - €{pi.amount} - {pi.status}')
"

# View linked expenses
docker exec -it backend python manage.py shell
>>> from maintenance.models import PaymentReceipt
>>> for pr in PaymentReceipt.objects.all():
...     print(f"{pr.installment.description} → {pr.linked_expense.title}")
```

#### **Troubleshooting**

**Common Issues:**

1. **"No installments found"**
   ```bash
   # Check if PaymentSchedule exists
   python manage.py shell -c "
   from maintenance.models import ScheduledMaintenance
   sm = ScheduledMaintenance.objects.get(id=X)
   print(f'Has payment schedule: {hasattr(sm, \"payment_schedule\")}')
   "
   ```

2. **"Duplicate expenses"**
   ```bash
   # The system now prevents this automatically
   # But if it happens, identify source:
   from maintenance.models import PaymentReceipt
   duplicates = Expense.objects.filter(title__icontains='...')
   for exp in duplicates:
       has_receipt = PaymentReceipt.objects.filter(linked_expense=exp).exists()
       print(f"{exp.id}: {'sync_command' if has_receipt else 'old_system'}")
   ```

3. **"Installments not creating expenses"**
   ```bash
   # Check time window (120 days)
   python manage.py sync_payment_expenses --dry-run
   
   # Extend window if needed (edit sync_payment_expenses.py)
   due_date__lte=timezone.now().date() + timedelta(days=180)
   ```

---

## 📊 Category Mapping System

The system automatically maps maintenance types to expense categories:

```python
def _get_expense_category(maintenance):
    title_lower = maintenance.title.lower()
    
    category_keywords = {
        'ανελκυστήρα': 'elevator_maintenance',
        'καυστήρα': 'heating_maintenance', 
        'θέρμανση': 'heating_maintenance',
        'ηλεκτρικ': 'electrical_maintenance',
        'φωτισμός': 'lighting_common',
        'καθαρισμός': 'cleaning',
        'κήπου': 'garden_maintenance',
        'στέγη': 'roof_maintenance',
        'δεξαμενή': 'water_tank_cleaning',
        'πυροσβεστήρ': 'fire_extinguishers',
        'ενδοεπικοινωνία': 'intercom_system',
        'θυροτηλέφων': 'intercom_system',
    }
    
    for keyword, category in category_keywords.items():
        if keyword in title_lower:
            return category
    
    return 'building_maintenance'  # Default
```

---

## 🔒 Security & Best Practices

### **Multi-Tenancy**
```python
# All database operations must use schema context
from django_tenants.utils import schema_context

with schema_context('demo'):
    # All database queries here
    installments = PaymentInstallment.objects.all()
```

### **Data Integrity**
- **Atomic transactions** για installment processing
- **Duplicate prevention** στο model level
- **Rollback capability** σε περίπτωση errors
- **Audit trail** μέσω created_at/updated_at fields

### **Error Handling**
```python
# Comprehensive error handling in sync command
try:
    with transaction.atomic():
        result = self._process_installment(installment, dry_run, create_only)
        if result == 'created':
            created_count += 1
except Exception as e:
    error_count += 1
    self.stdout.write(
        self.style.ERROR(f'Error processing installment {installment.id}: {e}')
    )
```

---

## 📈 Performance Considerations

### **Database Optimization**
```python
# Efficient queries with select_related
installments = PaymentInstallment.objects.select_related(
    'payment_schedule__scheduled_maintenance__building',
    'payment_schedule__scheduled_maintenance__contractor'
).filter(status='pending')
```

### **Caching Strategy**
- **Query optimization** με proper indexes
- **Batch processing** για multiple installments
- **Lazy loading** στο frontend (React Query)

### **Scalability**
- **Tenant isolation** prevents cross-contamination
- **Command-based processing** allows horizontal scaling
- **Asynchronous payment processing** (future enhancement)

---

## 🔮 Future Enhancements

### **Short Term**
- [ ] Email notifications για due installments
- [ ] Bulk payment processing για multiple projects
- [ ] Enhanced reporting dashboard
- [ ] Mobile-responsive improvements

### **Medium Term**
- [ ] Integration με accounting software
- [ ] Advanced payment scheduling (bi-weekly, custom)
- [ ] Automatic late fee calculations
- [ ] Payment confirmation workflows

### **Long Term**
- [ ] AI-powered cost estimation
- [ ] Predictive maintenance scheduling
- [ ] Integration με IoT sensors
- [ ] Advanced analytics και forecasting

---

## 📞 Support & Troubleshooting

### **Debug Commands**
```bash
# Check system status
python manage.py sync_payment_expenses --dry-run

# Verify data integrity
python manage.py shell -c "
from maintenance.models import *
from financial.models import Expense
# Run verification scripts
"

# View recent logs
docker logs linux_version-backend-1 | grep -i payment
```

### **Common Fixes**
```bash
# Reset payment schedule (if corrupted)
python manage.py shell -c "
from maintenance.models import PaymentSchedule
ps = PaymentSchedule.objects.get(id=X)
ps.installments.all().delete()  # Recreate installments
"

# Force sync all installments
python manage.py sync_payment_expenses --building-id 1
```

---

## 📝 Change Log

### **v2.3.0** - Maintenance System Overhaul
- ✅ Complete payment integration system
- ✅ Duplicate prevention mechanism  
- ✅ Enhanced form validation με Greek messages
- ✅ Automated expense creation από installments
- ✅ Multi-tenant support με schema context
- ✅ Category-based expense mapping
- ✅ Comprehensive error handling

### **Previous Versions**
- v2.2.0: Basic payment schedules
- v2.1.0: Maintenance CRUD operations
- v2.0.0: Initial maintenance module

---

**📅 Last Updated:** September 9, 2025  
**🔄 Status:** Production Ready  
**👥 Maintained By:** New Concierge Development Team  

---

*This documentation covers the complete maintenance system. For questions or additional support, refer to the main project documentation or contact the development team.*