# 👥 Ιεραρχία Χρηστών & Ρόλοι

## 🎯 Ιεραρχία Ρόλων

```
┌─────────────────────────────────────────────────────────────┐
│  1. ULTRA ADMIN (Superuser)                                 │
│     - Πλήρης πρόσβαση σε όλο το σύστημα                     │
│     - Μπορεί να διαχειρίζεται όλους τους tenants            │
│     - Πρόσβαση στο Django Admin                             │
│     - is_superuser = True                                   │
│                                                              │
│     👤 theostam1966@gmail.com                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. MANAGER (Διαχειριστής)                                  │
│     - Διαχείριση οικονομικών                                │
│     - Διαχείριση κτιρίων & διαμερισμάτων                    │
│     - Διαχείριση ενοίκων                                    │
│     - Δημιουργία ανακοινώσεων & ψηφοφοριών                  │
│     - Πρόσβαση μόνο στο δικό του tenant                     │
│     - is_superuser = False                                  │
│     - is_staff = True                                       │
│                                                              │
│     👤 theo etherm2021@gmail.com                            │
│     👤 Άλλοι πληρωμένοι χρήστες                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. RESIDENT (Ένοικος)                                      │
│     - Προβολή ανακοινώσεων                                  │
│     - Συμμετοχή σε ψηφοφορίες                               │
│     - Υποβολή αιτημάτων                                     │
│     - Προβολή δικών του οικονομικών                         │
│     - is_superuser = False                                  │
│     - is_staff = False                                      │
│                                                              │
│     👤 Δωρεάν χρήστες                                       │
│     👤 Χρήστες χωρίς ενεργή συνδρομή                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Συγκριτικός Πίνακας Δικαιωμάτων

| Λειτουργία | Ultra Admin | Manager | Resident |
|-----------|-------------|---------|----------|
| **Οικονομικά** |
| Προβολή όλων των οικονομικών | ✅ Όλων των tenants | ✅ Του tenant του | ❌ |
| Δημιουργία εξόδων | ✅ | ✅ | ❌ |
| Έγκριση πληρωμών | ✅ | ✅ | ❌ |
| Αναφορές & Γραφήματα | ✅ | ✅ | ❌ |
| **Κτίρια & Διαμερίσματα** |
| Δημιουργία κτιρίων | ✅ | ✅ | ❌ |
| Διαχείριση διαμερισμάτων | ✅ | ✅ | ❌ |
| Προσθήκη ενοίκων | ✅ | ✅ | ❌ |
| **Επικοινωνία** |
| Δημιουργία ανακοινώσεων | ✅ | ✅ | ❌ |
| Προβολή ανακοινώσεων | ✅ | ✅ | ✅ |
| Δημιουργία ψηφοφοριών | ✅ | ✅ | ❌ |
| Ψηφοφορία | ✅ | ✅ | ✅ |
| **Αιτήματα** |
| Προβολή όλων των αιτημάτων | ✅ | ✅ | ❌ |
| Υποβολή αιτήματος | ✅ | ✅ | ✅ |
| Διαχείριση αιτημάτων | ✅ | ✅ | ❌ |
| **Σύστημα** |
| Django Admin | ✅ | ❌ | ❌ |
| Πρόσβαση σε άλλους tenants | ✅ | ❌ | ❌ |
| Διαχείριση χρηστών | ✅ | ✅ (του tenant) | ❌ |
| Αλλαγή ρόλων χρηστών | ✅ | ❌ | ❌ |

---

## 👤 Συγκεκριμένοι Χρήστες

### 1. theostam1966@gmail.com - **Ultra Admin** 👑

```python
{
  "email": "theostam1966@gmail.com",
  "role": "manager",          # Ή "admin"
  "is_superuser": True,       # ← Αυτό τον κάνει Ultra Admin
  "is_staff": True,
  "groups": ["Manager"],
  "permissions": [
    "Access all tenants",
    "Django Admin access",
    "Full system control",
    "User management across tenants",
    "Financial management (all tenants)",
    "Building management (all tenants)"
  ]
}
```

**Χαρακτηριστικά:**
- ✅ Πρόσβαση σε **όλους τους tenants**
- ✅ Django Admin (`/admin`)
- ✅ Μπορεί να δει/τροποποιήσει **οποιονδήποτε χρήστη**
- ✅ Πλήρης έλεγχος συστήματος

---

### 2. theo etherm2021@gmail.com - **Manager** 👔

```python
{
  "email": "etherm2021@gmail.com",
  "role": "manager",
  "is_superuser": False,      # ← ΟΧΙ Ultra Admin
  "is_staff": True,           # ← Πρόσβαση σε manager features
  "groups": ["Manager"],
  "permissions": [
    "Financial management (own tenant)",
    "Building management (own tenant)",
    "Resident management (own tenant)",
    "Announcements & Votes",
    "View reports"
  ]
}
```

**Χαρακτηριστικά:**
- ✅ Πρόσβαση **μόνο στο δικό του tenant** (`etherm2021`)
- ✅ Πλήρης διαχείριση οικονομικών **του tenant του**
- ✅ Διαχείριση κτιρίων & ενοίκων **του tenant του**
- ❌ ΔΕΝ μπορεί να δει άλλους tenants
- ❌ ΔΕΝ έχει Django Admin access

---

### 3. Resident Users (Ένοικοι) 🏠

```python
{
  "email": "resident@example.com",
  "role": "resident",
  "is_superuser": False,
  "is_staff": False,
  "groups": ["Resident"],
  "permissions": [
    "View announcements",
    "Participate in votes",
    "Submit requests",
    "View own financial data"
  ]
}
```

**Χαρακτηριστικά:**
- ✅ Βασική πρόσβαση στο tenant τους
- ✅ Προβολή & συμμετοχή
- ❌ ΔΕΝ μπορούν να δημιουργήσουν/διαχειριστούν περιεχόμενο
- ❌ ΔΕΝ έχουν πρόσβαση στα οικονομικά

---

## 🔧 Διόρθωση Ρόλων

### Αυτόματη Διόρθωση

Τρέξε το script που διορθώνει και τους δύο χρήστες:

```bash
# Railway CLI
railway run python backend/fix_theo_as_manager.py

