# ✅ Verify MailerSend DNS Records

## Current DNS Records Status

Με βάση τα records που βλέπεις στο Vercel Dashboard:

| Record | Type | Name | Value | Status |
|--------|------|------|-------|--------|
| SPF | TXT | (no name shown) | `v=spf1 include:_spf.mailersend.net ~all` | ⚠️ Check Name |
| DKIM | CNAME | `mlsend2._domainkey` | `mlsend2._domainkey.mailersend.net.` | ✅ OK |
| RETURN-PATH | CNAME | `mta` | `mailersend.net.` | ✅ OK |
| DMARC | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1` | ✅ OK |

---

## 🔍 Verification Steps

### Step 1: Check SPF Record Name

Το SPF record δεν δείχνει Name. Έλεγξε ότι:

1. **Άνοιξε το SPF record στο Vercel Dashboard**
2. **Ελέγξε το Name field:**
   - Πρέπει να είναι `@` (root domain) **Ή**
   - Πρέπει να είναι `newconcierge.app`
3. **Εάν λείπει το Name**, πρόσθεσε το:
   - **Name:** `@` ή `newconcierge.app`
   - **Type:** `TXT`
   - **Value:** `v=spf1 include:_spf.mailersend.net ~all`

---

### Step 2: Verify DNS Records (Command Line)

Μετά από 5-10 λεπτά για DNS propagation, δοκίμασε:

```bash
# SPF Check
dig TXT newconcierge.app +short
# Expected: "v=spf1 include:_spf.mailersend.net ~all"

# DKIM Check
dig CNAME mlsend2._domainkey.newconcierge.app +short
# Expected: mlsend2._domainkey.mailersend.net. (με trailing dot είναι OK)

# RETURN-PATH Check
dig CNAME mta.newconcierge.app +short
# Expected: mailersend.net. (με trailing dot είναι OK)

# DMARC Check
dig TXT _dmarc.newconcierge.app +short
# Expected: "v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1"
```

---

### Step 3: Verify in MailerSend Dashboard

1. **Πήγαινε στο MailerSend Dashboard** → Domains
2. **Select `newconcierge.app`**
3. **Κάνε κλικ "Verify Domain"** ή **"Re-verify"**
4. **Ελέγξε το status:**
   - ✅ **SPF:** Verified (πράσινο)
   - ✅ **DKIM:** Verified (πράσινο)
   - ✅ **Return-Path:** Verified (πράσινο)
   - ✅ **DMARC:** Verified (πράσινο, optional)

---

## ⚠️ Notes About Trailing Dots

Παρατήρησα ότι τα CNAME records έχουν trailing dot (`.`):
- `mailersend.net.` ✅ OK
- `mlsend2._domainkey.mailersend.net.` ✅ OK

**Αυτό είναι συνήθως OK** - το trailing dot στο DNS σημαίνει "fully qualified domain name" και είναι valid.

**Αν το MailerSend δεν βρίσκει τα records:**
1. Περίμενε 10-30 λεπτά (DNS propagation)
2. Κάνε "Re-verify" στο MailerSend Dashboard
3. Αν ακόμα δεν λειτουργεί, δοκίμασε να αφαιρέσεις το trailing dot (αν το Vercel το επιτρέπει)

---

## 📋 Verification Checklist

- [ ] SPF record έχει Name field (`@` ή `newconcierge.app`)
- [ ] DKIM record value: `mlsend2._domainkey.mailersend.net.` (με trailing dot είναι OK)
- [ ] RETURN-PATH record value: `mailersend.net.` (με trailing dot είναι OK)
- [ ] DMARC record value: σωστό
- [ ] Περίμενε 10-30 λεπτά για DNS propagation
- [ ] Επαλήθευση με dig/nslookup commands
- [ ] Verify στο MailerSend Dashboard → Domains → Verify Domain
- [ ] Test email αποστολή από Django shell

---

## 🚨 Troubleshooting

### Αν το MailerSend δεν βρίσκει τα records:

1. **Έλεγξε DNS propagation:**
   ```bash
   dig TXT newconcierge.app +short
   dig CNAME mlsend2._domainkey.newconcierge.app +short
   ```
   
2. **Έλεγξε ότι τα records υπάρχουν:**
   - Vercel Dashboard → Domains → DNS Records
   - Βεβαιώσου ότι όλα τα 4 records είναι εκεί

3. **Clear DNS cache:**
   ```bash
   # Linux/Mac
   sudo dscacheutil -flushcache
   
   # Windows
   ipconfig /flushdns
   ```

4. **Χρησιμοποίησε διαφορετικό DNS server:**
   ```bash
   dig TXT newconcierge.app @8.8.8.8  # Google DNS
   dig TXT newconcierge.app @1.1.1.1  # Cloudflare DNS
   ```

5. **Re-verify στο MailerSend Dashboard:**
   - Κάνε "Re-verify" ή "Refresh" στο MailerSend Dashboard
   - Περίμενε 1-2 λεπτά
   - Έλεγξε το status

---

## ✅ Next Steps

1. ✅ **Ελέγξε το SPF record Name** (πρέπει να είναι `@` ή `newconcierge.app`)
2. ⏳ **Περίμενε 10-30 λεπτά** για DNS propagation
3. 🔍 **Verify με dig commands** (παραπάνω)
4. ✅ **Verify στο MailerSend Dashboard** → Domains → Verify Domain
5. 📧 **Test email αποστολή** από Django shell
6. 📊 **Έλεγξε στο Mail-Tester** για SPF/DKIM/DMARC scores

---

## 🎯 Expected Results

Μετά την επιτυχή verification:

- ✅ **MailerSend Dashboard:** Όλα τα records Verified (πράσινο)
- ✅ **DNS Lookup:** Όλα τα records εμφανίζονται σωστά
- ✅ **Email Delivery:** Emails φτάνουν στο Gmail inbox (όχι spam)
- ✅ **Mail-Tester Score:** 8-10/10 για SPF/DKIM/DMARC

