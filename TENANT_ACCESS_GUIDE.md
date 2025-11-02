# 🏢 Οδηγός Πρόσβασης σε Tenant

## ✅ Το Login Λειτουργεί!

Το login στα tenant subdomains λειτουργεί επιτυχώς μετά τα fixes. Όμως, υπάρχει σύγχυση με τα subdomains.

---

## 🔍 Το Πρόβλημα που Αντιμετωπίζεις

Προσπαθείς να μπεις στο:
```
❌ https://theo-etherm.newconcierge.app/
```

Αλλά το tenant που δημιουργήθηκε είναι:
```
✅ https://theo-etherm202.newconcierge.app/
```

---

## 📊 Πώς Δημιουργείται το Tenant Subdomain

Όταν εγγράφεσαι στο σύστημα:

1. **Registration**: Εισάγεις `First Name` και `Last Name`
   - Παράδειγμα: `Theo` `Etherm202`

2. **Tenant Creation**: Το σύστημα δημιουργεί subdomain από τα ονόματα:
   ```
   Schema: {first_name}-{last_name} → theo-etherm202
   ```

3. **Email Notification**: Λαμβάνεις email με το σωστό URL:
   ```
   Tenant URL: https://theo-etherm202.newconcierge.app/dashboard
   ```

---

## ✅ Λύση

### Επιλογή 1: Χρησιμοποίησε το Σωστό URL

Πήγαινε στο URL που έλαβες στο email:

```
https://theo-etherm202.newconcierge.app/
```

### Επιλογή 2: Δημιούργησε Νέο Tenant

Αν θέλεις το subdomain `theo-eth`:

1. **Εγγραφή με διαφορετικά στοιχεία**:
   - Email: Χρησιμοποίησε διαφορετικό email (π.χ. `test@example.com`)
   - First Name: `Theo`
   - Last Name: `Eth`

2. **Αποτέλεσμα**:
   - Tenant Schema: `theo-eth`
   - Tenant URL: `https://theo-eth.newconcierge.app/`

### Επιλογή 3: Προσθήκη Alias Domain (Προχωρημένο)

Μπορούμε να προσθέσουμε το `theo-eth.newconcierge.app` ως alias για το existing tenant `theo-etherm202`.

---

## 🔎 Πώς να Βρεις το Tenant URL σου

### Μέθοδος 1: Email Επιβεβαίωσης

Κοίτα το email με θέμα:
```
[New Concierge] 🎉 Το Workspace σας είναι έτοιμο - {tenant_name}
```

Το email περιέχει το σωστό tenant URL.

### Μέθοδος 2: Μετά το Stripe Payment

Μετά την ολοκλήρωση της πληρωμής, βλέπεις:
```
Subscription completed for user etherm2021@gmail.com, tenant: theo-etherm202
Generated tenant_url: https://theo-etherm202.newconcierge.app/dashboard
```

---

## 🐛 Γιατί το `/api/buildings/public` επέστρεφε 404

Όταν πήγες στο `theo-etherm.newconcierge.app`:

1. **Frontend**: Προσθέτει header `X-Tenant-Schema: theo-eth`
2. **Backend**: Ψάχνει για tenant με schema `theo-eth`  
3. **Database**: **ΔΕΝ ΒΡΙΣΚΕΙ** τέτοιο tenant (υπάρχει μόνο `theo-etherm202`)
4. **Result**: 404 - No buildings found

Αυτός είναι ο λόγος που έβλεπες:
```
GET /api/buildings/public → 404 Not Found
```

---

## 🎯 Επόμενα Βήματα

### Επιλογή Α: Χρησιμοποίησε το Υπάρχον Tenant

```bash
# 1. Πήγαινε στο σωστό URL
https://theo-etherm202.newconcierge.app/

# 2. Κάνε login με:
Email: etherm2021@gmail.com
Password: [το password σου]

# 3. Θα δεις το dashboard με τα demo buildings
```

### Επιλογή Β: Δημιούργησε Νέο Tenant "theo-eth"

```bash
# 1. Πήγαινε στο main domain
https://newconcierge.app/register

# 2. Εγγραφή με νέα στοιχεία:
Email: another-email@example.com
First Name: Theo
Last Name: Eth
Password: [νέο password]

# 3. Επιλογή Plan & Payment

# 4. Μετά το payment, θα σε ανακατευθύνει στο:
https://theo-eth.newconcierge.app/dashboard
```

---

## 📝 Σημειώσεις

### Tenant Naming Rules

- Το subdomain δημιουργείται από: `{first_name}-{last_name}`
- Όλα τα γράμματα γίνονται lowercase
- Τα spaces γίνονται dashes (`-`)
- Ειδικοί χαρακτήρες αφαιρούνται

**Παραδείγματα:**
```
Theo Stamatiou → theo-stamatiou
John Doe → john-doe
Maria Papadopoulou → maria-papadopoulou
```

### Tenant Data Isolation

Κάθε tenant έχει:
- **Ξεχωριστό database schema** (πλήρης απομόνωση δεδομένων)
- **Δικά του buildings, apartments, users**
- **Δικό του billing subscription**
- **Demo data** (1 building με 10 apartments) κατά τη δημιουργία

---

## 🔧 Troubleshooting

### "404 Not Found" σε /api/buildings/public

**Αιτία**: Λάθος tenant subdomain

**Λύση**: Χρησιμοποίησε το σωστό subdomain από το email

### "No buildings found"

**Αιτία**: Το tenant δημιουργήθηκε χωρίς demo data

**Λύση**: Δημιούργησε building manually από το dashboard

### "Login fails on tenant subdomain"

**Αιτία**: Caching issue ή το deployment δεν έχει ολοκληρωθεί

**Λύση**:
1. Hard refresh (Ctrl+Shift+R)
2. Clear localStorage: `localStorage.clear()`
3. Reload και δοκίμασε ξανά

---

## 📞 Επόμενα Βήματα

Στείλε μου:
1. **Ποια επιλογή θέλεις;** (Α: Use theo-etherm202, Β: Create theo-eth)
2. **Screenshots** όταν κάνεις login στο σωστό subdomain
3. **Console logs** αν εξακολουθούν να υπάρχουν errors

Το login λειτουργεί τώρα - απλά πρέπει να πας στο σωστό subdomain! 🚀

