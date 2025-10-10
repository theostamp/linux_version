# Ανάλυση: Γιατί δεν μεταφέρονται τα υπόλοιπα στον επόμενο μήνα;

**Ημερομηνία:** 10 Οκτωβρίου 2025  
**Σκοπός:** Διερεύνηση και επίλυση του προβλήματος μεταφοράς υπολοίπων

---

## 🔍 Η Σωστή Λογική (Όπως περιγράφεται)

### Σενάριο: Νέα Πολυκατοικία
1. **Καταχώρηση:** Εγγραφή στο σύστημα + δημιουργία "Πακέτου Δαπανών Διαχείρισης"
2. **Μηνιαία Χρέωση:** π.χ. 10€/μήνα management fee
3. **Ημερομηνία Έναρξης:** Από την 1η του μήνα (ανεξάρτητα από την ημέρα καταχώρησης)
4. **Ενσωμάτωση:** Το ποσό προστίθεται στο συνολικό χρέος
5. **Μεταφορά:** Αν δεν πληρωθεί → "Προηγούμενες Οφειλές" τον επόμενο μήνα

### Ίδια λογική για:
- ✅ Management Fees (Δαπάνες Διαχείρισης)
- ✅ Reserve Fund (Αποθεματικό)
- ✅ Δόσεις Έργων (όταν υπάρχουν)

---

## 📊 Πώς Λειτουργεί ΤΩΡΑ

### `BalanceCalculationService.calculate_historical_balance()`
**Αρχείο:** `linux_version/backend/financial/balance_service.py`

```python
def calculate_historical_balance(
    apartment: Apartment,
    end_date: date,
    include_management_fees: bool = True,
    include_reserve_fund: bool = False
) -> Decimal:
```

**Λογική:**
1. Βρίσκει όλες τις δαπάνες ΠΡΙΝ από το `end_date` (exclusive)
2. Υπολογίζει χρεώσεις από transactions
3. Υπολογίζει πληρωμές
4. **Αν `include_management_fees=True`:** Υπολογίζει management fees δυναμικά
5. **Αν `include_reserve_fund=True`:** Υπολογίζει reserve fund για τους μήνες εντός timeline
6. **Επιστρέφει:** `(charges + management_fees + reserve_fund) - payments`

### Πώς χρησιμοποιείται για Previous Balance

**Αρχείο:** `linux_version/backend/financial/services.py` (γραμμή 1046)

```python
# Για μήνα Νοέμβριο 2025:
month_start = date(2025, 11, 1)

# Υπολογισμός previous_balance (οφειλές ΠΡΙΝ τον Νοέμβριο)
calculated_balance = BalanceCalculationService.calculate_historical_balance(
    apartment, month_start, include_management_fees=True
)

previous_balance = calculated_balance  # Οφειλές μέχρι 31 Οκτωβρίου
```

---

## ⚠️ ΠΡΟΒΛΗΜΑΤΑ ΠΟΥ ΕΝΤΟΠΙΣΤΗΚΑΝ

### 1. **Reserve Fund ΔΕΝ συμπεριλαμβάνεται στο Previous Balance** ❌

**Πρόβλημα:**
```python
# Γραμμή 1007-1013 στο services.py
calculated_balance = BalanceCalculationService.calculate_historical_balance(
    apartment, month_start, include_management_fees=True
)
# ❌ include_reserve_fund=False (default)
```

**Αποτέλεσμα:** Το αποθεματικό των προηγούμενων μηνών ΔΕΝ μεταφέρεται!

**Σενάριο:**
- Οκτώβριος: Χρεώθηκαν 100€ αποθεματικό
- Διαμέρισμα δεν πλήρωσε
- Νοέμβριος: Οι 100€ ΔΕΝ εμφανίζονται στις "Προηγούμενες Οφειλές"!

---

### 2. **Management Fees υπολογίζονται CUMULATIVE αντί για ΜΗΝΙΑΙΕΣ** ⚠️

**Πρόβλημα στο `balance_service.py` (γραμμές 162-186):**

```python
if include_management_fees:
    management_expenses = Expense.objects.filter(
        building_id=apartment.building_id,
        category='management_fees',
        date__gte=system_start_date,
        date__lt=month_start  # ❌ Όλοι οι μήνες από την αρχή!
    )
    
    # Υπολογίζει το ΣΥΝΟΛΟ όλων των management fees expenses
    total_management_expenses = management_expenses.aggregate(...)
    management_fee_charges = total_management_expenses / total_apartments
```

**Πρόβλημα:** Αυτό παίρνει ΟΛΑ τα management fee expenses από system_start_date.

**Αλλά:** Σε ένα σύστημα με δυναμικά management fees (όχι Expense records), αυτό μπορεί να μην δουλεύει σωστά.

---

### 3. **Διπλή λογική για Management Fees** 🤔

**Α. Στο `BalanceCalculationService` (γραμμές 162-186):**
- Ψάχνει για `Expense` objects με `category='management_fees'`
- Κάνει aggregate και equal share distribution

**Β. Στο `get_apartment_balances()` (γραμμές 1077-1092):**
```python
management_fee_per_apartment = self.building.management_fee_per_apartment or Decimal('0.00')
if management_fee_per_apartment > 0:
    monthly_management_fee = management_fee_per_apartment * months_to_charge
    expense_share += monthly_management_fee
```

