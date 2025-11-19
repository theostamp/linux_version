# Projects & Offers Verification Checklist

## Backend Verification

### ✅ 1. Project Creation → Announcement & Vote

**Steps:**
1. Create new project via API or admin panel
2. Check announcements table:
   ```sql
   SELECT * FROM announcements_announcement 
   WHERE project_id = '<project_id>' 
   ORDER BY created_at DESC LIMIT 1;
   ```
3. Check votes table:
   ```sql
   SELECT * FROM votes_vote 
   WHERE project_id = '<project_id>' 
   ORDER BY created_at DESC LIMIT 1;
   ```

**Expected Results:**
- ✅ Announcement created with title "Νέο Έργο: {project.title}"
- ✅ Vote created with title "Έγκριση Έργου: {project.title}"
- ✅ Vote has correct end_date (general_assembly_date or deadline or None)

**Test Script:** `backend/test_projects_offers_flow.py` (requires database connection)

---

### ✅ 2. Offer Validation

**Test Cases:**

#### 2.1 Missing Required Fields
```bash
POST /api/projects/offers/
{
  "project": 123,
  "amount": 1000
  // Missing contractor_name
}
```
**Expected:** 400 error with field-specific error message

#### 2.2 Negative Amount
```bash
POST /api/projects/offers/
{
  "project": 123,
  "contractor_name": "Test",
  "amount": -100
}
```
**Expected:** 400 error: "Το ποσό πρέπει να είναι μεγαλύτερο από 0."

#### 2.3 Advance Payment > Amount
```bash
POST /api/projects/offers/
{
  "project": 123,
  "contractor_name": "Test",
  "amount": 1000,
  "advance_payment": 1500
}
```
**Expected:** 400 error: "Η προκαταβολή δεν μπορεί να είναι μεγαλύτερη από το συνολικό ποσό."

#### 2.4 Installments Required for Payment Method
```bash
POST /api/projects/offers/
{
  "project": 123,
  "contractor_name": "Test",
  "amount": 1000,
  "payment_method": "installments"
  // Missing installments
}
```
**Expected:** 400 error: "Ο αριθμός δόσεων είναι υποχρεωτικός όταν ο τρόπος πληρωμής είναι 'Δόσεις'."

#### 2.5 Valid Offer
```bash
POST /api/projects/offers/
{
  "project": 123,
  "contractor_name": "Test Contractor",
  "amount": 1000,
  "payment_method": "one_time"
}
```
**Expected:** 201 Created with offer data

**Check Logs:**
- Look for: `"Offer creation attempt by user {user_id}"`
- Look for: `"Offer created successfully: {offer_id}"`

---

### ✅ 3. Offer Approval Flow

**Steps:**
1. Create offer (status: 'submitted')
2. Approve offer via API:
   ```bash
   POST /api/projects/offers/{offer_id}/approve/
   ```
3. Check ScheduledMaintenance:
   ```sql
   SELECT * FROM maintenance_scheduledmaintenance 
   WHERE linked_project_id = '<project_id>';
   ```
4. Check Expenses:
   ```sql
   SELECT * FROM financial_expense 
   WHERE project_id = '<project_id>' 
   ORDER BY date;
   ```

**Expected Results:**
- ✅ Offer status changed to 'accepted'
- ✅ Project status changed to 'approved'
- ✅ Project fields updated: selected_contractor, final_cost, payment_method, installments, advance_payment
- ✅ ScheduledMaintenance created with linked_project
- ✅ Expenses created:
  - If installments > 1: Advance payment + Installment expenses
  - If installments = 1: One-time expense

**Check Logs:**
- Look for: `"Approving offer {offer_id} for project {project_id}"`
- Look for: `"Calling update_project_schedule for project {project_id}"`
- Look for: `"ScheduledMaintenance created for project {project_id}"`
- Look for: `"Advance payment expense created for project {project_id}"`
- Look for: `"Installment expense {i}/{installments} created for project {project_id}"`
- Look for: `"update_project_schedule completed successfully for project {project_id}"`

---

## Frontend Verification

### ✅ 4. Projects Page (`/projects`)

**Check:**
- [ ] Page loads without errors
- [ ] Stats cards show correct numbers:
  - Total projects
  - Active projects
  - Pending offers
  - Approved offers
- [ ] Projects list displays all projects
- [ ] Each project card shows:
  - Title
  - Status badge
  - Estimated/Final cost
  - Deadline
  - Linked offers count
