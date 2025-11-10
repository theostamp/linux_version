# Automatic Announcement Hiding

## Overview

Το σύστημα αυτόματα αποκρύπτει (sets `is_active=False`) ανακοινώσεις που δεν είναι πλέον σχετικές:

1. **Ανακοινώσεις Προσφορών** - Όταν επιλεγεί μία προσφορά
2. **Ανακοινώσεις Γενικών Συνελεύσεων** - Όταν περάσει η ημερομηνία

## Implementation

### 1. Signal-Based Auto-Hide (Real-time)

**File:** `projects/signals.py`

#### Offer Announcements
Όταν μια προσφορά γίνει `accepted`, όλες οι ανακοινώσεις προσφορών για το ίδιο έργο απενεργοποιούνται:

```python
@receiver(post_save, sender=Offer)
def sync_offer_todo(sender, instance: Offer, created, **kwargs):
    # Απενεργοποίηση όλων των ανακοινώσεων προσφορών όταν επιλεγεί μία
    if not created and instance.status == 'accepted':
        deactivate_offer_announcements(instance.project)
```

**Λειτουργία:**
- Αναζήτηση όλων των ανακοινώσεων με τίτλο `"Νέα Προσφορά για: {project.title}"`
- Ενημέρωση `is_active=False` για όλες
- Αποστολή WebSocket event για real-time UI update

#### General Assembly Announcements
Όταν ενημερώνεται ένα έργο, ελέγχεται αν η ημερομηνία της συνέλευσης έχει περάσει:

```python
@receiver(post_save, sender=Project)
def sync_project_todo(sender, instance: Project, created, **kwargs):
    if instance.general_assembly_date:
        # Απενεργοποίηση ανακοίνωσης αν η ημερομηνία έχει περάσει
        deactivate_assembly_announcement(instance)
```

**Λειτουργία:**
- Έλεγχος αν `general_assembly_date < today`
- Αναζήτηση ανακοινώσεων με `end_date=general_assembly_date`
- Ενημέρωση `is_active=False`
- Αποστολή WebSocket event

### 2. Management Command (Scheduled)

**File:** `announcements/management/commands/cleanup_expired_announcements.py`

**Command:** `python manage.py cleanup_expired_announcements`

Απενεργοποιεί όλες τις ανακοινώσεις Γενικών Συνελεύσεων που έχουν ημερομηνία λήξης στο παρελθόν.

**Setup Cron Job:**
```bash
# Run daily at 2:00 AM
0 2 * * * docker exec linux_version-backend-1 python manage.py cleanup_expired_announcements
```

**Ή με Django Celery Beat:**
```python
# celerybeat-schedule.py
CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-announcements': {
        'task': 'announcements.tasks.cleanup_expired_announcements',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2:00 AM
    },
}
```

## Testing

**Test Script:** `backend/test_announcement_auto_hide.py`

```bash
# Copy to Docker
docker cp backend/test_announcement_auto_hide.py linux_version-backend-1:/app/

# Run tests
docker exec linux_version-backend-1 python /app/test_announcement_auto_hide.py
```

**Expected Output:**
```
✅ TEST 1 PASSED: All offer announcements were deactivated
✅ TEST 2 PASSED: Assembly announcement was deactivated
✅ TEST 3 PASSED: Management command deactivated past announcement
```

## Database Queries

### Find Active Offer Announcements for a Project
```python
from announcements.models import Announcement

offer_announcements = Announcement.objects.filter(
    building=project.building,
    title__icontains=f"Νέα Προσφορά για: {project.title}",
    is_active=True
)
```

### Find Past Assembly Announcements
```python
from django.utils import timezone

past_assemblies = Announcement.objects.filter(
    title__icontains="Σύγκληση Γενικής Συνέλευσης",
    end_date__lt=timezone.now().date(),
    is_active=True
)
```

## WebSocket Events

Όταν ανακοινώσεις απενεργοποιούνται, στέλνεται WebSocket event για real-time updates:

```python
publish_building_event(
    building_id=project.building_id,
    event_type="announcements.updated",
    payload={
        "message": "Απενεργοποιήθηκαν N ανακοινώσεις",
        "project_id": str(project.id),
    },
)
```

**Frontend Handling:**
```typescript
// Listen for announcement updates
useEffect(() => {
  const socket = /* WebSocket connection */;

  socket.on('announcements.updated', (data) => {
    // Refetch announcements
    queryClient.invalidateQueries(['announcements']);
  });
}, []);
```

## Business Logic

### Why Auto-Hide?

1. **User Experience** - Residents don't need to see old/irrelevant announcements
2. **Data Quality** - Keeps announcement list focused on current events
3. **Compliance** - Greek building management regulations require timely communication

### When NOT to Auto-Hide

- **Manual Announcements** - Created by admins without project association
- **Evergreen Content** - Building rules, contact info, etc.
- **Important Updates** - Critical maintenance warnings

## Future Enhancements

1. **Soft Delete vs Hard Delete** - Consider archiving instead of just `is_active=False`
2. **Auto-Reactivate** - If assembly date changes to future, reactivate announcement
3. **Notification** - Email admins when announcements are auto-hidden
4. **Analytics** - Track which announcements get hidden and when

## Related Files

- `projects/signals.py` - Signal handlers for auto-hide
- `projects/models.py` - Project, Offer models
- `announcements/models.py` - Announcement model
- `announcements/management/commands/cleanup_expired_announcements.py` - Cleanup command
- `test_announcement_auto_hide.py` - Test script

## Audit Trail

**Created:** 2025-10-03
**Tested:** ✅ All tests passing
**Production:** Ready for deployment
