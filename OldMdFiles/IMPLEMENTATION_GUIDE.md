# 🚀 Οδηγός Εφαρμογής - Οικονομική Διαχείριση

## 📋 Επισκόπηση Εφαρμογής

Αυτός ο οδηγός παρέχει λεπτομερείς οδηγίες για την εφαρμογή του οικονομικού συστήματος βήμα-βήμα.

---

## 🎯 Φάση 1: Βασική Λειτουργικότητα

### Βήμα 1.1: Backend Models

#### Δημιουργία Expense Model
```python
# backend/financial/models.py
from django.db import models
from buildings.models import Building

class Expense(models.Model):
    EXPENSE_CATEGORIES = [
        # Πάγιες Δαπάνες Κοινοχρήστων
        ('cleaning', 'Καθαρισμός Κοινοχρήστων Χώρων'),
        ('electricity_common', 'ΔΕΗ Κοινοχρήστων'),
        ('water_common', 'Νερό Κοινοχρήστων'),
        ('garbage_collection', 'Συλλογή Απορριμμάτων'),
        ('security', 'Ασφάλεια Κτιρίου'),
        ('concierge', 'Καθαριστής/Πυλωρός'),
        
        # Δαπάνες Ανελκυστήρα
        ('elevator_maintenance', 'Ετήσια Συντήρηση Ανελκυστήρα'),
        ('elevator_repair', 'Επισκευή Ανελκυστήρα'),
        ('elevator_inspection', 'Επιθεώρηση Ανελκυστήρα'),
        ('elevator_modernization', 'Μοντέρνιση Ανελκυστήρα'),
        
        # Δαπάνες Θέρμανσης
        ('heating_fuel', 'Πετρέλαιο Θέρμανσης'),
        ('heating_gas', 'Φυσικό Αέριο Θέρμανσης'),
        ('heating_maintenance', 'Συντήρηση Καυστήρα'),
        ('heating_repair', 'Επισκευή Θερμαντικών'),
        ('heating_inspection', 'Επιθεώρηση Θερμαντικών'),
        ('heating_modernization', 'Μοντέρνιση Θερμαντικών'),
        
        # Δαπάνες Ηλεκτρικών Εγκαταστάσεων
        ('electrical_maintenance', 'Συντήρηση Ηλεκτρικών'),
        ('electrical_repair', 'Επισκευή Ηλεκτρικών'),
        ('electrical_upgrade', 'Αναβάθμιση Ηλεκτρικών'),
        ('lighting_common', 'Φωτισμός Κοινοχρήστων'),
        ('intercom_system', 'Σύστημα Εσωτερικής Επικοινωνίας'),
        
        # Δαπάνες Υδραυλικών Εγκαταστάσεων
        ('plumbing_maintenance', 'Συντήρηση Υδραυλικών'),
        ('plumbing_repair', 'Επισκευή Υδραυλικών'),
        ('water_tank_cleaning', 'Καθαρισμός Δεξαμενής Νερού'),
        ('water_tank_maintenance', 'Συντήρηση Δεξαμενής Νερού'),
        ('sewage_system', 'Σύστημα Αποχέτευσης'),
        
        # Δαπάνες Κτιρίου & Εξωτερικών Χώρων
        ('building_insurance', 'Ασφάλεια Κτιρίου'),
        ('building_maintenance', 'Συντήρηση Κτιρίου'),
        ('roof_maintenance', 'Συντήρηση Στέγης'),
        ('roof_repair', 'Επισκευή Στέγης'),
        ('facade_maintenance', 'Συντήρηση Πρόσοψης'),
        ('facade_repair', 'Επισκευή Πρόσοψης'),
        ('painting_exterior', 'Βαψίματα Εξωτερικών'),
        ('painting_interior', 'Βαψίματα Εσωτερικών Κοινοχρήστων'),
        ('garden_maintenance', 'Συντήρηση Κήπου'),
        ('parking_maintenance', 'Συντήρηση Χώρων Στάθμευσης'),
        ('entrance_maintenance', 'Συντήρηση Εισόδου'),
        
        # Έκτακτες Δαπάνες & Επισκευές
        ('emergency_repair', 'Έκτακτη Επισκευή'),
        ('storm_damage', 'Ζημιές από Κακοκαιρία'),
        ('flood_damage', 'Ζημιές από Πλημμύρα'),
        ('fire_damage', 'Ζημιές από Πυρκαγιά'),
        ('earthquake_damage', 'Ζημιές από Σεισμό'),
        ('vandalism_repair', 'Επισκευή Βανδαλισμών'),
        
        # Ειδικές Επισκευές
        ('locksmith', 'Κλειδαράς'),
        ('glass_repair', 'Επισκευή Γυαλιών'),
        ('door_repair', 'Επισκευή Πόρτας'),
        ('window_repair', 'Επισκευή Παραθύρων'),
        ('balcony_repair', 'Επισκευή Μπαλκονιού'),
        ('staircase_repair', 'Επισκευή Σκάλας'),
        
        # Δαπάνες Ασφάλειας & Πρόσβασης
        ('security_system', 'Σύστημα Ασφάλειας'),
        ('cctv_installation', 'Εγκατάσταση CCTV'),
        ('access_control', 'Σύστημα Ελέγχου Πρόσβασης'),
        ('fire_alarm', 'Σύστημα Πυρασφάλειας'),
        ('fire_extinguishers', 'Πυροσβεστήρες'),
        
        # Δαπάνες Διοικητικές & Νομικές
        ('legal_fees', 'Δικαστικά Έξοδα'),
        ('notary_fees', 'Συμβολαιογραφικά Έξοδα'),
        ('surveyor_fees', 'Εκτιμητής'),
        ('architect_fees', 'Αρχιτέκτονας'),
        ('engineer_fees', 'Μηχανικός'),
        ('accounting_fees', 'Λογιστικά Έξοδα'),
        ('management_fees', 'Διοικητικά Έξοδα'),
        
        # Δαπάνες Ειδικών Εργασιών
        ('asbestos_removal', 'Αφαίρεση Ασβέστη'),
        ('lead_paint_removal', 'Αφαίρεση Μολύβδου'),
        ('mold_removal', 'Αφαίρεση Μούχλας'),
        ('pest_control', 'Εντομοκτονία'),
        ('tree_trimming', 'Κλάδεμα Δέντρων'),
        ('snow_removal', 'Καθαρισμός Χιονιού'),
        
        # Δαπάνες Ενεργειακής Απόδοσης
        ('energy_upgrade', 'Ενεργειακή Αναβάθμιση'),
        ('insulation_work', 'Θερμομόνωση'),
        ('solar_panel_installation', 'Εγκατάσταση Φωτοβολταϊκών'),
        ('led_lighting', 'Αντικατάσταση με LED'),
        ('smart_systems', 'Έξυπνα Συστήματα'),
        
        # Δαπάνες Ιδιοκτητών
        ('special_contribution', 'Έκτακτη Εισφορά'),
        ('reserve_fund', 'Αποθεματικό Ταμείο'),
        ('emergency_fund', 'Ταμείο Έκτακτης Ανάγκης'),
        ('renovation_fund', 'Ταμείο Ανακαίνισης'),
        
        # Άλλες Δαπάνες
        ('miscellaneous', 'Διάφορες Δαπάνες'),
        ('consulting_fees', 'Εργασίες Συμβούλου'),
        ('permits_licenses', 'Άδειες & Αποδοχές'),
        ('taxes_fees', 'Φόροι & Τέλη'),
        ('utilities_other', 'Άλλες Κοινόχρηστες Υπηρεσίες'),
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

#### Δημιουργία Transaction & Payment Models
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

### Βήμα 1.2: API Endpoints

#### Δημιουργία Serializers
```python
# backend/financial/serializers.py
from rest_framework import serializers
from .models import Expense, Transaction, Payment

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
```

#### Δημιουργία Views
```python
# backend/financial/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from .models import Expense, Transaction, Payment
from .serializers import ExpenseSerializer, TransactionSerializer, PaymentSerializer
from buildings.models import Building
from apartments.models import Apartment
from decimal import Decimal
from typing import Dict, Any
from .services import CommonExpenseCalculator

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['building', 'category', 'is_issued', 'date']
    
    def get_queryset(self):
        building_id = self.request.query_params.get('building_id')
        if building_id:
            return self.queryset.filter(building_id=building_id)
        return self.queryset
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        building_id = request.query_params.get('building_id')
        queryset = self.get_queryset().filter(is_issued=False)
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class FinancialDashboardViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def summary(self, request):
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        total_obligations = sum(
            apt.current_balance for apt in apartments 
            if apt.current_balance < 0
        )
        
        recent_transactions = Transaction.objects.filter(
            building_id=building_id
        )[:10]
        
        return Response({
            'current_reserve': building.current_reserve,
            'total_obligations': abs(total_obligations),
            'recent_transactions': TransactionSerializer(recent_transactions, many=True).data,
        })

class CommonExpenseViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        building_id = request.data.get('building_id')
        period = request.data.get('period')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        calculator = CommonExpenseCalculator(building_id)
        shares = calculator.calculate_shares()
        
        return Response({
            'period': period,
            'shares': shares,
            'total_expenses': sum(exp.amount for exp in calculator.expenses),
            'pending_expenses': ExpenseSerializer(calculator.expenses, many=True).data
        })
    
    @action(detail=False, methods=['post'])
    def issue(self, request):
        building_id = request.data.get('building_id')
        period = request.data.get('period')
        shares = request.data.get('shares', {})
        
        try:
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
            
            # Δημιουργία εγγραφών κινήσεων
            for apartment_id, share_data in shares.items():
                if share_data['total_amount'] > 0:
                    Transaction.objects.create(
                        building_id=building_id,
                        type='common_expense_charge',
                        description=f"Κοινοχρήστων {period} - {share_data['apartment_number']}",
                        apartment_number=share_data['apartment_number'],
                        amount=-share_data['total_amount'],
                        balance_after=share_data['total_due']
                    )
            
            return Response({'message': 'Common expenses issued successfully'})
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

### Βήμα 1.3: Frontend Components

#### Δημιουργία Types
```typescript
// frontend/types/financial.ts
export interface Expense {
  id: number;
  building: number;
  title: string;
  amount: number;
  date: string;
  category: string;
  distribution_type: string;
  attachment?: string;
  notes?: string;
  is_issued: boolean;
  created_at: string;
}

export interface Transaction {
  id: number;
  building: number;
  date: string;
  type: string;
  description: string;
  apartment_number?: string;
  amount: number;
  balance_after: number;
  created_at: string;
}

export interface FinancialSummary {
  current_reserve: number;
  total_obligations: number;
  recent_transactions: Transaction[];
}
```

