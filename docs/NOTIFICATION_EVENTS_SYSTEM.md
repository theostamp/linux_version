# Notification Events System

## 📋 Επισκόπηση Συστήματος

Το **Notification Events System** καταγράφει αυτόματα όλα τα σημαντικά γεγονότα της πολυκατοικίας και τα μετατρέπει σε ειδοποιήσεις email (digest) για τους κατοίκους.

### Βασική Ιδέα

1. **Auto-Tracking**: Κάθε σημαντικό γεγονός (ανακοίνωση, φύλλο κοινοχρήστων, κλπ) δημιουργεί αυτόματα ένα `NotificationEvent`
2. **Pending Queue**: Τα events συσσωρεύονται σε μια "pending" λίστα
3. **Digest Emails**: Ο διαχειριστής στέλνει περιοδικά (π.χ. εβδομαδιαία) ένα **digest email** με όλα τα νέα events
4. **Monthly Reminders**: Κάθε μήνα (1η-2η) εμφανίζεται modal για αποστολή κοινοχρήστων

---

## 🔧 Backend Architecture

### Models

#### NotificationEvent
```python
class NotificationEvent(models.Model):
    """Καταγραφή γεγονότων για digest emails"""

    EVENT_TYPE_CHOICES = [
        ('announcement', 'Ανακοίνωση'),
        ('vote', 'Ψηφοφορία'),
        ('maintenance', 'Συντήρηση'),
        ('project', 'Έργο'),
        ('common_expense', 'Κοινόχρηστα'),
        ('urgent', 'Επείγουσα'),
        ('meeting', 'Συνέλευση'),
        ('general', 'Γενικό'),
    ]

    event_type = CharField(choices=EVENT_TYPE_CHOICES)
    building = ForeignKey(Building)
    title = CharField(max_length=255)
    description = TextField()
    url = CharField()  # Link to detail page
    icon = CharField()  # Emoji (e.g., 📢, 💰, 🔧)

    # Tracking
    included_in_digest = BooleanField(default=False)
    sent_immediately = BooleanField(default=False)
    is_urgent = BooleanField(default=False)
```

### Services

#### NotificationEventService
```python
# Create event manually or via signals
NotificationEventService.create_event(
    event_type='announcement',
    building=building,
    title="Νέα Ανακοίνωση",
    description="...",
    url="/announcements/123",
    is_urgent=False,
)

# Get pending events
events = NotificationEventService.get_pending_events(building, since_date)

# Group by type
grouped = NotificationEventService.group_events_by_type(events)
```

#### DigestService
```python
# Preview digest email (HTML)
preview = DigestService.get_digest_preview(building, since_date)
# Returns: { subject, body (HTML), event_count, events_by_type }

# Send digest to all residents
notification = DigestService.send_digest(building, user, since_date)
# Sends HTML email to all apartments
# Marks events as "included_in_digest"
```

### Signal Handlers

#### Announcements (announcements/signals.py)
```python
@receiver(post_save, sender=Announcement)
def announcement_created_or_published(sender, instance, created, **kwargs):
    if created and instance.published and instance.building:
        NotificationEventService.create_event(
            event_type='announcement',
            building=instance.building,
            title=f"Νέα Ανακοίνωση: {instance.title}",
            description=instance.description[:500],
            url=f"/announcements/{instance.id}",
            is_urgent=instance.is_urgent,
            icon='📢' if not instance.is_urgent else '🚨'
        )
```

#### Common Expenses (financial/signals.py)

#### Votes (votes/signals.py)
```python
@receiver(post_save, sender=Vote)
def create_notification_event_for_vote(sender, instance, created, **kwargs):
    if created and instance.is_active and instance.building:
        NotificationEventService.create_event(
            event_type='vote',
            building=instance.building,
            title=f"Νέα Ψηφοφορία: {instance.title}",
            description=f"{instance.description[:300]}... Ψηφίστε μέχρι {end_date}",
            url=f"/votes/{instance.id}",
            is_urgent=instance.is_urgent,
            icon='🗳️' if not instance.is_urgent else '🚨',
            event_date=instance.end_date,
            related_vote_id=instance.id,
        )
```
```python
@receiver(post_save, sender=CommonExpensePeriod)
def create_notification_event_for_common_expenses(sender, instance, created, **kwargs):
    if created:
        NotificationEventService.create_event(
            event_type='common_expense',
            building=instance.building,
            title=f"Νέο Φύλλο Κοινοχρήστων: {instance.period_name}",
            description=f"Συνολικά έξοδα: {instance.total_expenses:.2f}€",
            url=f"/financial/common-expenses/{instance.id}",
            icon='💰',
        )
```

