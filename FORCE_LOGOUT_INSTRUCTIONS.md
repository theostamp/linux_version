# 🔐 Οδηγίες για Force Logout & Fresh Login

## 🎯 Πρόβλημα: Cached JWT Token

Παρόλο που το **backend** έχει ενημερωμένα τα permissions του χρήστη:
- ✅ Backend: `is_superuser: True`, `is_staff: True`, `role: manager`
- ❌ Frontend: Δείχνει "Χρήστης" και "Μη Εξουσιοδοτημένη Πρόσβαση"

**Αιτία:** Το JWT token που έχει ο browser περιέχει τα **παλιά** user data (από όταν έγινε το τελευταίο login).

---

## ✅ Λύση 1: Πλήρης Logout από το UI (Προτεινόμενη)

### Βήμα 1: Κάνε Logout

1. Κλικ στο όνομα χρήστη (πάνω δεξιά)
2. Κλικ **"Αποσύνδεση"** (Logout)
3. Περίμενε να φύγεις στη σελίδα login

### Βήμα 2: Clear Browser Cache (Προαιρετικό αλλά Συνιστάται)

**Chrome/Edge:**
- Πάτα `Ctrl + Shift + Delete` (Windows/Linux) ή `Cmd + Shift + Delete` (Mac)
- Επίλεξε "Cached images and files" και "Cookies"
- Κλικ **"Clear data"**

**ή**

- Πάτα `F12` για Developer Tools
- Πάτα `Ctrl + Shift + R` (Hard Refresh) ή
- Right-click στο Refresh button → **"Empty Cache and Hard Reload"**

### Βήμα 3: Login Ξανά

1. Πήγαινε στο login page
2. Εισάγω `etherm2021@gmail.com` και password
3. Κλικ **"Login"**

### Βήμα 4: Επιβεβαίωση

Μετά το login, έλεγξε:
- ✅ Header πρέπει να δείχνει: **"theo etherm2021@gmail.com | Διαχειριστής"** (ή "Superuser")
- ✅ Sidebar πρέπει να δείχνει: **"Οικονομικά"** menu item
- ✅ Κλικ στα "Οικονομικά" → Πρέπει να ανοίξει η σελίδα (ΟΧΙ "Μη Εξουσιοδοτημένη Πρόσβαση")

---

## ✅ Λύση 2: Manual Token Clear (Browser Console)

Αν το UI logout δεν δουλεύει, κάνε manual clear των tokens:

### Βήμα 1: Άνοιξε Browser Console

- Πάτα `F12` ή
- Right-click → **"Inspect"** → Tab **"Console"**

### Βήμα 2: Διέγραψε τα Tokens

Εκτέλεσε αυτές τις εντολές στο console:

```javascript
// Clear all tokens and user data
localStorage.removeItem('token');
localStorage.removeItem('refreshToken');
localStorage.removeItem('access');
localStorage.removeItem('refresh');
localStorage.removeItem('user');

// Clear session storage too
sessionStorage.clear();

// Confirm
console.log('✅ Tokens cleared!');
console.log('localStorage:', localStorage);
```

### Βήμα 3: Hard Refresh

- Πάτα `Ctrl + Shift + R` (Windows/Linux)
- ή `Cmd + Shift + R` (Mac)

### Βήμα 4: Login Ξανά

Πήγαινε στο `/login` και κάνε login ξανά.

---

## ✅ Λύση 3: Incognito/Private Window (Quick Test)

Για γρήγορο test χωρίς να επηρεάσεις την τρέχουσα session:

1. Άνοιξε **Incognito/Private Window**:
   - Chrome: `Ctrl + Shift + N`
   - Firefox: `Ctrl + Shift + P`
   - Edge: `Ctrl + Shift + N`

2. Πήγαινε στην εφαρμογή

3. Κάνε login με `etherm2021@gmail.com`

4. Έλεγξε αν τώρα δείχνει "Διαχειριστής" και έχει πρόσβαση στα Οικονομικά

---

## ✅ Λύση 4: Force Token Refresh (Advanced)

Αν θέλεις να κρατήσεις τη session αλλά να ανανεώσεις το token:

### Browser Console:

```javascript
// Get current refresh token
const refreshToken = localStorage.getItem('refreshToken') || localStorage.getItem('refresh');

if (refreshToken) {
  // Call refresh endpoint
  fetch('/api/users/token/refresh/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh: refreshToken })
  })
  .then(res => res.json())
  .then(data => {
    // Save new tokens
    localStorage.setItem('token', data.access);
    localStorage.setItem('access', data.access);
    
    console.log('✅ Token refreshed!');
    
    // Reload page
    window.location.reload();
  })
  .catch(err => {
    console.error('❌ Refresh failed:', err);
    console.log('Please logout and login again');
  });
} else {
  console.error('❌ No refresh token found');
  console.log('Please logout and login again');
}
```

---

## 🔍 Debug: Έλεγχος Τρέχοντος Token

Για να δεις τι περιέχει το **τρέχον** token:

### Browser Console:

```javascript
// Get current access token
const token = localStorage.getItem('token') || localStorage.getItem('access');

if (token) {
  // Decode JWT (base64)
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  
  console.log('🔍 Current Token Payload:', payload);
  console.log('  - user_id:', payload.user_id);
  console.log('  - email:', payload.email);
  console.log('  - exp:', new Date(payload.exp * 1000).toLocaleString());
  
  // Check if token is expired
  const isExpired = Date.now() >= payload.exp * 1000;
  console.log('  - expired:', isExpired ? '❌ YES' : '✅ NO');
} else {
  console.log('❌ No token found in localStorage');
}
```

