# Αυτοματοποιημένες Υπενθυμίσεις Οφειλών

## Περιγραφή

Σύστημα αυτόματης αποστολής εξατομικευμένων υπενθυμίσεων οφειλών σε διαμερίσματα με εκκρεμείς πληρωμές. Κάθε email συμπληρώνεται αυτόματα με τα οικονομικά στοιχεία του συγκεκριμένου διαμερίσματος.

## Χαρακτηριστικά

### ✅ Αυτόματη Συμπλήρωση Πεδίων

Το σύστημα συμπληρώνει αυτόματα:

#### Στοιχεία Διαμερίσματος
- **Αριθμός διαμερίσματος**
- **Όροφος**
- **Όνομα ιδιοκτήτη/ενοίκου**
- **Email επικοινωνίας**
- **Χιλιοστά συμμετοχής** (κοινόχρηστα, θέρμανση, ανελκυστήρας)

#### Οικονομικά Στοιχεία
- **Τρέχον υπόλοιπο** (οφειλή ή πίστωση)
- **Προηγούμενη οφειλή**
- **Δαπάνες τρέχοντος μήνα**
- **Πληρωμές τρέχοντος μήνα**
- **Καθαρό υπόλοιπο μήνα**

#### Ανεξόφλητες Δαπάνες
- **Συνολικό ποσό ανεξόφλητων**
- **Αριθμός ανεξόφλητων δαπανών**
- **Λίστα με λεπτομέρειες** (ημερομηνία, περιγραφή, ποσό)
- **Ημέρες καθυστέρησης**

#### Στοιχεία Κτιρίου
- **Συνολικές δαπάνες κτιρίου**
- **Συνολικά εισπραχθέντα**
- **Ποσοστό είσπραξης**

#### Ημερομηνίες
- **Τρέχων μήνας** (Ιανουάριος, Φεβρουάριος, κλπ)
- **Τρέχον έτος**
- **Προθεσμία πληρωμής**
- **Σημερινή ημερομηνία**

## Χρήση

### 1. Μέσω Management Command (Προτεινόμενο)

#### Βασική Χρήση
```bash
# Αποστολή υπενθυμίσεων σε όλα τα κτίρια
python manage.py send_debt_reminders

# Test mode (χωρίς πραγματική αποστολή)
python manage.py send_debt_reminders --test

# Αποστολή για συγκεκριμένο κτίριο
python manage.py send_debt_reminders --building-id 1
```

#### Προχωρημένες Επιλογές
```bash
# Μόνο διαμερίσματα με οφειλή >100€
python manage.py send_debt_reminders --min-debt 100

# Για συγκεκριμένο μήνα
python manage.py send_debt_reminders --month 2025-11

# Test αποστολή σε συγκεκριμένο email
python manage.py send_debt_reminders --test-email admin@example.com

# Χρήση συγκεκριμένου template
python manage.py send_debt_reminders --template-id 5

# Αποστολή σε όλα τα διαμερίσματα (όχι μόνο με οφειλές)
python manage.py send_debt_reminders --send-to-all

# Δημιουργία default template αν δεν υπάρχει
python manage.py send_debt_reminders --create-template
```

#### Παραδείγματα

```bash
# Test run για να δεις τι θα σταλεί
python manage.py send_debt_reminders --building-id 2 --test

# Αποστολή υπενθυμίσεων για Νοέμβριο 2025
python manage.py send_debt_reminders --month 2025-11 --min-debt 50

# Αποστολή σε συγκεκριμένο tenant schema
python manage.py send_debt_reminders --schema tenant1 --test
```

### 2. Προγραμματισμένη Αυτόματη Αποστολή (Celery)

Μπορείτε να προσθέσετε στο `celery.py` ή στο `settings.py`:

```python
from celery.schedules import crontab

# Celery Beat Schedule
CELERY_BEAT_SCHEDULE = {
    'send-monthly-debt-reminders': {
        'task': 'notifications.tasks.send_monthly_debt_reminders',
        'schedule': crontab(day_of_month='5', hour=10, minute=0),  # Κάθε 5η του μήνα στις 10:00
    },
    'send-weekly-debt-reminders': {
        'task': 'notifications.tasks.send_weekly_debt_reminders',
        'schedule': crontab(day_of_week='monday', hour=9, minute=0),  # Κάθε Δευτέρα 09:00
    },
}
```

