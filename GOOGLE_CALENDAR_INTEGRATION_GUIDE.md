# 📅 Google Calendar Integration Guide
**New Concierge Building Management System**

---

## 📋 Επισκόπηση Στρατηγικής

Η ενσωμάτωση Google Calendar στο New Concierge ακολουθεί το **Admin-Centralized Model**: Ο διαχειριστής συνδέει έναν Google λογαριασμό και δημιουργεί/διαχειρίζεται calendars ανά κτίριο, τα οποία μοιράζονται με τους κατοίκους.

### 🎯 **Βασικά Χαρακτηριστικά:**
- **Ένας Admin Google Account** για όλα τα κτίρια
- **Ένα Calendar ανά κτίριο** (π.χ. "Αλκμάνος 22", "Βουλιαγμένης 15")
- **Αυτόματος συγχρονισμός** events από το New Concierge στο Google Calendar
- **Read-only πρόσβαση** για κατοίκους μέσω calendar sharing
- **Native mobile notifications** μέσω Google Calendar app

---

## 🏗️ Αρχιτεκτονική Σχεδίαση

### 📊 **Data Flow:**
```
[New Concierge Events] 
        ↓
[Admin Google Account OAuth]
        ↓  
[Building-Specific Google Calendars]
        ↓
[Auto-share με residents via email]
        ↓
[Native Google Calendar apps]
```

### 🗂️ **Calendar Structure:**
```
Admin Google Account (@buildingmanagement.com)
├── 📅 "Αλκμάνος 22 - Διαχείριση Κτιρίου"
│   ├── 🔧 Maintenance events
│   ├── 💰 Common expense deadlines  
│   ├── 📢 Building meetings
│   └── 🚨 Emergency notices
│
├── 📅 "Βουλιαγμένης 15 - Διαχείριση Κτιρίου"
│   └── ... (ίδια δομή)
│
└── 📅 "Master Admin Calendar" (Private)
    └── Cross-building management tasks
```

---

## 🛠️ Technical Implementation

### 1. **Google Cloud Setup**

#### 📋 **Prerequisites:**
- Google Cloud Project
- Google Calendar API enabled
- OAuth 2.0 Credentials
- Service Account (για server-to-server calls)

#### ⚙️ **Environment Variables:**
```env
# Google Calendar Integration
GOOGLE_CALENDAR_ENABLED=true
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://demo.localhost:8000/auth/google/callback
GOOGLE_SERVICE_ACCOUNT_FILE=path/to/service-account.json

# Admin Account Configuration  
GOOGLE_ADMIN_EMAIL=admin@yourdomain.com
```

### 2. **Backend Implementation**

#### 📦 **Dependencies:**
```bash
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

#### 🔧 **Core Service (`backend/integrations/google_calendar.py`):**
```python
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from django.conf import settings

class GoogleCalendarService:
    def __init__(self, admin_credentials=None):
        self.credentials = admin_credentials
        self.service = build('calendar', 'v3', credentials=self.credentials)
    
    def create_building_calendar(self, building_name, building_id):
        """Δημιουργία calendar για συγκεκριμένο κτίριο"""
        calendar = {
            'summary': f'{building_name} - Διαχείριση Κτιρίου',
            'description': f'Events και ανακοινώσεις για το κτίριο {building_name}',
            'timeZone': 'Europe/Athens'
        }
        
        created_calendar = self.service.calendars().insert(body=calendar).execute()
        
        # Store calendar ID στη database
        building = Building.objects.get(id=building_id)
        building.google_calendar_id = created_calendar['id']
        building.save()
        
        return created_calendar
    
    def sync_event_to_google(self, event, building_calendar_id):
        """Συγχρονισμός event από το New Concierge στο Google Calendar"""
        google_event = {
            'summary': event.title,
            'description': self._format_event_description(event),
            'start': {
                'dateTime': event.scheduled_date.isoformat(),
                'timeZone': 'Europe/Athens'
            },
            'end': {
                'dateTime': event.get_end_time().isoformat(),
                'timeZone': 'Europe/Athens'  
            },
            'colorId': self._get_event_color(event.event_type),
            'extendedProperties': {
                'private': {
                    'new_concierge_id': str(event.id),
                    'building_id': str(event.building_id)
                }
            }
        }
        
        result = self.service.events().insert(
            calendarId=building_calendar_id,
            body=google_event
        ).execute()
        
        # Store Google event ID
        event.google_event_id = result['id']
        event.save()
        
        return result
    
    def share_calendar_with_resident(self, calendar_id, resident_email):
        """Μοίρασμα calendar με κάτοικο (read-only)"""
        rule = {
            'role': 'reader',
            'scope': {
                'type': 'user',
                'value': resident_email
            }
        }
        
        return self.service.acl().insert(
            calendarId=calendar_id,
            body=rule
        ).execute()
