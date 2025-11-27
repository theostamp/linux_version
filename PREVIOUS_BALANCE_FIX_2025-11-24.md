# Διόρθωση Previous Balance στον Πίνακα Διαμερισμάτων

**Ημερομηνία:** 24 Νοεμβρίου 2025  
**Πρόβλημα:** Οι προηγούμενες οφειλές δεν εμφανίζονταν στον πίνακα διαμερισμάτων  
**Αιτία:** Ασυνέπεια υπολογισμού όταν η financial_system_start_date ισούται με τον επιλεγμένο μήνα

## Το Πρόβλημα

### Συμπτώματα

Στη σελίδα `financial?building=2&tab=balances` για τον Νοέμβριο 2025:

- ✅ **Συγκεντρωτική εμφάνιση:** "Παλαιότερες οφειλές: 1.000,00 €"
- ❌ **Πίνακας διαμερισμάτων:** Η στήλη "Συνολική Οφειλή" ΔΕΝ περιελάμβανε τις προηγούμενες οφειλές

### Παράδειγμα

```
Νοέμβριος 2025
Παλαιότερες οφειλές: 1.000,00 €
Μηνιαίο: 2.600,00 €
ΣΥΝΟΛΟ: 3.600,00 €

Αλλά στον πίνακα:
Διαμέρισμα 1: Δαπάνες Ενοίκου: 60€ | Δαπάνες Ιδιοκτήτη: 200€ | Συνολική Οφειλή: 260€
(Δεν περιελάμβανε τις προηγούμενες οφειλές!)
```

## Η Αιτία

### Ασυνέπεια στους Υπολογισμούς

**1. Συγκεντρωτική εμφάνιση** (`get_financial_summary`):
```python
if prev_balance:
    # Χρήση carry_forward από το MonthlyBalance του προηγούμενου μήνα
    previous_obligations = prev_balance.carry_forward
```
✅ Χρησιμοποιούσε το `MonthlyBalance.carry_forward` του Οκτωβρίου → 1.000€

**2. Πίνακας διαμερισμάτων** (`get_apartment_balances`):
```python
expenses_before_month = Expense.objects.filter(
    building_id=apartment.building_id,
    date__gte=system_start_date,  # 2025-11-01
    date__lt=month_start  # 2025-11-01
)
# Αποτέλεσμα: ΚΕΝΟ! (date >= 2025-11-01 ΚΑΙ date < 2025-11-01)
previous_balance = calculated_balance  # 0€
```
❌ Υπολόγιζε από Expense records και όταν `system_start_date = month_start`, επέστρεφε 0€

### Γιατί Συνέβαινε Αυτό

Όταν η `financial_system_start_date` του κτιρίου είναι **1/11/2025** και ζητάμε δεδομένα για **Νοέμβριο 2025**:
- `system_start_date = 2025-11-01`
- `month_start = 2025-11-01`
- Η συνθήκη `date__gte=2025-11-01 AND date__lt=2025-11-01` επιστρέφει **ΚΕΝΟ σετ**
- Άρα το `previous_balance` υπολογιζόταν ως **0€**

Αλλά το `MonthlyBalance` του **Οκτωβρίου** μπορεί να έχει `carry_forward = 1.000€` από προηγούμενους μήνες!

## Η Λύση

### Τροποποίηση του `get_apartment_balances`

Προσθέσαμε έλεγχο για το `MonthlyBalance` του προηγούμενου μήνα, όπως ακριβώς κάνει και η συγκεντρωτική:

```python
# Βρες το MonthlyBalance του προηγούμενου μήνα
prev_month = mon - 1
prev_year = year
if prev_month == 0:
    prev_month = 12
    prev_year -= 1

prev_monthly_balance = MonthlyBalance.objects.filter(
    building_id=apartment.building_id,
    year=prev_year,
    month=prev_month
).first()

if prev_monthly_balance:
    # Χρήση του carry_forward από το MonthlyBalance
    # Κατανομή στο διαμέρισμα βάση χιλιοστών
    total_carry_forward = prev_monthly_balance.carry_forward
    
    if total_participation_mills > 0:
        apartment_ratio = Decimal(apartment.participation_mills) / Decimal(total_participation_mills)
        previous_balance = total_carry_forward * apartment_ratio
    else:
        # Fallback: ισόποση κατανομή
        previous_balance = total_carry_forward / Decimal(safe_apartment_count)
else:
    # Fallback: Χρήση calculated_balance (υπολογισμός από Expense records)
    previous_balance = calculated_balance
```

### Τι Αλλάζει

**Πριν:**
```
Διαμέρισμα 1 (100 χιλιοστά):
  previous_balance = 0€  (λάθος!)
  expense_share = 260€
  net_obligation = 260€
```

**Μετά:**
```
Διαμέρισμα 1 (100 χιλιοστά):
  previous_balance = 100€  (από MonthlyBalance carry_forward: 1000€ × 100/1000)
  expense_share = 260€
  net_obligation = 360€  (100€ + 260€)
```

## Πλεονεκτήματα της Λύσης

1. ✅ **Συνέπεια:** Και τα δύο components (συγκεντρωτική & πίνακας) χρησιμοποιούν την ίδια πηγή δεδομένων
2. ✅ **Ακρίβεια:** Σωστή κατανομή του carry_forward ανά διαμέρισμα βάση χιλιοστών
3. ✅ **Fallback:** Αν δεν υπάρχει MonthlyBalance, χρησιμοποιεί τον παλιό τρόπο υπολογισμού
4. ✅ **Logging:** Προσθήκη debug εκτυπώσεων για tracking

## Αρχεία που Τροποποιήθηκαν

- `backend/financial/services.py` (γραμμές 1114-1165)

## Testing

Για έλεγχο της διόρθωσης:

1. Επισκεφτείτε: `https://theo.newconcierge.app/financial?building=2&tab=balances`
2. Επιλέξτε μήνα: **Νοέμβριος 2025**
3. Ελέγξτε:
   - Η συγκεντρωτική δείχνει: "Παλαιότερες οφειλές: 1.000,00 €"
   - Ο πίνακας διαμερισμάτων δείχνει σωστή "Συνολική Οφειλή" που περιλαμβάνει τις προηγούμενες οφειλές
   - Το άθροισμα των οφειλών όλων των διαμερισμάτων ταιριάζει με τη συγκεντρωτική

## Σημειώσεις

- Η διόρθωση είναι **backward compatible** - αν δεν υπάρχει MonthlyBalance, χρησιμοποιεί τον παλιό τρόπο
- Η λογική κατανομής βασίζεται στα χιλιοστά συμμετοχής, όπως και στις άλλες δαπάνες
- Η αλλαγή εφαρμόζεται **μόνο** όταν ζητάμε snapshot view (με συγκεκριμένο μήνα), όχι στο current view

## Συμπέρασμα

Το πρόβλημα προέκυψε από τον παρατηρητικό χρήστη που εντόπισε ότι η `financial_system_start_date` ήταν 1/11/2025. Αυτή η συμπαδικότητα με τον επιλεγμένο μήνα αποκάλυψε μια ασυνέπεια στους υπολογισμούς που διορθώθηκε με επιτυχία.

**Status:** ✅ ΔΙΟΡΘΩΘΗΚΕ

