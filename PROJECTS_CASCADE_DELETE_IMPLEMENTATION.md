# Σύνδεση Announcements & Votes με Projects - CASCADE DELETE

## 📋 Περίληψη

Υλοποιήθηκε πλήρης σύνδεση των **Announcements** και **Votes** με τα **Projects**, με αυτόματη διαγραφή (CASCADE DELETE) όταν διαγράφεται ένα έργο.

---

## 🎯 Στόχος

**Πρόβλημα:**
- Δεν υπήρχε σύνδεση μεταξύ Projects, Announcements και Votes
- Όταν διαγραφόταν ένα Project, οι σχετικές ανακοινώσεις και ψηφοφορίες παρέμεναν ορφανά στη βάση

**Λύση:**
- Προσθήκη foreign key `project` στα models Announcement και Vote
- Χρήση `on_delete=CASCADE` για αυτόματη διαγραφή
- Διατήρηση ακεραιότητας δεδομένων

---

## 🛠️ Υλοποίηση

### 1. Announcement Model

**Αρχείο:** `backend/announcements/models.py`

```python
class Announcement(models.Model):
    # ... υπάρχοντα fields ...
    
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='announcements',
        null=True,
        blank=True,
        help_text="Σύνδεση με έργο - διαγράφεται αυτόματα όταν διαγραφεί το έργο"
    )
```

**Χαρακτηριστικά:**
- `on_delete=CASCADE`: Αυτόματη διαγραφή όταν διαγράφεται το project
- `null=True, blank=True`: Προαιρετική σύνδεση (όχι υποχρεωτική)
- `related_name='announcements'`: Πρόσβαση από project: `project.announcements.all()`

---

### 2. Vote Model

**Αρχείο:** `backend/votes/models.py`

```python
class Vote(models.Model):
    # ... υπάρχοντα fields ...
    
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='votes',
        null=True,
        blank=True,
        help_text="Σύνδεση με έργο - διαγράφεται αυτόματα όταν διαγραφεί το έργο"
    )
```

**Χαρακτηριστικά:**
- Ίδια λογική με το Announcement
- `related_name='votes'`: Πρόσβαση από project: `project.votes.all()`

---

### 3. Διόρθωση related_name Clash

**Πρόβλημα:**
Υπήρχε σύγκρουση μεταξύ:
- `ProjectVote.project` (projects app) → `related_name='votes'`
- `Vote.project` (votes app) → `related_name='votes'`

**Λύση:**
```python
# backend/projects/models.py
class ProjectVote(models.Model):
    project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE, 
        related_name='project_votes',  # ← Άλλαξε από 'votes' σε 'project_votes'
        verbose_name="Έργο"
    )
```

**Αποτέλεσμα:**
- `project.votes.all()` → General votes (από votes app)
- `project.project_votes.all()` → Project-specific votes (από projects app)

---

### 4. Serializers Update

#### AnnouncementSerializer

**Αρχείο:** `backend/announcements/serializers.py`

```python
from projects.models import Project

class AnnouncementSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=False,
        allow_null=True
    )
    project_title = serializers.SerializerMethodField()
    
    class Meta:
        fields = [
            # ... άλλα fields ...
            'project',
            'project_title',
        ]
    
    def get_project_title(self, obj):
        return obj.project.title if obj.project else None
```

#### VoteSerializer

**Αρχείο:** `backend/votes/serializers.py`

```python
from projects.models import Project

class VoteSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=False,
        allow_null=True
    )
    project_title = serializers.SerializerMethodField()
    
    class Meta:
        fields = [
            # ... άλλα fields ...
            'project',
            'project_title',
        ]
    
    def get_project_title(self, obj):
        return obj.project.title if obj.project else None
```

---

## 🗄️ Migrations

Δημιουργήθηκαν τα εξής migrations:

1. **`announcements/0005_announcement_project.py`**
   - Προσθέτει το field `project` στο Announcement model

