# 📧 MailerSend DNS Setup - Vercel DNS Edition

## 🔍 Situation: Domain uses Vercel DNS

Αν το domain `newconcierge.app` χρησιμοποιεί **Vercel DNS** (nameservers: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`), τότε **δεν μπορείς** να προσθέσεις DNS records από το Namecheap Advanced DNS.

**Οι επιλογές σου είναι:**
1. ✅ **Πρόσθεσε τα DNS records στο Vercel Dashboard** (προτείνεται)
2. 🔄 **Αλλάξε τα nameservers πίσω στο Namecheap** (αν θες να διαχειριστείς DNS από Namecheap)

---

## ✅ Option 1: Add DNS Records in Vercel (Recommended)

### Step 1: Access Vercel DNS

1. Πήγαινε στο [Vercel Dashboard](https://vercel.com/dashboard)
2. Select το project που έχει το domain `newconcierge.app`
3. Πήγαινε στο **Settings → Domains**
4. Κάνε κλικ στο domain `newconcierge.app`
5. Στο tab **DNS Records** (ή **DNS**), θα δεις τα υπάρχοντα records

### Step 2: Add SPF Record

1. Κάνε κλικ **Add Record** (ή **Add DNS Record**)
2. **Type:** `TXT`
3. **Name:** `@` (ή `newconcierge.app` αν δεν επιτρέπει `@`)
4. **Value:** `v=spf1 include:_spf.mailersend.net ~all`
5. **TTL:** 3600 (ή default)
6. Save

### Step 3: Add DKIM Record

1. **Add Record**
2. **Type:** `CNAME`
3. **Name:** `mlsend2._domainkey` (το Vercel προσθέτει αυτόματα το `.newconcierge.app`)
   - **⚠️ Σημαντικό:** Μην βάλεις trailing dot (`.`)
4. **Value/Target:** `mlsend2._domainkey.mailersend.net`
   - **⚠️ Σημαντικό:** Πρέπει να είναι **fully qualified domain name**
   - **Μην βάλεις** trailing dot (`.`)
   - **Μην βάλεις** placeholder όπως `host.example.com`
   - **Βάλε ακριβώς:** `mlsend2._domainkey.mailersend.net`
5. **TTL:** 3600 (ή default)
6. Save

**⚠️ Αν βλέπεις Error "The specified target is not a fully qualified domain name":**
- Έλεγξε ότι το Value/Target είναι: `mlsend2._domainkey.mailersend.net` (χωρίς trailing dot)
- Έλεγξε ότι **δεν** είναι placeholder όπως `host.example.com`
- Έλεγξε ότι έχει το **πλήρες domain name** με `.mailersend.net` στο τέλος

**⚠️ Αν βλέπεις Warning για "Wildcard Domain Override":**
- Το Vercel μπορεί να δείξει warning: "You are about to create a specific record for mlsend2._domainkey, which overrides existing wildcard entries"
- **Αυτό είναι OK** ✅ - Μπορείς να το αγνοήσεις και να συνεχίσεις
- Το MailerSend χρειάζεται το συγκεκριμένο record `mlsend2._domainkey.newconcierge.app`
- **Δεν θα επηρεάσει** τα subdomains σου, γιατί δεν χρησιμοποιείς wildcards για email authentication
- **Continue** ή **Confirm** για να προσθέσεις το record

### Step 4: Add RETURN-PATH Record

1. **Add Record**
2. **Type:** `CNAME`
3. **Name:** `mta` (το Vercel προσθέτει αυτόματα το `.newconcierge.app`)
   - **Ή** `mta.newconcierge.app` αν χρειάζεται full path
4. **Value/Target:** `mailersend.net`
5. **TTL:** 3600 (ή default)
6. Save

### Step 5: Add DMARC Record (Optional)

1. **Add Record**
2. **Type:** `TXT`
3. **Name:** `_dmarc` (το Vercel προσθέτει αυτόματα το `.newconcierge.app`)
   - **Ή** `_dmarc.newconcierge.app` αν χρειάζεται full path
4. **Value:** `v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1`
5. **TTL:** 3600 (ή default)
6. Save

### ⏱️ Wait for Propagation

- Περίμενε 5-30 λεπτά για DNS propagation
- Επαλήθευση με:
  ```bash
  dig TXT newconcierge.app +short
  dig CNAME mlsend2._domainkey.newconcierge.app +short
  dig CNAME mta.newconcierge.app +short
  ```

---

## 🔄 Option 2: Change Nameservers Back to Namecheap

Αν προτιμάς να διαχειριστείς DNS από το Namecheap (για πιο detailed control):

### Step 1: Get Namecheap Nameservers

1. Πήγαινε στο Namecheap Dashboard → Domain List → Manage → **Domain** tab
2. Στο section **Nameservers**, δες τι options έχεις:
   - **Namecheap BasicDNS** (default)
   - **Namecheap PremiumDNS** (αν το έχεις enabled)

**Namecheap BasicDNS nameservers:**
```
dns1.registrar-servers.com
dns2.registrar-servers.com
```

**Ή αν έχεις PremiumDNS:**
```
dns1.p03.nsone.net
dns2.p03.nsone.net
dns3.p03.nsone.net
dns4.p03.nsone.net
```

### Step 2: Change Nameservers in Vercel

1. Πήγαινε στο Vercel Dashboard → Settings → Domains
2. Κάνε κλικ στο domain `newconcierge.app`
3. Remove το domain από το Vercel (προσοχή: αυτό **δεν** θα διαγράψει το domain, απλά θα αφαιρέσει τη σύνδεση με το Vercel project)

**⚠️ Προσοχή:** Αν αφαιρέσεις το domain από το Vercel, το site θα σταματήσει να λειτουργεί μέχρι να προσθέσεις το domain πίσω ή να ρυθμίσεις custom nameservers.

### Step 3: Change Nameservers in Namecheap

1. Πήγαινε στο Namecheap Dashboard → Domain List → Manage → **Domain** tab
2. Στο section **Nameservers**, άλλαξε από **Custom DNS** (Vercel) σε:
   - **Namecheap BasicDNS** (για basic DNS management)
   - **Ή** **Custom DNS** και προσθέστε τα Namecheap nameservers
3. Save changes

### Step 4: Add DNS Records in Namecheap

Μετά την αλλαγή nameservers (μετά από 5-30 λεπτά):

1. Πήγαινε στο **Advanced DNS** tab
2. Πρόσθεσε τα 3-4 records όπως περιγράφεται στο `MAILERSEND_DNS_SETUP_STEP_BY_STEP.md`

### Step 5: Re-add Domain to Vercel (if needed)

Αν χρειάζεται το Vercel deployment:

1. Πήγαινε στο Vercel Dashboard → Settings → Domains
2. **Add Domain** → `newconcierge.app`
3. Πρόσθεσε το DNS record που ζητά το Vercel (συνήθως A ή CNAME record)
4. Ακολούθησε τις οδηγίες του Vercel

---

## 🎯 Recommended Approach

**Προτείνεται:** **Option 1 (Add records στο Vercel)**

**Λόγοι:**
- ✅ Δεν χρειάζεται να αλλάξεις nameservers
- ✅ Το Vercel deployment συνεχίζει να λειτουργεί κανονικά
- ✅ Όλα τα DNS records είναι στο ίδιο μέρος (Vercel Dashboard)
- ✅ Ευκολότερη διαχείριση

**Πότε να επιλέξεις Option 2:**
- Αν χρειάζεσαι πιο advanced DNS features που δεν έχει το Vercel
- Αν προτιμάς να διαχειριστείς όλα τα DNS records από το Namecheap
- Αν έχεις πολλά custom DNS records που είναι πιο εύκολο να διαχειριστείς από το Namecheap

---

## 📋 Complete DNS Records Summary

| # | Type | Name | Value/Target | Where to Add |
|---|------|------|--------------|--------------|
| 1 | TXT | `@` (ή `newconcierge.app`) | `v=spf1 include:_spf.mailersend.net ~all` | Vercel Dashboard |
| 2 | CNAME | `mlsend2._domainkey.newconcierge.app` | `mlsend2._domainkey.mailersend.net` | Vercel Dashboard |
| 3 | CNAME | `mta.newconcierge.app` | `mailersend.net` | Vercel Dashboard |
| 4 | TXT | `_dmarc.newconcierge.app` | `v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1` | Vercel Dashboard |

---

## ✅ Verification

Μετά την προσθήκη των records:

### 1. Verify DNS Records

```bash
# SPF
dig TXT newconcierge.app +short
# Expected: "v=spf1 include:_spf.mailersend.net ~all"

# DKIM
dig CNAME mlsend2._domainkey.newconcierge.app +short
# Expected: mlsend2._domainkey.mailersend.net.

# RETURN-PATH
dig CNAME mta.newconcierge.app +short
# Expected: mailersend.net.

# DMARC
dig TXT _dmarc.newconcierge.app +short
# Expected: "v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1"
```

### 2. Verify in MailerSend Dashboard

1. Πήγαινε στο MailerSend Dashboard → Domains
2. Select `newconcierge.app`
3. Κάνε κλικ **Verify Domain** ή **Re-verify**
4. Ελέγξε το status:
   - ✅ SPF: Verified
   - ✅ DKIM: Verified
   - ✅ Return-Path: Verified
   - ✅ DMARC: Verified (optional)

---

## 🚨 Troubleshooting

### Αν δεν βλέπεις "DNS Records" στο Vercel:

- Έλεγξε αν έχεις access στο domain settings
- Έλεγξε αν το domain είναι συνδεδεμένο με το Vercel project
- Κάνε refresh τη σελίδα

### Αν τα records δεν εμφανίζονται:

1. Περίμενε 5-30 λεπτά (DNS propagation)
2. Clear DNS cache:
   ```bash
   # Linux/Mac
   sudo dscacheutil -flushcache
   
   # Windows
   ipconfig /flushdns
   ```
3. Έλεγξε με διαφορετικό DNS server:
   ```bash
   dig TXT newconcierge.app @8.8.8.8
   ```

### Αν το MailerSend δεν βρίσκει τα records:

1. Περίμενε 30-60 λεπτά (DNS propagation)
2. Κάνε "Re-verify" στο MailerSend Dashboard
3. Έλεγξε τα logs στο MailerSend Dashboard για errors

---

## 📞 Need Help?

Αν έχεις προβλήματα:
1. Έλεγξε τα Vercel DNS records (Dashboard → Domains → DNS)
2. Verify με dig/nslookup commands
3. Χρησιμοποίησε το MXToolbox για verification
4. Επικοινώνησε με το Vercel support ή MailerSend support

