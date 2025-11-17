# 🗑️ Διαγραφή Projects - Τεκμηρίωση

**Ημερομηνία**: 17 Νοεμβρίου 2025  
**Feature**: Project Delete Functionality  
**URL**: https://theo.newconcierge.app/projects

---

## 📋 Επισκόπηση

Προστέθηκε δυνατότητα διαγραφής projects με ασφαλή confirmation dialog και ενημέρωση για τις επηρεαζόμενες δαπάνες.

---

## 🎯 Χαρακτηριστικά

### 1. Delete Button

#### Grid View
- Κουμπί στο footer κάθε project card
- Εμφανίζεται μόνο για Admin/Manager
- Κόκκινο χρώμα με Trash2 icon

```tsx
<Button 
  variant="outline" 
  size="sm" 
  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
  onClick={(e) => { 
    e.stopPropagation(); 
    setProjectToDelete(project);
  }}
>
  <Trash2 className="w-4 h-4" />
</Button>
```

#### List View
- Κουμπί δίπλα στο "Προβολή" button
- Ίδιο styling με Grid view
- Stop propagation για να μην ανοίγει το project

### 2. Confirmation Dialog

Το dialog περιλαμβάνει:

#### Περιεχόμενο
- **Τίτλος Project**: Εμφανίζεται ο τίτλος του έργου
- **Προειδοποίηση**: AlertTriangle icon με κίτρινο background
- **Συνέπειες Διαγραφής**:
  - ✅ Οι σχετιζόμενες προσφορές θα **διαγραφούν**
  - ✅ Οι ψηφοφορίες θα **διαγραφούν**
  - ⚠️ Οι δαπάνες που συνδέονται με το έργο θα **παραμείνουν**, αλλά η σύνδεση τους με το έργο θα **διαγραφεί**
- **Final Warning**: "Αυτή η ενέργεια δεν μπορεί να αναιρεθεί!"

#### Κουμπιά
- **Ακύρωση**: Κλείνει το dialog χωρίς αλλαγές
- **Διαγραφή Έργου**: Κόκκινο button που εκτελεί τη διαγραφή
- Loading state: "Διαγραφή..." κατά την εκτέλεση

```tsx
<AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Διαγραφή Έργου</AlertDialogTitle>
      <AlertDialogDescription className="space-y-3">
        {/* Περιεχόμενο */}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>Ακύρωση</AlertDialogCancel>
      <AlertDialogAction onClick={handleDeleteProject} disabled={isDeleting}>
        {isDeleting ? 'Διαγραφή...' : 'Διαγραφή Έργου'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 🔧 Τεχνική Υλοποίηση

### Frontend

#### Hooks & State
```tsx
// State
const [projectToDelete, setProjectToDelete] = useState<any>(null);
const [isDeleting, setIsDeleting] = useState(false);

// Mutation hook (ήδη υπήρχε)
const { delete: deleteProject } = useProjectMutations();
```

#### Delete Handler
```tsx
const handleDeleteProject = async () => {
  if (!projectToDelete) return;
  
  setIsDeleting(true);
  try {
    await deleteProject.mutateAsync(projectToDelete.id);
    setProjectToDelete(null);
    // Auto query invalidation
  } catch (error) {
    console.error('Failed to delete project:', error);
  } finally {
    setIsDeleting(false);
  }
};
```

### Backend

#### API Endpoint
```
DELETE /api/projects/projects/{id}/
```

**Method**: `DELETE`  
**Authentication**: Required  
**Permission**: Admin or Manager  
**Response**: `204 No Content` on success

#### Database Relations

##### Project Model
```python
class Project(models.Model):
    building = models.ForeignKey('buildings.Building', on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    # ... other fields
```

##### Related Models - Cascade Behavior

| Model | Relation | on_delete | Συμπεριφορά |
|-------|----------|-----------|-------------|
| **Offer** | `project` FK | `CASCADE` | ✅ Διαγράφεται |
| **ProjectVote** | `project` FK | `CASCADE` | ✅ Διαγράφεται |
| **ProjectExpense** | `project` FK | `CASCADE` | ✅ Διαγράφεται |
| **Expense** | `project` FK | `SET_NULL` | ⚠️ Παραμένει (project → NULL) |

#### Expense Model (Κρίσιμο!)
```python
class Expense(models.Model):
    # ...
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.SET_NULL,  # ⚠️ SET_NULL όχι CASCADE!
        null=True,
        blank=True,
        related_name='expense'
    )
