# 📧 MailerSend DNS Setup - Step-by-Step Guide

## Domain: `newconcierge.app`

Αυτός ο οδηγός σου δείχνει **ακριβώς** τι να προσθέσεις στο DNS provider σου (π.χ. Cloudflare, Namecheap, GoDaddy).

---

## 🎯 Quick Summary

Χρειάζεσαι **3 DNS records** για το MailerSend:
1. **SPF** (TXT record)
2. **DKIM** (CNAME record)
3. **RETURN-PATH** (CNAME record)

**Επιπλέον (προτείνεται):**
4. **DMARC** (TXT record)

---

## 📝 Step-by-Step Instructions

### 🔹 Step 1: SPF Record

**Που να το προσθέσεις:** DNS provider σου (Cloudflare, Namecheap, κλπ.)

**Record Details:**
```
Type: TXT
Name: newconcierge.app
    (ή @ αν το provider σου το υποστηρίζει)
Value: v=spf1 include:_spf.mailersend.net ~all
TTL: 3600 (ή default)
```

**Πρακτικά βήματα:**

**Αν χρησιμοποιείς Cloudflare:**
1. Πήγαινε στο Cloudflare Dashboard → Select `newconcierge.app`
2. DNS → Records → Add record
3. **Type:** `TXT`
4. **Name:** `@` (root domain)
5. **Content:** `v=spf1 include:_spf.mailersend.net ~all`
6. **TTL:** Auto (ή 3600)
7. Save

**Αν χρησιμοποιείς Namecheap:**
1. Πήγαινε στο Namecheap Dashboard → Domain List → Manage → Advanced DNS
2. Add New Record
3. **Type:** `TXT Record`
4. **Host:** `@`
5. **Value:** `v=spf1 include:_spf.mailersend.net ~all`
6. **TTL:** 300 (ή 3600)
7. Save All Changes

**Αν χρησιμοποιείς άλλο provider:**
- Ακολούθησε την ίδια λογική: `TXT` record για `@` ή `newconcierge.app` με το value που δώσαμε

**✅ Επαλήθευση (μετά από 5-10 λεπτά):**
```bash
dig TXT newconcierge.app +short
# Expected: "v=spf1 include:_spf.mailersend.net ~all"
```

---

### 🔹 Step 2: DKIM Record

**Record Details:**
```
Type: CNAME
Name: mlsend2._domainkey.newconcierge.app
Value/Target: mlsend2._domainkey.mailersend.net
TTL: 3600 (ή default)
```

**Πρακτικά βήματα:**

**Αν χρησιμοποιείς Cloudflare:**
1. DNS → Records → Add record
2. **Type:** `CNAME`
3. **Name:** `mlsend2._domainkey` (το Cloudflare προσθέτει αυτόματα το `.newconcierge.app`)
4. **Target:** `mlsend2._domainkey.mailersend.net`
5. **Proxy status:** DNS only (OFF - μην το κάνεις proxy)
6. **TTL:** Auto (ή 3600)
7. Save

**⚠️ Σημαντικό:** Αν το provider σου **ΔΕΝ** προσθέτει αυτόματα το domain:
- **Name:** `mlsend2._domainkey.newconcierge.app` (full subdomain)

**Αν χρησιμοποιείς Namecheap:**
1. Add New Record
2. **Type:** `CNAME Record`
3. **Host:** `mlsend2._domainkey` (ή `mlsend2._domainkey.newconcierge.app` αν χρειάζεται full path)
4. **Value:** `mlsend2._domainkey.mailersend.net`
5. **TTL:** 300 (ή 3600)
6. Save All Changes

**✅ Επαλήθευση (μετά από 5-10 λεπτά):**
```bash
dig CNAME mlsend2._domainkey.newconcierge.app +short
# Expected: mlsend2._domainkey.mailersend.net.
```

---

### 🔹 Step 3: RETURN-PATH Record

**Record Details:**
```
Type: CNAME
Name: mta.newconcierge.app
Value/Target: mailersend.net
TTL: 3600 (ή default)
```

**Πρακτικά βήματα:**

**Αν χρησιμοποιείς Cloudflare:**
1. DNS → Records → Add record
2. **Type:** `CNAME`
3. **Name:** `mta` (το Cloudflare προσθέτει αυτόματα το `.newconcierge.app`)
4. **Target:** `mailersend.net`
5. **Proxy status:** DNS only (OFF)
6. **TTL:** Auto (ή 3600)
7. Save

**Αν χρησιμοποιείς Namecheap:**
1. Add New Record
2. **Type:** `CNAME Record`
3. **Host:** `mta` (ή `mta.newconcierge.app` αν χρειάζεται full path)
4. **Value:** `mailersend.net`
5. **TTL:** 300 (ή 3600)
6. Save All Changes

**✅ Επαλήθευση (μετά από 5-10 λεπτά):**
```bash
dig CNAME mta.newconcierge.app +short
# Expected: mailersend.net.
```

---

### 🔹 Step 4: DMARC Record (Optional but Recommended)

**Record Details:**
```
Type: TXT
Name: _dmarc.newconcierge.app
Value: v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1
TTL: 3600 (ή default)
```

**Πρακτικά βήματα:**

**Αν χρησιμοποιείς Cloudflare:**
1. DNS → Records → Add record
2. **Type:** `TXT`
3. **Name:** `_dmarc` (το Cloudflare προσθέτει αυτόματα το `.newconcierge.app`)
4. **Content:** `v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1`
5. **TTL:** Auto (ή 3600)
6. Save

