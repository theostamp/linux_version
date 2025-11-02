# 🌐 Vercel Wildcard Subdomain Setup Guide

## ✅ Προτίμηση: Option B (Subdomains)

Η χρήση subdomains είναι προτιμότερη για production γιατί:
- **Καθαρότερα URLs**: `https://theo-etherm.newconcierge.app` είναι πιο professional
- **Καλύτερο SEO**: Κάθε tenant έχει το δικό του subdomain
- **Εύκολη απομόνωση**: Κάθε tenant έχει ξεχωριστό URL
- **Καλύτερη εμπειρία χρήστη**: Είναι πιο εύκολο να θυμάται ο χρήστης

---

## 📋 Βήματα για Wildcard Subdomain Setup

### **Βήμα 1: Ρύθμιση Nameservers στο Vercel**

Για να χρησιμοποιήσεις wildcard subdomains, ο domain σου πρέπει να χρησιμοποιεί τους nameservers του Vercel.

#### **Α. Πρόσβαση στο Domain Registrar**

1. Πήγαινε στον provider του domain σου (π.χ., Namecheap, GoDaddy, Cloudflare)
2. Βρες τις DNS/Domain settings για `newconcierge.app`
3. Βρες την ενότητα "Nameservers" ή "DNS Management"

#### **Β. Αλλαγή Nameservers**

Αλλάξτε τους nameservers σε:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Σημείωση**: Αυτή η αλλαγή μπορεί να χρειαστεί **έως 48 ώρες** για να διαδοθεί πλήρως.

---

### **Βήμα 2: Έλεγχος Vercel Domain Configuration**

**Καλή νέα!** Το `newconcierge.app` είναι ήδη προσθετημένο στο Vercel ✅

**Στο Vercel Dashboard → Settings → Domains → `newconcierge.app`:**

- ✅ **Domain**: `newconcierge.app`
- ✅ **Valid Configuration**: Εμφανίζεται
- ✅ **Production**: Connected

#### **Πώς Λειτουργούν τα Wildcard Subdomains στο Vercel**

**Καλή νέα!** Το Vercel έχει ήδη δημιουργήσει wildcard records! ✅

**Τι βλέπουμε στο Vercel Dashboard:**
- ✅ `*` ALIAS → `cname.vercel-dns-016.com.` (wildcard subdomain)
- ✅ ALIAS record → `37ea4cbe76d7fe5f.vercel-dns-017.com`
- ✅ CAA record → Let's Encrypt SSL

**Το πρόβλημα:**
- ⚠️ **Nameservers: Third Party** (δεν έχουν αλλάξει ακόμα)
- Το Vercel έχει δημιουργήσει τα records, αλλά δεν μπορεί να τα χειριστεί μέχρι να αλλάξουν οι nameservers

**Η λύση: Αλλαγή Nameservers (ΑΥΤΟ ΕΙΝΑΙ ΑΠΑΡΑΙΤΗΤΟ)**

Το Vercel έχει ήδη δημιουργήσει τα wildcard records. Τώρα χρειάζεται να αλλάξεις τους nameservers:

#### **Αλλαγή Nameservers στο Namecheap (ΑΥΤΟ ΕΙΝΑΙ ΑΠΑΡΑΙΤΗΤΟ)**

**Στο Namecheap Dashboard για `newconcierge.app`:**

1. **Πήγαινε στο Namecheap Dashboard** → Domain List → `newconcierge.app` → Manage
2. **Στη βάση της σελίδας, βρες την ενότητα "Nameservers"**
   - **Τοποθεσία**: Κάτω από την ενότητα "Advanced DNS" / "Host Records"
   - Θα δεις dropdown "Nameservers" με επιλογές όπως:
     - "Namecheap BasicDNS"
     - "Namecheap PremiumDNS"
     - "Custom DNS"
3. **Στο dropdown "Nameservers", επίλεξε "Custom DNS"**
   - ⚠️ **ΜΗΝ** επιλέξεις "Personal DNS Server" (αυτό είναι διαφορετικό - ζητά IP address)
4. **Μόλις επιλέξεις "Custom DNS", θα εμφανιστούν δύο text input πεδία:**
   - **Πρώτο πεδίο** (συνήθως λέει "Nameserver 1" ή "First nameserver"): `ns1.vercel-dns.com`
   - **Δεύτερο πεδίο** (συνήθως λέει "Nameserver 2" ή "Second nameserver"): `ns2.vercel-dns.com`
   - Αυτά τα πεδία εμφανίζονται **αμέσως κάτω** από το dropdown "Nameservers"
