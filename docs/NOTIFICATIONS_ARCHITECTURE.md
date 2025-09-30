# 📬 Notifications System Architecture

## Overview

Comprehensive notification system for building management with support for:
- ✅ Email notifications (primary)
- ✅ SMS notifications (secondary)
- ✅ Bulk sending to all residents
- ✅ Targeted sending to specific apartments
- ✅ Template management
- ✅ Delivery tracking
- ✅ Notification history

## Database Schema

### NotificationTemplate Model
```python
class NotificationTemplate(models.Model):
    """Reusable notification templates"""

    CATEGORY_CHOICES = [
        ('announcement', 'Ανακοίνωση'),
        ('payment', 'Πληρωμή'),
        ('maintenance', 'Συντήρηση'),
        ('meeting', 'Συνέλευση'),
        ('emergency', 'Έκτακτο'),
        ('reminder', 'Υπενθύμιση'),
    ]

    name = models.CharField(max_length=200)  # "Υπενθύμιση Οφειλών"
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    subject = models.CharField(max_length=200)  # Email subject
    body_template = models.TextField()  # με {{placeholders}}
    sms_template = models.TextField(blank=True)  # Shorter version για SMS
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Multi-tenant
    building = models.ForeignKey('buildings.Building', on_delete=models.CASCADE)
```

### Notification Model
```python
class Notification(models.Model):
    """Individual notification record"""

    TYPE_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('both', 'Email & SMS'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Χαμηλή'),
        ('normal', 'Κανονική'),
        ('high', 'Υψηλή'),
        ('urgent', 'Επείγουσα'),
    ]

    # Basic info
    building = models.ForeignKey('buildings.Building', on_delete=models.CASCADE)
    template = models.ForeignKey(NotificationTemplate, null=True, blank=True, on_delete=models.SET_NULL)

    # Content
    subject = models.CharField(max_length=200)
    body = models.TextField()  # Rendered template
    sms_body = models.TextField(blank=True)

    # Metadata
    notification_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='email')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')

    # Sending
    created_by = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)  # For future sending
    sent_at = models.DateTimeField(null=True, blank=True)

    # Statistics
    total_recipients = models.IntegerField(default=0)
    successful_sends = models.IntegerField(default=0)
    failed_sends = models.IntegerField(default=0)
```

### NotificationRecipient Model
```python
class NotificationRecipient(models.Model):
    """Individual recipient tracking"""

    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί'),
        ('sent', 'Στάλθηκε'),
        ('delivered', 'Παραδόθηκε'),
        ('failed', 'Αποτυχία'),
        ('bounced', 'Επιστράφηκε'),
    ]

    notification = models.ForeignKey(Notification, related_name='recipients', on_delete=models.CASCADE)
    apartment = models.ForeignKey('apartments.Apartment', on_delete=models.CASCADE)

    # Contact info (snapshot at send time)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)

    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    # Engagement (optional)
    opened_at = models.DateTimeField(null=True, blank=True)  # Email tracking
    clicked_at = models.DateTimeField(null=True, blank=True)  # Link tracking
```

## API Endpoints

### Templates
```
GET    /api/notifications/templates/           # List templates
POST   /api/notifications/templates/           # Create template
GET    /api/notifications/templates/{id}/      # Get template
PUT    /api/notifications/templates/{id}/      # Update template
DELETE /api/notifications/templates/{id}/      # Delete template
POST   /api/notifications/templates/{id}/preview/  # Preview rendered template
```

### Notifications
```
GET    /api/notifications/                     # List notifications (history)
POST   /api/notifications/                     # Create & send notification
GET    /api/notifications/{id}/                # Get notification details
GET    /api/notifications/{id}/recipients/     # List recipients with status
POST   /api/notifications/{id}/resend/         # Resend to failed recipients
GET    /api/notifications/stats/               # Notification statistics
```

### Bulk Operations
```
POST   /api/notifications/send-bulk/           # Send to all apartments
POST   /api/notifications/send-targeted/       # Send to specific apartments
```

## Email Configuration

### Backend Options

**Option 1: SMTP (Development/Small Scale)**
```python
# settings.py
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
DEFAULT_FROM_EMAIL = 'New Concierge <noreply@newconcierge.gr>'
```

**Option 2: SendGrid (Production - Recommended)**
```python
EMAIL_BACKEND = 'sendgrid_backend.SendgridBackend'
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SENDGRID_SANDBOX_MODE_IN_DEBUG = True

# Benefits:
# - 100 emails/day FREE tier
# - Delivery tracking
# - Bounce handling
# - Professional sender reputation
# - Email analytics
```

**Option 3: AWS SES (High Volume)**
```python
EMAIL_BACKEND = 'django_ses.SESBackend'
AWS_SES_REGION_NAME = 'eu-central-1'
AWS_SES_REGION_ENDPOINT = 'email.eu-central-1.amazonaws.com'

# Benefits:
# - €0.10 per 1000 emails
# - High deliverability
# - Scalable
```

## SMS Configuration

### Provider Options

**Option 1: Twilio (International)**
```python
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = '+302101234567'

# Pricing: ~€0.07/SMS to Greece
# Features: Delivery receipts, two-way SMS
```

**Option 2: Messente (Europe-focused)**
```python
MESSENTE_API_USERNAME = os.environ.get('MESSENTE_API_USERNAME')
MESSENTE_API_PASSWORD = os.environ.get('MESSENTE_API_PASSWORD')

# Pricing: ~€0.05/SMS to Greece
# Features: Bulk SMS, delivery reports
```

