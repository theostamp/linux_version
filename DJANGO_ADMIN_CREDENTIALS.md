# 🔐 Django Admin Credentials

## 👑 Ultra-Superuser (Auto-Created)

Το Django Admin έχει ήδη δημιουργηθεί από το `auto_initialization.py` κατά το deploy.

### 🔑 Credentials

**Email**: `theostam1966@gmail.com`  
**Password**: `theo123!@#`

### 🌐 Admin URL

```
https://linuxversion-production.up.railway.app/admin/
```

---

## 📋 Login Steps

1. **Πήγαινε στο Admin URL**:
   ```
   https://linuxversion-production.up.railway.app/admin/
   ```

2. **Login με**:
   - **Email**: `theostam1966@gmail.com`
   - **Password**: `theo123!@#`

3. **Σημαντικό**: Χρησιμοποίησε **email** (όχι username) για login

---

## 🗑️ Διαγραφή Χρηστών με Λάθος Ροή

### Βήμα 1: Εύρεση Χρηστών

1. Στο Django Admin, πήγαινε στο **Users** → **Custom users**

2. **Φίλτρα για χρήστες με λάθος ροή**:
   - **Email verified**: `No` (χρήστες που δεν έχουν επιβεβαιώσει email)
   - **Is active**: `No` (ανενεργοί χρήστες)
   - **Tenant**: `None` (χρήστες χωρίς tenant)

### Βήμα 2: Διαγραφή

**Μέθοδος 1: Individual Deletion**
1. Κάνε click στο email του χρήστη
2. Κάνε scroll κάτω
3. Κάνε click στο **"Delete"** button
4. Επιβεβαίωσε τη διαγραφή

**Μέθοδος 2: Bulk Deletion**
1. Επίλεξε τους χρήστες (checkboxes)
2. Από το dropdown "Action", επίλεξε **"Delete selected users"**
3. Κάνε click **"Go"**
4. Επιβεβαίωσε τη διαγραφή

---

## ⚠️ Προσοχή

### Πριν τη Διαγραφή:

1. **Έλεγξε αν έχουν tenant**:
   - Αν έχουν tenant, πρέπει πρώτα να διαγράψεις το tenant
   - Tenants → Clients → Διάλεξε tenant → Delete

2. **Έλεγξε subscriptions**:
   - Billing → Subscriptions
   - Αν έχουν active subscription, ακύρωσε το πρώτα

3. **Backup** (προαιρετικά):
   - Export τα δεδομένα πριν τη διαγραφή

---

## 🔍 Εύρεση Χρηστών με Λάθος Ροή

### Κριτήρια για "Λάθος Ροή":

1. **Χρήστες χωρίς email verification**:
   - `email_verified = False`
   - `email_verification_token != None` (έχουν token αλλά δεν το έχουν χρησιμοποιήσει)

2. **Χρήστες χωρίς tenant**:
   - `tenant = None`
   - Δημιουργήθηκαν αλλά δεν ολοκληρώθηκε η ροή

3. **Χρήστες με expired tokens**:
   - `email_verification_sent_at < now() - 24 hours`
   - Το token έχει λήξει

### Query για Bulk Selection:

Στο Django Admin, μπορείς να χρησιμοποιήσεις filters:
- **Email verified**: **No**
- **Is active**: **No**
- **Tenant**: **None**

---

## 📋 Quick Checklist

- [x] Ultra-Superuser ήδη δημιουργημένος
- [ ] Login στο `/admin/`
- [ ] Εύρεση χρηστών με λάθος ροή
- [ ] Έλεγχος tenants/subscriptions
- [ ] Διαγραφή χρηστών
- [ ] Επαλήθευση διαγραφής

---

## 🆘 Troubleshooting

### "Permission Denied"
- Ο Ultra-Superuser έχει `is_superuser = True` και `is_staff = True`
- Αν δεν μπορείς να μπεις, έλεγξε τα credentials

### "Cannot login"
- Χρησιμοποίησε **email** (όχι username)
- Password: `theo123!@#`
- Έλεγξε ότι `is_active = True`

### "Admin page not found"
- Βεβαιώσου ότι είσαι στο public schema (όχι tenant domain)
- URL: `https://linuxversion-production.up.railway.app/admin/`

---

**Το Ultra-Superuser είναι ήδη έτοιμο! Μπορείς να συνδεθείς αμέσως!** ✅