#### Δημιουργία Hooks
```typescript
// frontend/hooks/useExpenses.ts
import { useState } from 'react';
import { api } from '@/lib/api';
import { Expense } from '@/types/financial';

export const useExpenses = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const createExpense = async (data: Partial<Expense>) => {
    setIsLoading(true);
    try {
      const response = await api.post('/expenses/', data);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  };
  
  const getPendingExpenses = async (buildingId: number) => {
    const response = await api.get(`/expenses/pending/?building_id=${buildingId}`);
    return response.data;
  };
  
  const getExpenses = async (buildingId: number) => {
    const response = await api.get(`/expenses/?building_id=${buildingId}`);
    return response.data;
  };
  
  return {
    createExpense,
    getPendingExpenses,
    getExpenses,
    isLoading,
  };
};
```

#### Δημιουργία Components
```typescript
// frontend/components/financial/ExpenseForm.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { useExpenses } from '@/hooks/useExpenses';

interface ExpenseFormData {
  title: string;
  amount: number;
  date: string;
  category: string;
  distribution_type: string;
  notes?: string;
}

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
      // Reset form ή redirect
    } catch (error) {
      console.error('Error creating expense:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input 
          label="Τίτλος Δαπάνης" 
          {...register('title', { required: 'Απαιτείται' })}
        />
        <Input 
          label="Ποσό (€)" 
          type="number" 
          step="0.01"
          {...register('amount', { required: 'Απαιτείται' })}
        />
        <Input 
          label="Ημερομηνία" 
          type="date" 
          {...register('date', { required: 'Απαιτείται' })}
        />
        <Select 
          label="Κατηγορία" 
          {...register('category', { required: 'Απαιτείται' })}
          onChange={(e) => {
            setValue('category', e.target.value);
            setValue('distribution_type', getDefaultDistributionType(e.target.value));
          }}
        >
          <option value="">Επιλέξτε κατηγορία</option>
          <optgroup label="Πάγιες Δαπάνες Κοινοχρήστων">
            <option value="cleaning">Καθαρισμός Κοινοχρήστων Χώρων</option>
            <option value="electricity_common">ΔΕΗ Κοινοχρήστων</option>
            <option value="water_common">Νερό Κοινοχρήστων</option>
            <option value="garbage_collection">Συλλογή Απορριμμάτων</option>
            <option value="security">Ασφάλεια Κτιρίου</option>
            <option value="concierge">Καθαριστής/Πυλωρός</option>
          </optgroup>
          
          <optgroup label="Δαπάνες Ανελκυστήρα">
            <option value="elevator_maintenance">Ετήσια Συντήρηση Ανελκυστήρα</option>
            <option value="elevator_repair">Επισκευή Ανελκυστήρα</option>
            <option value="elevator_inspection">Επιθεώρηση Ανελκυστήρα</option>
            <option value="elevator_modernization">Μοντέρνιση Ανελκυστήρα</option>
          </optgroup>
          
          <optgroup label="Δαπάνες Θέρμανσης">
            <option value="heating_fuel">Πετρέλαιο Θέρμανσης</option>
            <option value="heating_gas">Φυσικό Αέριο Θέρμανσης</option>
            <option value="heating_maintenance">Συντήρηση Καυστήρα</option>
            <option value="heating_repair">Επισκευή Θερμαντικών</option>
            <option value="heating_inspection">Επιθεώρηση Θερμαντικών</option>
            <option value="heating_modernization">Μοντέρνιση Θερμαντικών</option>
          </optgroup>
          
          <optgroup label="Δαπάνες Ηλεκτρικών">
            <option value="electrical_maintenance">Συντήρηση Ηλεκτρικών</option>
            <option value="electrical_repair">Επισκευή Ηλεκτρικών</option>
            <option value="electrical_upgrade">Αναβάθμιση Ηλεκτρικών</option>
            <option value="lighting_common">Φωτισμός Κοινοχρήστων</option>
            <option value="intercom_system">Σύστημα Εσωτερικής Επικοινωνίας</option>
          </optgroup>
          
          <optgroup label="Δαπάνες Υδραυλικών">
            <option value="plumbing_maintenance">Συντήρηση Υδραυλικών</option>
            <option value="plumbing_repair">Επισκευή Υδραυλικών</option>
            <option value="water_tank_cleaning">Καθαρισμός Δεξαμενής Νερού</option>
            <option value="water_tank_maintenance">Συντήρηση Δεξαμενής Νερού</option>
            <option value="sewage_system">Σύστημα Αποχέτευσης</option>
          </optgroup>
          
          <optgroup label="Δαπάνες Κτιρίου">
            <option value="building_insurance">Ασφάλεια Κτιρίου</option>
            <option value="building_maintenance">Συντήρηση Κτιρίου</option>
            <option value="roof_maintenance">Συντήρηση Στέγης</option>
            <option value="roof_repair">Επισκευή Στέγης</option>
            <option value="facade_maintenance">Συντήρηση Πρόσοψης</option>
            <option value="facade_repair">Επισκευή Πρόσοψης</option>
            <option value="painting_exterior">Βαψίματα Εξωτερικών</option>
            <option value="painting_interior">Βαψίματα Εσωτερικών Κοινοχρήστων</option>
            <option value="garden_maintenance">Συντήρηση Κήπου</option>
            <option value="parking_maintenance">Συντήρηση Χώρων Στάθμευσης</option>
            <option value="entrance_maintenance">Συντήρηση Εισόδου</option>
          </optgroup>
          
          <optgroup label="Έκτακτες Δαπάνες">
            <option value="emergency_repair">Έκτακτη Επισκευή</option>
            <option value="storm_damage">Ζημιές από Κακοκαιρία</option>
            <option value="flood_damage">Ζημιές από Πλημμύρα</option>
            <option value="fire_damage">Ζημιές από Πυρκαγιά</option>
            <option value="earthquake_damage">Ζημιές από Σεισμό</option>
            <option value="vandalism_repair">Επισκευή Βανδαλισμών</option>
          </optgroup>
          
          <optgroup label="Ειδικές Επισκευές">
            <option value="locksmith">Κλειδαράς</option>
            <option value="glass_repair">Επισκευή Γυαλιών</option>
            <option value="door_repair">Επισκευή Πόρτας</option>
            <option value="window_repair">Επισκευή Παραθύρων</option>
            <option value="balcony_repair">Επισκευή Μπαλκονιού</option>
            <option value="staircase_repair">Επισκευή Σκάλας</option>
          </optgroup>
          
          <optgroup label="Ασφάλεια & Πρόσβαση">
            <option value="security_system">Σύστημα Ασφάλειας</option>
            <option value="cctv_installation">Εγκατάσταση CCTV</option>
            <option value="access_control">Σύστημα Ελέγχου Πρόσβασης</option>
            <option value="fire_alarm">Σύστημα Πυρασφάλειας</option>
            <option value="fire_extinguishers">Πυροσβεστήρες</option>
          </optgroup>
          
          <optgroup label="Διοικητικές & Νομικές">
            <option value="legal_fees">Δικαστικά Έξοδα</option>
            <option value="notary_fees">Συμβολαιογραφικά Έξοδα</option>
            <option value="surveyor_fees">Εκτιμητής</option>
            <option value="architect_fees">Αρχιτέκτονας</option>
            <option value="engineer_fees">Μηχανικός</option>
            <option value="accounting_fees">Λογιστικά Έξοδα</option>
            <option value="management_fees">Διοικητικά Έξοδα</option>
          </optgroup>
          
          <optgroup label="Ειδικές Εργασίες">
            <option value="asbestos_removal">Αφαίρεση Ασβέστη</option>
            <option value="lead_paint_removal">Αφαίρεση Μολύβδου</option>
            <option value="mold_removal">Αφαίρεση Μούχλας</option>
            <option value="pest_control">Εντομοκτονία</option>
            <option value="tree_trimming">Κλάδεμα Δέντρων</option>
            <option value="snow_removal">Καθαρισμός Χιονιού</option>
          </optgroup>
          
          <optgroup label="Ενεργειακή Απόδοση">
            <option value="energy_upgrade">Ενεργειακή Αναβάθμιση</option>
            <option value="insulation_work">Θερμομόνωση</option>
            <option value="solar_panel_installation">Εγκατάσταση Φωτοβολταϊκών</option>
            <option value="led_lighting">Αντικατάσταση με LED</option>
            <option value="smart_systems">Έξυπνα Συστήματα</option>
          </optgroup>
          
          <optgroup label="Δαπάνες Ιδιοκτητών">
            <option value="special_contribution">Έκτακτη Εισφορά</option>
            <option value="reserve_fund">Αποθεματικό Ταμείο</option>
            <option value="emergency_fund">Ταμείο Έκτακτης Ανάγκης</option>
            <option value="renovation_fund">Ταμείο Ανακαίνισης</option>
          </optgroup>
          
          <optgroup label="Άλλες Δαπάνες">
            <option value="miscellaneous">Διάφορες Δαπάνες</option>
            <option value="consulting_fees">Εργασίες Συμβούλου</option>
            <option value="permits_licenses">Άδειες & Αποδοχές</option>
            <option value="taxes_fees">Φόροι & Τέλη</option>
            <option value="utilities_other">Άλλες Κοινόχρηστες Υπηρεσίες</option>
          </optgroup>
        </Select>
        <Select 
          label="Τρόπος Κατανομής" 
          {...register('distribution_type', { required: 'Απαιτείται' })}
        >
          <option value="by_participation_mills">Ανά Χιλιοστά</option>
          <option value="equal_share">Ισόποσα</option>
          <option value="specific_apartments">Συγκεκριμένα</option>
          <option value="by_meters">Μετρητές</option>
        </Select>
      </div>
      
      <Textarea 
        label="Σημειώσεις" 
        {...register('notes')}
        rows={3}
      />
      
      <Button type="submit" loading={isLoading}>
        Αποθήκευση Δαπάνης
      </Button>
    </form>
  );
};
```