```

**Γιατί SET_NULL;**
- Οι δαπάνες είναι ιστορικά στοιχεία που δεν πρέπει να διαγράφονται
- Χρειάζονται για λογιστικούς λόγους
- Μετά τη διαγραφή του project, οι δαπάνες παραμένουν με `project=NULL`

---

## 🔒 Ασφάλεια & Δικαιώματα

### Role-Based Access Control
```tsx
{(isAdmin || isManager) && (
  <Button onClick={() => setProjectToDelete(project)}>
    <Trash2 />
  </Button>
)}
```

**Δικαιώματα**:
- ✅ **Admin**: Full access
- ✅ **Manager**: Full access
- ❌ **Resident**: Δεν βλέπει το delete button
- ❌ **Owner**: Δεν βλέπει το delete button

### Confirmation Flow
1. User clicks delete button
2. Dialog ανοίγει με τις προειδοποιήσεις
3. User διαβάζει τις συνέπειες
4. User επιβεβαιώνει ή ακυρώνει
5. Αν επιβεβαιώσει, DELETE request στο backend
6. Success: Query invalidation & UI update
7. Error: Console log (future: user notification)

---

## 🎨 UI/UX Details

### Visual Design

#### Colors
- Delete Button: `text-red-600 hover:text-red-700 hover:bg-red-50`
- Warning Box: `bg-amber-50 border-amber-200`
- AlertTriangle Icon: `text-amber-600`
- Action Button: `bg-red-600 hover:bg-red-700`

#### Spacing & Layout
```tsx
// Grid View Footer
<div className="pt-2 border-t mt-2 flex gap-2">
  <Button className="w-full">Προβολή</Button>
  <Button>Delete</Button>
</div>

// List View
<div className="flex gap-2">
  <Button>Προβολή</Button>
  <Button>Delete</Button>