### API Endpoints

```
GET    /api/notifications/events/                      # List all events
GET    /api/notifications/events/pending/?building_id=1  # Pending events
POST   /api/notifications/events/digest_preview/        # Preview digest
POST   /api/notifications/events/send_digest/           # Send digest email
```

---

## 💻 Frontend Architecture

### Types (types/notifications.ts)
```typescript
export interface NotificationEvent {
  id: number;
  event_type: NotificationEventType;
  event_type_display: string;
  building: number;
  title: string;
  description: string;
  url: string;
  icon: string;
  created_at: string;
  is_pending: boolean;
  included_in_digest: boolean;
  sent_immediately: boolean;
  is_urgent: boolean;
}

export interface PendingEventsResponse {
  count: number;
  events: NotificationEvent[];
  events_by_type: Record<string, number>;
}

export interface DigestPreview {
  subject: string;
  body: string;  // HTML
  event_count: number;
  events_by_type: Record<string, number>;
}
```

### Hooks (hooks/useNotificationEvents.ts)

```typescript
// Get all events
const { data: events } = useNotificationEvents({ building: buildingId });

// Get pending events (auto-refresh every minute)
const { data: pending } = usePendingEvents(buildingId);

// Preview digest
const previewMutation = useDigestPreview();
const preview = await previewMutation.mutateAsync({ building_id: 1 });

// Send digest
const sendMutation = useSendDigest();
await sendMutation.mutateAsync({ building_id: 1 });

// Check if pending
const { hasPending, count } = useHasPendingEvents(buildingId);
```

### Components

#### DigestPreviewWidget
```tsx
// Shows pending events with count
// Buttons: "Προεπισκόπηση" and "Αποστολή Digest"
// Preview modal with HTML email preview
<DigestPreviewWidget />
```

#### MonthlyTaskReminderModal
```tsx
// Shows on 1st-2nd of month
// Reminds to send common expenses
// Dismisses to localStorage (reappears next day if not sent)
<MonthlyTaskReminderModal tasks={pendingTasks} open={show} onClose={handleClose} />
```

---

## 📊 User Flows

### Flow 1: Auto Event Creation
```
User creates announcement
  ↓
Signal fires: announcement_created_or_published
  ↓
NotificationEvent created (pending)
  ↓
Shows in DigestPreviewWidget with count badge
```

### Flow 2: Send Digest Email
```
Admin opens dashboard
  ↓
Sees "Εκκρεμείς Ειδοποιήσεις (3)" in widget
  ↓
Clicks "Προεπισκόπηση"
  ↓
Modal shows HTML preview with grouped events
  ↓
Clicks "Αποστολή Τώρα"
  ↓
Digest email sent to all residents
  ↓
Events marked as "included_in_digest"
  ↓
Pending count resets to 0
```

### Flow 3: Monthly Common Expenses
```
1st-2nd of month
  ↓
MonthlyTaskReminderModal appears
  ↓
Admin chooses:
  - "Αποστολή σε Όλα" → Sends to all buildings
  - "Επιλογή Κτιρίων" → Navigate to send page
  - "Υπενθύμιση Αύριο" → Dismiss (reappears tomorrow)
  ↓
If sent: localStorage cleared, modal won't reappear this month
```

---

## 🎯 Supported Event Types

| Event Type | Icon | Source | Auto-Created? |
|-----------|------|--------|---------------|
| `announcement` | 📢 | Announcements | ✅ Yes (signal) |
| `common_expense` | 💰 | CommonExpensePeriod | ✅ Yes (signal) |
| `vote` | 🗳️ | Votes | ❌ Manual (TODO) |
| `maintenance` | 🔧 | Maintenance | ❌ Manual (TODO) |
| `project` | 🏗️ | Projects | ❌ Manual (TODO) |
| `urgent` | 🚨 | Any | ✅ Flag on create |
| `meeting` | 👥 | Meetings | ❌ Manual (TODO) |
| `general` | ℹ️ | Manual | ❌ Manual |