**⚠️ Σημείωση:** Χρειάζεσαι email `dmarc@newconcierge.app` (ή χρησιμοποίησε υπάρχον email)

**Αν χρησιμοποιείς Namecheap:**
1. Add New Record
2. **Type:** `TXT Record`
3. **Host:** `_dmarc` (ή `_dmarc.newconcierge.app` αν χρειάζεται full path)
4. **Value:** `v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1`
5. **TTL:** 300 (ή 3600)
6. Save All Changes

**✅ Επαλήθευση (μετά από 5-10 λεπτά):**
```bash
dig TXT _dmarc.newconcierge.app +short
# Expected: "v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1"
```

---

## 📊 Complete Records Summary Table

| # | Type | Name | Value/Target | Purpose | Required |
|---|------|------|--------------|---------|----------|
| 1 | TXT | `newconcierge.app` | `v=spf1 include:_spf.mailersend.net ~all` | SPF Auth | ✅ |
| 2 | CNAME | `mlsend2._domainkey.newconcierge.app` | `mlsend2._domainkey.mailersend.net` | DKIM Auth | ✅ |
| 3 | CNAME | `mta.newconcierge.app` | `mailersend.net` | Bounce Handling | ✅ |
| 4 | TXT | `_dmarc.newconcierge.app` | `v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1` | DMARC Policy | ⭐ |

---

## ⏱️ Timeline

1. **Προσθήκη records:** 5-10 λεπτά (ανά record)
2. **DNS Propagation:** 5-30 λεπτά (συνήθως)
3. **MailerSend Verification:** 1-2 λεπτά (αφού propagate το DNS)
4. **Total:** ~20-40 λεπτά

---

## ✅ Verification Steps

### 1. Επαλήθευση DNS (Command Line)

```bash
# SPF
dig TXT newconcierge.app +short

# DKIM
dig CNAME mlsend2._domainkey.newconcierge.app +short

# RETURN-PATH
dig CNAME mta.newconcierge.app +short

# DMARC
dig TXT _dmarc.newconcierge.app +short
```

### 2. Επαλήθευση Online

**MXToolbox:**
1. Πήγαινε στο https://mxtoolbox.com/
2. Enter `newconcierge.app`
3. Select "SPF Record Lookup", "DKIM Record Lookup", "DMARC Record Lookup"
4. Verify ότι τα records είναι σωστά

### 3. Επαλήθευση στο MailerSend Dashboard

1. Πήγαινε στο MailerSend Dashboard → Domains
2. Select `newconcierge.app`
3. Κάνε κλικ "Verify Domain" ή "Re-verify"
4. Ελέγξε το status:
   - ✅ **SPF:** Verified
   - ✅ **DKIM:** Verified
   - ✅ **Return-Path:** Verified
   - ✅ **DMARC:** Verified (optional)

---

## 🚨 Troubleshooting

### Αν τα records δεν φαίνονται:

1. **Έλεγξε το DNS provider:**
   - Βεβαιώσου ότι δεν έχεις trailing dots (`.`) στα values
   - Έλεγξε αν το DNS provider προσθέτει αυτόματα το domain name

2. **Clear DNS cache:**
   ```bash
   # Linux/Mac
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder
   
   # Windows
   ipconfig /flushdns
   ```

3. **Χρησιμοποίησε διαφορετικό DNS server:**
   ```bash
   dig TXT newconcierge.app @8.8.8.8  # Google DNS
   dig TXT newconcierge.app @1.1.1.1  # Cloudflare DNS
   ```

### Αν το MailerSend δεν βρίσκει τα records:

1. Περίμενε 30-60 λεπτά (DNS propagation)
2. Κάνε "Re-verify" στο MailerSend Dashboard
3. Έλεγξε τα logs στο MailerSend Dashboard για errors
4. Επικοινώνησε με το MailerSend support

---

## 📋 Final Checklist

Μετά την προσθήκη όλων των records:

- [ ] SPF record added (TXT: `newconcierge.app`)
- [ ] DKIM record added (CNAME: `mlsend2._domainkey.newconcierge.app`)
- [ ] RETURN-PATH record added (CNAME: `mta.newconcierge.app`)
- [ ] DMARC record added (TXT: `_dmarc.newconcierge.app`) - Optional
- [ ] DNS propagation completed (verified with dig/nslookup)
- [ ] MailerSend domain verified (Dashboard → Domains → Verified ✅)
- [ ] Test email sent successfully
- [ ] Test email arrived in Gmail inbox (not spam)

---

## 🎯 Next Steps

1. ✅ Προσθήκη όλων των 3-4 DNS records
2. ⏳ Περίμενε 10-30 λεπτά για DNS propagation
3. 🔍 Verify με dig/nslookup commands
4. ✅ Verify στο MailerSend Dashboard
5. 📧 Test email αποστολή από Django shell
6. 📊 Έλεγχος στο Mail-Tester για SPF/DKIM/DMARC scores

---

## 📞 Need Help?

Αν έχεις προβλήματα:
1. Έλεγξε τα DNS records με dig/nslookup
2. Χρησιμοποίησε το MXToolbox για verification
3. Έλεγξε το MailerSend Dashboard logs
4. Επικοινώνησε με το MailerSend support

