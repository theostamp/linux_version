# TODO: Βελτίωση Συστήματος Πληρωμών Προγραμματισμένων Έργων

## 📋 Επισκόπηση Έργου

Βελτίωση της ενότητας `/maintenance/scheduled/new` για καλύτερη διαχείριση πληρωμών και αποδείξεων προς συνεργεία και επαγγελματίες. Το σύστημα θα υποστηρίζει:

- **Σταδιακές Πληρωμές**: Προκαταβολές, δόσεις, περιοδικές καταβολές
- **Αποδείξεις Πληρωμής**: Παραστατικά από γραφείο διαχείρισης προς συνεργείο
- **Αυτόματη Σύνδεση**: Με financial module για δαπάνες
- **Αρχείο Κινήσεων**: Πλήρη ιστορία πληρωμών και περιγραφών

## 🎯 ΦΑΣΗ 1: Ανάλυση & Σχεδιασμός Βάσης Δεδομένων

### 1.1 Ανάλυση Τρέχουσας Κατάστασης ✅

**Τρέχοντα Models:**
- `ScheduledMaintenance`: Βασικά στοιχεία έργου
- `ServiceReceipt`: Αποδείξεις υπηρεσιών (βασική υλοποίηση)
- `Contractor`: Στοιχεία συνεργείων
- Σύνδεση με `financial.Expense` μέσω `linked_expense`

**Προβλήματα που εντοπίστηκαν:**
- Δεν υποστηρίζονται σταδιακές πληρωμές
- Περιορισμένη διαχείριση αποδείξεων
- Ασθενής σύνδεση με financial system
- Έλλειψη audit trail για πληρωμές

### 1.2 Σχεδιασμός Νέων Models

#### PaymentSchedule Model
```python
class PaymentSchedule(models.Model):
    """Χρονοδιάγραμμα πληρωμών για έργο"""
    
    PAYMENT_TYPES = [
        ('lump_sum', 'Εφάπαξ'),
        ('advance_installments', 'Προκαταβολή + Δόσεις'),
        ('periodic', 'Περιοδικές Καταβολές'),
        ('milestone_based', 'Βάσει Ορόσημων'),
    ]
    
    scheduled_maintenance = models.OneToOneField(ScheduledMaintenance, ...)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    advance_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    installment_count = models.PositiveIntegerField(null=True)
    periodic_frequency = models.CharField(max_length=20, null=True)  # monthly, quarterly, etc.
    created_at = models.DateTimeField(auto_now_add=True)
```

#### PaymentInstallment Model
```python
class PaymentInstallment(models.Model):
    """Επιμέρους δόσεις πληρωμής"""
    
    INSTALLMENT_STATUS = [
        ('pending', 'Εκκρεμεί'),
        ('paid', 'Πληρώθηκε'),
        ('overdue', 'Ληξιπρόθεσμη'),
        ('cancelled', 'Ακυρώθηκε'),
    ]
    
    payment_schedule = models.ForeignKey(PaymentSchedule, ...)
    installment_number = models.PositiveIntegerField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=INSTALLMENT_STATUS)
    payment_date = models.DateField(null=True, blank=True)
    receipt = models.OneToOneField('PaymentReceipt', null=True, blank=True)
```

