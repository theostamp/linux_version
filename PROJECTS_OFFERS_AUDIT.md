# Projects & Offers Flow Audit

## Date: 2025-01-XX
## Purpose: Document end-to-end flows, identify failures, and create reproducible debugging scenarios

---

## 1. `/projects` Flow Analysis

### 1.1 API Calls

**Endpoint:** `GET /api/projects/projects/`

**Query Parameters:**
- `building`: Building ID (from `getActiveBuildingId()`)
- `page_size`: 1000
- `status`: Optional filter (e.g., 'in_progress', 'completed')

**Location:** `public-app/src/app/(dashboard)/projects/page.tsx` (line 44)

**React Query Cache Keys:**
- `['projects', { building: buildingId }]` - All projects
- `['projects', { building: buildingId, status: 'in_progress' }]` - Active projects
- `['projects', { building: buildingId, status: 'completed' }]` - Completed projects

**Building Context Sync:**
- Uses `getActiveBuildingId()` from `@/lib/api`
- Building ID comes from `useBuilding()` hook or localStorage
- No automatic refetch when building changes (potential issue)

### 1.2 Navigation Flow

```
/projects (dashboard)
  → /projects/[id] (project detail)
  → /projects/new (create project)
  → /projects/offers/new (create offer)
```

### 1.3 Known Issues

1. **Missing building filter in offers queries:**
   - Line 47-48: Offers queries don't filter by building
   - `pendingOffersQ` and `approvedOffersQ` use only `status` filter
   - Should include `building: buildingId` parameter

2. **Cache invalidation:**
   - Only invalidates `['offers']` on offer creation
   - Doesn't invalidate `['projects']` cache
   - Projects list may show stale data

3. **Loading states:**
   - Combined loading check (line 50) is correct
   - But no individual loading states for better UX

---

## 2. `/projects/offers` Flow Analysis

### 2.1 API Calls

**GET Endpoint:** `GET /api/projects/offers/`
- Used for fetching offers list
- Query params: `status`, `page_size`

**POST Endpoint:** `POST /api/projects/offers/`
- Used for creating new offers
- Location: `public-app/src/app/(dashboard)/projects/offers/new/page.tsx` (line 166)

### 2.2 Form Submission Payload

**Location:** `public-app/src/app/(dashboard)/projects/offers/new/page.tsx` (lines 126-163)

**Required Fields:**
- `project`: integer (required)
- `contractor_name`: string (required, trimmed)
- `payment_method`: string (defaults to 'one_time')

**Optional Fields (only included if provided):**
- `contractor_contact`: string
- `contractor_phone`: string
- `contractor_email`: string
- `contractor_address`: string
- `amount`: number (parsed from string)
- `description`: string
- `payment_terms`: string
- `installments`: integer
- `advance_payment`: number
- `warranty_period`: string
- `completion_time`: string

**Payload Example:**
```json
{
  "project": 123,
  "contractor_name": "Εργοληπτική Α.Ε.",
  "description": "Περιγραφή εργασιών",
  "payment_method": "one_time",
  "amount": 12500.00,
  "contractor_email": "contact@example.com"
}
```

### 2.3 Backend Validation

**File:** `backend/projects/serializers.py` (lines 48-83)

**Current Validation:**
- `contractor_name`: Required, non-empty (line 67-71)
- `amount`: Required, positive (line 73-79)

**Missing Validations:**
- `project`: No validation that project exists or user has access
- `payment_method`: No validation against choices
- `installments`: No validation if payment_method requires it
- `advance_payment`: No validation that it's <= amount

### 2.4 Error Handling

**Frontend Error Handling:**
- Line 178-192: Catches errors and shows toast
- Error message priority:
  1. `error?.response?.body`
  2. `error?.message`
  3. Generic fallback message

**Issues:**
- Error messages may not be user-friendly
- No field-specific error display
- Backend may return validation errors that aren't parsed correctly

### 2.5 Cache Invalidation

**On Success:**
- Line 174: `queryClient.invalidateQueries({ queryKey: ['offers'] })`
- Invalidates all offers queries
- Doesn't invalidate projects cache (should update project's offers_count)

---

## 3. Backend API Endpoints

### 3.1 Projects API

**Route:** `/api/projects/projects/`
**Backend:** `backend/projects/views.py` - `ProjectViewSet`
**Proxy:** `public-app/src/app/api/projects/projects/route.ts`