## Templates

### Διαθέσιμα Placeholders

Όλα τα παρακάτω placeholders συμπληρώνονται **αυτόματα**:

#### Βασικά Στοιχεία
```
{{apartment_number}}          - Αριθμός διαμερίσματος
{{apartment_floor}}           - Όροφος
{{owner_name}}                - Όνομα ιδιοκτήτη
{{occupant_name}}             - Όνομα ενοίκου
{{building_name}}             - Όνομα κτιρίου
{{building_address}}          - Διεύθυνση κτιρίου
```

#### Ημερομηνίες
```
{{current_month}}             - Ιανουάριος, Φεβρουάριος, κλπ
{{current_month_genitive}}    - Ιανουαρίου, Φεβρουαρίου, κλπ
{{current_year}}              - 2025
{{month_year}}                - 11/2025
{{today_date}}                - 23/11/2025
{{payment_deadline}}          - 10/12/2025
```

#### Οικονομικά
```
{{current_balance}}           - 150.50€
{{current_balance_raw}}       - 150.50 (χωρίς €)
{{previous_balance}}          - 100.00€
{{is_debt}}                   - true/false
{{is_credit}}                 - true/false

{{current_month_expenses}}    - 75.00€
{{current_month_payments}}    - 50.00€
{{current_month_net}}         - 25.00€

{{total_unpaid}}              - 250.00€
{{total_unpaid_raw}}          - 250.00
{{unpaid_count}}              - 5
{{days_overdue}}              - 15

{{building_total_expenses}}   - 5000.00€
{{building_total_collected}}  - 4500.00€
{{building_collection_rate}}  - 90.0%
```

#### Χιλιοστά
```
{{participation_mills}}       - 50
{{heating_mills}}             - 45
{{elevator_mills}}            - 48
```

### Παράδειγμα Template

```
Θέμα: Υπενθύμιση Οφειλών {{current_month_genitive}} {{current_year}} - Διαμ. {{apartment_number}}

Αγαπητέ/ή {{occupant_name}},

Σας ενημερώνουμε για την κατάσταση του λογαριασμού σας:

📊 ΟΙΚΟΝΟΜΙΚΑ ΣΤΟΙΧΕΙΑ:
💰 Τρέχον Υπόλοιπο: {{current_balance}}
📅 Προηγούμενη Οφειλή: {{previous_balance}}

⚠️ ΑΝΕΞΟΦΛΗΤΕΣ ΔΑΠΑΝΕΣ:
Σύνολο: {{total_unpaid}} ({{unpaid_count}} δαπάνες)
Ημέρες Καθυστέρησης: {{days_overdue}} ημέρες

⏰ ΠΡΟΘΕΣΜΙΑ: {{payment_deadline}}

Με εκτίμηση,
{{building_name}}
```

## Δημιουργία Custom Template

### Μέσω Django Admin

1. Πηγαίνετε στο **Admin Panel** → **Notifications** → **Notification Templates**
2. Κάντε κλικ στο **Add Template**
3. Συμπληρώστε:
   - **Name**: "Υπενθύμιση Οφειλών - Προσαρμοσμένο"
   - **Category**: "Reminder"
   - **Building**: Επιλέξτε κτίριο
   - **Subject**: Χρησιμοποιήστε placeholders (π.χ. `{{apartment_number}}`)
   - **Body Template**: Γράψτε το περιεχόμενο με placeholders
4. Αποθηκεύστε

### Μέσω Python Code

```python
from notifications.debt_reminder_service import DebtReminderService
from buildings.models import Building

building = Building.objects.get(id=1)
template = DebtReminderService.create_default_debt_reminder_template(building)
```

## API Endpoints (Προαιρετικό - για μελλοντική υλοποίηση)

### POST /api/notifications/send-debt-reminders/

