# TODO: Αυτόματη Μετατροπή Πληρωμών και Εισπράξεων σε Συναλλαγές

## 🎯 Προβληματική

Το σύστημα δεν μετατρέπει αυτόματα τις πληρωμές και εισπράξεις σε συναλλαγές (transactions), με αποτέλεσμα:

- **Δεν εμφανίζονται οι "Παλαιότερες οφειλές"** στο component "Οικονομική Κατάσταση Μήνα"
- **Λανθασμένοι υπολογισμοί** ιστορικών υπολοίπων
- **Ασυνεπής κατάσταση** μεταξύ πληρωμών και συναλλαγών

## 🔍 Τρέχουσα Κατάσταση

### Διαθέσιμα Δεδομένα
- ✅ **Πληρωμές (Payments)**: Υπάρχουν πληρωμές για τον Αύγουστο 2025
- ✅ **Δαπάνες (Expenses)**: Υπάρχει δαπάνη 300€ για τον Μάρτιο 2025 (ΔΕΗ Κοινοχρήστων)
- ❌ **Συναλλαγές (Transactions)**: Δεν υπάρχουν συναλλαγές

### Αναμενόμενο Αποτέλεσμα
- **Πληρωμές** → **Συναλλαγές τύπου** `common_expense_payment`
- **Δαπάνες** → **Συναλλαγές τύπου** `common_expense_charge` (όταν εκδίδονται)

## 🚀 Λύση

### 1. Δημιουργία Signal Handlers

```python
# financial/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Payment, Expense, Transaction

@receiver(post_save, sender=Payment)
def create_payment_transaction(sender, instance, created, **kwargs):
    """Δημιουργία συναλλαγής για κάθε νέα πληρωμή"""
    if created:
        Transaction.objects.create(
            apartment=instance.apartment,
            building=instance.apartment.building,
            type='common_expense_payment',
            amount=instance.amount,
            date=instance.date,
            description=f"Πληρωμή - {instance.get_method_display()}",
            payment=instance
        )

@receiver(post_save, sender=Expense)
def create_expense_transaction(sender, instance, created, **kwargs):
    """Δημιουργία συναλλαγών για εκδοθείσες δαπάνες"""
    if created and instance.is_issued:
        # Δημιουργία συναλλαγής για κάθε διαμέρισμα
        for apartment in instance.building.apartments.all():
            share_amount = calculate_expense_share(instance, apartment)
            Transaction.objects.create(
                apartment=apartment,
                building=instance.building,
                type='common_expense_charge',
                amount=share_amount,
                date=instance.date,
                description=f"Χρέωση - {instance.title}",
                expense=instance
            )
```

### 2. Retroactive Conversion Script

```python
# backend/convert_existing_data_to_transactions.py
def convert_existing_payments_to_transactions():
    """Μετατροπή υπάρχουσων πληρωμών σε συναλλαγές"""
    payments = Payment.objects.all()
    for payment in payments:
        if not Transaction.objects.filter(payment=payment).exists():
            Transaction.objects.create(
                apartment=payment.apartment,
                building=payment.apartment.building,
                type='common_expense_payment',
                amount=payment.amount,
                date=payment.date,
                description=f"Πληρωμή - {payment.get_method_display()}",
                payment=payment
            )

def convert_existing_expenses_to_transactions():
    """Μετατροπή εκδοθεισών δαπανών σε συναλλαγές"""
    expenses = Expense.objects.filter(is_issued=True)
    for expense in expenses:
        for apartment in expense.building.apartments.all():
            share_amount = calculate_expense_share(expense, apartment)
            if not Transaction.objects.filter(expense=expense, apartment=apartment).exists():
                Transaction.objects.create(
                    apartment=apartment,
                    building=expense.building,
                    type='common_expense_charge',
                    amount=share_amount,
                    date=expense.date,
                    description=f"Χρέωση - {expense.title}",
                    expense=expense
                )
```

### 3. Ενημέρωση Models

```python
# financial/models.py
class Payment(models.Model):
    # ... existing fields ...
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Δημιουργία συναλλαγής για νέες πληρωμές
        if is_new:
            Transaction.objects.create(
                apartment=self.apartment,
                building=self.apartment.building,
                type='common_expense_payment',
                amount=self.amount,
                date=self.date,
                description=f"Πληρωμή - {self.get_method_display()}",
                payment=self
            )

class Expense(models.Model):
    # ... existing fields ...
    
    def save(self, *args, **kwargs):
        was_issued = self.is_issued if self.pk else False
        super().save(*args, **kwargs)
        
        # Δημιουργία συναλλαγών όταν εκδίδεται η δαπάνη
        if self.is_issued and not was_issued:
            for apartment in self.building.apartments.all():
                share_amount = self.calculate_share_for_apartment(apartment)
                Transaction.objects.create(
                    apartment=apartment,
                    building=self.building,
                    type='common_expense_charge',
                    amount=share_amount,
                    date=self.date,
                    description=f"Χρέωση - {self.title}",
                    expense=self
                )
```

## 📋 Βήματα Εφαρμογής

### Phase 1: Προετοιμασία
- [ ] Δημιουργία `financial/signals.py`
- [ ] Εγγραφή signals στο `financial/apps.py`
- [ ] Δημιουργία migration για τυχόν νέα πεδία

### Phase 2: Retroactive Conversion
- [ ] Δημιουργία script `convert_existing_data_to_transactions.py`
- [ ] Εκτέλεση script σε Docker container
- [ ] Έλεγχος αποτελεσμάτων

### Phase 3: Ενημέρωση Models
- [ ] Προσθήκη `save()` methods στα models
- [ ] Testing με νέες πληρωμές/δαπάνες
- [ ] Έλεγχος αυτόματης δημιουργίας συναλλαγών

### Phase 4: Testing & Validation
- [ ] Έλεγχος "Παλαιότερες οφειλές" στο UI
- [ ] Έλεγχος ιστορικών υπολοίπων
- [ ] Validation συνεπέντησης δεδομένων

## 🎯 Αναμενόμενα Αποτελέσματα

Μετά την εφαρμογή:

1. **"Παλαιότερες οφειλές"** θα εμφανίζει σωστά το -300€ από τον Μάρτιο 2025
2. **Ιστορικά υπόλοιπα** θα υπολογίζονται σωστά από συναλλαγές
3. **Αυτόματη δημιουργία** συναλλαγών για νέες πληρωμές/δαπάνες
4. **Συνεπέντηση** μεταξύ πληρωμών, δαπανών και συναλλαγών

## ⚠️ Προσοχή

- **Backup database** πριν την εκτέλεση retroactive conversion
- **Testing** σε development environment πρώτα
- **Validation** ότι δεν δημιουργούνται διπλές συναλλαγές
- **Rollback plan** σε περίπτωση προβλημάτων

## 🔗 Σχετικά Αρχεία

- `backend/financial/models.py` - Models για Payment, Expense, Transaction
- `backend/financial/services.py` - FinancialDashboardService
- `frontend/components/financial/calculator/BuildingOverviewSection.tsx` - UI component
- `backend/test_previous_obligations_fix.py` - Testing script

---

**Προτεραιότητα**: 🔴 Υψηλή  
**Εκτιμώμενος χρόνος**: 2-3 ώρες  
**Εξάρτηση**: Κανένα