**Methods:**
- GET: List projects
- POST: Create project
- GET /{id}/: Retrieve project
- PUT/PATCH /{id}/: Update project
- DELETE /{id}/: Delete project

### 3.2 Offers API

**Route:** `/api/projects/offers/`
**Backend:** `backend/projects/views.py` - `OfferViewSet` (line 569)
**Proxy:** `public-app/src/app/api/projects/offers/route.ts`

**Methods:**
- GET: List offers
- POST: Create offer
- GET /{id}/: Retrieve offer
- PUT/PATCH /{id}/: Update offer
- DELETE /{id}/: Delete offer
- POST /{id}/approve/: Approve offer (line 591)
- POST /{id}/reject/: Reject offer (line 644)

### 3.3 Proxy Configuration

**File:** `public-app/src/app/api/projects/offers/route.ts`
- `ensureTrailingSlash: true` (line 10)
- Should preserve trailing slash for POST requests

**File:** `public-app/src/app/api/_utils/tenantProxy.ts`
- Forwards `Authorization` header (line 115-190)
- Uses `X-Tenant-Host` for tenant resolution
- Logs all requests/responses

---

## 4. Documented Failures

### 4.1 400 Errors

**Scenario:** Invalid payload sent to `/api/projects/offers/`

**Example Payload (Missing Required Field):**
```json
{
  "project": 123,
  "description": "Test"
  // Missing contractor_name
}
```

**Expected Backend Response:**
```json
{
  "contractor_name": ["Το όνομά του συνεργείου είναι υποχρεωτικό."]
}
```

**Current Frontend Handling:**
- Error caught in `onError` handler (line 178)
- Shows generic error toast
- Doesn't parse field-specific errors

**Reproduction Steps:**
1. Navigate to `/projects/offers/new`
2. Select a project
3. Leave contractor_name empty
4. Submit form
5. Observe error toast

### 4.2 500 Errors

**From Z_logs (line 193-195):**
```
GET https://theo.newconcierge.app/api/projects/projects/dc61d82a-f80a-41e7-9f79-67d6dd71b28f 500 (Internal Server Error)
```

**Possible Causes:**
- Invalid project ID format (UUID vs integer)
- Database error
- Missing related objects

**Reproduction Steps:**
1. Navigate to `/projects/[uuid]` (using UUID instead of integer ID)
2. Observe 500 error

### 4.3 Disabled Buttons

**Location:** `public-app/src/app/(dashboard)/projects/offers/new/page.tsx` (line 195-204)

**Validation Logic:**
```typescript
const canSubmit = Boolean(
  formState.project &&
  formState.project.trim() &&
  !Number.isNaN(parseInt(formState.project, 10)) &&
  parseInt(formState.project, 10) > 0 &&
  formState.contractor_name.trim() &&
  formState.amount &&
  !Number.isNaN(parseFloat(formState.amount)) &&
  parseFloat(formState.amount) > 0,
);
```

**Issues:**
- Only checks required fields
- Doesn't validate optional fields that may be required by backend
- No real-time validation feedback

### 4.4 Missing Loaders

**Projects Page:**
- Has combined loading state (line 50)
- Shows spinner during loading (line 212-218)
- But no skeleton loaders for better UX

**Offers Form:**
- Shows loader for projects dropdown (line 272-276)
- But no loader during form submission (only disabled button)

---

## 5. Cache Invalidation Patterns

### 5.1 Current Patterns

