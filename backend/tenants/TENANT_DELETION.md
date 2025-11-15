# Tenant Deletion Behavior

## Overview

Όταν διαγράφεται ένας tenant από το Django admin, τα εξής συμβαίνουν:

## Automatic Deletions (CASCADE)

### 1. Schema Deletion
- Το tenant schema **διαγράφεται αυτόματα** (`auto_drop_schema = True`)
- Όλα τα δεδομένα μέσα στο schema διαγράφονται μαζί με το schema
- Αυτό περιλαμβάνει:
  - Buildings
  - Apartments
  - Expenses
  - Payments
  - Monthly Balances
  - Projects
  - Contractors
  - Scheduled Maintenance
  - Announcements
  - Users (στο tenant schema)
  - Όλα τα άλλα tenant-specific δεδομένα

### 2. Domain Deletion
- Όλα τα `Domain` records που σχετίζονται με τον tenant διαγράφονται (`on_delete=models.CASCADE`)
- Το `Domain` model έχει `tenant = models.ForeignKey(Client, on_delete=models.CASCADE)`

## Field Updates (SET_NULL)

### 3. User Tenant Field
- Το `tenant` field των `CustomUser` records γίνεται `NULL` (`on_delete=models.SET_NULL`)
- Οι users **δεν διαγράφονται**, απλώς χάνουν την αναφορά στον tenant
- Αυτό σημαίνει ότι οι users μπορούν να υπάρχουν χωρίς tenant

## Important Notes

### Subscriptions
⚠️ **ΠΡΟΣΟΧΗ**: Τα `UserSubscription` records **ΔΕΝ** διαγράφονται αυτόματα όταν διαγράφεται ένας tenant, γιατί:
- Το `UserSubscription` έχει `user = models.ForeignKey(User, on_delete=models.CASCADE)` - διαγράφεται μόνο όταν διαγράφεται ο user
- Το `UserSubscription` δεν έχει άμεση σχέση με το `Client` tenant
- Έχει μόνο `tenant_domain` field (string) που δεν είναι ForeignKey

**Συστάσεις**:
- Αν θέλετε να διαγράφονται και τα subscriptions όταν διαγράφεται ένας tenant, πρέπει να:
  1. Προσθέσετε signal handler στο `Client` model
  2. Ή να προσθέσετε ForeignKey από `UserSubscription` στο `Client`

### Billing Cycles & Usage Tracking
- Τα `BillingCycle` και `UsageTracking` έχουν `subscription = models.ForeignKey(UserSubscription, on_delete=models.CASCADE)`
- Διαγράφονται αυτόματα όταν διαγράφεται το subscription
- Αλλά δεν διαγράφονται άμεσα όταν διαγράφεται ο tenant

## Testing Tenant Deletion

### Dry Run Mode (Safe)
```bash
python manage.py test_tenant_deletion <schema_name> --dry-run
```

Αυτό θα δείξει:
- Πόσα δεδομένα υπάρχουν πριν τη διαγραφή
- Τι θα συμβεί κατά τη διαγραφή
- **ΔΕΝ** θα διαγράψει τίποτα

### Actual Deletion (Dangerous)
```bash
python manage.py test_tenant_deletion <schema_name>
```

Αυτό θα:
1. Εμφανίσει τα counts πριν τη διαγραφή
2. Ζητήσει επιβεβαίωση (πρέπει να πληκτρολογήσετε "DELETE")
3. Διαγράψει τον tenant
4. Επαληθεύσει ότι:
   - Το schema διαγράφηκε
   - Τα domains διαγράφηκαν
   - Τα user tenant fields έγιναν NULL
   - Το schema data είναι απρόσιτο

### Example
```bash
# Test deletion of demo tenant (dry run)
python manage.py test_tenant_deletion demo --dry-run

# Actually delete demo tenant (requires confirmation)
python manage.py test_tenant_deletion demo
```

## Django Admin Deletion

Όταν διαγράφετε έναν tenant από το Django admin:

1. Κάντε click στο tenant
2. Κάντε click στο "Delete" button
3. Επιβεβαιώστε τη διαγραφή
4. Το Django θα:
   - Διαγράψει όλα τα domains (CASCADE)
   - Θέσει NULL τα user tenant fields (SET_NULL)
   - Διαγράψει το schema (auto_drop_schema=True)
   - Διαγράψει όλα τα δεδομένα μέσα στο schema

## Verification Checklist

Μετά τη διαγραφή ενός tenant, επιβεβαιώστε:

- [ ] Το schema δεν υπάρχει πλέον στη βάση δεδομένων
- [ ] Όλα τα domains διαγράφηκαν
- [ ] Όλοι οι users έχουν `tenant = NULL`
- [ ] Δεν μπορείτε να αποκτήσετε πρόσβαση στα tenant data
- [ ] (Optional) Τα subscriptions διαγράφηκαν (αν έχετε signal handler)

## Related Models

### Models with CASCADE to Tenant
- `Domain` → `Client` (CASCADE)

### Models with SET_NULL to Tenant
- `CustomUser` → `Client` (SET_NULL)

### Models Inside Tenant Schema (Auto-deleted)
- `Building`
- `Apartment`
- `Expense`
- `Payment`
- `MonthlyBalance`
- `Project`
- `Contractor`
- `ScheduledMaintenance`
- `Announcement`
- `CustomUser` (στο tenant schema)
- Όλα τα άλλα tenant-specific models

### Models NOT Auto-deleted
- `UserSubscription` (χρειάζεται signal handler)
- `BillingCycle` (διαγράφεται μόνο αν διαγραφεί το subscription)
- `UsageTracking` (διαγράφεται μόνο αν διαγραφεί το subscription)
- `PaymentMethod` (σχετίζεται με user, όχι tenant)