#### PaymentReceipt Model (Enhanced)
```python
class PaymentReceipt(models.Model):
    """Βελτιωμένες αποδείξεις πληρωμής"""
    
    RECEIPT_TYPES = [
        ('advance', 'Προκαταβολή'),
        ('installment', 'Δόση'),
        ('final', 'Εξόφληση'),
        ('periodic', 'Περιοδική Καταβολή'),
    ]
    
    scheduled_maintenance = models.ForeignKey(ScheduledMaintenance, ...)
    contractor = models.ForeignKey(Contractor, ...)
    receipt_type = models.CharField(max_length=20, choices=RECEIPT_TYPES)
    receipt_number = models.CharField(max_length=50, unique=True)  # Auto-generated
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField()
    description = models.TextField()
    
    # Contractor signature fields
    contractor_signature = models.TextField(blank=True)  # Digital signature
    contractor_signed_at = models.DateTimeField(null=True, blank=True)
    
    # File attachments
    receipt_file = models.FileField(upload_to='payment_receipts/%Y/%m/')
    contractor_invoice = models.FileField(upload_to='contractor_invoices/%Y/%m/', null=True)
    
    # Financial integration
    linked_expense = models.ForeignKey('financial.Expense', null=True, blank=True)
    
    # Audit trail
    created_by = models.ForeignKey(User, ...)
    approved_by = models.ForeignKey(User, null=True, blank=True, related_name='approved_receipts')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

## 🎯 ΦΑΣΗ 2: Backend API Enhancements

### 2.1 Νέα API Endpoints

#### Payment Management APIs
```python
# /api/maintenance/scheduled/{id}/payments/
class PaymentScheduleViewSet(viewsets.ModelViewSet):
    """Διαχείριση χρονοδιαγράμματος πληρωμών"""
    
# /api/maintenance/scheduled/{id}/installments/
class PaymentInstallmentViewSet(viewsets.ModelViewSet):
    """Διαχείριση δόσεων πληρωμής"""
    