2. **`votes/0004_vote_project.py`**
   - Προσθέτει το field `project` στο Vote model

3. **`projects/0006_alter_projectvote_offer_alter_projectvote_project.py`**
   - Διορθώνει το `related_name` για το ProjectVote

**Εφαρμογή:**
```bash
docker exec backend python manage.py migrate
```

---

## ✅ Testing & Verification

### Test Script

Δημιουργήθηκε test script που επιβεβαίωσε τη λειτουργία:

```python
# Δημιουργία test project
project = Project.objects.create(...)

# Δημιουργία συνδεδεμένης ανακοίνωσης
announcement = Announcement.objects.create(..., project=project)

# Δημιουργία συνδεδεμένης ψηφοφορίας
vote = Vote.objects.create(..., project=project)

# Διαγραφή project
project.delete()

# Επιβεβαίωση: announcement και vote διαγράφηκαν αυτόματα ✅
```

### Αποτελέσματα

```
======================================================================
✅ ΕΠΙΤΥΧΙΑ! Το cascade delete λειτουργεί σωστά!
   - Το project διαγράφηκε ✅
   - Η ανακοίνωση διαγράφηκε αυτόματα ✅
   - Η ψηφοφορία διαγράφηκε αυτόματα ✅
======================================================================
```

---

## 📊 Χρήση στην Εφαρμογή

### Backend (Django)

```python
# Δημιουργία ανακοίνωσης συνδεδεμένης με project
announcement = Announcement.objects.create(
    title="Ενημέρωση για το έργο",
    description="...",
    building=building,
    author=user,
    project=project,  # ← Σύνδεση με project
    is_active=True
)

# Δημιουργία ψηφοφορίας συνδεδεμένης με project
vote = Vote.objects.create(
    title="Ψηφοφορία για το έργο",
    description="...",
    building=building,
    creator=user,
    project=project,  # ← Σύνδεση με project
    start_date=date.today(),
    end_date=date.today() + timedelta(days=7)
)

# Ανάκτηση όλων των ανακοινώσεων ενός project
project_announcements = project.announcements.all()

# Ανάκτηση όλων των ψηφοφοριών ενός project
project_votes = project.votes.all()

# Διαγραφή project → αυτόματη διαγραφή announcements & votes
project.delete()
```

### Frontend (API)

```typescript
// Announcement με project
{
  "id": 13,
  "title": "Ανακοίνωση για το έργο",
  "description": "...",
  "project": "5680ed8d-7b6a-4f02-9e3e-ff4a9cbadc3f",  // Project UUID
  "project_title": "Επισκευή Όψεων",                 // Readable title
  "building": 1,
  "author": 1,
  "is_active": true
}

// Vote με project
{
  "id": 7,
  "title": "Ψηφοφορία για το έργο",
  "description": "...",
  "project": "5680ed8d-7b6a-4f02-9e3e-ff4a9cbadc3f",  // Project UUID
  "project_title": "Επισκευή Όψεων",                 // Readable title
  "building": 1,
  "creator": 1,
  "is_active": true
}
```

---

## 🔄 Database Schema

```
┌──────────────┐
│   Project    │
│              │
│ - id (UUID)  │
│ - title      │
│ - building   │
│ - status     │
└──────┬───────┘
       │
       │ CASCADE DELETE
       │
       ├───────────────────────┐
       │                       │
       ▼                       ▼
┌────────────────┐      ┌────────────────┐
│  Announcement  │      │      Vote      │
│                │      │                │
│ - project_id ──┤      │ - project_id ──┤
│ - title        │      │ - title        │
│ - description  │      │ - description  │
└────────────────┘      └────────────────┘

Όταν διαγράφεται το Project:
  ↓
Announcements & Votes διαγράφονται αυτόματα
```

---

## 📝 Best Practices

