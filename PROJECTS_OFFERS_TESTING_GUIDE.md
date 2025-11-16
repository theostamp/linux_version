# Projects & Offers Testing Guide

## Quick Start

### Backend Tests (Requires Database)

```bash
cd backend
source venv/bin/activate
python test_projects_offers_flow.py
```

**Note:** Requires PostgreSQL database connection. If database is not available locally, use staging/production environment.

---

## Frontend Manual Testing

### 1. Test Project Creation Flow

**URL:** `/projects/new`

**Steps:**
1. Fill in project form
2. Submit
3. Check:
   - Redirects to `/projects`
   - New project appears in list
   - Check announcements page → Should see new announcement
   - Check votes page → Should see new vote

**Expected:**
- ✅ Project created
- ✅ Announcement created automatically
- ✅ Vote created automatically

---

### 2. Test Offer Creation Flow

**URL:** `/projects/offers/new`

**Steps:**
1. Select building
2. Select project
3. Fill contractor name
4. Fill amount
5. Try to submit without required fields → Should show inline errors
6. Fill all required fields
7. Submit

**Expected:**
- ✅ Inline validation errors appear
- ✅ Submit button disabled when invalid
- ✅ Success toast on submission
- ✅ Redirects to project page
- ✅ Offer appears in `/projects/offers` list

**Test Invalid Cases:**
- Empty contractor name → Error: "Το όνομά του συνεργείου είναι υποχρεωτικό"
- Empty amount → Error: "Το ποσό είναι υποχρεωτικό"
- Negative amount → Error: "Το ποσό πρέπει να είναι μεγαλύτερο από 0"
- Advance payment > amount → Error: "Η προκαταβολή δεν μπορεί να είναι μεγαλύτερη..."

---

### 3. Test Offer Approval Flow

**URL:** `/projects/offers`

**Steps:**
1. Find submitted offer
2. Click "Έγκριση"
3. Check:
   - Offer status changes to "Εγκεκριμένη"
   - Project status changes to "approved"
   - Check `/maintenance/scheduled` → Should see new ScheduledMaintenance
   - Check `/financial` → Should see new expenses

**Expected:**
- ✅ Offer approved
- ✅ ScheduledMaintenance created
- ✅ Expenses created (advance + installments if applicable)
- ✅ Financial dashboard reflects changes

---

### 4. Test Projects List

**URL:** `/projects`

**Check:**
- [ ] All projects displayed
- [ ] Each project shows:
  - Title
  - Status
  - Costs
  - Linked offers count
- [ ] Click project → Navigates to detail page
- [ ] Stats cards show correct numbers

---

### 5. Test Offers List

**URL:** `/projects/offers`

**Check:**
- [ ] All offers displayed
- [ ] Status filter works
- [ ] Each offer shows contractor, project, amount
- [ ] Approve/Reject buttons work
- [ ] Empty state when no offers

---

## Browser DevTools Checks

### Network Tab

**When creating offer:**
- Request: `POST /api/projects/offers/`
- Payload should include: `project`, `contractor_name`, `amount`
- Response: 201 Created or 400 Bad Request with error details

**When approving offer:**
- Request: `POST /api/projects/offers/{id}/approve/`
- Response: 200 OK

### Console Tab

**Check for:**
- No unhandled errors
- React Query cache updates
- `[New Offer] Payload: {...}` log

### React Query DevTools

**Check cache keys:**
- `['projects', { building: ... }]`
- `['offers', { building: ..., status: ... }]`
- Cache invalidation after mutations

---

## Common Issues & Solutions

### Issue: Offers not showing in list

**Check:**
1. Building filter applied correctly
2. React Query cache invalidated
3. API returns correct data

**Solution:**
- Check browser console for errors
- Check network tab for API response
- Manually invalidate cache: `queryClient.invalidateQueries()`

### Issue: Form validation not working

**Check:**
1. Field errors state initialized
2. `handleFieldBlur` called on blur
3. Error messages displayed

**Solution:**
- Check `fieldErrors` state
- Verify `validateField` function logic
- Check field error display in JSX

### Issue: Offer approval not creating expenses

**Check:**
1. Backend logs for `update_project_schedule` call
2. Database for ScheduledMaintenance and Expenses
3. Project fields updated correctly

**Solution:**
- Check backend logs
- Verify `update_project_schedule` function executed
- Check database directly

---

## Automated Testing (Future)

### Cypress Tests

**File:** `public-app/cypress/e2e/projects-offers.cy.ts`

**Test Cases:**
1. Create project → Verify announcement & vote
2. Create offer → Verify validation
3. Approve offer → Verify expenses created
4. Projects list → Verify display
5. Offers list → Verify filters

### Playwright Tests

**File:** `public-app/playwright/projects-offers.spec.ts`

**Test Cases:**
1. End-to-end flow: Create project → Create offer → Approve
2. Form validation edge cases
3. Building filter behavior
4. Cache invalidation

---

## Performance Checks

### React Query Cache

**Check:**
- Cache hit rate
- Stale time configuration
- Cache invalidation frequency

**Optimize:**
- Adjust `staleTime` for projects/offers queries
- Use `keepPreviousData` for pagination
- Implement optimistic updates

---

## Security Checks

### API Authorization

**Verify:**
- Only authenticated users can create projects/offers
- Users can only see projects/offers for their buildings
- Approve/reject actions require proper permissions

### Input Validation

**Verify:**
- Frontend validation matches backend validation
- SQL injection prevention (Django ORM)
- XSS prevention (React escaping)

---

## Documentation Updates

After verification, update:
- `PROJECTS_OFFERS_AUDIT.md` with test results
- API documentation with new validation rules
- User guide with new features

