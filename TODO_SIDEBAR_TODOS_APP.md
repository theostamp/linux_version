# 📋 TODO Sidebar App - Πλάνο Ανάπτυξης

## 🎯 Στόχος
Δημιουργία νέας εφαρμογής TODOs με πτυσσόμενη sidebar στη δεξιά πλευρά της οθόνης για διαχείριση:
- Προγραμματισμένες συντηρήσεις καυστήρα
- Συνεργεία καθαρισμού
- Ληγμένες πληρωμές
- Γενικές εκκρεμότητες κτιρίου
- Ειδοποιήσεις με εικονίδιο κουδουνάκι

## 📊 Κατάσταση Καθαρισμού Backend
- ✅ **Διαγράφηκαν κενά directories**:
  - `backend/concierge_tasks/` (κενό)
  - `backend/task_manager/` (κενό) 
  - `backend/todos/` (κενό)
  - `backend/activity_stream/` (κενό)
  - `backend/tasks/` (κενό)
- ✅ **Διατηρήθηκε**: `backend/event_calendar/` (κενό αλλά διαθέσιμο για μελλοντική χρήση)

## 🏗️ Αρχιτεκτονική Σχεδίαση

### Backend (Django)
1. **Νέο Django App**: `todo_management`
2. **Models**:
   - `TodoItem` - Βασικό TODO item
   - `TodoCategory` - Κατηγορίες (συντήρηση, καθαρισμός, πληρωμές, κτλ)
   - `TodoTemplate` - Πρότυπα για επαναλαμβανόμενες εργασίες
   - `TodoNotification` - Ειδοποιήσεις
3. **API Endpoints**:
   - `/api/todos/items/` - CRUD operations
   - `/api/todos/items/pending-count/` - Μετρητής εκκρεμοτήτων
   - `/api/todos/categories/` - Κατηγορίες
   - `/api/todos/templates/` - Πρότυπα
   - `/api/todos/notifications/` - Ειδοποιήσεις
   - `/api/todos/items/generate-reminders/` - Δημιουργία υπενθυμίσεων (POST, managers/superusers)
   - `/api/todos/templates/auto-create/` - Αυτόματη δημιουργία από πρότυπα (POST, managers/superusers)
   - `/api/todos/items/sync-financial-overdues/` - Συγχρονισμός ληγμένων οφειλών (POST, managers/superusers)
   - `/api/todos/items/sync-maintenance-schedule/` - Συγχρονισμός προγραμματισμένων συντηρήσεων (POST, managers/superusers)

### Frontend (Next.js + TypeScript)
1. **Νέα πτυσσόμενη sidebar δεξιά**
2. **Components**:
   - `TodoSidebar` - Κύρια πτυσσόμενη sidebar
   - `TodoNotificationBell` - Εικονίδιο κουδουνάκι με badge
   - `TodoItem` - Μεμονωμένο TODO
   - `TodoList` - Λίστα TODOs
   - `TodoForm` - Φόρμα δημιουργίας/επεξεργασίας
   - `TodoCategories` - Διαχείριση κατηγοριών
3. **Hooks**:
   - `useTodos` - React Query για TODOs
   - `useTodoNotifications` - Διαχείριση ειδοποιήσεων

## 🔧 Τεχνικές Απαιτήσεις

### Database Schema
```sql
-- TodoCategory
id, name, icon, color, building_id, created_at, updated_at

-- TodoItem  
id, title, description, category_id, building_id, apartment_id (nullable),
priority (low/medium/high/urgent), status (pending/in_progress/completed),
due_date, created_by_id, assigned_to_id, completed_at, created_at, updated_at

-- TodoTemplate
id, title, description, category_id, frequency (daily/weekly/monthly/yearly),
auto_create, building_id, created_at, updated_at

-- TodoNotification
id, todo_id, user_id, type (due_soon/overdue/completed), 
is_read, created_at
```

### UI/UX Χαρακτηριστικά
- **Θέση**: Δεξιά πλευρά οθόνης, πτυσσόμενη
- **Trigger**: Floating κουδουνάκι με notification badge
- **Width**: ~350-400px όταν ανοιχτή
- **Animations**: Smooth slide-in/out transitions
- **Responsive**: Collapse σε mobile, overlay mode

## 📋 TODO List - Φάσεις Υλοποίησης