---

## 🔄 Adding New Event Types

### Step 1: Add Signal Handler

```python
# Example: votes/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Vote

@receiver(post_save, sender=Vote)
def create_notification_event_for_vote(sender, instance, created, **kwargs):
    if created and instance.is_active:
        from notifications.services import NotificationEventService

        NotificationEventService.create_event(
            event_type='vote',
            building=instance.building,
            title=f"Νέα Ψηφοφορία: {instance.title}",
            description=f"Ψηφίστε μέχρι {instance.end_date.strftime('%d/%m/%Y')}",
            url=f"/votes/{instance.id}",
            icon='🗳️',
            event_date=instance.end_date,
        )
```

### Step 2: Enable Signals in apps.py

```python
# votes/apps.py
class VotesConfig(AppConfig):
    name = 'votes'

    def ready(self):
        import votes.signals  # noqa: F401
```

---

## 📧 Digest Email Format

### HTML Email Structure
```html
<html>
  <body>
    <h2>Ενημέρωση Πολυκατοικίας</h2>
    <p><strong>Αλκμάνος 22</strong></p>
    <p>Τα τελευταία νέα της πολυκατοικίας:</p>

    <h3>📢 Ανακοινώσεις (2)</h3>
    <ul>
      <li>
        <strong><a href="http://demo.localhost:3000/announcements/1">Συντήρηση Ασανσέρ</a></strong>
        <span>(02/10/2025)</span><br>
        <span>Προγραμματισμένη συντήρηση για...</span>
      </li>
    </ul>

    <h3>💰 Κοινόχρηστα (1)</h3>
    <ul>
      <li>
        <strong><a href="http://demo.localhost:3000/financial/common-expenses/5">Φύλλο Κοινοχρήστων 10/2025</a></strong>
        <span>(01/10/2025)</span><br>
        <span>Συνολικά έξοδα: 1,234.56€</span>
      </li>
    </ul>

    <hr>
    <p>Με εκτίμηση,<br>Διαχείριση Κτιρίου</p>
  </body>
</html>
```

---

## 🚀 Deployment Checklist

- [x] Backend models created and migrated
- [x] Backend services implemented
- [x] API endpoints tested
- [x] Signal handlers for announcements ✅
- [x] Signal handlers for common expenses ✅
- [x] Signal handlers for votes ✅
- [ ] Signal handlers for maintenance (TODO)
- [x] Frontend types defined
- [x] Frontend hooks implemented
- [x] DigestPreviewWidget created
- [x] MonthlyTaskReminderModal integrated
- [x] Dashboard layout integration

---

## 📝 Future Enhancements

1. **Scheduled Digests**: Automatic weekly/monthly digests (cron job)
2. **Email Templates**: Customizable HTML templates for different event types
3. **User Preferences**: Per-user digest frequency settings
4. **SMS Support**: Optional SMS notifications for urgent events
5. **Push Notifications**: Web push notifications for real-time alerts
6. **Event Categories**: Group events by importance/category
7. **Read Receipts**: Track which residents opened the digest

---

## 🐛 Troubleshooting

### Events not being created automatically
1. Check signal handlers are imported in `apps.py`
2. Verify `django.setup()` includes signal registration
3. Check backend logs for signal errors

### Digest not sending
1. Verify email backend is configured (check `settings.py`)
2. Check pending events exist: `GET /api/notifications/events/pending/`
3. Check building has apartments with email addresses

### Monthly modal not appearing
1. Clear localStorage: `localStorage.clear()`
2. Check date is 1st or 2nd of month
3. Verify `MonthlyNotificationTask` exists for current month

---

## 📚 Related Documentation

- [NOTIFICATIONS_ARCHITECTURE.md](./NOTIFICATIONS_ARCHITECTURE.md) - Full notification system
- [CLAUDE.md](../CLAUDE.md) - Project overview
- [API Documentation](./API.md) - API endpoints reference

---

**Last Updated**: October 2025
**Status**: ✅ Production Ready
