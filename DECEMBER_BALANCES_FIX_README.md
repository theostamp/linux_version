# 🔧 Διόρθωση Εξαφάνισης Οφειλών Δεκεμβρίου - Οδηγός

**Ημερομηνία:** 19 Νοεμβρίου 2025  
**Θέμα:** Οι οφειλές Νοεμβρίου εξαφανίζονται τον Δεκέμβριο

---

## 🎯 Το Πρόβλημα

**Νοέμβριος:** Δαπάνες 100€ → Διαμερίσματα έχουν οφειλές (π.χ. Α1: 10€) ✅  
**Δεκέμβριος:** ΧΩΡΙΣ νέες δαπάνες → Όλα τα διαμερίσματα εμφανίζονται "Ενήμερο" ❌

### Οι οφειλές **εξαφανίζονται**!

---

## 🔍 Διάγνωση

Υπάρχουν **2 κύριες αιτίες**:

### 1. ❌ Το Building δεν έχει `financial_system_start_date`
- Το `BalanceCalculationService` επιστρέφει **0€** για παλαιότερες οφειλές
- Οι οφειλές Νοεμβρίου δεν υπολογίζονται

### 2. ❌ Δεν υπάρχει `MonthlyBalance` για Δεκέμβριο
- Ο Νοέμβριος δεν έχει κλείσει
- Οι οφειλές δεν μεταφέρονται στον επόμενο μήνα

---

## 🔧 Λύσεις

### ✅ ΛΥΣΗ 1: Αυτόματη Διόρθωση (RECOMMENDED)

**Script:** `backend/fix_december_balances.py`

```bash
cd /home/theo/project/backend
source venv/bin/activate
python fix_december_balances.py
```

**Τι κάνει:**
1. Ελέγχει αν το Building έχει `financial_system_start_date`
   - Αν ΟΧΙ → Το ορίζει στην πρώτη δαπάνη ή σε default
2. Ελέγχει αν υπάρχει MonthlyBalance για Δεκέμβριο
   - Αν ΟΧΙ → Κλείνει τον Νοέμβριο και δημιουργεί τον Δεκέμβριο
3. Διορθώνει όλα τα buildings αυτόματα

**Για συγκεκριμένο Building:**
```bash
python fix_december_balances.py --building-id 6
```

---

### ✅ ΛΥΣΗ 2: Χειροκίνητη Διόρθωση

#### Βήμα 1: Όρισε `financial_system_start_date`

**Μέσω Django Shell:**
```bash
cd /home/theo/project/backend
source venv/bin/activate
python manage.py shell
```

```python
from buildings.models import Building
from datetime import date

building = Building.objects.get(id=6)  # Αντικατάστησε με το ID σου
building.financial_system_start_date = date(2025, 11, 1)
building.save()

print(f"✅ Set to: {building.financial_system_start_date}")
```

**Ή μέσω Django Admin:**
1. Πήγαινε στο `/admin/buildings/building/`
2. Άνοιξε το Building
3. Όρισε "Financial System Start Date" = `2025-11-01`
4. Save

---

#### Βήμα 2: Δημιούργησε MonthlyBalance για Δεκέμβριο

**Μέσω Django Shell:**
```python
from buildings.models import Building
from financial.monthly_balance_service import MonthlyBalanceService

building = Building.objects.get(id=6)
service = MonthlyBalanceService(building)

# Κλείσε Νοέμβριο και δημιούργησε Δεκέμβριο
nov_balance, dec_balance = service.close_month_and_create_next(2025, 11)

print(f"✅ Νοέμβριος carry_forward: €{nov_balance.carry_forward}")
print(f"✅ Δεκέμβριος previous_obligations: €{dec_balance.previous_obligations}")
```

---

### ✅ ΛΥΣΗ 3: Debug Script (Διαγνωστικό)

**Script:** `backend/debug_december_balances.py`

```bash
cd /home/theo/project/backend
source venv/bin/activate
python debug_december_balances.py
```

**Τι κάνει:**
- Εμφανίζει αναλυτικά τι συμβαίνει
- Δεν κάνει αλλαγές
- Δίνει προτάσεις διόρθωσης

---

## 📊 Έλεγχος Αποτελέσματος

### 1. Έλεγξε τη Βάση Δεδομένων

```sql
-- Έλεγχος financial_system_start_date
SELECT id, name, financial_system_start_date 
FROM buildings_building;

-- Έλεγχος MonthlyBalance
SELECT 
    year, 
    month, 
    total_expenses, 
    previous_obligations, 
    carry_forward, 
    is_closed
FROM financial_monthlybalance
WHERE building_id = 6
ORDER BY year, month;
```