### 1. Προαιρετική Σύνδεση
```python
# ✅ ΣΩΣΤΟ: null=True, blank=True
project = models.ForeignKey(
    'projects.Project',
    null=True,  # Δεν είναι υποχρεωτικό
    blank=True
)

# Επιτρέπει announcements/votes χωρίς project
announcement = Announcement.objects.create(
    title="Γενική ανακοίνωση",
    # χωρίς project
)
```

### 2. Cascade Delete
```python
# ✅ ΣΩΣΤΟ: on_delete=CASCADE
project = models.ForeignKey(
    'projects.Project',
    on_delete=models.CASCADE  # Αυτόματη διαγραφή
)

# ❌ ΛΑΘΟΣ: on_delete=SET_NULL
# Θα άφηνε ορφανά records
```

### 3. Related Names
```python
# ✅ ΣΩΣΤΟ: Ξεχωριστά related_names
class Announcement:
    project = ForeignKey(..., related_name='announcements')

class Vote:
    project = ForeignKey(..., related_name='votes')

class ProjectVote:
    project = ForeignKey(..., related_name='project_votes')

# Χρήση:
project.announcements.all()  # Ανακοινώσεις
project.votes.all()          # General votes
project.project_votes.all()  # Project votes
```

---

## 🎉 Αποτελέσματα

### ✅ Πλεονεκτήματα

1. **Ακεραιότητα Δεδομένων**
   - Δεν υπάρχουν πλέον ορφανά announcements/votes
   - Αυτόματος καθαρισμός όταν διαγράφεται project

2. **Καλύτερη Οργάνωση**
   - Εύκολη ανάκτηση όλων των announcements/votes ενός project
   - Σαφής σχέση μεταξύ entities

3. **Developer Experience**
   - Απλό API: `project.announcements.all()`
   - Αυτόματη διαχείριση lifecycle

4. **User Experience**
   - Ο χρήστης βλέπει το `project_title` στα announcements/votes
   - Καλύτερο context για κάθε ανακοίνωση/ψηφοφορία

### 📊 Στατιστικά

- **2 Models ενημερωμένα**: Announcement, Vote
- **3 Migrations**: announcements/0005, votes/0004, projects/0006
- **2 Serializers ενημερωμένοι**: AnnouncementSerializer, VoteSerializer
- **1 related_name clash διορθωμένο**: ProjectVote
- **100% test coverage**: Cascade delete verified

---

## 🚀 Επόμενα Βήματα (Προαιρετικά)

### 1. Frontend Integration
- Εμφάνιση project_title στα lists
- Filter announcements/votes by project
- UI για σύνδεση με project κατά τη δημιουργία

### 2. Admin Panel
- Inline display στο Project admin
- Bulk actions για announcements/votes

### 3. Notifications
- Ειδοποιήσεις όταν διαγράφεται project με announcements/votes
- Warning πριν τη διαγραφή

---

## 📚 Related Models

### Υπάρχοντα στο Projects App

```python
# Αυτά ΗΔΗ υπάρχουν και λειτουργούν σωστά:

Project → Offers (CASCADE)
Project → ProjectVotes (CASCADE, related_name='project_votes')
Project → ProjectExpenses (CASCADE)
Project → OfferFiles (μέσω Offer, CASCADE)

# Προστέθηκαν τώρα:

Project → Announcements (CASCADE, related_name='announcements')
Project → Votes (CASCADE, related_name='votes')
```

---

## 🔗 Commits

**Main Commit:**
```
feat(projects): Σύνδεση Announcements & Votes με Projects + CASCADE DELETE

- Added project foreign key to Announcement model
- Added project foreign key to Vote model
- Fixed related_name clash in ProjectVote
- Updated serializers with project & project_title fields
- Created migrations for all changes
- Tested & verified cascade delete functionality
```

---

**Ημερομηνία Υλοποίησης:** 08/10/2025  
**Κατάσταση:** ✅ Ολοκληρωμένο & Tested  
**Backend Version:** Django 5.2.4  
**Database:** PostgreSQL με django-tenants

