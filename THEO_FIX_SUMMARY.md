# 🔧 Σύνοψη Διορθώσεων για theo etherm2021@gmail.com

## 🎯 Πρόβλημα

Ο χρήστης `theo etherm2021@gmail.com` έχει **δύο** προβλήματα:

### 1. Backend: Λάθος Role (is_superuser=True)

**Τρέχουσα κατάσταση στο backend:**
```python
{
  "email": "etherm2021@gmail.com",
  "role": "manager",
  "is_superuser": True,    # ❌ ΛΑΘΟΣ - Δεν πρέπει να είναι superuser
  "is_staff": True
}
```

**Σωστή κατάσταση:**
```python
{
  "email": "etherm2021@gmail.com",
  "role": "manager",
  "is_superuser": False,   # ✅ ΣΩΣΤΟ - Απλός Manager
  "is_staff": True         # ✅ Πρόσβαση σε manager features
}
```

### 2. Frontend: Cached JWT Token

**Τρέχουσα κατάσταση στο frontend:**
- Header δείχνει: **"Χρήστης"** ❌
- Οικονομικά: **"Μη Εξουσιοδοτημένη Πρόσβαση"** ❌

**Αιτία:** Το JWT token έχει παλιά δεδομένα (από πριν το fix).

---

## ✅ Λύση (3 Βήματα)

### **Βήμα 1: Fix Backend Role** 🔧

Τρέξε ένα από τα παρακάτω scripts στο Railway:

#### Option A: Quick Fix (Προτεινόμενο)

```bash
# Railway Web Terminal
cd /app
python quick_fix_theo.py
```

#### Option B: Complete Fix

```bash
# Railway Web Terminal
cd /app
python fix_theo_as_manager.py
```

#### Option C: Django Shell (Manual)

```bash
# Railway Web Terminal
cd /app
python manage.py shell
```

```python
from users.models import CustomUser
from django.contrib.auth.models import Group

user = CustomUser.objects.get(email='etherm2021@gmail.com')

# Set as Manager (NOT superuser)
user.role = 'manager'
user.is_superuser = False
user.is_staff = True
user.save()

# Add to Manager group
manager_group, _ = Group.objects.get_or_create(name='Manager')
user.groups.add(manager_group)

# Remove from Resident group
if user.groups.filter(name='Resident').exists():
    user.groups.remove(Group.objects.get(name='Resident'))

print(f"✅ Fixed! Role: {user.role}, is_superuser: {user.is_superuser}")
```

---

### **Βήμα 2: Logout από το Frontend** 🚪

Ο χρήστης `theo` πρέπει να:

1. **Κλικ** στο όνομά του (πάνω δεξιά)
2. **Κλικ** "Αποσύνδεση"
3. **Περίμενε** να εμφανιστεί η σελίδα login

**Εναλλακτικά (Browser Console):**

```javascript
// Clear all tokens
localStorage.removeItem('token');
localStorage.removeItem('refreshToken');
localStorage.removeItem('access');
localStorage.removeItem('refresh');
localStorage.removeItem('user');
sessionStorage.clear();

// Hard refresh
window.location.reload();
```

---

### **Βήμα 3: Login Ξανά** 🔑

1. **Email:** `etherm2021@gmail.com`
2. **Password:** (το password του χρήστη)
3. **Login**

---

## ✅ Επιβεβαίωση Επιτυχίας

Μετά το login, ο χρήστης `theo` θα δει:

### **Header:**
```
theo etherm2021@gmail.com | Διαχειριστής
```
✅ ΟΧΙ "Χρήστης", ΟΧΙ "Ultra Admin", ΑΚΡΙΒΩΣ "Διαχειριστής"

### **Sidebar:**
```
🏠 Dashboard
💰 Οικονομικά          ← ✅ Φαίνεται!
🏢 Κτίρια
📢 Ανακοινώσεις
🗳️ Ψηφοφορίες
📝 Αιτήματα
👥 Ένοικοι
```

### **Πρόσβαση στα Οικονομικά:**
- Κλικ στο **"Οικονομικά"**
- ✅ Η σελίδα ανοίγει κανονικά
- ❌ ΔΕΝ εμφανίζεται "Μη Εξουσιοδοτημένη Πρόσβαση"

---

## 🔍 Debug Commands

### Έλεγχος Backend (Railway Terminal):

```bash
cd /app
python manage.py shell
```

```python
from users.models import CustomUser

user = CustomUser.objects.get(email='etherm2021@gmail.com')

print(f"Email: {user.email}")
print(f"Role: {user.role}")              # Should be: 'manager'
print(f"is_superuser: {user.is_superuser}")  # Should be: False
print(f"is_staff: {user.is_staff}")      # Should be: True
print(f"Groups: {[g.name for g in user.groups.all()]}")  # Should be: ['Manager']
```

**Expected Output:**
```
Email: etherm2021@gmail.com
Role: manager
is_superuser: False    ← MUST be False
is_staff: True         ← MUST be True
Groups: ['Manager']
```

### Έλεγχος Frontend (Browser Console F12):

```javascript
const user = JSON.parse(localStorage.getItem('user'));

console.log('Email:', user.email);
console.log('Role:', user.role);           // Should be: 'manager'
console.log('is_staff:', user.is_staff);   // Should be: true
console.log('is_superuser:', user.is_superuser); // Should be: false
```