**On Offer Creation:**
- Invalidates: `['offers']`
- Missing: `['projects']` (should update project's offers_count)

**On Offer Approval:**
- Not handled in frontend (backend handles it)
- Should invalidate: `['offers']`, `['projects']`, `['financial']`

### 5.2 Recommended Patterns

**After Creating Offer:**
```typescript
queryClient.invalidateQueries({ queryKey: ['offers'] });
queryClient.invalidateQueries({ queryKey: ['projects'] });
```

**After Approving Offer:**
```typescript
queryClient.invalidateQueries({ queryKey: ['offers'] });
queryClient.invalidateQueries({ queryKey: ['projects'] });
queryClient.invalidateQueries({ queryKey: ['financial'] });
```

---

## 6. Building Context Sync

### 6.1 Current Implementation

**Hook:** `useBuilding()` from `@/components/contexts/BuildingContext`
**Function:** `getActiveBuildingId()` from `@/lib/api`

**Flow:**
1. User selects building from dropdown
2. Building stored in context/localStorage
3. `getActiveBuildingId()` retrieves current building
4. Used in API queries

### 6.2 Issues

- Projects queries use building filter correctly
- Offers queries DON'T use building filter (line 47-48)
- No automatic refetch when building changes

---

## 7. Announcement & Vote Creation Verification

### 7.1 Current Behavior

**File:** `backend/projects/signals.py`

**On Project Creation (`created=True`):**
- ✅ Always creates announcement (line 32: `create_project_announcement()`)
- ✅ Always creates vote (line 34: `create_project_vote()`)
- ✅ Creates assembly announcement if `general_assembly_date` exists (line 37)

**Vote Creation Logic:**
- Checks for existing vote (line 474-481)
- Creates vote with project details
- Sets `end_date` to `general_assembly_date` or `deadline` or `None` (line 483-488)

### 7.2 Verification Steps

1. Create new project WITHOUT `general_assembly_date`
   - ✅ Should create announcement
   - ✅ Should create vote
   - ✅ Vote should have `end_date` = `deadline` or `None`

2. Create new project WITH `general_assembly_date`
   - ✅ Should create announcement
   - ✅ Should create vote
   - ✅ Should create assembly announcement
   - ✅ Vote should have `end_date` = `general_assembly_date`

---

## 8. Payload Validation Mismatches

### 8.1 Frontend → Backend Mismatches

**Frontend Sends (Optional Fields):**
- `contractor_contact`, `contractor_phone`, `contractor_email`, `contractor_address`
- `description`, `payment_terms`
- `installments`, `advance_payment`
- `warranty_period`, `completion_time`

**Backend Expects:**
- `contractor_name`: Required
- `amount`: Required
- `project`: Required (implicitly, via serializer)
- All other fields: Optional

**Potential Issues:**
- If backend adds required fields, frontend won't send them
- No validation that `installments` is required when `payment_method` = 'installments'

---

## 9. Recommendations

### 9.1 Immediate Fixes

1. **Add building filter to offers queries** (line 47-48)
2. **Invalidate projects cache after offer creation**
3. **Parse field-specific backend errors**
4. **Add real-time form validation**

### 9.2 Improvements

1. **Add skeleton loaders** for better UX
2. **Add field-level error display** in forms
3. **Add telemetry/logging** for offer creation failures
4. **Create offers list page** (currently missing)

---

## 10. Testing Scenarios

### 10.1 Offer Creation - Valid Payload
```
1. Navigate to /projects/offers/new
2. Select building
3. Select project
4. Fill required fields (contractor_name, amount)
5. Submit
Expected: Success toast, redirect to project page
```

### 10.2 Offer Creation - Invalid Payload
```
1. Navigate to /projects/offers/new
2. Select building
3. Select project
4. Leave contractor_name empty
5. Submit
Expected: Error toast with field-specific error
```

### 10.3 Offer Creation - Missing Project
```
1. Navigate to /projects/offers/new
2. Don't select project
3. Fill other fields
4. Submit
Expected: Frontend validation error (button disabled)
```

### 10.4 Project Creation - Verify Announcement & Vote
```
1. Navigate to /projects/new
2. Create project
3. Check announcements list
Expected: New announcement created
4. Check votes list
Expected: New vote created
```

---

## 11. Next Steps

1. ✅ Fix vote creation to always happen (DONE)
2. ✅ Add building filter to offers queries (DONE)
3. ✅ Enhance backend validation (DONE)
4. ✅ Add detailed error logging (DONE)
5. ✅ Improve frontend error handling (DONE - inline validation added)
6. ✅ Create offers list page (DONE)
7. ⏳ Add comprehensive tests (Test scripts created, ready for execution)

## 12. Implementation Status

### Completed ✅
- Vote creation fix (always creates vote for new projects)
- Backend validation enhancements (cross-field validation)
- Detailed logging (OfferViewSet, update_project_schedule)
- Frontend hooks (useProjects, useOffers)
- Projects page with actual list
- Offers list page with filters
- Inline form validation
- Building filter in offers queries
- Cache invalidation improvements

### In Progress ⏳
- Automated testing (scripts created, need database connection)
- Component breakdown (can be done in next PR)
- Advanced filters/sorting (can be done in next PR)

### Future Enhancements 🔮
- Financial summary sidebar
- E2E tests (Cypress/Playwright)
- Backend DRF tests
- Performance optimizations

