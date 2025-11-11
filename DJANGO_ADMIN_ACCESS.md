# 🔐 Django Admin Access Guide

## 🌐 Admin URL

Το Django Admin είναι διαθέσιμο στο:
```
https://linuxversion-production.up.railway.app/admin/
```

**Σημαντικό**: Χρειάζεσαι superuser account για πρόσβαση.

---

## 🔧 Δημιουργία Superuser

### Μέθοδος 1: Railway CLI (Recommended)

1. **Εγκατάσταση Railway CLI** (αν δεν το έχεις):
   ```bash
   npm i -g @railway/cli
   ```

2. **Login στο Railway**:
   ```bash
   railway login
   ```

3. **Σύνδεση με το project**:
   ```bash
   railway link
   ```

4. **Δημιουργία Superuser**:
   ```bash
   railway run python manage.py createsuperuser
   ```
   
   Θα σου ζητήσει:
   - Email: `admin@newconcierge.app` (ή το email σου)
   - Password: (δώσε έναν δυνατό κωδικό)
   - Password (again): (επανάληψη)

### Μέθοδος 2: Railway Dashboard Shell

1. Πήγαινε στο **Railway Dashboard** → Backend Service
2. Κάνε click στο **"Shell"** tab
3. Τρέξε:
   ```bash
   python manage.py createsuperuser
   ```
4. Ακολούθησε τις οδηγίες

### Μέθοδος 3: Python Script (Local)

Αν έχεις local access:

```bash
cd backend
python scripts/create_superuser.py --email admin@newconcierge.app --password YOUR_PASSWORD
```

---

## 🔍 Είσοδος στο Admin

1. Πήγαινε στο: `https://linuxversion-production.up.railway.app/admin/`

2. **Login με**:
   - Email: (το email που έδωσες στο superuser)
   - Password: (τον κωδικό που έδωσες)

3. **Σημαντικό**: Χρησιμοποίησε **email** (όχι username) για login

---

## 🗑️ Διαγραφή Χρηστών με Λάθος Ροή

### Βήμα 1: Εύρεση Χρηστών

1. Στο Django Admin, πήγαινε στο **Users** → **Custom users**

2. **Φίλτρα** για να βρεις τους χρήστες:
   - `email_verified = False` (χρήστες που δεν έχουν επιβεβαιώσει email)
   - `is_active = False` (ανενεργοί χρήστες)
   - `tenant = None` (χρήστες χωρίς tenant)

### Βήμα 2: Διαγραφή Χρηστών

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
- Email verified: **No**
- Is active: **No**
- Tenant: **None**

---

## 📋 Quick Checklist

- [ ] Δημιουργία superuser
- [ ] Login στο `/admin/`
- [ ] Εύρεση χρηστών με λάθος ροή
- [ ] Έλεγχος tenants/subscriptions
- [ ] Διαγραφή χρηστών
- [ ] Επαλήθευση διαγραφής

---

## 🆘 Troubleshooting

### "Permission Denied"
- Βεβαιώσου ότι ο χρήστης είναι `is_superuser = True` και `is_staff = True`

### "Cannot login"
- Χρησιμοποίησε **email** (όχι username)
- Έλεγξε ότι `is_active = True`

### "Admin page not found"
- Βεβαιώσου ότι είσαι στο public schema (όχι tenant domain)
- URL: `https://linuxversion-production.up.railway.app/admin/`

---

**Μετά τη δημιουργία superuser, θα έχεις πλήρη πρόσβαση στο Django Admin!** ✅