**Expected Output:**
```
Email: etherm2021@gmail.com
Role: manager
is_staff: true
is_superuser: false    ← MUST be false (after logout/login)
```

---

## 🚨 Αν το Πρόβλημα Επιμένει

### Πρόβλημα 1: Μετά το backend fix, εξακολουθεί να είναι superuser

**Έλεγξε αν το script τρέχει στο σωστό database:**

```bash
cd /app
python manage.py shell
```

```python
from django.conf import settings
print(f"Database: {settings.DATABASES['default']['NAME']}")

from users.models import CustomUser
user = CustomUser.objects.get(email='etherm2021@gmail.com')
print(f"is_superuser: {user.is_superuser}")
```

### Πρόβλημα 2: Μετά logout/login εξακολουθεί να δείχνει "Χρήστης"

**Clear browser cache πλήρως:**

1. `Ctrl + Shift + Delete`
2. Επίλεξε **"All time"**
3. Επίλεξε **"Cookies"** και **"Cached images and files"**
4. Κλικ **"Clear data"**
5. **Κλείσε** όλα τα tabs
6. **Άνοιξε** νέο tab
7. Login ξανά

### Πρόβλημα 3: "Μη Εξουσιοδοτημένη Πρόσβαση" στα Οικονομικά

**Έλεγξε τα permissions στο frontend:**

Browser Console (F12):
```javascript
const user = JSON.parse(localStorage.getItem('user'));

// Check user object
console.log('Full user object:', user);

// Check if user.role is correctly set
if (user.role !== 'manager') {
  console.error('❌ User role is NOT manager:', user.role);
  console.log('Solution: Logout and login again');
}

// Check if user.is_staff is true
if (user.is_staff !== true) {
  console.error('❌ User is_staff is NOT true:', user.is_staff);
  console.log('Solution: Fix backend and logout/login again');
}
```

---

## 📊 Τεχνικά Στοιχεία

### Γιατί Χρειάζεται Logout/Login;

Το **JWT token** περιέχει snapshot των user data:

```json
{
  "user_id": 123,
  "email": "etherm2021@gmail.com",
  "role": "resident",        ← Baked στο token
  "is_superuser": true,       ← Baked στο token
  "is_staff": false,          ← Baked στο token
  "exp": 1234567890
}
```

Όταν αλλάζεις τα δεδομένα στο backend (database), το **παλιό token** δεν αλλάζει αυτόματα.

**Λύση:** Νέο login → Νέο token με fresh data.

---

## 👥 User Hierarchy (Reminder)

```
1. theostam1966@gmail.com    → Ultra Admin (is_superuser=True)
   - Full system access
   - All tenants
   - Django Admin

2. theo etherm2021@gmail.com → Manager (is_superuser=False)
   - Financial management (own tenant)
   - Building management (own tenant)
   - No cross-tenant access

3. Residents                 → Resident (is_staff=False)
   - View & participate only
   - No management features
```

---

## 📝 Checklist

### Backend Fix:
- [ ] Τρέξε το fix script στο Railway
- [ ] Επιβεβαίωση: `is_superuser=False`
- [ ] Επιβεβαίωση: `is_staff=True`
- [ ] Επιβεβαίωση: `role='manager'`
- [ ] Επιβεβαίωση: Groups = `['Manager']`

### Frontend Fix:
- [ ] Ο χρήστης κάνει Logout
- [ ] Clear browser cache (optional αλλά συνιστάται)
- [ ] Ο χρήστης κάνει Login ξανά
- [ ] Header δείχνει "Διαχειριστής"
- [ ] Sidebar δείχνει "Οικονομικά"
- [ ] Πρόσβαση στα Οικονομικά λειτουργεί

---

## 🎯 Quick Commands Summary

### Fix Backend (Railway):
```bash
cd /app && python quick_fix_theo.py
```

### Verify Backend:
```bash
cd /app && python manage.py shell -c "from users.models import CustomUser; u=CustomUser.objects.get(email='etherm2021@gmail.com'); print(f'is_superuser: {u.is_superuser}')"
```

### Clear Frontend Token (Browser Console):
```javascript
localStorage.clear(); sessionStorage.clear(); location.reload();
```

---

## 📞 Support

Αν το πρόβλημα επιμένει, στείλε:

1. **Backend verification output:**
   ```bash
   cd /app && python quick_fix_theo.py
   ```

2. **Frontend token data:**
   ```javascript
   JSON.parse(localStorage.getItem('user'))
   ```

3. **Screenshot** του header και του error message

4. **Railway logs** (αν υπάρχουν errors)

---

## 📚 Related Files

- `backend/quick_fix_theo.py` - Quick fix script (this is fastest)
- `backend/fix_theo_as_manager.py` - Complete fix for both users
- `backend/fix_theo_user.py` - Original fix script
- `USER_ROLES_HIERARCHY.md` - Full role hierarchy documentation
- `FORCE_LOGOUT_INSTRUCTIONS.md` - JWT token refresh guide
- `RESIDENT_PERMISSIONS_GUIDE.md` - Resident permissions reference



