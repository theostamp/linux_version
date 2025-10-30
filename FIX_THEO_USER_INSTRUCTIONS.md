# 🔧 Οδηγίες για Fix του Χρήστη theo etherm2021@gmail.com

## 🎯 Πρόβλημα

Ο χρήστης `theo etherm2021@gmail.com`:
- ✅ Έχει πληρωμένη συνδρομή
- ❌ Εμφανίζεται ως **"Χρήστης"** (Resident) αντί για **"Διαχειριστής"** (Manager)
- ❌ Παίρνει **"Μη Εξουσιοδοτημένη Πρόσβαση"** στα Οικονομικά

## 🔍 Αιτία

Ο χρήστης έχει:
- `role = 'resident'` (λάθος)
- **ΔΕΝ** είναι μέλος του **Manager Group**

## ✅ Λύση

Τρέξε το fix script που δημιουργήθηκε.

---

## 🚀 Μέθοδος 1: Railway CLI (Προτεινόμενη)

### Βήμα 1: Σύνδεση στο Railway

```bash
# Αν δεν έχεις κάνει login
railway login

# Σύνδεση στο project
railway link
```

### Βήμα 2: Εκτέλεση του Fix Script

```bash
# Option A: Τρέξε το Python script
railway run python backend/fix_theo_user.py

# Option B: Τρέξε το shell script
railway run bash backend/railway_fix_theo.sh
```

### Βήμα 3: Επιβεβαίωση

Το script θα εμφανίσει:

```
🚀 THEO USER FIX SCRIPT
============================================================
Found user: etherm2021@gmail.com
============================================================

📊 CURRENT STATE:
  - Role: resident
  - is_staff: False
  - is_superuser: False
  - Groups: ['Resident']

💳 SUBSCRIPTION:
  - Status: active
  - Plan: basic
  - Stripe Customer: cus_xxxxx

🔧 APPLYING FIX...
  ✅ Set role to 'manager'
  ✅ Set is_staff to True
  ✅ Added to Manager group
  ✅ Removed from Resident group

✅ NEW STATE:
  - Role: manager
  - is_staff: True
  - is_superuser: False
  - Groups: ['Manager']

============================================================
✅ SUCCESS! User etherm2021@gmail.com is now a Manager
============================================================

📝 NEXT STEPS:
  1. User should LOGOUT from the application
  2. User should LOGIN again
  3. Header should show 'Διαχειριστής' instead of 'Χρήστης'
  4. Financial Management should be accessible
```

---

## 🖥️ Μέθοδος 2: Railway Web Console

### Βήμα 1: Πήγαινε στο Railway Dashboard