### 2. Έλεγξε το API

1. Άνοιξε το Frontend
2. Πήγαινε στον Δεκέμβριο 2025
3. F12 → Network tab
4. Βρες το call: `/api/financial/dashboard/apartment_balances/?month=2025-12`
5. Έλεγξε το response:

```json
{
  "number": "Α1",
  "previous_balance": 10.00,  // ⬅️ Πρέπει να είναι > 0!
  "resident_expenses": 0.00,
  "owner_expenses": 0.00,
  "net_obligation": 10.00
}
```

### 3. Έλεγξε το UI

**Ειδοποιητήριο Πληρωμής:**
- **Παλαιότερες Οφειλές:** Πρέπει να δείχνει 10€ (όχι "-")
- **Ποσό Πληρωτέο:** Πρέπει να είναι 10€ (όχι 0€)

**Κατάσταση Διαμερισμάτων:**
- **Συνολική Οφειλή:** Πρέπει να δείχνει την οφειλή (όχι "-")
- **Κατάσταση:** Πρέπει να είναι "Οφειλή" (όχι "Ενήμερο")

---

## 🚨 Συχνά Λάθη

### ❌ "Το fix script τρέχει αλλά δεν αλλάζει τίποτα"

**Αιτία:** Η βάση δεδομένων δεν τρέχει ή είναι άλλη από αυτή του UI.

**Λύση:**
```bash
# Έλεγξε ότι χρησιμοποιείς τη σωστή βάση
cat backend/.env | grep DATABASE_URL
```

---

### ❌ "Το frontend δείχνει ακόμα 0€"

**Αιτία:** Cached data στο browser.

**Λύση:**
1. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) ή `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Restart frontend: `npm run dev`

---

### ❌ "Τα διαμερίσματα δείχνουν 'Ενήμερο' αντί για 'Οφειλή'"

**Αιτία:** Το `previous_balance` είναι ακόμα 0€.

**Λύση:**
1. Τρέξε το debug script: `python debug_december_balances.py`
2. Έλεγξε το API response
3. Αν το API δίνει 0€, τότε δεν έχει διορθωθεί το `financial_system_start_date`

---

## 📝 Σχετικά Αρχεία

### Scripts:
- ✅ `backend/fix_december_balances.py` - Αυτόματη διόρθωση
- ✅ `backend/debug_december_balances.py` - Διαγνωστικό

### Τεκμηρίωση:
- ✅ `DECEMBER_BALANCES_ISSUE_ANALYSIS.md` - Αναλυτική ανάλυση
- ✅ `ΔΙΟΡΘΩΣΗ_ΔΙΠΛΟΧΡΕΩΣΗΣ_ΔΑΠΑΝΩΝ.md` - Προηγούμενη διόρθωση

### Backend Code:
- `backend/financial/balance_service.py` - `calculate_historical_balance()`
- `backend/financial/services.py` - `get_apartment_balances()`
- `backend/financial/monthly_balance_service.py` - `close_month_and_create_next()`

---

## ✅ Τελικός Έλεγχος

Μετά τη διόρθωση, έλεγξε τα παρακάτω:

### Νοέμβριος 2025:
- [ ] Διαμερίσματα δείχνουν οφειλές (π.χ. Α1: 10€)
- [ ] Ειδοποιητήριο δείχνει "Ποσό Πληρωτέο: 10€"
- [ ] Κατάσταση: "Οφειλή"

### Δεκέμβριος 2025 (χωρίς νέες δαπάνες):
- [ ] **Παλαιότερες Οφειλές:** 10€ (στο ειδοποιητήριο)
- [ ] **Συνολική Οφειλή:** 10€ (στον πίνακα διαμερισμάτων)
- [ ] **Κατάσταση:** "Οφειλή" (όχι "Ενήμερο")
- [ ] **API Response:** `previous_balance: 10.00`

---

## 🎯 Σύνοψη

**Πρόβλημα:** Οι οφειλές εξαφανίζονται μεταξύ μηνών

**Αιτίες:**
1. Δεν υπάρχει `financial_system_start_date`
2. Δεν έχει κλείσει ο μήνας (MonthlyBalance)

**Λύση:** 
```bash
python fix_december_balances.py
```

**Αποτέλεσμα:** 
- ✅ Οι παλαιότερες οφειλές εμφανίζονται σωστά
- ✅ Τα διαμερίσματα δείχνουν "Οφειλή" αντί για "Ενήμερο"
- ✅ Το ειδοποιητήριο δείχνει το σωστό ποσό

---

**Τελευταία Ενημέρωση:** 19 Νοεμβρίου 2025

