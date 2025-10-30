# Webhook and Signal Role Assignment Fix

## Αλλαγές που Έγιναν

### 1. Billing Webhook (`billing/webhooks.py`)

**Πρόβλημα:** Όταν ολοκληρώνεται η πληρωμή μέσω Stripe, ο χρήστης έπαιρνε το `role='manager'` αλλά **δεν προστίθετο στο Manager Group**.

**Λύση:** Ενημερώθηκε το `handle_checkout_session_completed` για να:
- Προσθέτει τον χρήστη στο **Manager Group**
- Αφαιρεί τον χρήστη από το **Resident Group** (αν υπάρχει)
- Καταγράφει τις αλλαγές στα logs

```python
# Add user to Manager group for proper permissions
from django.contrib.auth.models import Group
manager_group, created = Group.objects.get_or_create(name='Manager')
if not user.groups.filter(name='Manager').exists():
    user.groups.add(manager_group)
    logger.info(f"[WEBHOOK] Added {user.email} to Manager group")

# Remove from Resident group if present
if user.groups.filter(name='Resident').exists():
    resident_group = Group.objects.get(name='Resident')
    user.groups.remove(resident_group)
    logger.info(f"[WEBHOOK] Removed {user.email} from Resident group")
```

### 2. Subscription Signals (`notifications/signals.py`)

**Πρόβλημα:** Τα signals για subscription creation και payment confirmation δεν διασφάλιζαν ότι ο χρήστης έχει το σωστό role και groups.

**Λύση:** Ενημερώθηκαν **2 signals**:

#### A. `send_subscription_created_email`
Όταν δημιουργείται μια **active subscription**:
- Ελέγχει και ενημερώνει το `user.role` σε `'manager'`
- Ορίζει `user.is_staff = True`
- Προσθέτει στο **Manager Group**
- Αφαιρεί από το **Resident Group**

#### B. `send_payment_confirmation_email`
Όταν επιβεβαιώνεται η **πληρωμή**:
- Εφαρμόζει τις ίδιες αλλαγές για consistency
- Διασφαλίζει ότι ακόμα και αν το webhook απέτυχε, ο χρήστης θα πάρει το σωστό role

## Πώς Λειτουργεί Τώρα

### Ροή Πληρωμής (Happy Path)

1. **Χρήστης Εγγράφεται** → `role='resident'` (default)
2. **Πληρώνει μέσω Stripe** → Stripe στέλνει webhook
3. **Webhook Handler** (`handle_checkout_session_completed`):
   - Δημιουργεί tenant
   - Ορίζει `user.role = 'manager'`
   - Ορίζει `user.is_staff = True`
   - **Προσθέτει στο Manager Group** ✅ ΝΕΟ
   - **Αφαιρεί από Resident Group** ✅ ΝΕΟ
   - Στέλνει welcome email
4. **Subscription Signal** (`send_subscription_created_email`):
   - **Επιβεβαιώνει** ότι ο χρήστης έχει τα σωστά permissions
   - **Διορθώνει** αν κάτι πήγε στραβά
5. **Payment Confirmation Signal** (`send_payment_confirmation_email`):
   - **Double-check** για consistency
   - Στέλνει payment confirmation email

### Ροή Πληρωμής (Fallback)

Αν το webhook αποτύχει ή καθυστερήσει:
- Τα **signals** θα διορθώσουν αυτόματα το role
- Ο χρήστης θα πάρει τα σωστά permissions όταν η subscription γίνει active

## Τι Διορθώθηκε

### Πριν τις Αλλαγές ❌
```python
user.role = 'manager'  # ✅ Ορίζεται
user.is_staff = True   # ✅ Ορίζεται
# ❌ ΔΕΝ προστίθεται στο Manager Group
# ❌ ΔΕΝ αφαιρείται από το Resident Group
```

**Αποτέλεσμα:**
- Frontend: `useFinancialPermissions` ελέγχει `profile?.role === 'manager'` ✅
- Backend: `FinancialPermissionMixin` ελέγχει `user.groups.filter(name='Manager')` ❌
- **Μη Εξουσιοδοτημένη Πρόσβαση** στο `/financial`

### Μετά τις Αλλαγές ✅
```python
user.role = 'manager'  # ✅ Ορίζεται
user.is_staff = True   # ✅ Ορίζεται
user.groups.add(manager_group)  # ✅ Προστίθεται στο Manager Group
user.groups.remove(resident_group)  # ✅ Αφαιρείται από Resident Group
```

**Αποτέλεσμα:**
- Frontend: `profile?.role === 'manager'` ✅
- Backend: `user.groups.filter(name='Manager')` ✅
- **Πλήρης Πρόσβαση** στο `/financial` ✅

## Έλεγχος Αλλαγών

### Για Νέους Χρήστες
Οι νέοι χρήστες που θα πληρώσουν συνδρομή θα παίρνουν αυτόματα:
- ✅ `role = 'manager'`
- ✅ `is_staff = True`
- ✅ Membership στο **Manager Group**
- ✅ Πλήρη πρόσβαση στο Financial Management

### Για Υπάρχοντες Χρήστες
Οι υπάρχοντες χρήστες με πληρωμένη συνδρομή χρειάζονται manual fix:

```bash
# Χρήση του Django management command
python manage.py fix_paid_user_roles --email etherm2021@gmail.com

# Ή για όλους
python manage.py fix_paid_user_roles --all
```

## Logging

Όλες οι αλλαγές καταγράφονται στα logs:

```
[WEBHOOK] Added user@example.com to Manager group
[WEBHOOK] Removed user@example.com from Resident group
[WEBHOOK] Provisioning complete for user@example.com → tenant_schema

Updated user@example.com role to manager
Added user@example.com to Manager group
Removed user@example.com from Resident group
Welcome email triggered for user@example.com after payment confirmation
```

## Σχετικά Αρχεία

### Αρχεία που Ενημερώθηκαν:
- `backend/billing/webhooks.py` - Stripe webhook handler
- `backend/notifications/signals.py` - Subscription signals

### Σχετικά Αρχεία:
- `backend/users/management/commands/fix_paid_user_roles.py` - Manual fix command
- `backend/scripts/fix_user_role.py` - Standalone fix script
- `USER_ROLE_FIX.md` - Documentation για manual fixes
- `backend/financial/permissions.py` - Permission classes που ελέγχουν Groups
- `frontend/hooks/useFinancialPermissions.ts` - Frontend permission checks

## Testing

### Τεστ για Νέα Εγγραφή:
1. Εγγραφή νέου χρήστη
2. Ολοκλήρωση πληρωμής μέσω Stripe
3. Έλεγχος:
   ```python
   user = User.objects.get(email='test@example.com')
   assert user.role == 'manager'
   assert user.is_staff == True
   assert user.groups.filter(name='Manager').exists()
   assert not user.groups.filter(name='Resident').exists()
   ```

### Τεστ για Frontend Access:
1. Login ως paid user
2. Navigate to `/financial`
3. Verify: Δεν εμφανίζεται "Μη Εξουσιοδοτημένη Πρόσβαση"
4. Verify: Header shows "Διαχειριστής" αντί για "Χρήστης"

## Rollback Plan

Αν χρειαστεί rollback:
```bash
git revert <commit-hash>
```

Οι υπάρχοντες χρήστες θα συνεχίσουν να έχουν τα groups που τους έχουν ανατεθεί.


