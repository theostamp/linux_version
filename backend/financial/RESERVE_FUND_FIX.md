# Reserve Fund Payer Responsibility Fix

## Πρόβλημα
Οι δαπάνες αποθεματικού (reserve_fund) εμφανίζονταν λανθασμένα στις "Δαπάνες Ενοίκου" αντί στις "Δαπάνες Ιδιοκτήτη" στην κατάσταση διαμερισμάτων.

## Αιτία
Η αυτόματη δημιουργία δαπανών αποθεματικού στο `FinancialDashboardService._create_reserve_fund_expense_if_needed()` δεν όριζε το πεδίο `payer_responsibility='owner'`.

## Λύση

### 1. Διόρθωση για νέες δαπάνες
Προστέθηκε το `payer_responsibility='owner'` στη δημιουργία νέων reserve_fund expenses στο:
- `backend/financial/services.py` (γραμμή 358)

### 2. Διόρθωση υπαρχόντων δαπανών
Δημιουργήθηκε management command για να διορθώσει τα υπάρχοντα records.

## Εντολές

### Preview (Dry Run)
```bash
python manage.py fix_reserve_fund_payer --dry-run
```

### Apply Fix
```bash
python manage.py fix_reserve_fund_payer
```

## Περιγραφή Πεδίων

### `payer_responsibility`
Καθορίζει ποιος πληρώνει μια δαπάνη:

- **`owner`** (Ιδιοκτήτης): Μεγάλες επισκευές, αντικαταστάσεις, αποθεματικό, ασφάλιση
- **`resident`** (Ένοικος): Τακτική συντήρηση, κατανάλωση, λειτουργικά έξοδα
- **`shared`** (Κοινή Ευθύνη): Δαπάνες που μοιράζονται

### Κατηγορίες Δαπανών Ιδιοκτητών
Σύμφωνα με την ελληνική νομοθεσία, οι παρακάτω κατηγορίες χρεώνονται στους ιδιοκτήτες:

```python
EXPENSE_CATEGORY_DEFAULTS = {
    # ...
    'special_contribution': 'owner',
    'reserve_fund': 'owner',           # ✅ Αποθεματικό Ταμείο
    'emergency_fund': 'owner',
    'renovation_fund': 'owner',
    'project': 'owner',
    # ...
}
```

## Επιβεβαίωση

Μετά την εκτέλεση, επιβεβαιώστε ότι:

1. Στην κατάσταση διαμερισμάτων, το αποθεματικό εμφανίζεται στη στήλη "Δαπάνες Ιδιοκτήτη"
2. Στο φύλλο κοινόχρηστων, εμφανίζεται ο επιμερισμός με `payer_responsibility='owner'`

## SQL Query για Έλεγχο

```sql
-- Δες όλες τις reserve_fund δαπάνες
SELECT 
    id, 
    building_id, 
    date, 
    amount, 
    payer_responsibility 
FROM financial_expense 
WHERE category = 'reserve_fund' 
ORDER BY date DESC;

-- Μέτρησε δαπάνες ανά payer_responsibility
SELECT 
    payer_responsibility, 
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM financial_expense 
WHERE category = 'reserve_fund'
GROUP BY payer_responsibility;
```

## Related Files
- `backend/financial/services.py` (γραμμή 350-360)
- `backend/financial/models.py` (γραμμή 322, 348-375)
- `backend/financial/monthly_charge_service.py` (γραμμή 258)
- `backend/financial/management/commands/fix_reserve_fund_payer.py`

