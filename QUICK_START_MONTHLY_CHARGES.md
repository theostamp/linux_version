# 🚀 QUICK START: Ενεργοποίηση Monthly Charges System

**Date:** 10 Οκτωβρίου 2025  
**Status:** ✅ Ready to Activate

---

## ⚠️ ΓΙΑΤΙ ΔΕΝ ΛΕΙΤΟΥΡΓΕΙ ΤΩΡΑ

Βλέπεις `previous_obligations: 0` γιατί:
1. ❌ Δεν έχουν δημιουργηθεί ακόμα τα **Transaction records** για management fees
2. ❌ Το σύστημα ψάχνει για `Transaction.type='management_fee_charge'` αλλά δεν βρίσκει τίποτα
3. ❌ Χρειάζεται να **τρέξεις το command** για να τα δημιουργήσει!

---

## ✅ ΛΥΣΗ: Τρέξε το Command (3 Βήματα)

### Βήμα 1: Μπες στο Docker Container

```bash
# Βρες το container name
docker ps

# Μπες μέσα (αντικατάστησε το <container_name>)
docker exec -it <container_name> bash

# Ή αν χρησιμοποιείς docker-compose:
docker-compose exec web bash
```

### Βήμα 2: Τρέξε το Command (RETROACTIVE)

```bash
# ⭐ ΣΗΜΑΝΤΙΚΟ: Χρησιμοποίησε --schema demo
python manage.py create_monthly_charges --schema demo --building 1 --retroactive --verbose
```

**Τι θα κάνει:**
- Θα βρει το `financial_system_start_date` (π.χ. Οκτώβριος 2025)
- Θα δημιουργήσει `Transaction` records για management fees από Οκτώβριο μέχρι τώρα
- Θα ενημερώσει τα `apartment.current_balance`
- ✅ Τα `previous_obligations` θα δείχνουν σωστά!

### Βήμα 3: Refresh το Frontend

```bash
# Έξοδος από το container
exit

# Refresh τη σελίδα στο browser
# Πήγαινε στο Νοέμβριο 2025
# Τώρα θα δεις: previous_obligations > 0 ✅
```

---

## 📊 Τι θα δεις ΜΕΤΑ

### ΠΡΙΝ (Τώρα) ❌
```json
{
  "previous_obligations": 0,      // ❌ Λάθος!
  "current_month_expenses": 10,
  "total": 10                     // ❌ Λάθος! (λείπουν οι προηγούμενες)
}
```

### ΜΕΤΑ (Σωστό) ✅
```json
{
  "previous_obligations": 10,     // ✅ Σωστό! (Οκτώβριος)
  "current_month_expenses": 10,   // ✅ Σωστό! (Νοέμβριος)
  "total": 20                     // ✅ Σωστό! (Συνολικό χρέος)
}
```

---

## 🔍 Troubleshooting

### Problem: "relation 'buildings_building' does not exist"

**Λύση:** Ξέχασες το `--schema demo`:
```bash
# ❌ WRONG
python manage.py create_monthly_charges --building 1 --retroactive

# ✅ CORRECT
python manage.py create_monthly_charges --schema demo --building 1 --retroactive
```

---

### Problem: "No charges created" ή "0 transactions"

**Πιθανές αιτίες:**
1. Δεν έχεις ορίσει `management_fee_per_apartment` στο building
2. Δεν έχεις ορίσει `financial_system_start_date`

**Έλεγχος:**
```python
python manage.py shell

from django_tenants.utils import schema_context
from buildings.models import Building

with schema_context('demo'):
    building = Building.objects.get(id=1)
    print(f"Management fee: {building.management_fee_per_apartment}")
    print(f"Start date: {building.financial_system_start_date}")
```

**Αν είναι None:**
```python
# Ορισμός μέσω admin ή shell:
with schema_context('demo'):
    building.management_fee_per_apartment = Decimal('1.00')  # ή όσο θες
    building.financial_system_start_date = date(2025, 10, 1)  # ή όποια ημερομηνία
    building.save()
```

---

### Problem: Θέλω να ξαναφτιάξω τα charges από την αρχή

**Λύση:** Χρησιμοποίησε το `reset_management_fees` endpoint:

```javascript
// Από το frontend:
await api.post(`/financial/expenses/reset_management_fees/`, {
  building_id: 1
});
```

Ή από command line:
```bash
python manage.py shell

from django_tenants.utils import schema_context
from financial.models import Transaction

with schema_context('demo'):
    # Διαγραφή όλων των management fee transactions
    Transaction.objects.filter(type='management_fee_charge').delete()
    
    # Επαναδημιουργία
    exit()

# Τρέξε ξανά το command
python manage.py create_monthly_charges --schema demo --building 1 --retroactive
```

---

## 📝 Complete Example Session

```bash
# 1. Μπες στο container
docker exec -it <your_container> bash

# 2. Δες τι υπάρχει (dry-run)
python manage.py create_monthly_charges --schema demo --building 1 --retroactive --dry-run

# Θα δεις:
#   October 2025: Management ✅ | Reserve ⏭️
#   November 2025: Management ✅ | Reserve ⏭️
#   December 2025: Management ✅ | Reserve ⏭️

# 3. Δημιούργησε τα (for real)
python manage.py create_monthly_charges --schema demo --building 1 --retroactive --verbose

# Θα δεις:
#   ✅ Management Fees: 10€
#   📝 Transactions: 10 (1 per apartment)

# 4. Επιβεβαίωση
python manage.py shell

>>> from django_tenants.utils import schema_context
>>> from financial.models import Transaction
>>> 
>>> with schema_context('demo'):
...     count = Transaction.objects.filter(type='management_fee_charge').count()
...     print(f"Management fee transactions: {count}")
...
Management fee transactions: 30  # (3 μήνες × 10 διαμερίσματα)

# 5. Έξοδος
>>> exit()

# 6. Refresh το frontend
# Πήγαινε στο Financial Dashboard → Νοέμβριος 2025
# Τώρα θα δεις: previous_obligations = 10€ ✅
```

---

## 🎯 Αναμενόμενο Αποτέλεσμα

Μετά το command, για το **Building 1** με **10 διαμερίσματα** και **1€/μήνα** management fee:

**Οκτώβριος 2025:**
- Transactions created: 10 (1 per apartment)
- Amount each: 1€
- Total: 10€

**Νοέμβριος 2025:**
- Transactions created: 10 (1 per apartment)
- Amount each: 1€
- **Previous obligations:** 10€ (από Οκτώβριο) ✅
- **Current:** 1€
- **Total:** 11€ ✅

**Δεκέμβριος 2025:**
- Transactions created: 10 (1 per apartment)
- Amount each: 1€
- **Previous obligations:** 11€ (από Οκτώβριο + Νοέμβριο) ✅
- **Current:** 1€
- **Total:** 12€ ✅

---

## 🚀 Ready!

Τώρα το σύστημα είναι **100% έτοιμο**!

Απλά τρέξε:
```bash
docker exec -it <container> python manage.py create_monthly_charges --schema demo --building 1 --retroactive --verbose
```

Και όλα θα δουλέψουν! 🎉