- [ ] Click on project card navigates to `/projects/{id}`
- [ ] "Νέο Έργο" button works
- [ ] "Νέα Προσφορά" button works

**Browser Console:**
- Check for React Query cache keys: `['projects', { building: ... }]`
- Check for no errors

---

### ✅ 5. Offers List Page (`/projects/offers`)

**Check:**
- [ ] Page loads without errors
- [ ] Shows all offers for current building
- [ ] Status filter works (all, submitted, accepted, etc.)
- [ ] Each offer card shows:
  - Contractor name
  - Project title
  - Amount
  - Submission date
  - Status badge
- [ ] "Προβολή" button navigates to offer detail
- [ ] "Έγκριση" button works for submitted offers
- [ ] "Απόρριψη" button works for submitted offers
- [ ] Empty state shows when no offers

**Browser Console:**
- Check for React Query cache keys: `['offers', { building: ..., status: ... }]`
- Check for no errors

---

### ✅ 6. Offer Form (`/projects/offers/new`)

**Check:**
- [ ] Page loads without errors
- [ ] Building selector works
- [ ] Projects dropdown loads and filters by building
- [ ] Form validation:
  - [ ] Project field: Shows error if not selected
  - [ ] Contractor name: Shows error if empty
  - [ ] Amount: Shows error if empty or <= 0
  - [ ] Advance payment: Shows error if > amount
  - [ ] Installments: Shows error if required but missing
- [ ] Submit button disabled when form invalid
- [ ] Submit button shows loading state during submission
- [ ] Success toast appears on successful creation
- [ ] Redirects to project page after creation
- [ ] Error toast appears with backend error message on failure

**Browser Console:**
- Check for: `[New Offer] Payload: {...}`
- Check for no errors

**Network Tab:**
- Check POST request to `/api/projects/offers/`
- Check request payload matches form data
- Check response status (201 for success, 400 for validation errors)

---

### ✅ 7. Cache Invalidation

**Test Flow:**
1. Create offer → Check that offers list updates
2. Approve offer → Check that:
   - Offers list updates
   - Projects list updates (offers count)
   - Financial dashboard updates (if applicable)

**Browser Console:**
- Check for React Query invalidation:
  - `queryClient.invalidateQueries({ queryKey: ['offers'] })`
  - `queryClient.invalidateQueries({ queryKey: ['projects'] })`

---

## Manual Testing Scenarios

### Scenario 1: Complete Flow
1. Create project → Verify announcement & vote created
2. Create offer for project → Verify offer appears in list
3. Approve offer → Verify:
   - ScheduledMaintenance created
   - Expenses created
   - Project status updated
   - Financial dashboard reflects changes

### Scenario 2: Form Validation
1. Try to submit form with missing fields → Verify inline errors
2. Try to submit with invalid data (negative amount, etc.) → Verify backend errors displayed
3. Submit valid form → Verify success

### Scenario 3: Building Filter
1. Switch building → Verify:
   - Projects list updates
   - Offers list updates
   - Only shows data for selected building

---

## Logs to Check

### Backend Logs (Django)
Look for these log messages:

**Offer Creation:**
```
INFO: Offer creation attempt by user {user_id}
INFO: Offer created successfully: {offer_id}
```

**Offer Approval:**
```
INFO: Approving offer {offer_id} for project {project_id}
INFO: Calling update_project_schedule for project {project_id}
INFO: ScheduledMaintenance created for project {project_id}
INFO: Advance payment expense created for project {project_id}
INFO: Installment expense {i}/{installments} created for project {project_id}
INFO: update_project_schedule completed successfully for project {project_id}
INFO: Offer {offer_id} approved successfully
```

**Project Creation:**
```
INFO: update_project_schedule called for project {project_id}
```

### Frontend Logs (Browser Console)
Look for:
- `[New Offer] Payload: {...}`
- React Query cache updates
- No unhandled errors

---

## Known Issues to Verify Fixed

1. ✅ **Building filter in offers queries** - Fixed (now uses buildingId)
2. ✅ **Cache invalidation** - Fixed (invalidates both offers and projects)
3. ✅ **Vote creation** - Fixed (always creates vote for new projects)
4. ✅ **Backend validation** - Enhanced (cross-field validation added)
5. ✅ **Error logging** - Added (detailed logging in OfferViewSet)

---

## Next Steps After Verification

1. If all tests pass → Ready for staging deployment
2. If issues found → Document in `PROJECTS_OFFERS_AUDIT.md` and fix
3. Add automated tests (Cypress/Playwright) for critical flows
4. Add backend DRF tests for validation edge cases



