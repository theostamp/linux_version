# 🛠️ Προδιαγραφές Υλοποίησης - Οικονομική Διαχείριση

## 📋 Επισκόπηση Υλοποίησης

Αυτό το έγγραφο περιγράφει τις λεπτομερείς προδιαγραφές υλοποίησης για κάθε πυλώνα του οικονομικού συστήματος.

---

## 🎯 ΠΥΛΩΝΑΣ 1: Καταχώρηση Δαπανών

### Backend Models

```python
# backend/financial/models.py
class Expense(models.Model):
    EXPENSE_CATEGORIES = [
        ('cleaning', 'Καθαρισμός'),
        ('electricity_common', 'ΔΕΗ Κοινοχρήστων'),
        ('elevator_maintenance', 'Συντήρηση Ανελκυστήρα'),
        ('heating_fuel', 'Πετρέλαιο Θέρμανσης'),
        ('plumbing', 'Υδραυλικός'),
        ('building_insurance', 'Ασφάλεια Κτιρίου'),
    ]
    
    DISTRIBUTION_TYPES = [
        ('by_participation_mills', 'Ανά Χιλιοστά'),
        ('equal_share', 'Ισόποσα'),
        ('specific_apartments', 'Συγκεκριμένα'),
        ('by_meters', 'Μετρητές'),
    ]
    
    building = models.ForeignKey(Building, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    category = models.CharField(max_length=50, choices=EXPENSE_CATEGORIES)
    distribution_type = models.CharField(max_length=50, choices=DISTRIBUTION_TYPES)
    attachment = models.FileField(upload_to='expenses/', null=True, blank=True)
    notes = models.TextField(blank=True)
    is_issued = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
```

### API Endpoints

```python
# backend/financial/views.py
class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Ανέκδοτες δαπάνες"""
        building_id = request.query_params.get('building_id')
        queryset = self.get_queryset().filter(is_issued=False)
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
```

### Frontend Component

```typescript
// frontend/components/financial/ExpenseForm.tsx
export const ExpenseForm: React.FC = () => {
  const { register, handleSubmit, watch, setValue } = useForm<ExpenseFormData>();
  const { createExpense, isLoading } = useExpenses();
  
  const selectedCategory = watch('category');
  
  const getDefaultDistributionType = (category: string) => {
    const heatingCategories = ['heating_fuel', 'heating_gas'];
    if (heatingCategories.includes(category)) {
      return 'by_meters';
    }
    return 'by_participation_mills';
  };
  
  const onSubmit = async (data: ExpenseFormData) => {
    try {
      await createExpense(data);
      // Reset form
    } catch (error) {
      console.error('Error creating expense:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Input label="Τίτλος Δαπάνης" {...register('title')} />
      <Input label="Ποσό (€)" type="number" {...register('amount')} />
      <Input label="Ημερομηνία" type="date" {...register('date')} />
      <Select label="Κατηγορία" {...register('category')}>
        <option value="cleaning">Καθαρισμός</option>
        <option value="electricity_common">ΔΕΗ Κοινοχρήστων</option>
        {/* ... άλλες κατηγορίες */}
      </Select>
      <Button type="submit" loading={isLoading}>
        Αποθήκευση Δαπάνης
      </Button>
    </form>
  );
};
```

---

## ⚙️ ΠΥΛΩΝΑΣ 2: Υπολογισμός & Έκδοση

### Backend Service