```

### 3. **Django Models Extension**

#### 🗃️ **Building Model Update:**
```python
# backend/buildings/models.py
class Building(models.Model):
    # ... existing fields ...
    
    # Google Calendar Integration
    google_calendar_id = models.CharField(max_length=255, blank=True, null=True)
    google_calendar_enabled = models.BooleanField(default=False)
    google_calendar_sync_enabled = models.BooleanField(default=True)
    
    def get_google_calendar_url(self):
        if self.google_calendar_id:
            return f"https://calendar.google.com/calendar/embed?src={self.google_calendar_id}"
        return None
```

#### 📋 **Event Model Update:**
```python
# backend/events/models.py  
class Event(models.Model):
    # ... existing fields ...
    
    # Google Calendar Integration
    google_event_id = models.CharField(max_length=255, blank=True, null=True)
    google_sync_enabled = models.BooleanField(default=True)
    last_google_sync = models.DateTimeField(blank=True, null=True)
```

### 4. **Signal-based Auto-sync**

```python
# backend/events/signals.py
from django.db.models.signals import post_save, post_delete
from .google_calendar import GoogleCalendarService

@receiver(post_save, sender=Event)
def sync_event_to_google_calendar(sender, instance, created, **kwargs):
    """Αυτόματος συγχρονισμός event στο Google Calendar"""
    if not instance.google_sync_enabled:
        return
        
    if not instance.building.google_calendar_enabled:
        return
    
    try:
        service = GoogleCalendarService.get_admin_service()
        
        if created and not instance.google_event_id:
            # Create new Google event
            service.sync_event_to_google(
                instance, 
                instance.building.google_calendar_id
            )
        elif instance.google_event_id:
            # Update existing Google event  
            service.update_google_event(instance)
            
    except Exception as e:
        logger.error(f"Failed to sync event {instance.id} to Google: {e}")

@receiver(post_delete, sender=Event) 
def delete_google_calendar_event(sender, instance, **kwargs):
    """Διαγραφή event από Google Calendar"""
    if instance.google_event_id:
        try:
            service = GoogleCalendarService.get_admin_service()
            service.delete_google_event(
                instance.building.google_calendar_id,
                instance.google_event_id
            )
        except Exception as e:
            logger.error(f"Failed to delete Google event {instance.google_event_id}: {e}")
