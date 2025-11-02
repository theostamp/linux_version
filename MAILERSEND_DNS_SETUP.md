# 📧 MailerSend Domain Verification - DNS Setup Guide

## Domain: `newconcierge.app`

Αυτός ο οδηγός περιγράφει βήμα-βήμα πώς να προσθέσεις τα DNS records που απαιτεί το MailerSend για να επιβεβαιώσει το domain σου.

---

## 📋 Checklist - DNS Records που χρειάζονται

### ✅ 1. SPF Record (Required)
### ⏳ 2. DKIM Record (Required)
### ⏳ 3. RETURN-PATH Record (Required)
### ⏳ 4. DMARC Record (Optional but Recommended)

---

## 🔧 Step-by-Step Setup

### Step 1: SPF Record (Email Authentication)

**Record Type:** `TXT`  
**Name/Host:** `newconcierge.app` (ή `@` αν το DNS provider σου το υποστηρίζει)  
**Value:** 
```
v=spf1 include:_spf.mailersend.net ~all
```
**TTL:** 3600 (ή default)

**Πώς να το προσθέσεις:**

1. Πήγαινε στο DNS provider σου (π.χ. Cloudflare, GoDaddy, Namecheap, κλπ.)
2. Βρες τη σελίδα DNS Management / DNS Records
3. Πρόσθεσε νέο record:
   - **Type:** `TXT`
   - **Name:** `newconcierge.app` ή `@` (root domain)
   - **Content/Value:** `v=spf1 include:_spf.mailersend.net ~all`
   - **TTL:** 3600 (1 hour)
4. Save / Add Record

**Επαλήθευση:**
```bash
# Μετά από 5-10 λεπτά, δοκίμασε:
dig TXT newconcierge.app +short
# ή
nslookup -type=TXT newconcierge.app
```

**Expected Output:**
```
"v=spf1 include:_spf.mailersend.net ~all"
```

---

### Step 2: DKIM Record (Email Authentication)

**Record Type:** `CNAME`  
**Name/Host:** `mlsend2._domainkey.newconcierge.app`  
**Value/Target:** `mlsend2._domainkey.mailersend.net`  
**TTL:** 3600 (ή default)

**Πώς να το προσθέσεις:**

1. Στο DNS provider σου, πρόσθεσε νέο record:
   - **Type:** `CNAME`
   - **Name:** `mlsend2._domainkey.newconcierge.app`
   - **Target/Value:** `mlsend2._domainkey.mailersend.net`
   - **TTL:** 3600
2. Save / Add Record

**⚠️ Σημαντικό:**
- Το όνομα είναι **ολόκληρο:** `mlsend2._domainkey.newconcierge.app`
- Το target είναι: `mlsend2._domainkey.mailersend.net`
- Αν το DNS provider σου προσθέτει αυτόματα το domain name, χρησιμοποίησε μόνο: `mlsend2._domainkey`

**Επαλήθευση:**
```bash
# Μετά από 5-10 λεπτά, δοκίμασε:
dig CNAME mlsend2._domainkey.newconcierge.app +short
# ή
nslookup -type=CNAME mlsend2._domainkey.newconcierge.app
```

**Expected Output:**
```
mlsend2._domainkey.mailersend.net.
```

---

### Step 3: RETURN-PATH Record (Bounce Handling)

**Record Type:** `CNAME`  
**Name/Host:** `mta.newconcierge.app`  
**Value/Target:** `mailersend.net`  
**TTL:** 3600 (ή default)

**Πώς να το προσθέσεις:**

1. Στο DNS provider σου, πρόσθεσε νέο record:
   - **Type:** `CNAME`
   - **Name:** `mta.newconcierge.app`
   - **Target/Value:** `mailersend.net`
   - **TTL:** 3600
2. Save / Add Record

**⚠️ Σημαντικό:**
- Το όνομα είναι **subdomain:** `mta.newconcierge.app`
- Το target είναι: `mailersend.net` (χωρίς trailing dot)

**Επαλήθευση:**
```bash
# Μετά από 5-10 λεπτά, δοκίμασε:
dig CNAME mta.newconcierge.app +short
# ή
nslookup -type=CNAME mta.newconcierge.app
```

**Expected Output:**
```
mailersend.net.
```

---

### Step 4: DMARC Record (Optional but Recommended)

**Record Type:** `TXT`  
**Name/Host:** `_dmarc.newconcierge.app`  
**Value:**
```
v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1
```
**TTL:** 3600 (ή default)

**Πώς να το προσθέσεις:**

1. Πρώτα, δημιούργησε email `dmarc@newconcierge.app` (ή χρησιμοποίησε υπάρχον email)
2. Στο DNS provider σου, πρόσθεσε νέο record:
   - **Type:** `TXT`
   - **Name:** `_dmarc.newconcierge.app`
   - **Content/Value:** `v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1`
   - **TTL:** 3600