</div>
```

### States

#### Normal State
- Delete button: Red with hover effect
- Clickable

#### Loading State
- Dialog: "Διαγραφή..." text
- Buttons: Disabled
- Loading indicator (implicit via disabled state)

#### Error State
- Console error log
- Dialog remains open
- User can retry or cancel

---

## 🧪 Testing

### Manual Testing Steps

1. **Προετοιμασία**
   ```
   - Login ως Admin/Manager
   - Navigate to https://theo.newconcierge.app/projects
   - Ensure έχεις τουλάχιστον 1 project
   ```

2. **Grid View Test**
   ```
   - Switch to Grid view
   - Locate delete button στο card footer
   - Click delete button
   - Verify dialog opens
   - Read warnings
   - Test "Ακύρωση" button
   - Test "Διαγραφή Έργου" button
   ```

3. **List View Test**
   ```
   - Switch to List view
   - Locate delete button δίπλα στο "Προβολή"
   - Click delete button
   - Verify dialog opens
   - Test delete functionality
   ```

4. **Database Verification**
   ```sql
   -- Μετά τη διαγραφή:
   
   -- Project διαγράφηκε
   SELECT * FROM projects_project WHERE id = <deleted_id>;
   -- Result: 0 rows
   
   -- Offers διαγράφηκαν
   SELECT * FROM projects_offer WHERE project_id = <deleted_id>;
   -- Result: 0 rows
   
   -- Expenses παραμένουν με NULL project
   SELECT id, title, project_id FROM financial_expense WHERE title LIKE '%<project_title>%';
   -- Result: Rows exist, project_id = NULL
   ```

5. **UI Verification**
   ```
   - Project δεν εμφανίζεται πια στη λίστα
   - Total projects count updated
   - Stats cards updated
   - No console errors
   ```

### Role-Based Testing

| Role | Can See Delete Button | Can Delete |
|------|----------------------|------------|
| Admin | ✅ Yes | ✅ Yes |
| Manager | ✅ Yes | ✅ Yes |
| Resident | ❌ No | ❌ No |
| Owner | ❌ No | ❌ No |

---

## 📊 Database Impact

### Before Delete
```
Project #123
├── Offers: 5
├── Votes: 12
├── ProjectExpenses: 3
└── Linked Expenses: 8 (project_id = 123)
```

### After Delete
```
Project #123: ❌ DELETED
├── Offers: ❌ DELETED (5 rows)
├── Votes: ❌ DELETED (12 rows)
├── ProjectExpenses: ❌ DELETED (3 rows)
└── Linked Expenses: ✅ REMAIN (8 rows, project_id = NULL)
```

---

## 🚨 Γνωστά Ζητήματα & Περιορισμοί

### 1. Orphaned Expenses
**Issue**: Μετά τη διαγραφή, οι δαπάνες δεν έχουν project reference  
**Impact**: Low - Οι δαπάνες εξακολουθούν να εμφανίζονται στις αναφορές  
**Workaround**: Οι δαπάνες παραμένουν λειτουργικές, απλά χωρίς project link

### 2. No Undo
**Issue**: Δεν υπάρχει undo functionality  
**Impact**: High - Permanent deletion  
**Mitigation**: Confirmation dialog με σαφείς προειδοποιήσεις

### 3. No Toast Notifications
**Issue**: Δεν υπάρχει success/error toast notification  
**Impact**: Medium - User δεν έχει visual feedback  
**Future**: Προσθήκη toast library (e.g., react-hot-toast)

---

## 🔮 Μελλοντικές Βελτιώσεις

### Phase 1: Notifications
```tsx
import { toast } from 'react-hot-toast';

// Success
toast.success('Το έργο διαγράφηκε επιτυχώς');

// Error
toast.error('Σφάλμα κατά τη διαγραφή του έργου');
```

### Phase 2: Soft Delete
```python
class Project(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        default_manager = ProjectManager()  # Filters deleted
```

### Phase 3: Bulk Delete
```tsx
const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

// Multi-select UI
// Bulk delete confirmation
```

### Phase 4: Audit Log
```python
class ProjectDeletionLog(models.Model):
    project_id = models.UUIDField()
    project_title = models.CharField(max_length=200)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    deleted_at = models.DateTimeField(auto_now_add=True)
    related_expenses_count = models.IntegerField()
```

---

## 📚 Σχετικά Αρχεία

### Frontend
- `public-app/src/app/(dashboard)/projects/page.tsx` - Main projects page
- `public-app/src/hooks/useProjects.ts` - Projects hook με delete mutation
- `public-app/src/components/ui/dialog.tsx` - AlertDialog component

### Backend
- `backend/projects/models.py` - Project model (line 35)
- `backend/projects/views.py` - ProjectViewSet (line 471)
- `backend/financial/models.py` - Expense model με project FK (line 404)

---

## 🆘 Support & Troubleshooting

### Common Issues

#### 1. Delete button δεν εμφανίζεται
**Cause**: User role δεν είναι Admin/Manager  
**Solution**: Check `useRole()` hook, verify role assignment

#### 2. Dialog δεν ανοίγει
**Cause**: State management issue  
**Solution**: Check `projectToDelete` state, verify onClick handler

#### 3. Delete fails με 403 Forbidden
**Cause**: Backend permission issue  
**Solution**: Check `ProjectPermission` class, verify user role

#### 4. Expenses διαγράφονται (δεν πρέπει!)
**Cause**: Wrong `on_delete` setting  
**Solution**: Verify `Expense.project` has `on_delete=models.SET_NULL`

---

## 📞 Contact

**Developer**: Theo  
**Date**: 17 Νοεμβρίου 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready

---

**Τελευταία Ενημέρωση**: 17 Νοεμβρίου 2025