**Option 3: Greek SMS Provider (Best for Greece)**
- **SMS.to** - €0.04/SMS
- **Yuboto** - €0.035/SMS
- **Routee** (Greek company) - €0.03-0.05/SMS

## Template System

### Variable Placeholders
```python
AVAILABLE_PLACEHOLDERS = {
    # Building info
    '{{building_name}}': 'Αλκμάνος 22',
    '{{building_address}}': 'Αλκμάνος 22, Αθήνα 116 36',

    # Apartment info
    '{{apartment_number}}': 'Α1',
    '{{apartment_floor}}': '1',
    '{{owner_name}}': 'Γιώργος Παπαδόπουλος',

    # Financial
    '{{balance}}': '€-250.00',
    '{{next_payment_date}}': '01/11/2025',
    '{{payment_amount}}': '€150.00',

    # Dates
    '{{current_date}}': '30/09/2025',
    '{{current_month}}': 'Σεπτέμβριος 2025',

    # Contact
    '{{manager_name}}': 'Μαρία Κωνσταντίνου',
    '{{manager_phone}}': '210 1234567',
    '{{manager_email}}': 'manager@building.gr',
}
```

### Example Templates

**Payment Reminder:**
```
Subject: Υπενθύμιση Οφειλής - {{building_name}}

Αγαπητέ/ή {{owner_name}},

Σας υπενθυμίζουμε ότι το διαμέρισμά σας ({{apartment_number}}) έχει
οφειλή ύψους {{balance}}.

Παρακαλούμε να προβείτε σε τακτοποίηση έως {{next_payment_date}}.

Για οποιαδήποτε διευκρίνιση, επικοινωνήστε μαζί μας:
Τηλέφωνο: {{manager_phone}}
Email: {{manager_email}}

Με εκτίμηση,
Η Διαχείριση
{{building_name}}
```

**SMS Version:**
```
{{building_name}}: Υπενθύμιση οφειλής {{balance}} για διαμ. {{apartment_number}}.
Πληρωμή έως {{next_payment_date}}. Πληροφορίες: {{manager_phone}}
```

**Meeting Announcement:**
```
Subject: Πρόσκληση Γενικής Συνέλευσης - {{building_name}}

Αγαπητοί Ιδιοκτήτες,

Σας καλούμε στη Γενική Συνέλευση της πολυκατοικίας που θα
πραγματοποιηθεί:

📅 Ημερομηνία: {{meeting_date}}
🕐 Ώρα: {{meeting_time}}
📍 Τόπος: {{meeting_location}}

Θέματα Ημερήσιας Διάταξης:
{{agenda_items}}

Η παρουσία σας είναι σημαντική!

Με εκτίμηση,
Η Διαχείριση
```

## Implementation Strategy

### Phase 1: Email Backend (Week 1)
1. Create Django `notifications` app
2. Define models (Template, Notification, NotificationRecipient)
3. Setup email backend (SendGrid recommended)
4. Create basic ViewSets and serializers
5. Test email sending

### Phase 2: Template System (Week 1)
1. Template CRUD operations
2. Variable replacement engine
3. Preview functionality
4. Default template seeding

### Phase 3: Bulk Sending (Week 1.5)
1. Bulk notification creation
2. Recipient selection logic
3. Async sending with Celery
4. Progress tracking

### Phase 4: SMS Integration (Week 2)
1. SMS provider integration (Twilio/Routee)
2. SMS character limit handling
3. SMS delivery tracking
4. Cost estimation

### Phase 5: Frontend UI (Week 2-2.5)
1. Notification history page
2. Send notification form
3. Template management UI
4. Delivery statistics dashboard

### Phase 6: Advanced Features (Week 3+)
1. Scheduled notifications
2. Email open tracking
3. Link click tracking
4. Automatic reminders (overdue payments)
5. Notification preferences per apartment

## Cost Estimation

### Email (SendGrid Free Tier)
```
100 emails/day FREE
= 3,000 emails/month FREE
= Sufficient για 10-20 buildings
```

### SMS (Routee - Greece)
```
€0.035/SMS
10 buildings × 20 apartments = 200 recipients
1 SMS/month = €7/month
4 SMS/month = €28/month
```

### Total Monthly Cost (10 buildings)
```
Email: FREE (SendGrid)
SMS: €7-28 (based on usage)
━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: €7-28/month
```

## Security & Privacy

### GDPR Compliance
- ✅ Store only necessary contact info
- ✅ Allow residents to opt-out of SMS
- ✅ Clear data retention policy
- ✅ Secure credential storage (environment variables)

### Email Best Practices
- ✅ SPF/DKIM/DMARC configuration
- ✅ Unsubscribe links (for non-critical notifications)
- ✅ Rate limiting
- ✅ Bounce handling

### SMS Best Practices
- ✅ Sender ID registration
- ✅ Opt-out keywords (STOP)
- ✅ Time restrictions (9am-9pm)
- ✅ Character optimization (Greek SMS = 70 chars/SMS)

## Testing Strategy

### Unit Tests
- Template rendering
- Variable replacement
- Recipient selection
- Status tracking

### Integration Tests
- Email sending (mock SMTP)
- SMS sending (mock API)
- Bulk operations
- Error handling

### Manual Tests
- Send test email to yourself
- Send test SMS to test number
- Verify delivery tracking
- Check bounce handling

---

**Next Step:** Create Django `notifications` app and define models