```json
{
  "building_id": 1,
  "template_id": 5,
  "min_debt_amount": 0.01,
  "target_month": "2025-11",
  "send_to_all": false,
  "test_mode": false
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "total_apartments": 25,
    "emails_sent": 20,
    "emails_failed": 0,
    "total_debt_notified": "3750.50",
    "sent_apartments": [
      {
        "apartment": "A1",
        "email": "owner@example.com",
        "debt": "150.50€"
      }
    ]
  }
}
```

## Ροή Λειτουργίας

1. **Επιλογή Κτιρίου**: Το σύστημα επιλέγει τα κτίρια για αποστολή
2. **Εύρεση Διαμερισμάτων**: Βρίσκει διαμερίσματα με οφειλές (ή όλα αν `send_to_all=True`)
3. **Υπολογισμός Δεδομένων**: Για κάθε διαμέρισμα:
   - Υπολογίζει τρέχον υπόλοιπο
   - Βρίσκει ανεξόφλητες δαπάνες
   - Υπολογίζει ημέρες καθυστέρησης
   - Παίρνει στοιχεία κτιρίου
4. **Rendering Template**: Αντικαθιστά όλα τα placeholders με πραγματικά δεδομένα
5. **Αποστολή Email**: Στέλνει εξατομικευμένο email σε κάθε παραλήπτη
6. **Καταγραφή**: Αποθηκεύει την αποστολή στη βάση δεδομένων
7. **Αναφορά**: Επιστρέφει αναλυτικά αποτελέσματα

## Logging

Το σύστημα καταγράφει:

```
📧 Starting debt reminder campaign for Κτίριο Α
📅 Target month: 11/2025
💰 Minimum debt: 0.01€
🏠 Found 25 apartments to notify
✅ Sent to A1 (owner@example.com) - Debt: 150.50€
❌ Failed to send to B2: No email address
✅ Campaign completed: 20 sent, 5 failed
💰 Total debt notified: 3750.50€
```

## Troubleshooting

### Πρόβλημα: "No email address"
**Λύση**: Ελέγξτε ότι τα διαμερίσματα έχουν `occupant_email` ή `owner_email`

### Πρόβλημα: "Template not found"
**Λύση**: 
```bash
python manage.py send_debt_reminders --create-template
```

### Πρόβλημα: "SMTP Error"
**Λύση**: Ελέγξτε τις ρυθμίσεις email στο `settings.py`:
```python
MAILERSEND_FROM_EMAIL = 'noreply@yourdomain.com'
DEFAULT_FROM_EMAIL = 'noreply@yourdomain.com'
```

### Πρόβλημα: Placeholders δεν αντικαθίστανται
**Λύση**: Βεβαιωθείτε ότι χρησιμοποιείτε τη σωστή σύνταξη: `{{placeholder}}` (όχι `{{ placeholder }}`)

## Best Practices

1. **Test πάντα πρώτα**:
   ```bash
   python manage.py send_debt_reminders --test
   ```

2. **Χρησιμοποιήστε min-debt** για να αποφύγετε spam για μικρά ποσά:
   ```bash
   python manage.py send_debt_reminders --min-debt 10
   ```

3. **Προγραμματίστε την αποστολή** σε κατάλληλη ώρα (π.χ. 10:00 πρωί)

4. **Ελέγχετε τα logs** για αποτυχίες αποστολής

5. **Ενημερώστε τα templates** τακτικά με βάση τα feedback των ενοίκων

## Μελλοντικές Επεκτάσεις

- [ ] SMS υπενθυμίσεις
- [ ] PDF attachments με αναλυτική κατάσταση
- [ ] Multilingual templates (Ελληνικά/Αγγλικά)
- [ ] Conditional content (π.χ. διαφορετικό μήνυμα αν οφειλή >3 μήνες)
- [ ] Rich HTML templates με styling
- [ ] Automatic follow-up reminders
- [ ] Payment link integration

## Συμπέρασμα

Αυτό το σύστημα εξαλείφει την ανάγκη για χειροκίνητη συμπλήρωση πεδίων στα emails υπενθύμισης οφειλών. Όλα τα οικονομικά στοιχεία υπολογίζονται και συμπληρώνονται αυτόματα, εξοικονομώντας χρόνο και εξασφαλίζοντας ακρίβεια.

