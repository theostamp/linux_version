# 🔍 Ανάλυση Προβλήματος: Εξαφάνιση Οφειλών Δεκεμβρίου

**Ημερομηνία:** 19 Νοεμβρίου 2025  
**Κατάσταση:** 🔴 **ΕΝΕΡΓΟ ΠΡΟΒΛΗΜΑ**

---

## 📊 Συμπτώματα

### ✅ Νοέμβριος 2025 (ΣΩΣΤΑ):
- **Δαπάνες:** 100€ συνολικά
- **Διαμέρισμα Α1 (100 χιλιοστά = 10%):** 
  - Οφειλή: 10€ ✅
  - Ειδοποιητήριο: "Ποσό Πληρωτέο: 10€" ✅
  - Δαπάνες Ενοίκου: 10€ ✅
  - Κατάσταση: "Οφειλή" ✅

### ❌ Δεκέμβριος 2025 (ΧΩΡΙΣ νέες δαπάνες/πληρωμές) - ΛΑΘΟΣ:

#### Συνοπτικός Πίνακας:
```
Παλαιότερες οφειλές: 100€      ✅ ΣΩΣΤΟ
Μηνιαίο: 100€                   ❌ ΛΑΘΟΣ (θα έπρεπε 0€)
ΣΥΝΟΛΟ: 100€                    ⚠️  (θα έπρεπε να είναι μόνο παλαιότερες)
```

#### Ειδοποιητήριο Α1:
```
Ποσό Πληρωτέο: 0,00 €           ❌ ΛΑΘΟΣ (θα έπρεπε 10€)
Δαπάνες Ενοίκου: -               ❌ ΛΑΘΟΣ
Δαπάνες Ιδιοκτήτη: -             ❌ ΛΑΘΟΣ
Παλαιότερες Οφειλές: -           ❌ ΛΑΘΟΣ (θα έπρεπε 10€)
Ποσό Κοινοχρήστων: 0,00 €       ❌ ΛΑΘΟΣ
```

#### Κατάσταση Διαμερισμάτων:
```
Όλα τα διαμερίσματα:
  Δαπάνες Ενοίκου: -             ❌ ΛΑΘΟΣ
  Δαπάνες Ιδιοκτήτη: -            ❌ ΛΑΘΟΣ
  Συνολική Οφειλή: -              ❌ ΛΑΘΟΣ (θα έπρεπε να δείχνει παλαιότερες οφειλές)
  Κατάσταση: "Ενήμερο"            ❌ ΛΑΘΟΣ (θα έπρεπε "Οφειλή")
```

---

## 🔍 Διάγνωση

### Πιθανές Αιτίες:

### 1. ❌ **Το `financial_system_start_date` δεν είναι ορισμένο**

**Έλεγχος:**
```sql
SELECT id, name, financial_system_start_date 
FROM buildings_building 
WHERE id = [YOUR_BUILDING_ID];
```

**Αν είναι `NULL` ή μετά τον Νοέμβριο:**
- Το `BalanceCalculationService.calculate_historical_balance()` επιστρέφει **0€**
- Οι οφειλές Νοεμβρίου **εξαφανίζονται**

**Λύση:**
```sql
UPDATE buildings_building 
SET financial_system_start_date = '2025-11-01' 
WHERE id = [YOUR_BUILDING_ID];
```

---

### 2. ❌ **Δεν έχει δημιουργηθεί `MonthlyBalance` για Δεκέμβριο**

**Έλεγχος:**
```sql
SELECT year, month, previous_obligations, carry_forward, is_closed
FROM financial_monthlybalance
WHERE building_id = [YOUR_BUILDING_ID]
ORDER BY year, month;
```

**Αν δεν υπάρχει record για Δεκέμβριο 2025:**
- Το σύστημα δεν μεταφέρει τις οφειλές
- Οι παλαιότερες οφειλές **χάνονται**

**Λύση:**
```python
from financial.monthly_balance_service import MonthlyBalanceService

building = Building.objects.get(id=[YOUR_BUILDING_ID])
service = MonthlyBalanceService(building)

# Κλείσε τον Νοέμβριο και δημιούργησε τον Δεκέμβριο
nov_balance, dec_balance = service.close_month_and_create_next(2025, 11)

print(f"Νοέμβριος carry_forward: €{nov_balance.carry_forward}")
print(f"Δεκέμβριος previous_obligations: €{dec_balance.previous_obligations}")
```

---

### 3. ⚠️ **To Frontend δεν εμφανίζει σωστά το `previous_balance`**

Το API μπορεί να επιστρέφει σωστά το `previous_balance`, αλλά το frontend να μην το εμφανίζει.

**Έλεγχος:**
1. Άνοιξε το Browser DevTools (F12)
2. Πήγαινε στον Δεκέμβριο
3. Βρες το API call: `/api/financial/dashboard/apartment_balances/?month=2025-12`
4. Έλεγξε το response:

```json
{
  "number": "Α1",
  "previous_balance": 10.00,  // ⬅️ Αυτό πρέπει να είναι 10€, όχι 0€!
  "resident_expenses": 0.00,
  "owner_expenses": 0.00,
  "net_obligation": 10.00
}
```

**Αν `previous_balance: 0.00`:**
- Το πρόβλημα είναι στο backend (αιτίες 1 ή 2 παραπάνω)

**Αν `previous_balance: 10.00` αλλά δεν εμφανίζεται:**
- Το πρόβλημα είναι στο frontend

---

## 🔧 Λύσεις ανά Σενάριο

### ✅ ΛΥΣΗ 1: Ορισμός `financial_system_start_date`

