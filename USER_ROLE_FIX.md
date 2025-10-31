# User Role Fix for Paid Subscriptions

## Πρόβλημα

Οι χρήστες που έχουν πληρώσει συνδρομή εμφανίζονται ως **"Χρήστης"** (Resident) αντί για **"Διαχειριστής"** (Manager), με αποτέλεσμα να μην έχουν πρόσβαση στην Οικονομική Διαχείριση και άλλες λειτουργίες manager.

### Συμπτώματα:
- Στο header εμφανίζεται: `theo etherm2021@gmail.com Χρήστης`
- Μήνυμα σφάλματος: **"Μη Εξουσιοδοτημένη Πρόσβαση"**
- Δεν έχει πρόσβαση στο `/financial` και άλλες σελίδες manager

## Λύση

### Μέθοδος 1: Django Management Command (Προτεινόμενη)

#### Για συγκεκριμένο χρήστη:
```bash
cd /app
python manage.py fix_paid_user_roles --email etherm2021@gmail.com
```

#### Για όλους τους χρήστες με ενεργή συνδρομή:
```bash
cd /app
python manage.py fix_paid_user_roles --all
```

### Μέθοδος 2: Python Script

```bash
cd /app
python scripts/fix_user_role.py etherm2021@gmail.com
```

### Μέθοδος 3: Django Shell

```bash
cd /app
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django_tenants.utils import schema_context, get_public_schema_name

User = get_user_model()

with schema_context(get_public_schema_name()):
    # Get user
    user = User.objects.get(email='etherm2021@gmail.com')
    
    # Fix role
    user.role = 'manager'
    user.is_staff = True
    user.save(update_fields=['role', 'is_staff'])
    
    # Add to Manager group
    manager_group, _ = Group.objects.get_or_create(name='Manager')
    user.groups.add(manager_group)
    
    # Remove from Resident group if present
    if user.groups.filter(name='Resident').exists():
        resident_group = Group.objects.get(name='Resident')
        user.groups.remove(resident_group)
    
    print(f"✅ User {user.email} role fixed!")
    print(f"   Role: {user.role}")
    print(f"   Groups: {', '.join([g.name for g in user.groups.all()])}")
```

## Αυτόματη Πρόληψη

Για να αποφευχθεί αυτό το πρόβλημα στο μέλλον, ο κώδικας πρέπει να ενημερωθεί στα εξής σημεία:

### 1. Webhook Handler (`billing/webhooks.py`)

Όταν ολοκληρώνεται η πληρωμή, ο χρήστης πρέπει να γίνεται manager:

```python
# After successful payment
user.role = 'manager'
user.is_staff = True
user.save(update_fields=['role', 'is_staff'])

# Add to Manager group
from django.contrib.auth.models import Group
manager_group, _ = Group.objects.get_or_create(name='Manager')
user.groups.add(manager_group)
```

### 2. Subscription Signal (`notifications/signals.py`)

Όταν δημιουργείται ενεργή συνδρομή:

```python
@receiver(post_save, sender=UserSubscription)
def send_subscription_created_email(sender, instance, created, **kwargs):
    if instance.status == 'active':
        user = instance.user
        
        # Fix user role
        if user.role != 'manager':
            user.role = 'manager'
            user.is_staff = True
            user.save(update_fields=['role', 'is_staff'])
            
            # Add to Manager group
            from django.contrib.auth.models import Group
            manager_group, _ = Group.objects.get_or_create(name='Manager')
            user.groups.add(manager_group)
```

### 3. User Registration (`users/views.py`)

Όταν ένας χρήστης εγγράφεται με πληρωμένη συνδρομή, πρέπει αμέσως να γίνεται manager.

## Έλεγχος

Μετά τη διόρθωση, ελέγξτε:

```bash
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context, get_public_schema_name

User = get_user_model()

with schema_context(get_public_schema_name()):
    user = User.objects.get(email='etherm2021@gmail.com')
    print(f"Role: {user.role}")  # Should be: manager
    print(f"is_staff: {user.is_staff}")  # Should be: True
    print(f"Groups: {[g.name for g in user.groups.all()]}")  # Should include: Manager
```

## Επόμενα Βήματα για τον Χρήστη

Μετά τη διόρθωση του role:

1. **Αποσύνδεση**: Ο χρήστης πρέπει να κάνει logout
2. **Σύνδεση**: Να κάνει login ξανά
3. **Έλεγχος**: Στο header θα πρέπει να εμφανίζεται: `theo etherm2021@gmail.com Διαχειριστής`
4. **Πρόσβαση**: Τώρα θα έχει πρόσβαση στο `/financial` και όλες τις λειτουργίες manager

## Σχετικά Αρχεία

- `backend/users/management/commands/fix_paid_user_roles.py` - Django management command
- `backend/scripts/fix_user_role.py` - Standalone Python script
- `backend/billing/webhooks.py` - Stripe webhook handler (needs update)
- `backend/notifications/signals.py` - Subscription signals (needs update)
- `backend/users/views.py` - User registration (needs update)
- `frontend/hooks/useFinancialPermissions.ts` - Frontend permission checks
- `frontend/components/financial/ProtectedFinancialRoute.tsx` - Route protection

## Troubleshooting

### Αν το πρόβλημα συνεχίζεται:

1. **Καθαρισμός Cache**: Ο browser μπορεί να έχει cached το παλιό role
   ```bash
   # Στον browser: Ctrl+Shift+R (hard refresh)
   # Ή καθαρίστε τα cookies για το site
   ```

2. **Έλεγχος Token**: Το JWT token μπορεί να έχει το παλιό role
   ```bash
   # Ο χρήστης πρέπει να κάνει logout και login ξανά
   ```

3. **Έλεγχος Database**: Επιβεβαιώστε ότι οι αλλαγές έχουν αποθηκευτεί
   ```bash
   python manage.py shell
   # Run the check commands above
   ```

4. **Έλεγχος Logs**: Δείτε τα logs για τυχόν σφάλματα
   ```bash
   # Railway logs
   railway logs
   ```