# Railway Web Terminal
cd /app
python fix_theo_as_manager.py
```

**Αποτέλεσμα:**
- ✅ `theostam1966@gmail.com` → Ultra Admin (is_superuser=True)
- ✅ `theo etherm2021@gmail.com` → Manager (is_superuser=False)

---

### Manual Διόρθωση (Django Shell)

#### Ultra Admin (theostam1966@gmail.com)

```python
from users.models import CustomUser
from django.contrib.auth.models import Group

# Get user
user = CustomUser.objects.get(email='theostam1966@gmail.com')

# Set as Ultra Admin
user.role = 'manager'  # or 'admin'
user.is_superuser = True   # ← Ultra Admin
user.is_staff = True
user.save()

# Add to Manager group
manager_group, _ = Group.objects.get_or_create(name='Manager')
user.groups.add(manager_group)

print(f"✅ {user.email} is now Ultra Admin")
print(f"   is_superuser: {user.is_superuser}")
```

#### Manager (theo etherm2021@gmail.com)

```python
from users.models import CustomUser
from django.contrib.auth.models import Group

# Get user
user = CustomUser.objects.get(email='etherm2021@gmail.com')

# Set as Manager (NOT superuser)
user.role = 'manager'
user.is_superuser = False  # ← Regular Manager
user.is_staff = True       # ← Access to manager features
user.save()

# Add to Manager group
manager_group, _ = Group.objects.get_or_create(name='Manager')
user.groups.add(manager_group)

# Remove from Resident group
if user.groups.filter(name='Resident').exists():
    user.groups.remove(Group.objects.get(name='Resident'))

print(f"✅ {user.email} is now Manager")
print(f"   is_superuser: {user.is_superuser}")
print(f"   is_staff: {user.is_staff}")
```

---

## 🎯 Frontend Εμφάνιση

### Στο Header

```
Ultra Admin:  theostam1966@gmail.com | Ultra Admin
Manager:      theo etherm2021@gmail.com | Διαχειριστής
Resident:     resident@example.com | Χρήστης
```

### Στο Sidebar

**Ultra Admin & Manager:**
- 🏠 Dashboard
- 💰 Οικονομικά ✅
- 🏢 Κτίρια
- 📢 Ανακοινώσεις
- 🗳️ Ψηφοφορίες
- 📝 Αιτήματα
- 👥 Ένοικοι

**Resident:**
- 🏠 Dashboard
- 📢 Ανακοινώσεις
- 🗳️ Ψηφοφορίες
- 📝 Αιτήματα (δικά του)
- 💰 Οικονομικά ❌ (κρυφό)

---

## 🔍 Επιβεβαίωση Ρόλων

### Έλεγχος στο Backend

```bash
railway run python backend/manage.py shell
```

```python
from users.models import CustomUser