5. **Κάνε κλικ στο "Save All Changes"** (green checkmark icon) **στην κορυφή της σελίδας** ή **στο τέλος της φόρμας**

**⚠️ ΣΗΜΑΝΤΙΚΟ**: 
- **ΜΗΝ** χρησιμοποιήσεις "Add Personal DNS Server" - αυτό είναι για custom DNS servers με IP addresses
- Χρησιμοποίησε **"Custom DNS"** και απλά πάτα τους Vercel nameserver hostnames
- **ΜΗΝ** προσθέσεις IP addresses - μόνο hostnames (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`)

**✅ ΕΠΙΤΥΧΙΑ**: Αν βλέπεις στο Namecheap:
```
Nameservers:
ns1.vercel-dns.com
ns2.vercel-dns.com
```
**Τότε η αλλαγή έχει γίνει!** ✅

**Σημείωση**: 
- Η αλλαγή των nameservers μπορεί να χρειαστεί **30 λεπτά - 48 ώρες** για DNS propagation
- Μπορεί να χρειαστεί **έως 30 λεπτά** για να αναγνωριστεί η αλλαγή από το Vercel
- Στο Vercel Dashboard, οι nameservers θα εμφανιστούν ως "Vercel DNS" αντί για "Third Party" μετά το propagation

**⚠️ ΣΗΜΑΝΤΙΚΟ**: Μετά την αλλαγή των nameservers:
- Τα DNS records στο Namecheap (όπως το wildcard CNAME `*` → `cname.vercel-dns.com.`) **ΔΕΝ θα χρειάζονται πλέον**
- Το Vercel θα διαχειριστεί **όλα** τα DNS records αυτόματα
- Το wildcard subdomain θα λειτουργεί αυτόματα χάρη στα records που έχει ήδη δημιουργήσει το Vercel

**Μετά την αλλαγή των nameservers:**
- Το Vercel θα μπορεί να χειριστεί τα wildcard subdomains
- Θα εκδώσει wildcard SSL certificates
- Θα διαχειριστεί όλα τα DNS records αυτόματα
- Οι requests σε `theo-etherm20.newconcierge.app` θα λειτουργούν

#### **Επαλήθευση**

**Τρέχουσα κατάσταση:**
1. ✅ Domain προσθετημένο στο Vercel (`newconcierge.app` - ήδη έτοιμο)
2. ✅ Wildcard ALIAS records δημιουργημένα από το Vercel (`*` → `cname.vercel-dns-016.com.`)
3. ✅ SSL CAA record για Let's Encrypt
4. ⚠️ **ΚΡΙΣΙΜΟ**: Nameservers ακόμα Third Party (χρειάζεται αλλαγή)
5. ✅ `FRONTEND_URL` στο Railway = `https://newconcierge.app` (ήδη έτοιμο)

**Μετά την αλλαγή των nameservers:**
- Το Vercel θα μπορεί να χειριστεί τα wildcard subdomains
- Τα subdomains όπως `theo-etherm20.newconcierge.app` θα λειτουργούν

---

### **Βήμα 3: Ενημέρωση Railway Environment Variables (ΚΡΙΣΙΜΟ)**

⚠️ **Αυτό είναι το πιο σημαντικό βήμα!** Το backend πρέπει να ξέρει ότι χρησιμοποιείς subdomains.

1. **Πήγαινε στο Railway Dashboard**: https://railway.app
2. **Επέλεξε το service**: Django Backend
3. **Πήγαινε σε**: **Variables** tab
4. **Ενημέρωσε τα παρακάτω variables:**

#### **Α. ΚΡΙΣΙΜΟ - FRONTEND_URL**

**Πριν:**
```
FRONTEND_URL=https://linux-version.vercel.app
```

**Μετά:**
```
FRONTEND_URL=https://newconcierge.app
```

#### **Β. CORS_ALLOWED_ORIGINS**

**Πριν:**
```
CORS_ALLOWED_ORIGINS=https://linux-version.vercel.app,https://*.vercel.app
```

**Μετά:**
```
CORS_ALLOWED_ORIGINS=https://newconcierge.app,https://*.newconcierge.app,https://linux-version.vercel.app,https://*.vercel.app
```

**Σημείωση**: Κρατάμε και τα `vercel.app` για backward compatibility με preview deployments.

#### **Γ. CSRF_ORIGINS**

**Πριν:**
```
CSRF_ORIGINS=.railway.app,localhost,linuxversion-production.up.railway.app,linux-version.vercel.app,*.vercel.app
```

**Μετά:**
```
CSRF_ORIGINS=.railway.app,localhost,linuxversion-production.up.railway.app,newconcierge.app,*.newconcierge.app,linux-version.vercel.app,*.vercel.app
```

#### **Δ. DJANGO_ALLOWED_HOSTS**

**Πριν:**
```
DJANGO_ALLOWED_HOSTS=.railway.app,localhost,linuxversion-production.up.railway.app,linux-version.vercel.app
```

**Μετά:**
```
DJANGO_ALLOWED_HOSTS=.railway.app,localhost,linuxversion-production.up.railway.app,newconcierge.app,.newconcierge.app,linux-version.vercel.app
```

**Σημείωση**: Το `.newconcierge.app` (με τελεία μπροστά) επιτρέπει όλα τα subdomains.

#### **Ε. GOOGLE_REDIRECT_URI (Εάν χρησιμοποιείς Google OAuth)**

**Πριν:**
```
GOOGLE_REDIRECT_URI=https://linux-version.vercel.app/auth/callback
```

**Μετά:**
```
GOOGLE_REDIRECT_URI=https://newconcierge.app/auth/callback
```

**Σημείωση**: Ενημέρωσε και το Google OAuth configuration στο Google Console με το νέο redirect URI.

---

6. **Κάνε redeploy** του service ώστε να εφαρμοστούν οι αλλαγές

**ΠΡΟΣΟΧΗ**: Μετά το redeploy, ελέγξε τα logs για να επιβεβαιώσεις:
```
[SETTINGS] FRONTEND_URL: https://newconcierge.app (env var: https://newconcierge.app)
```

---

---

### **Βήμα 4: Επαλήθευση DNS (Εάν χρειάζεται)**

**Σημείωση**: Εάν τα DNS records είναι ήδη ρυθμισμένα (όπως φαίνεται παραπάνω), μπορείς να παραλείψεις αυτό το βήμα.

Μετά την αλλαγή των nameservers, επαλήθευσε ότι το DNS λειτουργεί:

```bash
# Ελέγξε το apex domain
nslookup newconcierge.app

# Ελέγξε ένα subdomain (θα πρέπει να δείχνει στο Vercel)
nslookup theo-etherm.newconcierge.app
```

**Αναμενόμενο αποτέλεσμα**: Και τα δύο θα πρέπει να δείχνουν στα Vercel IP addresses.

---

### **Βήμα 5: SSL Certificate (Αυτόματο)**

Το Vercel θα εκδώσει **αυτόματα** wildcard SSL certificates για όλα τα subdomains:

- ✅ `newconcierge.app` → SSL
- ✅ `*.newconcierge.app` → Wildcard SSL
- ✅ `theo-etherm.newconcierge.app` → SSL (από wildcard)

**Δεν χρειάζεται manual SSL setup!**

---

## 🔍 Έλεγχος ότι Λειτουργεί

### **1. Έλεγχος ότι οι Nameservers Έχουν Αλλάξει**

**Μετά την αλλαγή των nameservers στο Namecheap, ελέγξε:**

**Α. Στο Namecheap:**
- ✅ Nameservers εμφανίζονται ως `ns1.vercel-dns.com` και `ns2.vercel-dns.com`

**Β. Στο Vercel Dashboard:**
- Πήγαινε στο Vercel Dashboard → Settings → Domains → `newconcierge.app`
- Μετά το DNS propagation (30 λεπτά - 48 ώρες), οι nameservers θα εμφανιστούν ως **"Vercel DNS"** αντί για "Third Party"

**Γ. Με DNS lookup:**
```bash
# Ελέγξε τους nameservers
nslookup -type=NS newconcierge.app

# Αναμενόμενο αποτέλεσμα (μετά το propagation):
# newconcierge.app nameserver = ns1.vercel-dns.com
# newconcierge.app nameserver = ns2.vercel-dns.com
```

### **2. Έλεγχος Apex Domain**

Ανοιξε στο browser:
```
https://newconcierge.app
```

**Αναμενόμενο**: Θα πρέπει να φορτώσει η Next.js app σου ✅

### **3. Έλεγχος Subdomain**

**ΠΡΟΣΟΧΗ**: Περίμενε **30 λεπτά - 48 ώρες** για DNS propagation πριν δοκιμάσεις!

Μετά το DNS propagation, ανοιξε στο browser:
```
https://theo-etherm20.newconcierge.app/dashboard
```

**Αναμενόμενο**: 
- Το Vercel θα αποδεχτεί το subdomain (χάρη στο wildcard ALIAS record)
- Το Next.js middleware θα ανιχνεύσει το subdomain `theo-etherm20`
- Θα κάνει rewrite σε `/tenant/dashboard?tenant=theo-etherm20`
- Ο `SessionTenantMiddleware` στο backend θα ενεργοποιήσει το σωστό tenant schema

**Εάν δεν λειτουργεί:**
- Περίμενε λίγο περισσότερο για DNS propagation (μπορεί να χρειαστεί 1-48 ώρες)
- Ελέγξε στο Vercel Dashboard αν οι nameservers εμφανίζονται ως "Vercel DNS"

### **4. Έλεγχος Backend Logs**

Στο Railway logs, θα πρέπει να βλέπεις:

```
[SETTINGS] FRONTEND_URL: https://newconcierge.app (env var: https://newconcierge.app)
[TENANT_WORKSPACE_ACCESS] Generated tenant_url: https://theo-etherm20.newconcierge.app/dashboard
```

**Εάν βλέπεις**:
```
[SETTINGS] FRONTEND_URL: https://linux-version.vercel.app
```

**Τότε** το `FRONTEND_URL` δεν έχει ενημερωθεί ακόμα στο Railway!

---

## ⚠️ Troubleshooting

### **Πρόβλημα: "ERR_CONNECTION_CLOSED"**

**Αιτία**: Το subdomain δεν είναι ακόμα ρυθμισμένο στο DNS.

**Λύση**:
1. Ελέγξε αν οι nameservers άλλαξαν (μπορεί να χρειαστεί έως 48 ώρες)
2. Ελέγξε αν πρόσθεσες `*.newconcierge.app` στο Vercel
3. Περίμενε λίγο για DNS propagation

### **Πρόβλημα: "Certificate Error"**

**Αιτία**: Το SSL certificate δεν έχει εκδοθεί ακόμα.

**Λύση**:
1. Το Vercel εκδίδει SSL certificates αυτόματα
2. Μπορεί να χρειαστεί έως 5 λεπτά
3. Κάνε refresh μετά από λίγο

### **Πρόβλημα: Backend δεν βρίσκει tenant**

**Αιτία**: Το `FRONTEND_URL` δεν έχει ενημερωθεί στο Railway.

**Λύση**:
1. Ελέγξε το Railway environment variable `FRONTEND_URL`
2. Βεβαιώσου ότι είναι `https://newconcierge.app` (όχι `https://linux-version.vercel.app`)
3. Κάνε redeploy του Railway service

---

## 📝 Checklist

**DNS Configuration:**
- [ ] `newconcierge.app` προσθετημένο στο Vercel Domains ✅ (ήδη έτοιμο)
- [ ] Wildcard CNAME (`*` → `cname.vercel-dns.com.`) προσθετημένο στο DNS ή Vercel
- [ ] `www` CNAME (`www` → `cname.vercel-dns.com.`) προσθετημένο (αν χρειάζεται)
- [ ] Apex A Record (`@` → `216.150.1.1` ή `76.76.21.21`) ρυθμισμένο

**Vercel Setup:**
- [ ] `newconcierge.app` visible στο Vercel Dashboard
- [ ] `*.newconcierge.app` visible στο Vercel Dashboard (αν χρησιμοποιείς Vercel DNS)
- [ ] Edge Network: Active ✅ (ήδη active)

**Backend Configuration (ΚΡΙΣΙΜΟ):**
- [ ] `FRONTEND_URL` ενημερώθηκε στο Railway σε `https://newconcierge.app`
- [ ] Railway service redeployed
- [ ] Backend logs δείχνουν: `FRONTEND_URL: https://newconcierge.app`

**Verification:**
- [ ] Apex domain (`https://newconcierge.app`) λειτουργεί
- [ ] Subdomain (`https://theo-etherm.newconcierge.app`) λειτουργεί
- [ ] SSL certificates εκδόθηκαν (no certificate errors)
- [ ] Backend redirects χρησιμοποιούν subdomains (όχι query parameters)

---

## 🎉 Μετά τη Setup

Όταν όλα λειτουργούν:

1. **Tenant URLs** θα είναι: `https://{schema_name}.newconcierge.app/dashboard`
   - Παράδειγμα: `https://theo-etherm.newconcierge.app/dashboard`

2. **Email links** θα δείχνουν στο: `https://newconcierge.app` (apex domain)

3. **Backend redirects** θα χρησιμοποιούν subdomains αντί για query parameters

4. **Κάθε tenant** θα έχει το δικό του subdomain με SSL certificate

---

## 📚 Πηγές

- [Vercel Wildcard Domains Documentation](https://vercel.com/docs/multi-tenant/domain-management)
- [Why Use Domain Nameservers for Wildcard Domains](https://vercel.com/guides/why-use-domain-nameservers-method-wildcard-domains)