# /api/maintenance/receipts/
class PaymentReceiptViewSet(viewsets.ModelViewSet):
    """Διαχείριση αποδείξεων πληρωμής"""
    
    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Δημιουργία PDF απόδειξης"""
        
    @action(detail=True, methods=['post'])
    def contractor_sign(self, request, pk=None):
        """Υπογραφή από συνεργείο"""
```

### 2.2 Enhanced ScheduledMaintenance API

```python
class ScheduledMaintenanceViewSet(viewsets.ModelViewSet):
    
    @action(detail=True, methods=['post'])
    def create_payment_schedule(self, request, pk=None):
        """Δημιουργία χρονοδιαγράμματος πληρωμών"""
        
    @action(detail=True, methods=['get'])
    def payment_history(self, request, pk=None):
        """Ιστορικό πληρωμών έργου"""
        
    @action(detail=True, methods=['post'])
    def process_payment(self, request, pk=None):
        """Επεξεργασία πληρωμής και δημιουργία απόδειξης"""
```

### 2.3 Financial Integration Services

```python
class MaintenanceFinancialService:
    """Υπηρεσία σύνδεσης με financial module"""
    
    @staticmethod
    def create_expense_from_receipt(receipt: PaymentReceipt) -> Expense:
        """Δημιουργία δαπάνης από απόδειξη"""
        
    @staticmethod
    def handle_expense_deletion(expense_id: int):
        """Διαχείριση διαγραφής δαπάνης - επιστροφή στο maintenance"""
        
    @staticmethod
    def sync_payment_with_expenses(maintenance_id: int):
        """Συγχρονισμός πληρωμών με δαπάνες"""
```

## 🎯 ΦΑΣΗ 3: Frontend UI Improvements

### 3.1 Enhanced ScheduledMaintenanceForm

#### Νέα Πεδία Πληρωμής
```typescript
// Προσθήκη στο schema
const paymentSchema = z.object({
  payment_type: z.enum(['lump_sum', 'advance_installments', 'periodic', 'milestone_based']),
  total_amount: z.number().positive(),
  advance_percentage: z.number().min(0).max(100).optional(),
  installment_count: z.number().int().positive().optional(),
  periodic_frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annual']).optional(),
});
```

#### Payment Configuration Section
```tsx
<div className="space-y-4">
  <h3 className="text-lg font-medium">Διαχείριση Πληρωμών</h3>
  
  <div>
    <label>Τύπος Πληρωμής</label>
    <Select value={paymentType} onValueChange={setPaymentType}>
      <SelectItem value="lump_sum">Εφάπαξ Πληρωμή</SelectItem>
      <SelectItem value="advance_installments">Προκαταβολή + Δόσεις</SelectItem>
      <SelectItem value="periodic">Περιοδικές Καταβολές</SelectItem>
      <SelectItem value="milestone_based">Βάσει Ορόσημων</SelectItem>
    </Select>
  </div>
  
  {paymentType === 'advance_installments' && (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label>Ποσοστό Προκαταβολής (%)</label>
        <Input type="number" min="0" max="100" {...register('advance_percentage')} />
      </div>
      <div>
        <label>Αριθμός Δόσεων</label>
        <Input type="number" min="1" {...register('installment_count')} />
      </div>
    </div>
  )}
  
  {paymentType === 'periodic' && (
    <div>
      <label>Συχνότητα Πληρωμών</label>
      <Select {...register('periodic_frequency')}>
        <SelectItem value="monthly">Μηνιαία</SelectItem>
        <SelectItem value="quarterly">Τριμηνιαία</SelectItem>
        <SelectItem value="annual">Ετήσια</SelectItem>
      </Select>
    </div>
  )}
</div>
```

### 3.2 Payment Receipt Modal

#### PaymentReceiptModal Component
```tsx
interface PaymentReceiptModalProps {
  maintenanceId: number;
  installment?: PaymentInstallment;
  onClose: () => void;
  onSuccess: (receipt: PaymentReceipt) => void;
}

export function PaymentReceiptModal({ maintenanceId, installment, onClose, onSuccess }: PaymentReceiptModalProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Απόδειξη Πληρωμής Συνεργείου</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Receipt Form */}
          <div className="space-y-4">
            <div>
              <label>Αριθμός Απόδειξης</label>
              <Input value={receiptNumber} readOnly />
            </div>
            
            <div>
              <label>Συνεργείο</label>
              <Input value={contractor?.name} readOnly />
            </div>
            
            <div>
              <label>Ποσό Πληρωμής (€)</label>
              <Input type="number" value={amount} onChange={setAmount} />
            </div>
            
            <div>
              <label>Τύπος Πληρωμής</label>
              <Select value={receiptType} onValueChange={setReceiptType}>
                <SelectItem value="advance">Προκαταβολή</SelectItem>
                <SelectItem value="installment">Δόση</SelectItem>
                <SelectItem value="final">Εξόφληση</SelectItem>
                <SelectItem value="periodic">Περιοδική Καταβολή</SelectItem>
              </Select>
            </div>
            
            <div>
              <label>Περιγραφή Εργασιών</label>
              <Textarea value={description} onChange={setDescription} rows={4} />
            </div>
            
            <div>
              <label>Επισύναψη Τιμολογίου Συνεργείου</label>
              <Input type="file" accept=".pdf,.jpg,.png" onChange={handleFileUpload} />
            </div>
          </div>
          
          {/* Receipt Preview */}
          <div className="border rounded-lg p-4">
            <ReceiptPreview 
              receiptData={{
                receiptNumber,
                contractor,
                amount,
                receiptType,
                description,
                paymentDate: new Date(),
                buildingInfo
              }}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Άκυρο</Button>
          <Button variant="outline" onClick={handlePrintPreview}>
            <Printer className="w-4 h-4 mr-2" />
            Προεπισκόπηση Εκτύπωσης
          </Button>
          <Button onClick={handleSaveReceipt}>
            <Save className="w-4 h-4 mr-2" />
            Αποθήκευση & Εκτύπωση
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 3.3 Receipt Preview Component

```tsx
export function ReceiptPreview({ receiptData }: { receiptData: ReceiptData }) {
  return (
    <div className="receipt-preview bg-white p-6 text-sm">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">ΑΠΟΔΕΙΞΗ ΠΛΗΡΩΜΗΣ</h2>
        <p className="text-gray-600">Αρ. {receiptData.receiptNumber}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="font-semibold mb-2">Στοιχεία Κτιρίου</h3>
          <p>{receiptData.buildingInfo.name}</p>
          <p>{receiptData.buildingInfo.address}</p>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Στοιχεία Συνεργείου</h3>
          <p>{receiptData.contractor.name}</p>
          <p>{receiptData.contractor.phone}</p>
          <p>ΑΦΜ: {receiptData.contractor.tax_number}</p>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Στοιχεία Πληρωμής</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Τύπος:</strong> {getReceiptTypeLabel(receiptData.receiptType)}</p>
            <p><strong>Ημερομηνία:</strong> {formatDate(receiptData.paymentDate)}</p>
          </div>
          <div>
            <p><strong>Ποσό:</strong> €{receiptData.amount.toFixed(2)}</p>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Περιγραφή Εργασιών</h3>
        <p className="whitespace-pre-wrap">{receiptData.description}</p>
      </div>
      
      <div className="border-t pt-4 mt-8">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="border-b border-gray-400 mb-2 h-12"></div>
            <p className="text-sm">Υπογραφή Γραφείου Διαχείρισης</p>
          </div>
          <div className="text-center">
            <div className="border-b border-gray-400 mb-2 h-12"></div>
            <p className="text-sm">Υπογραφή & Σφραγίδα Συνεργείου</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 🎯 ΦΑΣΗ 4: Payment Management Dashboard

### 4.1 Payment History Component

```tsx
export function PaymentHistoryTab({ maintenanceId }: { maintenanceId: number }) {
  const { data: payments } = useQuery(['maintenance-payments', maintenanceId], 
    () => api.get(`/maintenance/scheduled/${maintenanceId}/payment-history/`)
  );
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Ιστορικό Πληρωμών</h3>
        <Button onClick={() => setShowNewPayment(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Νέα Πληρωμή
        </Button>
      </div>
      
      <div className="space-y-2">
        {payments?.map((payment) => (
          <PaymentHistoryItem key={payment.id} payment={payment} />
        ))}
      </div>
    </div>
  );
}
```

### 4.2 Payment Schedule Component

```tsx
export function PaymentScheduleTab({ maintenanceId }: { maintenanceId: number }) {
  return (
    <div className="space-y-4">
      <PaymentScheduleOverview maintenanceId={maintenanceId} />
      <InstallmentsList maintenanceId={maintenanceId} />
      <PaymentActions maintenanceId={maintenanceId} />
    </div>
  );
}
```

## 🎯 ΦΑΣΗ 5: Financial Integration Enhancement

### 5.1 Bidirectional Linking System

#### Enhanced Expense Model Integration
```python
# In financial/models.py
class Expense(models.Model):
    # ... existing fields ...
    
    # Enhanced maintenance linking
    linked_maintenance_receipt = models.ForeignKey(
        'maintenance.PaymentReceipt',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='financial_expenses'
    )
    
    def delete(self, *args, **kwargs):
        # Signal maintenance system before deletion
        if self.linked_maintenance_receipt:
            signals.expense_pre_delete.send(
                sender=self.__class__,
                instance=self,
                maintenance_receipt=self.linked_maintenance_receipt
            )
        super().delete(*args, **kwargs)
```

#### Signal Handlers
```python
# In maintenance/signals.py
from django.dispatch import receiver
from financial.signals import expense_pre_delete

@receiver(expense_pre_delete)
def handle_expense_deletion(sender, instance, maintenance_receipt, **kwargs):
    """Handle expense deletion - provide link back to maintenance"""
    if maintenance_receipt:
        # Update receipt status
        maintenance_receipt.linked_expense = None
        maintenance_receipt.save()
        
        # Create notification for user
        create_notification(
            message=f"Δαπάνη διαγράφηκε. Επιστροφή στο έργο: {maintenance_receipt.scheduled_maintenance.title}",
            link=f"/maintenance/scheduled/{maintenance_receipt.scheduled_maintenance.id}",
            type="warning"
        )
```

### 5.2 Expense Deletion Handling UI

```tsx
// In financial expense deletion component
export function ExpenseDeleteDialog({ expense, onConfirm }: ExpenseDeleteDialogProps) {
  const hasMaintenanceLink = expense.linked_maintenance_receipt;
  
  return (
    <AlertDialog>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Διαγραφή Δαπάνης</AlertDialogTitle>
          <AlertDialogDescription>
            {hasMaintenanceLink && (
              <div className="bg-yellow-50 p-3 rounded-md mb-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="font-medium">Συνδεδεμένο Έργο</span>
                </div>
                <p className="mt-1 text-sm">
                  Αυτή η δαπάνη συνδέεται με έργο συντήρησης. 
                  Η διαγραφή θα επηρεάσει το ιστορικό πληρωμών.
                </p>
                <Button 
                  variant="link" 
                  className="p-0 h-auto mt-2"
                  onClick={() => router.push(`/maintenance/scheduled/${expense.linked_maintenance_receipt.scheduled_maintenance.id}`)}
                >
                  Μετάβαση στο Έργο →
                </Button>
              </div>
            )}
            Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή τη δαπάνη;
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Άκυρο</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Διαγραφή
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

## 🎯 ΦΑΣΗ 6: Testing & Quality Assurance

### 6.1 Backend Tests

```python
# tests/test_payment_system.py
class PaymentSystemTestCase(TenantTestCase):
    
    def test_payment_schedule_creation(self):
        """Test payment schedule creation for maintenance"""
        
    def test_installment_processing(self):
        """Test installment payment processing"""
        
    def test_receipt_generation(self):
        """Test receipt generation and PDF creation"""
        
    def test_financial_integration(self):
        """Test bidirectional financial integration"""
        
    def test_expense_deletion_handling(self):
        """Test expense deletion notification system"""
```

### 6.2 Frontend Tests

```typescript
// tests/PaymentReceiptModal.test.tsx
describe('PaymentReceiptModal', () => {
  test('renders receipt form correctly', () => {});
  test('generates PDF preview', () => {});
  test('handles contractor signature', () => {});
  test('integrates with financial system', () => {});
});
```

## 🎯 ΦΑΣΗ 7: Documentation & Deployment

### 7.1 User Documentation

#### Payment Management Guide
- Τύποι πληρωμών και χρήση
- Δημιουργία αποδείξεων
- Διαχείριση δόσεων
- Σύνδεση με δαπάνες

#### Administrator Guide
- Ρύθμιση συστήματος πληρωμών
- Διαχείριση αποδείξεων
- Αναφορές και στατιστικά

### 7.2 Technical Documentation

#### API Documentation
- Payment endpoints
- Receipt generation
- Financial integration
- Webhook notifications

## 📊 Success Metrics

### Functional Requirements ✅
- [ ] Σταδιακές πληρωμές (προκαταβολή, δόσεις, περιοδικές)
- [ ] Αποδείξεις πληρωμής με εκτύπωση
- [ ] Αυτόματη σύνδεση με financial module
- [ ] Διαχείριση διαγραφής δαπανών
- [ ] Αρχείο κινήσεων και περιγραφών

### Technical Requirements ✅
- [ ] Enhanced database schema
- [ ] RESTful API endpoints
- [ ] React components with TypeScript
- [ ] PDF generation for receipts
- [ ] Signal-based integration
- [ ] Comprehensive testing

### User Experience ✅
- [ ] Intuitive payment configuration
- [ ] Clear receipt generation flow
- [ ] Bidirectional navigation (financial ↔ maintenance)
- [ ] Real-time status updates
- [ ] Mobile-responsive design

## 🚀 Implementation Timeline

| Φάση | Διάρκεια | Παραδοτέα |
|------|----------|-----------|
| 1 | 3 ημέρες | Database schema, migrations |
| 2 | 5 ημέρες | Backend APIs, services |
| 3 | 7 ημέρες | Frontend components, forms |
| 4 | 3 ημέρες | Payment dashboard |
| 5 | 4 ημέρες | Financial integration |
| 6 | 3 ημέρες | Testing, QA |
| 7 | 2 ημέρες | Documentation, deployment |

**Συνολική Διάρκεια: 27 ημέρες**

## 📝 Σημειώσεις Υλοποίησης

### Προτεραιότητες
1. **Υψηλή**: Database schema, βασικά APIs, receipt modal
2. **Μέτρια**: Payment dashboard, advanced features
3. **Χαμηλή**: Advanced reporting, analytics

### Τεχνικές Προκλήσεις
- PDF generation με Greek fonts
- Digital signature integration
- Complex payment schedule calculations
- Real-time financial synchronization

### Εξαρτήσεις
- Existing financial module
- PDF generation library (reportlab/weasyprint)
- File upload system
- Notification system