**Ερώτημα:** Ποια είναι η σωστή προσέγγιση;
- Δυναμικά από `building.management_fee_per_apartment`? (όπως περιγράφεις)
- Ή από `Expense` records?

---

## 🎯 ΛΥΣΕΙΣ

### Λύση 1: Ενεργοποίηση `include_reserve_fund=True`

**Που:** `linux_version/backend/financial/services.py` γραμμή ~1007

**Πριν:**
```python
calculated_balance = BalanceCalculationService.calculate_historical_balance(
    apartment, month_start, include_management_fees=True
)
```

**Μετά:**
```python
calculated_balance = BalanceCalculationService.calculate_historical_balance(
    apartment, month_start, 
    include_management_fees=True,
    include_reserve_fund=True  # ✅ ΝΕΟ!
)
```

---

### Λύση 2: Διόρθωση Management Fees Logic

Χρειάζεται να αποφασίσουμε:

**Επιλογή Α: Δυναμικά Management Fees (Συνιστάται)**
- Χρησιμοποιούμε `building.management_fee_per_apartment`
- Υπολογίζουμε: `fee_per_apartment × μήνες_από_έναρξη`
- Δημιουργούμε `Transaction` records αυτόματα κάθε μήνα
- **Πλεονέκτημα:** Δεν χρειάζεται manual creation of Expense records

**Επιλογή Β: Expense-based Management Fees**
- Δημιουργούμε `Expense` με `category='management_fees'` κάθε μήνα
- Το σύστημα τα διαβάζει από τη βάση
- **Πλεονέκτημα:** Πιο esplicit, μπορούν να επεξεργαστούν

---

### Λύση 3: Αυτόματη Δημιουργία Μηνιαίων Χρεώσεων

**Προτεινόμενη Αρχιτεκτονική:**

```python
class MonthlyChargeService:
    """Αυτόματη δημιουργία μηνιαίων χρεώσεων"""
    
    @staticmethod
    def create_monthly_charges(building: Building, target_month: date):
        """
        Δημιουργεί όλες τις μηνιαίες χρεώσεις για μια πολυκατοικία:
        - Management Fees
        - Reserve Fund
        - Δόσεις Έργων
        
        Καλείται:
        - Αυτόματα κάθε μήνα (cron job)
        - Manual όταν δημιουργείται νέα πολυκατοικία
        - Retroactive για ιστορικούς μήνες
        """
        # 1. Management Fees
        if building.management_fee_per_apartment:
            MonthlyChargeService._create_management_fee_charge(
                building, target_month
            )
        
        # 2. Reserve Fund
        if MonthlyChargeService._is_reserve_fund_active(building, target_month):
            MonthlyChargeService._create_reserve_fund_charge(
                building, target_month
            )
        
        # 3. Δόσεις Έργων
        # TODO: Implement project installments
```

---

## 🔄 ΠΡΟΤΕΙΝΟΜΕΝΗ ΡΟΗΗ

### Κατά τη δημιουργία νέας πολυκατοικίας:

```python
# 1. Καταχώρηση Πολυκατοικίας
building = Building.objects.create(
    name="Πολυκατοικία Α",
    financial_system_start_date=date.today().replace(day=1),  # 1η του μήνα
    management_fee_per_apartment=Decimal('10.00'),
    ...
)

# 2. Δημιουργία Μηνιαίων Χρεώσεων για τρέχοντα μήνα
MonthlyChargeService.create_monthly_charges(
    building, 
    date.today().replace(day=1)
)

# 3. Δημιουργία Transaction records για κάθε διαμέρισμα
for apartment in building.apartments.all():
    Transaction.objects.create(
        apartment=apartment,
        building=building,
        type='monthly_management_fee',
        amount=building.management_fee_per_apartment,
        date=date.today().replace(day=1),
        description=f"Δαπάνες Διαχείρισης {month_name}"
    )
```

### Κάθε μήνα (αυτόματα):

```python
# Cron job που τρέχει την 1η κάθε μήνα
def monthly_charge_job():
    for building in Building.objects.filter(is_active=True):
        MonthlyChargeService.create_monthly_charges(
            building, 
            date.today().replace(day=1)
        )
```

---

## 📝 ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ

1. **Επιβεβαίωση της επιλογής:**
   - Δυναμικά management fees ή Expense-based?
   
2. **Διόρθωση του `include_reserve_fund`:**
   - Ενεργοποίηση σε όλα τα σημεία που υπολογίζεται previous_balance
   
3. **Δημιουργία `MonthlyChargeService`:**
   - Κεντρική υπηρεσία για αυτόματη δημιουργία μηνιαίων χρεώσεων
   
4. **Testing:**
   - Σενάριο 1: Νέα πολυκατοικία, μηνιαία χρέωση, μεταφορά στον επόμενο μήνα
   - Σενάριο 2: Μερική πληρωμή, υπόλοιπο μεταφέρεται
   - Σενάριο 3: Reserve fund + management fees μαζί

5. **Documentation:**
   - Πλήρης τεκμηρίωση της λογικής μεταφοράς υπολοίπων
   - Examples και best practices

---

**Συμπέρασμα:** Το σύστημα έχει τη βασική λογική, αλλά χρειάζονται τρεις διορθώσεις:
1. ✅ Ενεργοποίηση `include_reserve_fund`
2. ⚠️ Αποσαφήνιση management fees approach
3. 🚀 Δημιουργία αυτόματου μηχανισμού για μηνιαίες χρεώσεις