---

## ⚙️ Φάση 2: Αυτοματοποίηση Υπολογισμών

### Βήμα 2.1: Common Expense Calculator Service

```python
# backend/financial/services.py
from decimal import Decimal
from typing import Dict, Any
from .models import Expense
from apartments.models import Apartment

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
                'owner_name': apartment.owner_name,
                'participation_mills': apartment.participation_mills,
                'current_balance': apartment.current_balance,
                'total_amount': Decimal('0.00'),
                'breakdown': [],
                'previous_balance': apartment.current_balance,
                'total_due': Decimal('0.00')
            }
        
        for expense in self.expenses:
            if expense.distribution_type == 'by_participation_mills':
                self._calculate_by_participation_mills(expense, shares)
            elif expense.distribution_type == 'equal_share':
                self._calculate_equal_share(expense, shares)
        
        for apartment_id, share_data in shares.items():
            share_data['total_due'] = (
                share_data['total_amount'] + share_data['previous_balance']
            )
        
        return shares
    
    def _calculate_by_participation_mills(self, expense: Expense, shares: Dict):
        total_mills = sum(apt.participation_mills for apt in self.apartments)
        
        for apartment in self.apartments:
            share_amount = (expense.amount * apartment.participation_mills) / total_mills
            shares[apartment.id]['total_amount'] += share_amount
            shares[apartment.id]['breakdown'].append({
                'expense_id': expense.id,
                'expense_title': expense.title,
                'expense_amount': expense.amount,
                'apartment_share': share_amount,
                'distribution_type': expense.distribution_type
            })
```