### Έλεγχος User Object:

```javascript
// Get current user object
const userStr = localStorage.getItem('user');

if (userStr) {
  const user = JSON.parse(userStr);
  
  console.log('🔍 Current User Data:', user);
  console.log('  - email:', user.email);
  console.log('  - role:', user.role);  // ← Αυτό πρέπει να είναι 'manager'
  console.log('  - is_staff:', user.is_staff);  // ← Αυτό πρέπει να είναι true
  console.log('  - is_superuser:', user.is_superuser);
} else {
  console.log('❌ No user object found in localStorage');
}
```

---

## 📊 Αναμενόμενα Αποτελέσματα

### Πριν το Logout/Login ❌

```javascript
localStorage.getItem('user'):
{
  "email": "etherm2021@gmail.com",
  "role": "resident",           // ❌ ΛΑΘΟΣ
  "is_staff": false,             // ❌ ΛΑΘΟΣ
  "is_superuser": false          // ❌ ΛΑΘΟΣ
}

Frontend Header: "Χρήστης"
Financial Access: "Μη Εξουσιοδοτημένη Πρόσβαση"
```

### Μετά το Logout/Login ✅

```javascript
localStorage.getItem('user'):
{
  "email": "etherm2021@gmail.com",
  "role": "manager",             // ✅ ΣΩΣΤΟ
  "is_staff": true,              // ✅ ΣΩΣΤΟ
  "is_superuser": true           // ✅ ΣΩΣΤΟ
}

Frontend Header: "Διαχειριστής" (ή "Superuser")
Financial Access: Πλήρης πρόσβαση ✅
```

---

## 🔧 Backend Verification

Για να επιβεβαιώσεις ότι το backend έχει τα σωστά δεδομένα:

### Option 1: Railway CLI

```bash
railway run python backend/check_theo_role.py
```

### Option 2: Railway Web Terminal

```bash
cd /app
python check_theo_role.py
```

### Option 3: Django Shell

```bash
railway run python backend/manage.py shell
```

```python
from users.models import CustomUser

user = CustomUser.objects.get(email='etherm2021@gmail.com')

print(f"Role: {user.role}")           # Πρέπει: 'manager'
print(f"is_staff: {user.is_staff}")   # Πρέπει: True
print(f"is_superuser: {user.is_superuser}")  # Πρέπει: True (αν είναι superuser)
print(f"Groups: {[g.name for g in user.groups.all()]}")  # Πρέπει: ['Manager']
```

**Αναμενόμενο Output:**
```
Role: manager
is_staff: True
is_superuser: True
Groups: ['Manager']
```

Αν αυτά **ΔΕΝ** είναι σωστά, τρέξε το fix script:
```bash
railway run python backend/fix_theo_user.py
```

---

## 🚨 Troubleshooting

### Πρόβλημα 1: Μετά το login εξακολουθεί να δείχνει "Χρήστης"

**Αιτία:** Το backend δεν έχει ενημερωμένα τα δεδομένα.

**Λύση:**
```bash
railway run python backend/fix_theo_user.py
```

Μετά κάνε logout/login ξανά.

---

### Πρόβλημα 2: Logout button δεν λειτουργεί

**Λύση:** Manual token clear (Λύση 2 παραπάνω).

---

### Πρόβλημα 3: "Invalid token" error

**Αιτία:** Το token έχει λήξει ή έχει blacklisted.

**Λύση:** Αυτό είναι καλό! Σημαίνει ότι το logout δούλεψε. Κάνε login ξανά.

---

### Πρόβλημα 4: Frontend εξακολουθεί να κάνει cache

**Λύση:**
1. Clear browser cache πλήρως
2. Κλείσε όλα τα tabs της εφαρμογής
3. Άνοιξε νέο tab
4. Login ξανά

---

## 📝 Γιατί Συμβαίνει Αυτό;

### JWT Token Structure

Το JWT token περιέχει **snapshot** των user data τη στιγμή του login:

```json
{
  "user_id": 123,
  "email": "etherm2021@gmail.com",
  "role": "resident",        ← Αυτό είναι baked στο token
  "is_staff": false,          ← Και αυτό
  "exp": 1234567890          ← Expiration timestamp
}
```

Όταν αλλάζεις το role στο backend, το **υπάρχον token** δεν αλλάζει αυτόματα. Χρειάζεται **νέο login** για να δημιουργηθεί νέο token με τα ενημερωμένα δεδομένα.

### Πρόληψη Μελλοντικών Προβλημάτων

Τα fixes που έγιναν στο webhook και στα signals διασφαλίζουν ότι:
- ✅ Νέοι χρήστες παίρνουν αυτόματα το σωστό role κατά την εγγραφή
- ✅ Η συνδρομή ενεργοποιείται με τα σωστά permissions
- ❌ Υπάρχοντες χρήστες χρειάζονται manual fix (one-time)

---

## ✅ Checklist

- [ ] Backend verification: `railway run python backend/check_theo_role.py`
- [ ] Αν χρειάζεται fix: `railway run python backend/fix_theo_user.py`
- [ ] Logout από το UI ή manual token clear
- [ ] Clear browser cache (optional αλλά συνιστάται)
- [ ] Login ξανά
- [ ] Επιβεβαίωση: Header δείχνει "Διαχειριστής"
- [ ] Επιβεβαίωση: Πρόσβαση στα Οικονομικά

---

## 📞 Επικοινωνία

Αν το πρόβλημα επιμένει:
1. Screenshot του browser console (F12)
2. Screenshot του header (που δείχνει role)
3. Backend logs από Railway
4. Output από `check_theo_role.py`