### Φάση 1: Backend Setup
- [x] Δημιουργία Django app `todo_management`
- [x] Ορισμός Models (TodoItem, TodoCategory, TodoTemplate, TodoNotification)
- [x] Δημιουργία migrations
- [x] Setup ViewSets και Serializers
- [x] API endpoints configuration
- [x] Προσθήκη στο `TENANT_APPS` στα settings

### Φάση 2: Frontend Core Components
- [x] Δημιουργία `TodoSidebar` component
- [x] Δημιουργία `TodoNotificationBell` component
- [x] Integration στο main layout
- [x] Βασική λειτουργικότητα πτυσσόμενης sidebar

### Φάση 3: TODO Management
- [x] `TodoItem` component
- [x] `TodoList` component  
- [x] `TodoForm` component για δημιουργία/επεξεργασία
- [x] CRUD operations με React Query
- [x] Category management

### Φάση 4: Notifications & Smart Features
- [x] Notification system (badge, λίστες, mark-as-read)
- [x] Due date reminders (endpoint + command)
- [x] Auto-creation από templates (endpoint + command)
- [x] Integration με Financial (λήξεις/οφειλές: sync overdues)
- [x] Integration με Maintenance (προγραμματισμένες συντηρήσεις: sync)
- [x] Tag-based filters & badges (maintenance / financial_overdue)
- [x] Role-based gating για sync triggers (manager/staff/superuser)

### Φάση 5: Advanced Features
- [ ] Recurring tasks από templates
- [ ] Bulk operations
- [ ] Export/Import functionality
- [ ] Analytics & reporting

## 🎨 UI Design Concepts

### TodoNotificationBell
- Position: Fixed, top-right corner
- Badge: Κόκκινο με αριθμό εκκρεμοτήτων
- Animation: Subtle bounce για νέες ειδοποιήσεις
- Click: Opens TodoSidebar

### TodoSidebar
- Width: 380px
- Background: White/Dark mode compatible
- Sections:
  - Header με φίλτρα (All, Pending, Overdue, Today)
  - Quick actions (Add Todo, Templates)
  - Categorized todo lists
  - Footer με settings

### TodoItem Card
- Compact design
- Priority indicators (colors)
- Due date badges
- Quick actions (complete, edit, delete)
- Category icons

## 🔗 Integration Points

### Με υπάρχοντα modules:
1. **Financial**: Auto-create TODOs για ληγμένες πληρωμές — Υλοποιήθηκε
2. **Maintenance**: Προγραμματισμένες συντηρήσεις — Υλοποιήθηκε (sync)
3. **Buildings**: Building-specific TODOs
4. **Apartments**: Apartment-specific tasks
5. **User Requests**: Convert requests to TODOs

### Notification Triggers:
- Νέα ληγμένη πληρωμή → TODO "Επικοινωνία με ένοικο"
- Προγραμματισμένη συντήρηση → TODO "Συντήρηση καυστήρα"
- Νέο αίτημα → TODO "Αξιολόγηση αιτήματος"

## 📱 Mobile Considerations
- Sidebar → Full screen overlay στο mobile
- Touch-friendly interactions
- Swipe gestures για actions
- Responsive typography

## 🚀 Επόμενα Βήματα
1. **Καθαρισμός**: ✅ Completed
2. **Backend Setup**: ✅ Completed
3. **Models & API**: ✅ Database schema & endpoints
4. **Frontend Core**: Βασικά components
5. **Integration**: Financial ✅ (overdues sync), Maintenance ✅ (schedule sync)
6. **Worker**: ✅ Hourly `todo_sync_worker` με env params `TODO_SYNC_*`
7. **Logging**: ✅ JSON logs & timings στη `run_todo_syncs`
8. **Tests**: ✅ Unit tests (services) + API tests (endpoints)

### Προαιρετικά (Next)
- Health/metrics για τον worker (π.χ. Sentry/Prometheus)
- Alerting για ανωμαλίες (π.χ. spikes στα created/skipped)
- Βελτίωση UX: counters ανά φίλτρο, export/analytics

---

**Ημερομηνία Δημιουργίας**: 2024
**Τελευταία Ενημέρωση**: 2025 - Ολοκληρωμένα: Notifications/Reminders/Financial & Maintenance Sync, Worker, Tests, Logging
**Status**: 🟢 In Progress - Έτοιμη λειτουργικότητα, εκκρεμούν προαιρετικά health/metrics/alerting/UX