```python
# backend/financial/services.py
class CommonExpenseCalculator:
    def __init__(self, building_id: int):
        self.building_id = building_id
        self.apartments = Apartment.objects.filter(building_id=building_id)
        self.expenses = Expense.objects.filter(
            building_id=building_id, 
            is_issued=False
        )
    
    def calculate_shares(self) -> Dict[str, Any]:
        shares = {}
        
        for apartment in self.apartments:
            shares[apartment.id] = {
                'apartment_id': apartment.id,
                'apartment_number': apartment.number,
                'current_balance': apartment.current_balance,
                'total_amount': Decimal('0.00'),
                'breakdown': [],
            }
        
        for expense in self.expenses:
            if expense.distribution_type == 'by_participation_mills':
                self._calculate_by_participation_mills(expense, shares)
            elif expense.distribution_type == 'equal_share':
                self._calculate_equal_share(expense, shares)
        
        return shares
    
    def _calculate_by_participation_mills(self, expense: Expense, shares: Dict):
        total_mills = sum(apt.participation_mills for apt in self.apartments)
        
        for apartment in self.apartments:
            share_amount = (expense.amount * apartment.participation_mills) / total_mills
            shares[apartment.id]['total_amount'] += share_amount
            shares[apartment.id]['breakdown'].append({
                'expense_id': expense.id,
                'expense_title': expense.title,
                'apartment_share': share_amount,
            })
```

### API Endpoints

```python
# backend/financial/views.py
class CommonExpenseViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        building_id = request.data.get('building_id')
        period = request.data.get('period')
        
        calculator = CommonExpenseCalculator(building_id)
        shares = calculator.calculate_shares()
        
        return Response({
            'period': period,
            'shares': shares,
            'total_expenses': sum(exp.amount for exp in calculator.expenses),
        })
    
    @action(detail=False, methods=['post'])
    def issue(self, request):
        building_id = request.data.get('building_id')
        shares = request.data.get('shares', {})
        
        # Ενημέρωση οφειλών διαμερισμάτων
        for apartment_id, share_data in shares.items():
            apartment = Apartment.objects.get(id=apartment_id)
            apartment.current_balance = share_data['total_due']
            apartment.save()
        
        # Σήμανση δαπανών ως εκδοθείσες
        expenses = Expense.objects.filter(
            building_id=building_id, 
            is_issued=False
        )
        expenses.update(is_issued=True)
        
        return Response({'message': 'Common expenses issued successfully'})
```

---

## 📊 ΠΥΛΩΝΑΣ 3: Διαχείριση Αποθεματικού

### Backend Models

```python
# backend/financial/models.py
class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('common_expense_payment', 'Πληρωμή Κοινοχρήστων'),
        ('expense_payment', 'Πληρωμή Δαπάνης'),
        ('refund', 'Επιστροφή'),
    ]
    
    building = models.ForeignKey(Building, on_delete=models.CASCADE)
    date = models.DateTimeField()
    type = models.CharField(max_length=50, choices=TRANSACTION_TYPES)
    description = models.TextField()
    apartment_number = models.CharField(max_length=50, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

class Payment(models.Model):
    PAYMENT_METHODS = [
        ('cash', 'Μετρητά'),
        ('bank_transfer', 'Τραπεζική Μεταφορά'),
        ('check', 'Επιταγή'),
    ]
    
    apartment = models.ForeignKey('apartments.Apartment', on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### API Endpoints

```python
# backend/financial/views.py
class FinancialDashboardViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def summary(self, request):
        building_id = request.query_params.get('building_id')
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        # Υπολογισμός συνολικών οφειλών
        total_obligations = sum(
            apt.current_balance for apt in apartments 
            if apt.current_balance < 0
        )
        
        # Πρόσφατες κινήσεις
        recent_transactions = Transaction.objects.filter(
            building_id=building_id
        )[:10]
        
        return Response({
            'current_reserve': building.current_reserve,
            'total_obligations': abs(total_obligations),
            'recent_transactions': TransactionSerializer(recent_transactions, many=True).data,
        })
    
    @action(detail=False, methods=['post'])
    def record_payment(self, request):
        apartment_id = request.data.get('apartment_id')
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method')
        
        apartment = Apartment.objects.get(id=apartment_id)
        building = apartment.building
        
        # Ενημέρωση υπόλοιπου διαμερίσματος
        apartment.current_balance += Decimal(amount)
        apartment.save()
        
        # Ενημέρωση αποθεματικού κτιρίου
        building.current_reserve += Decimal(amount)
        building.save()
        
        # Δημιουργία πληρωμής και κίνησης
        payment = Payment.objects.create(
            apartment=apartment,
            amount=amount,
            method=payment_method,
        )
        
        transaction = Transaction.objects.create(
            building=building,
            type='common_expense_payment',
            description=f"Πληρωμή Κοινοχρήστων - {apartment.number}",
            apartment_number=apartment.number,
            amount=amount,
            balance_after=building.current_reserve
        )
        
        return Response({'message': 'Payment recorded successfully'})