**Script:**
```python
from buildings.models import Building
from datetime import date

building = Building.objects.get(id=[YOUR_BUILDING_ID])
building.financial_system_start_date = date(2025, 11, 1)
building.save()

print(f"✅ Financial system start date set to: {building.financial_system_start_date}")
```

**Ή μέσω Django Admin:**
1. Πήγαινε στο Building
2. Όρισε "Financial System Start Date" = `2025-11-01`
3. Save

---

### ✅ ΛΥΣΗ 2: Δημιουργία MonthlyBalance για Δεκέμβριο

**Script:**
```python
from buildings.models import Building
from financial.monthly_balance_service import MonthlyBalanceService

building = Building.objects.get(id=[YOUR_BUILDING_ID])
service = MonthlyBalanceService(building)

# Κλείσε Νοέμβριο
nov_balance, dec_balance = service.close_month_and_create_next(2025, 11)

print("✅ Δεκέμβριος δημιουργήθηκε!")
print(f"   Previous Obligations: €{dec_balance.previous_obligations}")
```

---

### ✅ ΛΥΣΗ 3: Έλεγχος Frontend (αν το API επιστρέφει σωστά)

**Αρχείο:** `public-app/src/components/financial/calculator/components/ApartmentExpenseTable.tsx`

**Έλεγξε τη γραμμή που εμφανίζει το `previous_balance`:**

```typescript
const previousBalance = Math.abs(apartmentData?.previous_balance ?? 0);
```

**Αν το `apartmentData.previous_balance` είναι 10 αλλά εμφανίζει 0:**
- Πιθανά το component δεν κάνει re-render
- Ή το conditional rendering κρύβει το πεδίο

---

## 🧪 Debug Script

Δημιούργησα script: `backend/debug_december_balances.py`

**Χρήση (ΟΤΑ ΤΡΕΧΕΙ Η ΒΑΣΗ):**
```bash
cd /home/theo/project/backend
source venv/bin/activate
python debug_december_balances.py
```

**Τι κάνει:**
1. Ελέγχει `financial_system_start_date`
2. Ελέγχει δαπάνες Νοεμβρίου
3. Υπολογίζει `previous_balance` για Δεκέμβριο
4. Ελέγχει MonthlyBalance records
5. Καλεί το API για Δεκέμβριο
6. Δίνει διάγνωση και λύσεις

---

## 📝 Συνιστώμενη Διαδικασία

### Βήμα 1: Έλεγξε το `financial_system_start_date`

```sql
SELECT id, name, financial_system_start_date 
FROM buildings_building;
```

**Αν είναι NULL:**
```sql
UPDATE buildings_building 
SET financial_system_start_date = '2025-11-01' 
WHERE id = [YOUR_ID];
```

---

### Βήμα 2: Έλεγξε τα MonthlyBalance records

```sql
SELECT 
    year, 
    month, 
    total_expenses, 
    total_payments, 
    previous_obligations, 
    carry_forward, 
    is_closed
FROM financial_monthlybalance
WHERE building_id = [YOUR_ID]
ORDER BY year, month;
```

**Αν δεν υπάρχει Δεκέμβριος:**
- Κλείσε τον Νοέμβριο μέσω του API ή script

---

### Βήμα 3: Έλεγξε το API Response

1. Άνοιξε το Frontend
2. Πήγαινε στον Δεκέμβριο
3. F12 → Network tab
4. Βρες το call: `apartment_balances/?month=2025-12`
5. Έλεγξε αν το `previous_balance` είναι σωστό

---

### Βήμα 4: Αν όλα είναι OK στο API αλλά το UI δεν δείχνει σωστά

**Πιθανά το component δεν κάνει re-render μετά την αλλαγή μήνα.**

Έλεγξε το `ApartmentExpenseTable.tsx`:
- Ελέγχει σωστά το `apartmentData.previous_balance`?
- Κάνει conditional rendering που κρύβει τις οφειλές?
- Χρησιμοποιεί cached data αντί για fresh data?

---

## 🎯 Πιθανότερη Αιτία

Με βάση τα συμπτώματα:

### 🥇 **#1: Δεν έχει οριστεί `financial_system_start_date`**

**Γιατί:**
- Ο Νοέμβριος δείχνει σωστά τις οφειλές
- Ο Δεκέμβριος δεν δείχνει `previous_balance`
- Το `BalanceCalculationService.calculate_historical_balance()` επιστρέφει 0 αν δεν υπάρχει `financial_system_start_date`

**Λύση:**
```python
building.financial_system_start_date = date(2025, 11, 1)
building.save()
```

---

### 🥈 **#2: Δεν έχει δημιουργηθεί MonthlyBalance για Δεκέμβριο**

**Γιατί:**
- Ο συνοπτικός πίνακας δείχνει "Παλαιότερες οφειλές: 100€"
- Αλλά τα διαμερίσματα δείχνουν 0€

**Λύση:**
```python
service.close_month_and_create_next(2025, 11)
```

---

## ✅ Επόμενα Βήματα

1. **ΑΜΕΣΑ:** Όρισε `financial_system_start_date` αν δεν υπάρχει
2. **ΜΕΤΑ:** Κλείσε τον Νοέμβριο για να δημιουργηθεί ο Δεκέμβριος
3. **ΕΛΕΓΧΟΣ:** Έλεγξε το API response για Δεκέμβριο
4. **ΤΕΣΤ:** Ελέγχει το UI αν εμφανίζει σωστά τα δεδομένα

---

**Τελευταία Ενημέρωση:** 19 Νοεμβρίου 2025