3. Save / Add Record

**Επαλήθευση:**
```bash
# Μετά από 5-10 λεπτά, δοκίμασε:
dig TXT _dmarc.newconcierge.app +short
```

**Expected Output:**
```
"v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1"
```

**Σημείωση:**
- Ξεκίνα με `p=none` για να μην ρίξεις legitimate emails
- Όταν λειτουργεί σωστά, άλλαξε σε `p=quarantine` ή `p=reject`

---

## 🔍 Verification Tools

### Online Tools:
1. **MXToolbox:** https://mxtoolbox.com/
   - Enter `newconcierge.app`
   - Check "SPF Record", "DMARC Record", "DKIM Record"

2. **Mail-Tester:** https://www.mail-tester.com/
   - Στείλε test email από το `noreply@newconcierge.app`
   - Έλεγξε SPF/DKIM/DMARC scores

3. **Google Admin Toolbox:** https://toolbox.googleapps.com/apps/checkmx/
   - Έλεγξε MX, SPF, DKIM records

### Command Line:
```bash
# SPF Check
dig TXT newconcierge.app +short

# DKIM Check
dig CNAME mlsend2._domainkey.newconcierge.app +short

# RETURN-PATH Check
dig CNAME mta.newconcierge.app +short

# DMARC Check
dig TXT _dmarc.newconcierge.app +short
```

---

## 📊 Complete DNS Records Summary

| Record Type | Name | Value/Target | Purpose |
|------------|------|--------------|---------|
| TXT | `newconcierge.app` | `v=spf1 include:_spf.mailersend.net ~all` | SPF Authentication |
| CNAME | `mlsend2._domainkey.newconcierge.app` | `mlsend2._domainkey.mailersend.net` | DKIM Authentication |
| CNAME | `mta.newconcierge.app` | `mailersend.net` | Bounce Handling |
| TXT | `_dmarc.newconcierge.app` | `v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1` | DMARC Policy |

---

## ⏱️ DNS Propagation Time

- **TTL:** 3600 seconds (1 hour)
- **Typical Propagation:** 5-30 minutes
- **Maximum Propagation:** 48 hours (rare)

**Tip:** Μπορείς να μειώσεις το TTL προσωρινά σε 300 (5 minutes) για γρηγορότερη propagation, αλλά αυξήσε το πίσω σε 3600 μετά τη setup.

---

## ✅ Verification Checklist

Μετά την προσθήκη όλων των records, ελέγξτε:

- [ ] SPF record επαληθεύτηκε στο MailerSend Dashboard
- [ ] DKIM record επαληθεύτηκε στο MailerSend Dashboard
- [ ] RETURN-PATH record επαληθεύτηκε στο MailerSend Dashboard
- [ ] DMARC record επαληθεύτηκε (optional)
- [ ] Test email αποστολή από Django shell
- [ ] Test email έφτασε στο Gmail inbox
- [ ] SPF/DKIM/DMARC scores > 8/10 στο Mail-Tester

---

## 🚨 Troubleshooting

### Αν τα records δεν φαίνονται:

1. **Έλεγξε το DNS provider:**
   - Μην έχεις trailing dots στα values
   - Έλεγξε αν το DNS provider προσθέτει αυτόματα το domain name

2. **Έλεγξε TTL:**
   - Αν έχεις TTL 86400 (24 hours), θα πάρει χρόνο
   - Μείωσε προσωρινά σε 300 (5 minutes)

3. **Clear DNS Cache:**
   ```bash
   # Linux/Mac
   sudo dscacheutil -flushcache
   
   # Windows
   ipconfig /flushdns
   ```

4. **Χρησιμοποίησε διαφορετικό DNS server:**
   ```bash
   dig TXT newconcierge.app @8.8.8.8
   ```

### Αν το MailerSend δεν βρίσκει τα records:

1. Περίμενε 30-60 λεπτά (DNS propagation)
2. Έλεγξε στο MailerSend Dashboard → Domains → newconcierge.app → DNS Records
3. Κάνε "Re-verify" στο MailerSend Dashboard

---

## 📚 Next Steps

1. ✅ Προσθήκη όλων των DNS records (SPF, DKIM, RETURN-PATH, DMARC)
2. ⏳ Περίμενε 10-30 λεπτά για DNS propagation
3. 🔍 Επαλήθευση με dig/nslookup commands
4. ✅ Επαλήθευση στο MailerSend Dashboard
5. 📧 Test email αποστολή από Django shell
6. 📊 Έλεγχος στο Mail-Tester για SPF/DKIM/DMARC scores

---

## 🆘 Support

Αν έχεις προβλήματα:
1. Έλεγξε τα logs στο MailerSend Dashboard
2. Χρησιμοποίησε τα verification tools (MXToolbox, Mail-Tester)
3. Έλεγξε το DNS provider logs για errors
4. Επικοινώνησε με το MailerSend support