### Βήμα 2.2: API Endpoints

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
        
        for apartment_id, share_data in shares.items():
            apartment = Apartment.objects.get(id=apartment_id)
            apartment.current_balance = share_data['total_due']
            apartment.save()
        
        expenses = Expense.objects.filter(
            building_id=building_id, 
            is_issued=False
        )
        expenses.update(is_issued=True)
        
        return Response({'message': 'Common expenses issued successfully'})
```

---

## 📊 Φάση 3: Διαφάνεια & Αναφορές

### Βήμα 3.1: Transaction History

```typescript
// frontend/components/financial/TransactionHistory.tsx
import React, { useEffect, useState } from 'react';
import { Table, Card } from '@/components/ui';
import { Transaction } from '@/types/financial';

export const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  useEffect(() => {
    loadTransactions();
  }, []);
  
  const loadTransactions = async () => {
    try {
      const buildingId = 1;
      const response = await fetch(`/api/transactions/?building_id=${buildingId}`);
      const data = await response.json();
      setTransactions(data.results || data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };
  
  return (
    <Card>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Ιστορικό Κινήσεων</h3>
        <Table>
          <thead>
            <tr>
              <th>Ημερομηνία</th>
              <th>Περιγραφή</th>
              <th>Διαμέρισμα</th>
              <th>Ποσό</th>
              <th>Υπόλοιπο</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{new Date(transaction.date).toLocaleDateString('el-GR')}</td>
                <td>{transaction.description}</td>
                <td>{transaction.apartment_number || '-'}</td>
                <td className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)}€
                </td>
                <td>{transaction.balance_after.toFixed(2)}€</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
};
```

---

## 🚀 Επόμενα Βήματα

### Προτεραιότητα 1: Ενσωμάτωση
1. **Building Context**: Ενσωμάτωση με το υπάρχον building selector
2. **Authentication**: Έλεγχος δικαιωμάτων για οικονομικές λειτουργίες
3. **Error Handling**: Καλύτερη διαχείριση σφαλμάτων

### Προτεραιότητα 2: Βελτιώσεις
1. **File Upload**: Επισύναψη παραστατικών στις δαπάνες
2. **Meter Readings**: Υποστήριξη μετρητών θέρμανσης
3. **Notifications**: Ειδοποιήσεις για πληρωμές

### Προτεραιότητα 3: Προχωρημένα Χαρακτηριστικά
1. **Audit Trail**: Πλήρες ιστορικό αλλαγών
2. **Reports**: Λεπτομερείς αναφορές
3. **Export**: Εξαγωγή αναφορών σε PDF/Excel

---

**Συμπέρασμα**: Αυτός ο οδηγός παρέχει ένα πλήρες roadmap για την εφαρμογή του οικονομικού συστήματος, ξεκινώντας από τη βασική λειτουργικότητα και προχωρώντας στα πιο προχωρημένα χαρακτηριστικά. 