# Check both users
ultra_admin = CustomUser.objects.get(email='theostam1966@gmail.com')
manager = CustomUser.objects.get(email='etherm2021@gmail.com')

print("Ultra Admin:")
print(f"  is_superuser: {ultra_admin.is_superuser}")  # Should be True
print(f"  is_staff: {ultra_admin.is_staff}")          # Should be True
print(f"  role: {ultra_admin.role}")                  # 'manager' or 'admin'

print("\nManager:")
print(f"  is_superuser: {manager.is_superuser}")      # Should be False
print(f"  is_staff: {manager.is_staff}")              # Should be True
print(f"  role: {manager.role}")                      # 'manager'
```

### Έλεγχος στο Frontend

**Browser Console (F12):**

```javascript
const user = JSON.parse(localStorage.getItem('user'));

console.log('Email:', user.email);
console.log('Role:', user.role);           // 'manager'
console.log('is_staff:', user.is_staff);   // true για Manager
console.log('is_superuser:', user.is_superuser); // false για Manager, true για Ultra Admin
```

---

## 📝 Σημαντικές Σημειώσεις

### 1. is_superuser vs is_staff

```python
# Ultra Admin
is_superuser = True   # Πλήρης πρόσβαση, όλοι οι tenants
is_staff = True       # Πρόσβαση στο Django Admin

# Manager
is_superuser = False  # Μόνο το δικό του tenant
is_staff = True       # Πρόσβαση σε manager features

# Resident
is_superuser = False  # Μόνο το δικό του tenant
is_staff = False      # Βασική πρόσβαση
```

### 2. Πότε Αλλάζει ο Ρόλος Αυτόματα

✅ **Αυτόματη αλλαγή σε Manager** όταν:
- Ολοκληρωθεί πληρωμή συνδρομής (Stripe webhook)
- Ενεργοποιηθεί συνδρομή (signal)

❌ **ΔΕΝ γίνεται αυτόματα Ultra Admin:**
- Μόνο manual assignment για security reasons
- Μόνο ο κύριος administrator (theostam1966@gmail.com)

### 3. JWT Token Refresh

Μετά από αλλαγή ρόλου, ο χρήστης ΠΡΕΠΕΙ:
1. ✅ Logout
2. ✅ Login ξανά
3. ✅ Νέο token με updated permissions

---

## 🚨 Security Best Practices

1. **Ultra Admin:**
   - Ένας μόνο Ultra Admin ανά σύστημα
   - Strong password + 2FA (όταν διατίθεται)
   - Χρήση μόνο για system administration

2. **Manager:**
   - Ένας ή περισσότεροι ανά tenant
   - Πληρωμένη συνδρομή required
   - Regular password updates

3. **Resident:**
   - Ανεξάρτητα τόσοι όσοι χρειάζονται
   - Περιορισμένα permissions by default
   - Μπορούν να upgrade σε Manager

---

## 📞 Support

Για αλλαγή ρόλων ή προβλήματα πρόσβασης:

1. Έλεγξε τον τρέχοντα ρόλο: `python backend/check_theo_role.py`
2. Διόρθωσε τους ρόλους: `python backend/fix_theo_as_manager.py`
3. Logout + Login για refresh του JWT token
4. Επικοινώνησε με development team αν το πρόβλημα επιμένει

---

## 📚 Related Documentation

- `RESIDENT_PERMISSIONS_GUIDE.md` - Λεπτομερής οδηγός για Resident permissions
- `USER_ROLE_FIX.md` - Πώς να διορθώσεις user roles
- `FORCE_LOGOUT_INSTRUCTIONS.md` - JWT token refresh issues
- `WEBHOOK_ROLE_FIX.md` - Αυτόματη ανάθεση ρόλων