```

---

## 🎨 Frontend Implementation

### 1. **Admin Panel Integration**

#### ⚙️ **Settings Page Component:**
```typescript
// frontend/components/admin/GoogleCalendarSettings.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function GoogleCalendarSettings({ building }) {
  const [isConnecting, setIsConnecting] = useState(false);
  
  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    
    // Redirect to Google OAuth
    window.location.href = `/api/auth/google?building_id=${building.id}`;
  };
  
  const handleDisconnect = async () => {
    await fetch(`/api/integrations/google-calendar/disconnect`, {
      method: 'POST',
      body: JSON.stringify({ building_id: building.id })
    });
  };
  
  return (
    <div className="space-y-4">
      <h3>📅 Google Calendar Integration</h3>
      
      {building.google_calendar_enabled ? (
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-green-800">
            ✅ Συνδεδεμένο με Google Calendar
          </p>
          <p className="text-sm text-green-600">
            Calendar ID: {building.google_calendar_id}
          </p>
          
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm">
              📋 Προβολή στο Google
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDisconnect}>
              Αποσύνδεση
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-blue-800 mb-4">
            Συνδέστε το κτίριο με Google Calendar για αυτόματο συγχρονισμό των events
          </p>
          
          <Button 
            onClick={handleConnectGoogle}
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? '🔄 Συνδέονται...' : '🔗 Σύνδεση με Google Calendar'}
          </Button>
        </div>
      )}
      
      {/* Sync Settings */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">⚙️ Ρυθμίσεις Συγχρονισμού</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span>Αυτόματος συγχρονισμός νέων events</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span>Συγχρονισμός maintenance events</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span>Συγχρονισμός common expense deadlines</span>
          </label>
        </div>
      </div>
    </div>
  );
}
```

### 2. **Resident Experience**

#### 📱 **Calendar Embed Component:**
```typescript
// frontend/components/calendar/GoogleCalendarEmbed.tsx
export default function GoogleCalendarEmbed({ building }) {
  if (!building.google_calendar_id) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <p>📅 Το ημερολόγιο δεν είναι διαθέσιμο</p>
      </div>
    );
  }
  
  const calendarSrc = `https://calendar.google.com/calendar/embed?src=${building.google_calendar_id}&ctz=Europe/Athens`;
  
  return (
    <div className="w-full h-96">
      <iframe
        src={calendarSrc}
        style={{ border: 0 }}
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
      />
    </div>
  );
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: **Foundation** (Week 1-2)
- [ ] **Google Cloud Project Setup**
  - Enable Google Calendar API
  - Create OAuth 2.0 credentials
  - Setup service account
- [ ] **Backend Core Service**
  - GoogleCalendarService implementation
  - Django models extension
  - Basic API endpoints

### Phase 2: **Admin Experience** (Week 2-3)  
- [ ] **OAuth Flow Implementation**
  - Admin authentication with Google
  - Calendar creation per building
  - Credential storage & management
- [ ] **Admin Panel UI**
  - Google Calendar settings page
  - Connection status display
  - Sync configuration options

### Phase 3: **Auto-sync** (Week 3-4)
- [ ] **Signal-based Sync**
  - Event creation → Google Calendar
  - Event updates → Google Calendar
  - Event deletion → Google Calendar
- [ ] **Sync Management**
  - Sync status tracking
  - Error handling & retry logic
  - Manual sync triggers

### Phase 4: **Resident Experience** (Week 4-5)
- [ ] **Calendar Sharing**
  - Auto-invite residents to building calendar
  - Email invitation management
  - Access control (read-only)
- [ ] **Frontend Integration**
  - Embedded Google Calendar view
  - Calendar access instructions
  - Mobile setup guides

### Phase 5: **Advanced Features** (Week 5-6)
- [ ] **Event Categories & Colors**
  - Color coding by event type
  - Custom event templates
  - Recurring event patterns
- [ ] **Resident Management**
  - Bulk invite/uninvite residents
  - Access level management
  - Calendar preference settings

---

## 👥 User Experience Flows

### 🔧 **Admin Flow:**

1. **Initial Setup:**
   ```
   Admin Panel → Settings → Google Calendar
   → "Connect Google Calendar" button
   → Google OAuth flow
   → Calendar created automatically
   → "Setup Complete" ✅
   ```

2. **Daily Usage:**
   ```
   Create Event in New Concierge
   → Automatic sync to Google Calendar
   → Residents get notification on phone
   → Event visible in Google Calendar apps
   ```

