# 📧 Email Delivery Troubleshooting Guide

## Πρόβλημα: Emails φαίνονται ως αποσταλμένα στα logs αλλά δεν φτάνουν στο Gmail

### Γρήγοροι Έλεγχοι (6 checks)

#### 1. MailerSend Trial / Επιτρεπόμενοι Παραλήπτες
Στο trial, το MailerSend μπορεί να στέλνει μόνο σε approved recipients.

**Λύση:**
- Πήγαινε στο MailerSend Dashboard → **Settings → Recipients**
- Πρόσθεσε το Gmail σου στους **Allowed recipients**
- Ή κάνε **upgrade** σε paid plan

#### 2. DMARC Setup
Πρέπει να υπάρχει DMARC record στο DNS (μαζί με SPF & DKIM).

**Setup:**
```
Type: TXT
Name: _dmarc.newconcierge.app
Value: v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1
```

**Σημείωση:** Ξεκίνα με `p=none` για να μη ρίχνει απορρίψεις. Όταν λειτουργεί, άλλαξε σε `p=quarantine` ή `p=reject`.

#### 3. From / Return-Path Ευθυγράμμιση
Το `From:` email πρέπει να είναι στο ίδιο domain με DKIM/SPF.

**Τρέχουσα ρύθμιση:**
```python
# backend/settings.py
DEFAULT_FROM_EMAIL = "no-reply@newconcierge.app"  # ✅ Σωστό
# ή
MAILERSEND_FROM_EMAIL = "noreply@newconcierge.app"  # ✅ Σωστό
```

**Ελέγχουμε:**
- Το domain `newconcierge.app` έχει SPF record
- Το domain `newconcierge.app` έχει DKIM (από MailerSend)
- Το `From:` email είναι `@newconcierge.app` (όχι `@resend.dev` ή άλλο domain)

#### 4. Blacklists
Είχες ένδειξη "SEM FRESH LISTED". Δεν είναι συνήθως decisive για Gmail, αλλά βελτίωσε το reputation.

**Λύση:**
- Στείλε αρχικά σε δικούς σου λογαριασμούς που αλληλεπιδρούν (open/click/reply)
- Αποφύγετε spam-like behavior (πολλά emails σε λίγο χρόνο, μη λεζάντες recipients, κλπ)

#### 5. MailerSend Activity Logs
Ελέγχουμε αν το email είναι "Accepted" ή "Delivered" ή "Deferred/Bounced".

**Ελέγχος:**
1. Πήγαινε στο MailerSend Dashboard → **Activity → Emails**
2. Ψάξε το email που έστειλες
3. Δες το status:
   - ✅ **Delivered**: Το email έφτασε στο inbox
   - ⚠️ **Deferred**: Προσωρινή καθυστέρηση, θα ξαναδοκιμάσει
   - ❌ **Bounced**: Το email δεν μπόρεσε να παραδοθεί
   - 🔍 **Accepted**: Το MailerSend δέχτηκε το email (αλλά δεν σημαίνει ότι παραδόθηκε)

**Εάν είναι "Accepted" αλλά όχι "Delivered":**
- Έλεγξε το recipient email (spelling, domain)
- Έλεγξε αν το recipient domain έχει spam filters
- Έλεγξε το MailerSend delivery logs για details

#### 6. Gmail Φάκελοι (Promotions/Spam)
Αν το email φτάνει αλλά πηγαίνει σε **Promotions** ή **Spam**:

**Λύση:**
- Σήμανέ το ως "Not spam" στο Gmail
- Προσθήκη SPF/DKIM/DMARC records (βελτιώνει deliverability)
- Χρησιμοποίησε HTML email με proper structure (δεν μοιάζει με spam)

---

## Δοκιμαστική Αποστολή από Django Shell

```python
# backend/manage.py shell
from django.contrib.auth import get_user_model
from users.services import EmailService

User = get_user_model()
user = User.objects.get(email='your-email@gmail.com')

# Αποστολή verification email
result = EmailService.send_verification_email(user)
print(f"Email sent: {result}")
```

**Ελέγχουμε:**
1. MailerSend logs → Δες αν το email έφτασε στο MailerSend
2. Gmail inbox → Έλεγξε inbox, promotions, spam
3. Gmail search → Ψάξε για "from:no-reply@newconcierge.app"

---

## Backend Configuration Check

### Current Settings (Railway Environment Variables)

```bash
EMAIL_BACKEND="users.mailersend_backend.MailerSendEmailBackend"
MAILERSEND_API_KEY="mlsn.23fd01e8cb447d2fcde5e580e6a1c9ab3e68d59293ab4fc5cea9d237672038d7"
MAILERSEND_FROM_EMAIL="noreply@newconcierge.app"  # ✅ Σωστό domain
DEFAULT_FROM_EMAIL="noreply@newconcierge.app"      # ✅ Σωστό domain (not @resend.dev)
FRONTEND_URL="https://newconcierge.app"
```

**Ελέγχουμε:**
- ✅ `MAILERSEND_FROM_EMAIL` = `noreply@newconcierge.app` (σωστό domain)
- ✅ `DEFAULT_FROM_EMAIL` = `noreply@newconcierge.app` (όχι `@resend.dev`)
- ✅ Δεν υπάρχουν leading spaces στις environment variables

---

## DNS Records Check

### SPF Record
```
Type: TXT
Name: newconcierge.app
Value: v=spf1 include:_spf.mailersend.net ~all
```

### DKIM Record
Πρέπει να ρυθμιστεί από MailerSend Dashboard → Domains → newconcierge.app → DKIM

### DMARC Record (Νέο - Πρέπει να προστεθεί)
```
Type: TXT
Name: _dmarc.newconcierge.app
Value: v=DMARC1; p=none; rua=mailto:dmarc@newconcierge.app; fo=1
```

---

## MailerSend Backend Implementation

Το custom MailerSend backend (`backend/users/mailersend_backend.py`) έχει:
- ✅ Error detection για 202 Accepted με hidden errors
- ✅ Enhanced logging για debugging
- ✅ Proper return value checking (returns False on failure)

**Ελέγχουμε logs για:**
```
✅ Verification email sent successfully to: user@example.com
   From: noreply@newconcierge.app
   Verification URL: https://newconcierge.app/auth/verify-email?token=...
```

Αν δεις:
```
❌ Email backend returned 0 - email NOT sent
   This usually means: missing API key, backend error, or invalid configuration
```

**Λύση:**
- Έλεγξε το `MAILERSEND_API_KEY` (correct, no spaces)
- Έλεγξε το `MAILERSEND_FROM_EMAIL` (correct domain)
- Έλεγξε το MailerSend account status (active, not suspended)

---

## Next Steps

1. **Πρόσθεσε DMARC record** στο DNS (αν δεν υπάρχει)
2. **Έλεγξε MailerSend Activity logs** για delivery status
3. **Στείλε test email** από Django shell
4. **Έλεγξε Gmail** (inbox, promotions, spam)
5. **Έλεγξε blacklists** (Mail-Tester, MXToolbox)

---

## Resources

- [MailerSend Delivery Troubleshooting](https://www.mailersend.com/help/email-delivery-troubleshooting)
- [DMARC Setup Guide](https://www.dmarcanalyzer.com/dmarc-record-setup-guide/)
- [Gmail Delivery Best Practices](https://support.google.com/mail/answer/81126)

