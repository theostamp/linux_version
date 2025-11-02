# 🔍 MailerSend Email Debugging Guide

## Προβλήματα που εντοπίστηκαν και λύσεις

### 1. **Ασυμφωνία FROM Email**
**Πρόβλημα:** Το `EmailService` χρησιμοποιούσε `DEFAULT_FROM_EMAIL` (noreply@newconcierge.gr) ενώ το MailerSend backend χρησιμοποιούσε `MAILERSEND_FROM_EMAIL` (noreply@newconcierge.app).

**Λύση:** 
- Το `EmailService` τώρα χρησιμοποιεί `MAILERSEND_FROM_EMAIL` αν είναι διαθέσιμο
- Το MailerSend backend τώρα σέβεται το `from_email` που περνάει από το message

### 2. **Ανεπαρκές Logging**
**Πρόβλημα:** Δεν υπήρχαν αρκετά logs για debugging email issues.

**Λύση:**
- Προσθήκη detailed logging στο MailerSend backend
- Logging του message_id από την MailerSend API response
- Logging του from_email που χρησιμοποιείται
- Better error messages με response details

### 3. **Δεν υπήρχε Visibility**
**Πρόβλημα:** Δεν ήταν εύκολο να δούμε τι στέλνεται στο MailerSend API.

**Λύση:**
- Προσθήκη debug logs πριν την αποστολή
- Logging των email data (from, to, subject)
- Logging της API response

## Configuration Checklist

### Environment Variables που χρειάζονται:

```bash
# MailerSend Configuration
MAILERSEND_API_KEY=mlsn.xxxxxxxxxxxxx  # Το API token από MailerSend dashboard
MAILERSEND_FROM_EMAIL=noreply@newconcierge.app  # Verified domain email

# Email Backend
EMAIL_BACKEND=users.mailersend_backend.MailerSendEmailBackend

# Frontend URL (για verification links)
FRONTEND_URL=https://newconcierge.app
```

### Verification στο MailerSend Dashboard:

1. ✅ Domain verified: `newconcierge.app`
2. ✅ API token active
3. ✅ Email stats: Sent = Delivered (0 rejected)

## Testing

### 1. Test MailerSend Configuration

```bash
cd backend
python test_mailersend_diagnosis.py
```

Αυτό θα ελέγξει:
- EMAIL_BACKEND configuration
- MAILERSEND_API_KEY presence
- MAILERSEND_FROM_EMAIL vs DEFAULT_FROM_EMAIL
- Backend initialization
- Test email sending (αν δώσεις TEST_EMAIL env var)

### 2. Test Email Sending

```bash
TEST_EMAIL=your-email@example.com python test_mailersend_diagnosis.py
```

### 3. Check Logs

Στο Railway logs, ψάξε για:
- `MailerSend backend initialized with from_email:`
- `✅ Email sent successfully via MailerSend`
- `Message ID:` - αυτό είναι σημαντικό για tracking στο MailerSend dashboard

## Common Issues

### Issue 1: Email goes to spam
**Solution:**
- Ελέγξτε ότι το domain είναι verified στο MailerSend
- Χρησιμοποιήστε το verified domain email (`noreply@newconcierge.app`)
- Ελέγξτε SPF/DKIM records στο domain

### Issue 2: Email not sent
**Symptoms:** Logs show "MailerSend API error"
**Solution:**
- Ελέγξτε το MAILERSEND_API_KEY
- Ελέγξτε ότι το API token είναι active και έχει permissions
- Ελέγξτε τα logs για detailed error message

### Issue 3: Email sent but not received
**Symptoms:** Logs show success but email not in inbox
**Solution:**
- Check MailerSend dashboard για delivery status
- Check spam folder
- Verify recipient email address
- Check MailerSend delivery logs

## Logging Levels

Για debugging, χρησιμοποιήστε:

```python
# In settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'DEBUG',  # Change to DEBUG for more details
        },
    },
    'loggers': {
        'users.mailersend_backend': {
            'level': 'DEBUG',
        },
        'users.services': {
            'level': 'DEBUG',
        },
    },
}
```

## Next Steps

1. ✅ Deploy τις αλλαγές στο production
2. ✅ Monitor τα logs για 24 ώρες
3. ✅ Ελέγξτε το MailerSend dashboard για delivery rates
4. ✅ Test registration flow end-to-end

## Monitoring

### MailerSend Dashboard Metrics:
- **Sent**: Συνολικό emails που στάλθηκαν
- **Delivered**: Emails που παραδόθηκαν επιτυχώς
- **Rejected**: Emails που απορρίφθηκαν (πρέπει να είναι 0)

### Django Logs να παρακολουθείς:
- `MailerSend backend initialized`
- `✅ Email sent successfully via MailerSend`
- `Message ID:` - για tracking στο MailerSend dashboard
- `❌ MailerSend API error` - αν υπάρχουν errors

## API Response Codes

- **202 Accepted**: Email sent successfully ✅
- **400 Bad Request**: Invalid email data ❌
- **401 Unauthorized**: Invalid API key ❌
- **422 Unprocessable Entity**: Validation error ❌