1. Άνοιξε το [Railway Dashboard](https://railway.app/)
2. Επίλεξε το project σου
3. Επίλεξε το **Backend Service**

### Βήμα 2: Άνοιξε το Terminal

1. Κλικ στην καρτέλα **"Deployments"**
2. Κλικ στο τελευταίο deployment
3. Κλικ στο **"View Logs"**
4. Κλικ στο **"Terminal"** (πάνω δεξιά)

### Βήμα 3: Τρέξε το Script

```bash
# Στο Railway terminal
cd /app
python fix_theo_user.py
```

---

## 🐍 Μέθοδος 3: Django Shell (Manual)

### Βήμα 1: Άνοιξε Django Shell

```bash
# Railway CLI
railway run python backend/manage.py shell

# Ή στο Railway Web Terminal
cd /app
python manage.py shell
```

### Βήμα 2: Εκτέλεση του Fix

```python
from users.models import CustomUser
from django.contrib.auth.models import Group

# Get user
user = CustomUser.objects.get(email='etherm2021@gmail.com')

# Current state
print(f"Current role: {user.role}")
print(f"Current groups: {[g.name for g in user.groups.all()]}")

# Fix role
user.role = 'manager'
user.is_staff = True
user.save(update_fields=['role', 'is_staff'])

# Add to Manager group
manager_group, _ = Group.objects.get_or_create(name='Manager')
user.groups.add(manager_group)

# Remove from Resident group
if user.groups.filter(name='Resident').exists():
    resident_group = Group.objects.get(name='Resident')
    user.groups.remove(resident_group)

# Verify
user.refresh_from_db()
print(f"\nNew role: {user.role}")
print(f"New groups: {[g.name for g in user.groups.all()]}")
print(f"is_staff: {user.is_staff}")

print("\n✅ Fix completed!")
```

---

## 🧪 Μέθοδος 4: Local Testing (Development)

Αν θέλεις να τεστάρεις τοπικά πρώτα:

```bash
cd /home/theo/project/linux_version/backend

# Ενεργοποίηση virtual environment (αν χρειάζεται)
source venv/bin/activate  # ή το path του venv σου

# Εκτέλεση script
python fix_theo_user.py

# Ή με Django management command
python manage.py fix_paid_user_roles --email etherm2021@gmail.com
```

---

## ✅ Επιβεβαίωση ότι Δούλεψε

### 1. Έλεγχος στο Backend

```bash
# Railway CLI
railway run python backend/manage.py shell

# Στο shell:
from users.models import CustomUser
user = CustomUser.objects.get(email='etherm2021@gmail.com')
print(f"Role: {user.role}")  # Πρέπει να είναι 'manager'
print(f"Groups: {[g.name for g in user.groups.all()]}")  # Πρέπει να είναι ['Manager']
print(f"is_staff: {user.is_staff}")  # Πρέπει να είναι True
```

### 2. Έλεγχος στο Frontend

1. **Logout** από την εφαρμογή
2. **Login** ξανά με `etherm2021@gmail.com`
3. Έλεγχος Header:
   - ✅ Πρέπει να δείχνει: **"Διαχειριστής"**
   - ❌ ΟΧΙ: "Χρήστης"
4. Έλεγχος Sidebar:
   - ✅ Πρέπει να φαίνεται: **"Οικονομικά"**
5. Κλικ στο **"Οικονομικά"**:
   - ✅ Πρέπει να ανοίξει η σελίδα
   - ❌ ΟΧΙ: "Μη Εξουσιοδοτημένη Πρόσβαση"

---

## 🔍 Troubleshooting

### Πρόβλημα: "User not found"

**Λύση:** Έλεγξε ότι το email είναι σωστό:

```python
from users.models import CustomUser
users = CustomUser.objects.filter(email__icontains='etherm')
for u in users:
    print(f"{u.email} - {u.role}")
```

### Πρόβλημα: "No active subscription"

**Λύση:** Έλεγξε την κατάσταση της συνδρομής:

```python
from billing.models import UserSubscription
from users.models import CustomUser

user = CustomUser.objects.get(email='etherm2021@gmail.com')
subs = UserSubscription.objects.filter(user=user)

for sub in subs:
    print(f"Status: {sub.status}")
    print(f"Plan: {sub.plan_id}")
    print(f"Created: {sub.created_at}")
```

### Πρόβλημα: Μετά το fix ακόμα δεν έχει πρόσβαση

**Λύση 1:** Κάνε **hard refresh** στο browser:
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Λύση 2:** Διέγραψε cookies και κάνε login ξανά

**Λύση 3:** Έλεγξε ότι το token έχει ανανεωθεί:
```bash
# Στο browser console (F12)
localStorage.getItem('token')
# Κάνε logout/login για νέο token
```

---

## 📚 Σχετικά Αρχεία

- `backend/fix_theo_user.py` - Το fix script
- `backend/railway_fix_theo.sh` - Shell wrapper για Railway
- `backend/users/management/commands/fix_paid_user_roles.py` - Django management command
- `backend/scripts/fix_user_role.py` - Alternative standalone script
- `USER_ROLE_FIX.md` - Γενικός οδηγός για user role fixes
- `WEBHOOK_ROLE_FIX.md` - Πώς λειτουργεί το automatic role assignment
- `RESIDENT_PERMISSIONS_GUIDE.md` - Τι δικαιώματα έχουν οι Residents

---

## 🎯 Επόμενα Βήματα

Μετά το fix:

1. ✅ **Τεστάρισμα:**
   - Logout/Login
   - Έλεγχος πρόσβασης στα Οικονομικά
   - Έλεγχος header (πρέπει να δείχνει "Διαχειριστής")

2. ✅ **Monitoring:**
   - Έλεγξε τα logs για τυχόν errors
   - Βεβαιώσου ότι οι νέοι χρήστες παίρνουν αυτόματα το σωστό role

3. ✅ **Documentation:**
   - Ενημέρωσε το team για τις αλλαγές
   - Κράτα αυτό το documentation για μελλοντική αναφορά

---

## 💡 Πρόληψη Μελλοντικών Προβλημάτων

Οι αλλαγές που έγιναν στο webhook (`billing/webhooks.py`) και στα signals (`notifications/signals.py`) διασφαλίζουν ότι:

✅ **Νέοι χρήστες** που πληρώνουν συνδρομή θα παίρνουν **αυτόματα**:
- `role = 'manager'`
- `is_staff = True`
- Membership στο **Manager Group**

✅ **Υπάρχοντες χρήστες** με πληρωμένη συνδρομή χρειάζονται **manual fix** (αυτό το script).

---

## 📞 Support

Αν αντιμετωπίσεις πρόβλημα:

1. Έλεγξε τα Railway logs:
   ```bash
   railway logs
   ```

2. Τρέξε το debug script:
   ```bash
   railway run python backend/scripts/debug_user_permissions.py etherm2021@gmail.com
   ```

3. Επικοινώνησε με το development team με:
   - Screenshot του error
   - User email
   - Railway logs (αν υπάρχουν)