### 👨‍👩‍👧‍👦 **Resident Flow:**

1. **First Time:**
   ```
   Receive email: "You're invited to Αλκμάνος 22 Calendar"
   → Click "Accept invitation"  
   → Calendar appears in Google Calendar
   → Setup phone notifications
   ```

2. **Daily Usage:**
   ```
   Open Google Calendar app
   → See building events alongside personal events
   → Get native notifications for maintenance, meetings
   → Click event for details & links back to New Concierge
   ```

---

## 🔒 Security & Privacy Considerations

### 🛡️ **Data Security:**
- **OAuth Scopes**: Minimum required permissions (calendar read/write only)
- **Credential Storage**: Encrypted storage of refresh tokens
- **API Rate Limits**: Respect Google Calendar API quotas
- **Error Handling**: Graceful degradation when Google is unavailable

### 👤 **Privacy Controls:**
- **Opt-in Only**: Residents choose to connect their Google account
- **Read-only Access**: Residents cannot modify building events
- **Data Retention**: Clear policies on event data in Google
- **Resident Control**: Easy opt-out mechanism

### 🔐 **Access Management:**
- **Admin Permissions**: Only authorized admins can setup integration
- **Building Isolation**: Calendar sharing limited to building residents
- **Email Validation**: Verify resident emails before calendar sharing
- **Audit Logging**: Track all calendar operations

---

## 📊 Success Metrics

### 📈 **Technical KPIs:**
- **Sync Success Rate**: >99% event synchronization
- **Response Time**: <2s for calendar operations
- **Error Rate**: <1% failed sync attempts
- **API Usage**: Within Google Calendar API limits

### 👥 **User Adoption:**
- **Admin Adoption**: % buildings with Google Calendar enabled
- **Resident Participation**: % residents accepting calendar invitations  
- **Mobile Usage**: % events viewed via mobile Google Calendar
- **Engagement**: Reduction in missed maintenance/meetings

---

## 🚨 Troubleshooting Guide

### ⚠️ **Common Issues:**

#### 1. **OAuth Authentication Failures**
```
Error: invalid_grant
Solution: Refresh admin credentials, check system time
```

#### 2. **Calendar Sharing Issues**
```
Error: Calendar not visible to residents  
Solution: Check email addresses, verify sharing permissions
```

#### 3. **Sync Delays**
```
Issue: Events not appearing in Google Calendar
Solution: Check webhook configuration, manual sync trigger
```

#### 4. **Mobile Notification Issues**
```
Issue: Residents not getting notifications
Solution: Guide residents to enable calendar notifications
```

---

## 📞 Support & Maintenance

### 🔧 **Regular Maintenance:**
- **Monthly**: Check Google API quota usage
- **Quarterly**: Review calendar sharing permissions
- **Annually**: Renew OAuth credentials if needed

### 📋 **Monitoring:**
- **Sync Status Dashboard**: Real-time sync health
- **Error Alerting**: Immediate notification of sync failures  
- **Usage Analytics**: Track calendar adoption and usage

### 📖 **Documentation:**
- **Admin Guide**: Step-by-step setup instructions
- **Resident Guide**: How to accept and use building calendar
- **Developer Guide**: API reference and troubleshooting

---

## 🎯 Conclusion

Η ενσωμάτωση Google Calendar στο New Concierge προσφέρει μια seamless εμπειρία που συνδυάζει:

- **Professional Building Management** μέσω του New Concierge
- **Familiar User Experience** μέσω Google Calendar
- **Mobile-first Notifications** για άμεση ενημέρωση
- **Centralized Admin Control** με decentralized user access

Αυτή η αρχιτεκτονική εξασφαλίζει ότι οι κάτοικοι παραμένουν ενημερωμένοι για όλες τις εξελίξεις του κτιρίου τους, ενώ οι διαχειριστές διατηρούν πλήρη έλεγχο του συστήματος.

**🚀 Ready για implementation!**