```

### Frontend Component

```typescript
// frontend/components/financial/FinancialDashboard.tsx
export const FinancialDashboard: React.FC = () => {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const { getSummary, recordPayment, isLoading } = useFinancialDashboard();
  
  useEffect(() => {
    loadSummary();
  }, []);
  
  const loadSummary = async () => {
    try {
      const data = await getSummary();
      setSummary(data);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Βασικά Μετρικά */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold">Τρέχον Αποθεματικό</h3>
            <p className="text-3xl font-bold text-green-600">
              {summary?.current_reserve.toFixed(2)}€
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold">Συνολικές Οφειλές</h3>
            <p className="text-3xl font-bold text-red-600">
              {summary?.total_obligations.toFixed(2)}€
            </p>
          </div>
        </Card>
      </div>
      
      {/* Πρόσφατες Κινήσεις */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">Πρόσφατες Κινήσεις</h3>
          <div className="space-y-2">
            {summary?.recent_transactions.map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(transaction.date).toLocaleDateString('el-GR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)}€
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
```

---

## 🔧 Hooks

### useExpenses Hook
```typescript
// frontend/hooks/useExpenses.ts
export const useExpenses = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const createExpense = async (formData: FormData) => {
    setIsLoading(true);
    try {
      const response = await api.post('/expenses/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } finally {
      setIsLoading(false);
    }
  };
  
  const getPendingExpenses = async (buildingId: number) => {
    const response = await api.get(`/expenses/pending/?building_id=${buildingId}`);
    return response.data;
  };
  
  return {
    createExpense,
    getPendingExpenses,
    isLoading,
  };
};
```

### useFinancialDashboard Hook
```typescript
// frontend/hooks/useFinancialDashboard.ts
export const useFinancialDashboard = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const getSummary = async (buildingId: number) => {
    const response = await api.get(`/financial/dashboard/summary/?building_id=${buildingId}`);
    return response.data;
  };
  
  const recordPayment = async (data: {
    apartment_id: number;
    amount: number;
    payment_method: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await api.post('/financial/dashboard/record_payment/', data);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    getSummary,
    recordPayment,
    isLoading,
  };
};
```

---

## 🚀 Επόμενα Βήματα

### Προτεραιότητα 1: Βασική Λειτουργικότητα
1. **Backend Models**: Δημιουργία των βασικών models
2. **API Endpoints**: Υλοποίηση των CRUD operations
3. **Frontend Forms**: Δημιουργία φορμών καταχώρησης
4. **Basic Dashboard**: Απλή οθόνη με βασικά μετρικά

### Προτεραιότητα 2: Αυτοματοποίηση
1. **Calculator Service**: Υλοποίηση του CommonExpenseCalculator
2. **Distribution Logic**: Αλγόριθμοι κατανομής δαπανών
3. **Issue Process**: Διαδικασία έκδοσης κοινοχρήστων

### Προτεραιότητα 3: Διαφάνεια
1. **Transaction History**: Πλήρες ιστορικό κινήσεων
2. **Audit Trail**: Καταγραφή όλων των ενεργειών
3. **Reports**: Αναφορές και εξαγωγή δεδομένων

---

**Συμπέρασμα**: Αυτές οι προδιαγραφές παρέχουν ένα πλήρες roadmap για την υλοποίηση του οικονομικού συστήματος με απόλυτη διαφάνεια και ευκολία χρήσης. 