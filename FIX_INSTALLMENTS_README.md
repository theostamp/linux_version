# Fix Project Installments Script

## Περιγραφή

Αυτό το script ελέγχει και διορθώνει projects που έχουν `payment_method='installments'` αλλά έχουν λάθος τιμή στο `installments` ή έχουν δημιουργηθεί εφάπαξ δαπάνες αντί για δόσεις.

## Πρόβλημα

Όταν εγκρίνεται μια προσφορά με δόσεις, μερικές φορές:
- Το `project.installments` δεν αποθηκεύεται σωστά (παραμένει `None` ή `1`)
- Δημιουργούνται εφάπαξ δαπάνες αντί για δόσεις

## Χρήση

### 1. Εκτέλεση του script

```bash
cd /home/theo/project/backend
python3 fix_project_installments.py
```

**ΣΗΜΑΝΤΙΚΟ:** Πρέπει να τρέξεις το script από το backend directory και να έχεις ενεργοποιημένο το virtual environment.

### 2. Τι κάνει το script

1. **Σάρωση**: Βρίσκει όλα τα projects με `payment_method='installments'` που έχουν προβλήματα:
   - `installments <= 1` ενώ θα έπρεπε να είναι > 1
   - Εφάπαξ δαπάνες αντί για δόσεις
   - Mismatch μεταξύ project.installments και offer.installments

2. **Εμφάνιση**: Εμφανίζει λίστα με τα προβλήματα που βρήκε

3. **Επιβεβαίωση**: Ρωτάει αν θέλεις να προχωρήσει με τη διόρθωση

4. **Διόρθωση**: 
   - Ενημερώνει το `project.installments` με τη σωστή τιμή από το accepted offer
   - Διαγράφει εφάπαξ δαπάνες (μόνο αν δεν έχουν πληρωθεί και είναι πρόσφατες < 24h)
   - Δημιουργεί νέες δαπάνες με δόσεις χρησιμοποιώντας `update_project_schedule()`

### 3. Προστασία

Το script **ΔΕΝ** θα διαγράψει:
- Πληρωμένες δαπάνες
- Παλιές δαπάνες (> 24 ώρες)
- Δαπάνες με συνδεδεμένες πληρωμές

Σε αυτές τις περιπτώσεις, θα εμφανίσει warning και θα ζητήσει χειροκίνητη διόρθωση.

## Παράδειγμα Output

```
================================================================================
PROJECT INSTALLMENTS FIX SCRIPT
================================================================================

1. Scanning for projects with installment issues...

Found 1 projects with issues:

1. Project ID: abc-123-def
   Title: Αντικατάσταση Λέβητα
   Issue: Project abc-123-def has payment_method='installments' but installments=1
   Current installments: 1
   Offer installments: 4
   Expenses: 1 found
     - Έργο: Αντικατάσταση Λέβητα: 5000.00€ (2025-11-16)

================================================================================
Do you want to fix these 1 projects? (yes/no): yes

2. Fixing projects...
Fixing project abc-123-def: Setting installments=4
Updated project abc-123-def with installments=4
Deleting 1 one-time expenses for project abc-123-def
Recreating expenses for project abc-123-def
✅ Successfully recreated expenses for project abc-123-def
✅ Fixed project abc-123-def

================================================================================
SUMMARY
================================================================================
Total issues found: 1
Fixed: 1
Failed: 0
================================================================================
```

## Troubleshooting

### Αν το script δεν βρίσκει προβλήματα αλλά υπάρχουν

1. Ελέγξτε τα logs του Django για να δείτε τι τιμές αποθηκεύονται όταν εγκρίνεται μια προσφορά
2. Ελέγξτε το database απευθείας:
   ```sql
   SELECT id, title, payment_method, installments, final_cost 
   FROM projects_project 
   WHERE payment_method = 'installments';
   ```

### Αν το script αποτυγχάνει

1. Ελέγξτε τα logs για το συγκεκριμένο error
2. Ελέγξτε αν υπάρχουν πληρωμένες ή παλιές δαπάνες που εμποδίζουν τη διαγραφή
3. Ελέγξτε αν υπάρχει accepted offer για το project

## Σημειώσεις

- Το script χρησιμοποιεί transactions, οπότε αν αποτύχει, δεν θα αφήσει το database σε inconsistent state
- Πάντα κάντε backup πριν τρέξετε το script σε production
- Το script είναι idempotent - μπορείτε να το τρέξετε πολλές φορές



