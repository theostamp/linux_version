# 🏢 Σύστημα Μεταφοράς Υπολοίπων - Σχεδιασμός

## 📊 Τρέχουσα Αρχιτεκτονική

```
Μήνας Ν → Μήνας Ν+1
┌─────────────────┐    ┌─────────────────┐
│ MonthlyBalance  │    │ MonthlyBalance  │
│ - total_expenses│    │ - total_expenses│
│ - total_payments│    │ - total_payments│
│ - previous_oblig│    │ - previous_oblig│ ← carry_forward
│ - carry_forward │ ──→│ - carry_forward │
└─────────────────┘    └─────────────────┘
```

## 🎯 Προτεινόμενη Βελτίωση

### 1. Προσθήκη Ετήσιας Μεταφοράς

```
Έτος 2024 → Έτος 2025
┌─────────────────┐    ┌─────────────────┐
│ MonthlyBalance  │    │ MonthlyBalance  │
│ (Δεκέμβριος)    │    │ (Ιανουάριος)    │
│ - annual_carry  │ ──→│ - previous_oblig│
└─────────────────┘    └─────────────────┘
```

### 2. Νέο Πεδίο στο MonthlyBalance Model

```python
class MonthlyBalance(models.Model):
    # ... υπάρχοντα πεδία ...
    
    # ΝΕΟ: Ετήσιο υπόλοιπο που μεταφέρεται στο νέο έτος
    annual_carry_forward = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0, 
        verbose_name="Ετήσια Μεταφορά"
    )
    
    # ΝΕΟ: Έτος που ανήκει το υπόλοιπο
    balance_year = models.PositiveIntegerField(
        verbose_name="Έτος Υπολοίπου"
    )
```

### 3. Βελτιωμένη Λογική Μεταφοράς

#### Μηνιαία Μεταφορά (Ν → Ν+1)
```python
def close_month(self):
    # Υπολογισμός carry_forward
    self.carry_forward = -self.net_result if self.net_result < 0 else Decimal('0.00')
    
    # Αν είναι Δεκέμβριος, υπολογισμός ετήσιας μεταφοράς
    if self.month == 12:
        self.annual_carry_forward = self.carry_forward
        self.balance_year = self.year
    
    self.is_closed = True
    self.save()
    
    # Δημιουργία επόμενου μήνα
    self.create_next_month()
```

#### Ετήσια Μεταφορά (Δεκέμβριος → Ιανουάριος)
```python
def create_next_month(self):
    next_month = self.month + 1
    next_year = self.year
    
    if next_month > 12:
        next_month = 1
        next_year += 1
        
        # Ετήσια μεταφορά
        previous_obligations = self.annual_carry_forward
    else:
        # Μηνιαία μεταφορά
        previous_obligations = self.carry_forward
    
    MonthlyBalance.objects.get_or_create(
        building=self.building,
        year=next_year,
        month=next_month,
        defaults={
            'previous_obligations': previous_obligations,
            'balance_year': next_year,
            # ... άλλα πεδία ...
        }
    )
```

## 🔄 Ροή Δεδομένων

### 1. Κανονική Λειτουργία (Μήνας → Μήνας)
```
Ιανουάριος 2024:
- Δαπάνες: 1000€
- Εισπράξεις: 800€
- Net Result: -200€
- Carry Forward: 200€ (οφειλή)

Φεβρουάριος 2024:
- Previous Obligations: 200€ (από Ιανουάριο)
- Δαπάνες: 1200€
- Εισπράξεις: 1000€
- Total Obligations: 1400€ (200 + 1200)
- Net Result: -400€
- Carry Forward: 400€
```

### 2. Ετήσια Μεταφορά (Δεκέμβριος → Ιανουάριος)
```
Δεκέμβριος 2024:
- Carry Forward: 500€
- Annual Carry Forward: 500€
- Balance Year: 2024

Ιανουάριος 2025:
- Previous Obligations: 500€ (από ετήσια μεταφορά)
- Balance Year: 2025
- Νέος κύκλος...
```

## 🧹 Καθαρισμός Κώδικα

### Scripts προς Διαγραφή:
- `financial_audit_step3_balance_transfer_check.py`
- `system_health_check.py` (περιττές εντολές)
- `test_monthly_balance_display.py`
- `debug_comprehensive_expense_list.py`
- `test_frontend_data_flow.py`
- `simple_september_test.py`
- `test_comprehensive_expense_list_september.py`
- `create_missing_monthly_balances.py`

### Functions προς Απλοποίηση:
- `_get_historical_balance()` - απλοποίηση
- `calculate_shares()` - αφαίρεση περιττών υπολογισμών
- `check_balance_transfer()` - αφαίρεση από health check

## 🎯 Αποτελέσματα

### Πριν:
- Περίπλοκη λογική με πολλά scripts
- Έλλειψη ετήσιας μεταφοράς
- Περιττός κώδικας

### Μετά:
- Απλή και συστηματική λογική
- Πλήρης ετήσια μεταφορά
- Καθαρός και βελτιστοποιημένος κώδικας
- Αυτόματη λειτουργία από 1/1 έως 31/12
