# 🎯 Comprehensive Refactoring Plan - Complete Component Restoration

## Objective

Επαναφορά της πλήρης λειτουργικότητας της προηγούμενης έκδοσης (commit `4203014f`) στο νέο `public-app` setup. Η προηγούμενη έκδοση είχε πλήρη λειτουργικότητα με contexts, hooks, components, και features που λείπουν από την τρέχουσα έκδοση.

## Source Reference

- **Commit**: `4203014f` - "feat: Fix all TypeScript errors and prepare for production deployment"
- **Date**: Fri Oct 24 21:28:59 2025
- **Location**: `frontend/` directory in repository
- **Status**: Production-ready, TypeScript errors fixed

## Current State

### Τρέχουσα Έκδοση (`public-app/src/`)
- ✅ Basic Sidebar component (~140 lines)
- ✅ Basic Header component (~116 lines)
- ✅ Dashboard layout with sidebar & header
- ✅ Basic API helper (`lib/api.ts`)
- ✅ Simple dashboard page
- ✅ Utils helper (`lib/utils.ts`)
- ❌ Χωρίς Contexts (AuthContext, BuildingContext)
- ❌ Χωρίς Custom Hooks
- ❌ Χωρίς UI Components Library (shadcn/ui)
- ❌ Χωρίς Feature Components
- ❌ Χωρίς Type Definitions

### Target State (from `frontend/`)
- ✅ 5 Contexts (AuthContext, BuildingContext, LoadingContext, ReactQueryProvider, DocumentLogContext)
- ✅ 68 Custom Hooks
- ✅ 330+ Components
- ✅ Shadcn/ui UI Library (~41 components)
- ✅ Complete API layer with throttling & caching
- ✅ 12 Type Definition files
- ✅ 146 Pages/Routes
- ✅ Full-featured Sidebar (~590 lines)
- ✅ Full-featured GlobalHeader (~235 lines)
- ✅ Complete Dashboard with widgets

## Complete Inventory

### 1. CONTEXTS (5 files - CRITICAL)

**Location**: `frontend/components/contexts/`

1. **AuthContext.tsx** (~291 lines)
   - User authentication & session management
   - Token handling (`access`, `refresh` → adapt to `access_token`, `refresh_token`)
   - Login/logout functions
   - User state management
   - Auto-refresh tokens
   - localStorage synchronization

2. **BuildingContext.tsx** (~200 lines)
   - Building selection & management
   - Building data caching
   - Current building state
   - Building list management
   - Building change handlers

3. **LoadingContext.tsx**
   - Global loading states
   - Loading overlay management

4. **ReactQueryProvider.tsx**
   - React Query setup
   - Query client configuration
   - Devtools integration

5. **DocumentLogContext.tsx** (optional)
   - Document logging functionality

**Migration Notes**:
- Adapt localStorage keys: `access` → `access_token`, `refresh` → `refresh_token`
- Update API calls to use new `lib/api.ts` structure
- Ensure context providers work with new route structure

### 2. CORE LAYOUT COMPONENTS (4 files - CRITICAL)

**Location**: `frontend/components/`

1. **Sidebar.tsx** (~590 lines)
   - Grouped navigation with categories:
     - Οικονομικά και Έργα (Financial & Projects)
     - Κύρια Λειτουργίες (Main Features)
     - Προσωπικά (Personal)
     - Kiosk & Display
     - Διαχείριση Κτιρίων (Building Management)
     - Συνεργασίες & Ομάδες (Collaboration & Teams)
     - Σύστημα & Ελέγχοι (System & Tests)
   - Role-based filtering
   - Building selector integration
   - Calculator modal
   - Mobile responsive with overlay
   - Loading states
   - "No access" states
   - "No buildings" states

2. **GlobalHeader.tsx** (~235 lines)
   - Office logo display
   - Building selector button
   - Notifications bell
   - Settings modal
   - Calendar button
   - User role display
   - Responsive design
   - Todo notifications
   - Event notifications

3. **LayoutWrapper.tsx**
   - Wrapper for non-dashboard pages
   - Sidebar integration
   - Loading overlay
   - Toast notifications

4. **AppProviders.tsx**
   - Root providers wrapper
   - Context providers hierarchy
   - Route-based layout logic
   - Kiosk mode handling
   - Info screen handling
   - Dashboard route detection

**Migration Notes**:
- Merge old Sidebar logic into new basic Sidebar
- Merge old GlobalHeader logic into new basic Header
- Adapt routing logic for `(dashboard)` route group

### 3. SUPPORTING CORE COMPONENTS (15+ files)

**Location**: `frontend/components/`

- `AuthGate.tsx` - Authentication guard
- `SubscriptionGate.tsx` - Subscription guard
- `BuildingSelector.tsx` - Building selection modal
- `BuildingSelectorButton.tsx` - Building selector button
- `ErrorMessage.tsx` - Error display component
- `FullPageSpinner.tsx` - Full page loading
- `ErrorBoundary.tsx` - Error boundary wrapper
- `GlobalLoadingOverlay.tsx` - Global loading overlay
- `GoToTopButton.tsx` - Scroll to top button
- `LogoutButton.tsx` - Logout button component
- `OfficeSettingsModal.tsx` - Office settings modal
- `Breadcrumb.tsx` - Breadcrumb navigation
- `DevCompileIndicator.tsx` - Dev compile indicator
- `NavigationLoader.tsx` - Navigation loader
- `StartupWrapper.tsx` - Startup wrapper
- `IntroWrapper.tsx` - Intro animation wrapper
- `EnhancedIntroAnimation.tsx` - Enhanced intro animation

### 4. DASHBOARD COMPONENTS (8 files)

**Location**: `frontend/components/`

- `DashboardCards.tsx` - Dashboard stat cards
- `BuildingStats.tsx` - Building statistics widget
- `AnnouncementsCarousel.tsx` - Announcements carousel
- `AnnouncementsFallback.tsx` - Fallback for announcements
- `AnnouncementCard.tsx` - Individual announcement card
- `AnnouncementContent.tsx` - Announcement content display
- `AnnouncementSkeleton.tsx` - Announcement loading skeleton
- `SelectedBuildingInfo.tsx` - Selected building info widget

### 5. BUILDING MANAGEMENT COMPONENTS (7 files)

**Location**: `frontend/components/`

- `BuildingCard.tsx` - Building card display
- `BuildingTable.tsx` - Building table
- `BuildingDetailsModal.tsx` - Building details modal
- `CreateBuildingForm.tsx` - Building creation form
- `BuildingContextHelp.tsx` - Building context help
- `BuildingFilterIndicator.tsx` - Building filter indicator
- `BuildingStreetView.tsx` - Building street view

### 6. APARTMENT COMPONENTS (5 files)

**Location**: `frontend/components/`

- `ApartmentCard.tsx` - Apartment card
- `ApartmentTable.tsx` - Apartment table
- `ApartmentTableEnhanced.tsx` - Enhanced apartment table
- `ApartmentEditModal.tsx` - Apartment edit modal
- `ApartmentStatusModal.tsx` - Apartment status modal
- `AssignResidentForm.tsx` - Assign resident form

### 7. FEATURE COMPONENTS (10+ files)

**Location**: `frontend/components/`

- `CreateRequestForm.tsx` - Request creation form
- `CreateResidentForm.tsx` - Resident creation form
- `AssemblyForm.tsx` - Assembly announcement form
- `ChatInterface.tsx` - Chat interface
- `ChatNotificationBadge.tsx` - Chat notification badge
- `ContactLink.tsx` - Contact link component
- `GreekThemeElements.tsx` - Greek theme elements
- `GoogleMapsVisualization.tsx` - Google Maps visualization
- `DataStatusIndicator.tsx` - Data status indicator
- `DocumentStatusLog.tsx` - Document status log
- `DocumentUploadModal.tsx` - Document upload modal
- `AddWidgetModal.tsx` - Widget addition modal
- `AddressAutocomplete.tsx` - Address autocomplete
- `AddressAutocompleter.tsx` - Address autocompleter

### 8. UI COMPONENTS LIBRARY (41 files)

**Location**: `frontend/components/ui/`

#### Shadcn/UI Core (18 files):
- `button.tsx`
- `input.tsx`
- `select.tsx`
- `dialog.tsx`
- `toast.tsx`
- `dropdown-menu.tsx`
- `tabs.tsx`
- `card.tsx`
- `alert.tsx`
- `alert-dialog.tsx`
- `avatar.tsx`
- `badge.tsx`
- `calendar.tsx`
- `checkbox.tsx`
- `label.tsx`
- `popover.tsx`
- `progress.tsx`
- `radio-group.tsx`
- `scroll-area.tsx`
- `separator.tsx`
- `switch.tsx`
- `tooltip.tsx`

#### Custom UI Components (13 files):
- `AppButton.tsx`
- `AppCard.tsx`
- `BackButton.tsx`
- `CalculatorModal.tsx`
- `CategorySelector.tsx`
- `ConfirmDialog.tsx`
- `CustomProgress.tsx`
- `DistributionSelector.tsx`
- `FileOpenWith.tsx`
- `FilePreview.tsx`
- `FileUpload.tsx`
- `ProgressBar.tsx`
- `SidebarNavItem.tsx`

### 9. SPECIALIZED COMPONENTS

**Location**: `frontend/components/`

#### Todos (3 files):
- `todos/TodoSidebar.tsx`
- `todos/TodoSidebarContext.tsx`
- `todos/TodoNotificationBell.tsx`

#### Events (2 files):
- `events/EventNotificationBell.tsx`
- `events/EventSidebar.tsx`

#### Notifications (1 file):
- `notifications/MonthlyTaskReminderModal.tsx`

#### Guards (1 file):
- `Guards/BuildingGuard.tsx`

#### Kiosk (Optional - can be added later):
- `kiosk/KioskNavigation.tsx`
- `kiosk/KioskSidebar.tsx`
- `kiosk/scenes/MorningOverviewSceneCustom.tsx`
- `kiosk/widgets/*` (multiple widget components)

### 10. HOOKS SYSTEM (68 files)

**Location**: `frontend/hooks/`

#### Core Authentication & Authorization (5 files):
- `useAuth.ts`
- `useAuthGuard.ts`
- `useCurrentUser.ts`
- `useLogout.ts`
- `useSuperUserGuard.ts`

#### Building Management (3 files):
- `useBuildings.ts`
- `useBuildingCache.ts`
- `useBuildingChange.ts`

#### CSRF & Security (2 files):
- `useCsrf.ts`
- `useEnsureCsrf.ts`

#### Navigation (3 files):
- `useNavigationWithLoading.ts`
- `useVoiceNavigation.ts`
- `useOfflineVoiceNavigation.ts`

#### Financial (15 files):
- `useFinancialDashboard.ts`
- `useExpenses.ts`
- `useExpensesQuery.ts`
- `useCommonExpenses.ts`
- `useMonthlyExpenses.ts`
- `useExpenseCalculator.ts`
- `useExpenseTemplates.ts`
- `useImprovedFinancialData.ts`
- `useFinancialAutoRefresh.ts`
- `useFinancialPermissions.ts`
- `usePayments.ts`
- `useMeterReadings.ts`
- `useMeterReadingsQuery.ts`
- `useReceipts.ts`
- `useChartData.ts`

#### Features (15 files):
- `useAnnouncements.ts`
- `useVotes.ts`
- `useVoteDetail.ts`
- `useVoteResults.ts`
- `useMyVote.ts`
- `useSubmitVote.ts`
- `useRequests.ts`
- `useCreateRequest.ts`
- `useTopRequests.ts`
- `useResidents.ts`
- `useCreateResident.ts`
- `useApartmentsWithFinancialData.ts`
- `useNotifications.ts`
- `useNotificationTemplates.ts`
- `useNotificationEvents.ts`

#### Documents (4 files):
- `useDocuments.ts`
- `useDocumentParser.ts`
- `useFileUpload.ts`
- `useFileOpenWith.ts`

#### Kiosk (6 files - Optional):
- `useKiosk.ts`
- `useKioskData.ts`
- `useKioskScenes.ts`
- `useKioskWidgets.ts`
- `useKioskWidgetManagement.ts`
- `useKioskWeather.ts`

#### Other Features (15 files):
- `usePublicInfo.ts`
- `useNews.ts`
- `useSuppliers.ts`
- `useTodos.ts`
- `useTodoMutations.ts`
- `useEvents.ts`
- `useGoogleCalendar.ts`
- `useMonthlyTasksReminder.ts`
- `useModalState.ts`
- `useKeyboardShortcuts.ts`
- `usePerformance.ts`
- `useResizableColumns.ts`
- `useSmartDateDefault.ts`
- `useMonthRefresh.ts`
- `useSupportRequest.ts`
- `use-toast.ts`

### 11. TYPES SYSTEM (12 files)

**Location**: `frontend/types/`

- `user.ts` - User interface & types
- `financial.ts` - Financial data types
- `improved-financial.ts` - Enhanced financial types
- `userRequests.ts` - Request types
- `vote.ts` - Vote types
- `notifications.ts` - Notification types
- `kiosk.ts` - Kiosk types
- `kiosk-widgets.ts` - Widget types
- `kiosk/index.ts` - Kiosk index
- `google-maps.d.ts` - Google Maps types
- `axios-augment.d.ts` - Axios augmentation
- `react-hot-toast.d.ts` - Toast types

### 12. PAGES/ROUTES (146 files)

**Location**: `frontend/app/`

#### Dashboard Routes (2 files):
- `(dashboard)/dashboard/page.tsx`
- `(dashboard)/layout.tsx`

#### Building Routes (9 files):
- `(dashboard)/buildings/page.tsx`
- `(dashboard)/buildings/new/page.tsx`
- `(dashboard)/buildings/[id]/page.tsx`
- `(dashboard)/buildings/[id]/edit/page.tsx`
- `(dashboard)/buildings/[id]/layout.tsx`
- `(dashboard)/buildings/[id]/dashboard/page.tsx`
- `(dashboard)/buildings/[id]/announcements/page.tsx`
- `(dashboard)/buildings/[id]/requests/page.tsx`
- `(dashboard)/buildings/assign-resident/page.tsx`

#### Apartment Routes (3 files):
- `(dashboard)/apartments/page.tsx`
- `(dashboard)/apartments/new/page.tsx`
- `(dashboard)/apartments/enhanced/page.tsx`

#### Announcement Routes (4 files):
- `(dashboard)/announcements/page.tsx`
- `(dashboard)/announcements/new/page.tsx`
- `(dashboard)/announcements/[id]/page.tsx`
- `(dashboard)/announcements/new-assembly/page.tsx`

#### Vote Routes (4 files):
- `(dashboard)/votes/page.tsx`
- `(dashboard)/votes/new/page.tsx`
- `(dashboard)/votes/[id]/page.tsx`
- `(dashboard)/votes/new/NewVoteClient.tsx`

#### Request Routes (4 files):
- `(dashboard)/requests/page.tsx`
- `(dashboard)/requests/new/page.tsx`
- `(dashboard)/requests/[id]/page.tsx`
- `(dashboard)/requests/[id]/edit/page.tsx`

#### Financial Routes (3 files):
- `(dashboard)/financial/page.tsx`
- `(dashboard)/financial/layout.tsx`
- `(dashboard)/financial-tests/page.tsx`

#### Maintenance Routes (17 files):
- `(dashboard)/maintenance/page.tsx`
- `(dashboard)/maintenance/tickets/page.tsx`
- `(dashboard)/maintenance/tickets/new/page.tsx`
- `(dashboard)/maintenance/tickets/[id]/page.tsx`
- `(dashboard)/maintenance/work-orders/page.tsx`
- `(dashboard)/maintenance/work-orders/new/page.tsx`
- `(dashboard)/maintenance/work-orders/[id]/page.tsx`
- `(dashboard)/maintenance/scheduled/page.tsx`
- `(dashboard)/maintenance/scheduled/new/page.tsx`
- `(dashboard)/maintenance/scheduled/[id]/page.tsx`
- `(dashboard)/maintenance/scheduled/[id]/edit/page.tsx`
- `(dashboard)/maintenance/receipts/page.tsx`
- `(dashboard)/maintenance/receipts/new/page.tsx`
- `(dashboard)/maintenance/receipts/[id]/edit/page.tsx`
- `(dashboard)/maintenance/contractors/page.tsx`
- `(dashboard)/maintenance/contractors/new/page.tsx`
- `(dashboard)/maintenance/contractors/[id]/edit/page.tsx`
- `(dashboard)/maintenance/reports/page.tsx`

#### Project Routes (14 files):
- `(dashboard)/projects/page.tsx`
- `(dashboard)/projects/new/page.tsx`
- `(dashboard)/projects/[id]/page.tsx`
- `(dashboard)/projects/[id]/edit/page.tsx`
- `(dashboard)/projects/layout.tsx`
- `(dashboard)/projects/projects/page.tsx`
- `(dashboard)/projects/offers/page.tsx`
- `(dashboard)/projects/offers/new/page.tsx`
- `(dashboard)/projects/offers/[id]/page.tsx`
- `(dashboard)/projects/offers/[id]/edit/page.tsx`
- `(dashboard)/projects/contracts/page.tsx`
- `(dashboard)/projects/contracts/new/page.tsx`
- `(dashboard)/projects/milestones/new/page.tsx`
- `(dashboard)/projects/reports/page.tsx`

#### Notification Routes (4 files):
- `(dashboard)/notifications/page.tsx`
- `(dashboard)/notifications/[id]/page.tsx`
- `(dashboard)/notifications/send/page.tsx`
- `(dashboard)/notifications/templates/page.tsx`

#### Other Feature Routes (20+ files):
- `(dashboard)/residents/list/page.tsx`
- `(dashboard)/residents/new/page.tsx`
- `(dashboard)/residents/assign/page.tsx`
- `(dashboard)/teams/page.tsx`
- `(dashboard)/collaborators/page.tsx`
- `(dashboard)/suppliers/page.tsx`
- `(dashboard)/chat/page.tsx`
- `(dashboard)/calendar/page.tsx`
- `(dashboard)/map-visualization/page.tsx`
- `(dashboard)/documents/page.tsx`
- `(dashboard)/documents/[id]/review/page.tsx`
- `(dashboard)/documents/[id]/review/useDocumentParser.ts`
- `(dashboard)/kiosk-management/page.tsx`
- `(dashboard)/kiosk-management/preview/page.tsx`
- `(dashboard)/kiosk-management/widgets/page.tsx`
- `(dashboard)/kiosk-management/widgets/create/page.tsx`
- `(dashboard)/kiosk-management/widgets/[id]/edit/page.tsx`
- `(dashboard)/data-migration/page.tsx`
- `(dashboard)/system-health/page.tsx`
- `(dashboard)/my-profile/page.tsx`
- `(dashboard)/my-subscription/page.tsx`
- `(dashboard)/admin/calendar/page.tsx`

#### Admin Routes (6 files):
- `admin/page.tsx`
- `admin/layout.tsx`
- `admin/billing/page.tsx`
- `admin/settings/page.tsx`
- `admin/subscriptions/page.tsx`
- `admin/users/page.tsx`

#### Auth Routes (7 files):
- `login/page.tsx`
- `register/page.tsx`
- `logout/page.tsx`
- `auth/callback/page.tsx`
- `auth/verify/page.tsx`
- `forgot-password/page.tsx`
- `unauthorized/page.tsx`

#### Payment Routes (3 files):
- `payment/page.tsx`
- `payment/success/page.tsx`
- `verify-payment/[id]/page.tsx`

#### Kiosk Routes (6 files - Optional):
- `kiosk/page.tsx`
- `kiosk/[id]/page.tsx`
- `kiosk-display/page.tsx`
- `kiosk-public/page.tsx`
- `simple-kiosk/page.tsx`
- `test-kiosk/page.tsx`

#### Other Routes (10+ files):
- `page.tsx` (landing)
- `layout.tsx` (root layout)
- `connect/page.tsx`
- `my-apartment/[token]/page.tsx`
- `info-screen/[buildingId]/page.tsx`
- `display/layout.tsx`
- `demo/page.tsx`
- `debug/page.tsx`
- `debug-street-view/page.tsx`
- `test-*.tsx` (various test pages)

#### API Routes (15+ files):
- `api/community-messages/route.ts`
- `api/financial/common-expenses/route.ts`
- `api/financial/dashboard/apartment_balances/route.ts`
- `api/financial/previous-balance/route.ts`
- `api/kiosk-latest-bill/route.ts`
- `api/kiosk-scenes-active/route.ts`
- `api/kiosk-widgets-public/route.ts`
- `api/kiosk/widgets/config/route.ts`
- `api/maintenance/contractors/route.ts`
- `api/news/multiple/route.ts`
- `api/news/route.ts`
- `api/projects/*` (multiple routes)
- `api/public-info/[buildingId]/route.ts`
- `api/quote/route.ts`
- `api/weather/route.ts`

### 13. API LAYER ENHANCEMENT

**File**: `frontend/lib/api.ts`

**Current**: Basic API helper
**Target**: Full-featured API client with:
- Request throttling & caching
- Exponential backoff retry logic
- CSRF token handling
- All API functions:
  - `getCurrentUser()`
  - `loginUser()`
  - `logoutUser()`
  - `fetchAllBuildings()`
  - `fetchAllBuildingsPublic()`
  - `fetchObligationsSummary()`
  - `fetchAnnouncements()`
  - `fetchVotes()`
  - `fetchRequests()`
  - `fetchTopRequests()`
  - All other API functions

**Migration Notes**:
- Merge old `lib/api.ts` functionality into new one
- Ensure API calls go through `/api/*` → `/backend-proxy/*`
- Maintain throttling & caching logic

### 14. UTILITIES

**File**: `frontend/lib/utils.ts`

**Enhancements Needed**:
- Date formatting functions (`safeFormatDate`, `isValidDate`)
- Amount formatting (`formatAmount`)
- Other utility functions from old version

## Dependencies Required

### Core Dependencies
```json
{
  "@tanstack/react-query": "^5.90.5",
  "@tanstack/react-query-devtools": "^5.90.2",
  "axios": "^1.3.0",
  "react-hot-toast": "^2.6.0",
  "sonner": "^2.0.7",
  "framer-motion": "^12.23.24",
  "recharts": "^3.3.0",
  "react-hook-form": "^7.43.0",
  "@hookform/resolvers": "^3.10.0",
  "date-fns": "^4.1.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^1.2.1",
  "tailwind-merge": "^3.3.1"
}
```

### Radix UI Components (18 packages)
```json
{
  "@radix-ui/react-alert-dialog": "^1.1.15",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.1.16",
  "@radix-ui/react-select": "^2.2.6",
  "@radix-ui/react-toast": "^1.2.15",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-tooltip": "^1.2.8",
  "@radix-ui/react-popover": "^1.1.15",
  "@radix-ui/react-avatar": "^1.1.10",
  "@radix-ui/react-checkbox": "^1.3.3",
  "@radix-ui/react-radio-group": "^1.3.8",
  "@radix-ui/react-scroll-area": "^1.2.10",
  "@radix-ui/react-separator": "^1.1.7",
  "@radix-ui/react-switch": "^1.2.6",
  "@radix-ui/react-progress": "^1.1.7",
  "@radix-ui/react-label": "^2.1.7",
  "@radix-ui/react-slot": "^1.2.3"
}
```

### Additional Dependencies
```json
{
  "react-day-picker": "^9.11.1",
  "qrcode": "^1.5.4",
  "@types/qrcode": "^1.5.5",
  "file-saver": "^2.0.5",
  "html2canvas": "^1.4.1",
  "jspdf": "^3.0.3",
  "react-dropzone": "^14.3.8",
  "keen-slider": "^6.8.6",
  "@fontsource/inter-tight": "^5.1.0",
  "@fontsource/open-sans": "^5.1.0",
  "@fontsource/roboto-condensed": "^5.1.0",
  "@fontsource/ubuntu-condensed": "^5.1.0"
}
```

## Migration Strategy - 8 Phases

### PHASE 1: Foundation & Dependencies ⏱️ ~30 min
**Priority**: CRITICAL

1. Install all dependencies listed above
2. Create directory structure:
   ```
   public-app/src/
     ├── components/
     │   ├── contexts/     [NEW]
     │   ├── ui/           [NEW]
     │   ├── guards/       [NEW]
     │   ├── todos/        [NEW]
     │   ├── events/       [NEW]
     │   └── ...
     ├── hooks/            [NEW]
     ├── types/            [NEW]
     └── lib/
   ```
3. Copy `components.json` from old version
4. Update `tsconfig.json` paths
5. Copy all 12 type files from `frontend/types/` → `public-app/src/types/`
6. Enhance `lib/utils.ts` with date/amount formatting

**Deliverables**:
- ✅ All dependencies installed
- ✅ Directory structure created
- ✅ All types copied
- ✅ Utils enhanced

### PHASE 2: API Layer Enhancement ⏱️ ~1 hour
**Priority**: CRITICAL

1. Enhance `lib/api.ts`:
   - Add request throttling & caching
   - Add exponential backoff retry logic
   - Add CSRF token handling
   - Add all API functions from old version
   - Ensure proxy routing works (`/api/*` → `/backend-proxy/*`)

**Deliverables**:
- ✅ Enhanced API layer
- ✅ All API functions available
- ✅ Throttling & caching working

### PHASE 3: Contexts System ⏱️ ~2-3 hours
**Priority**: CRITICAL

1. Copy `components/contexts/AuthContext.tsx`
   - Adapt localStorage keys: `access` → `access_token`
   - Update API calls to use new `lib/api.ts`
   - Test authentication flow

2. Copy `components/contexts/BuildingContext.tsx`
   - Update API calls
   - Ensure building selection works

3. Copy `components/contexts/LoadingContext.tsx`
4. Copy `components/contexts/ReactQueryProvider.tsx`
5. Copy `components/contexts/DocumentLogContext.tsx` (optional)
6. Copy `components/AppProviders.tsx`
   - Adapt routing logic for `(dashboard)` route group
   - Integrate all contexts

**Deliverables**:
- ✅ All contexts working
- ✅ AppProviders integrated
- ✅ Authentication flow working

### PHASE 4: UI Components Library ⏱️ ~2-3 hours
**Priority**: HIGH

1. Install shadcn/ui components (18 core components)
2. Copy custom UI components (13 files)
3. Test component rendering

**Deliverables**:
- ✅ Complete UI library
- ✅ All components rendering correctly

### PHASE 5: Core Components ⏱️ ~3-4 hours
**Priority**: CRITICAL

1. Enhance `components/Sidebar.tsx`:
   - Merge old Sidebar logic (~590 lines)
   - Add grouped navigation
   - Add role-based filtering
   - Add building selector integration
   - Add calculator modal
   - Improve mobile responsiveness

2. Enhance `components/Header.tsx` → Rename to `GlobalHeader.tsx`:
   - Merge old GlobalHeader logic (~235 lines)
   - Add office logo display
   - Add building selector button
   - Add notifications
   - Add settings modal
   - Add calendar button

3. Copy `components/LayoutWrapper.tsx`
4. Update `app/(dashboard)/layout.tsx`:
   - Integrate with AuthContext
   - Integrate with BuildingContext
   - Add loading states
   - Add error boundaries
   - Add monthly tasks reminder modal

5. Copy supporting components (15+ files):
   - AuthGate, SubscriptionGate
   - BuildingSelector, BuildingSelectorButton
   - ErrorMessage, FullPageSpinner
   - ErrorBoundary, GlobalLoadingOverlay
   - GoToTopButton, LogoutButton
   - OfficeSettingsModal
   - Breadcrumb, DevCompileIndicator
   - NavigationLoader, StartupWrapper
   - IntroWrapper, EnhancedIntroAnimation

**Deliverables**:
- ✅ Enhanced Sidebar with all features
- ✅ Enhanced Header with all features
- ✅ Updated Layout
- ✅ All supporting components

### PHASE 6: Essential Hooks ⏱️ ~2-3 hours
**Priority**: HIGH

1. Copy core hooks (10 files):
   - useAuth, useAuthGuard, useCurrentUser, useLogout, useSuperUserGuard
   - useBuildings, useBuildingCache, useBuildingChange
   - useCsrf, useEnsureCsrf
   - useNavigationWithLoading

2. Copy feature hooks as needed (priority order):
   - Financial hooks (15 files)
   - Announcements hooks
   - Votes hooks
   - Requests hooks
   - Residents hooks
   - Notifications hooks
   - Documents hooks
   - Other hooks

**Deliverables**:
- ✅ Essential hooks working
- ✅ Feature hooks available

### PHASE 7: Dashboard Enhancement ⏱️ ~2-3 hours
**Priority**: HIGH

1. Copy dashboard components (8 files)
2. Enhance `app/(dashboard)/dashboard/page.tsx`:
   - Add charts (Recharts)
   - Add announcements carousel
   - Add building stats
   - Add obligations summary
   - Add weather widget
   - Add subscription info
   - Add all dashboard widgets

**Deliverables**:
- ✅ Full-featured dashboard
- ✅ All widgets working

### PHASE 8: Feature Pages ⏱️ ~4-6 hours
**Priority**: MEDIUM (can be done incrementally)

**Priority Order**:
1. Buildings pages (9 files)
2. Announcements pages (4 files)
3. Financial pages (3 files)
4. Votes pages (4 files)
5. Requests pages (4 files)
6. Other feature pages (as needed)

**Deliverables**:
- ✅ Priority feature pages working
- ✅ Other pages can be added incrementally

## Critical Migration Notes

### 1. API Token Standardization
- **Old**: `access`, `refresh` (localStorage)
- **New**: `access_token`, `refresh_token` (localStorage)
- **Action**: Update AuthContext to use `access_token` consistently

### 2. Route Structure
- **Old**: Different route structure
- **New**: `(dashboard)` route group
- **Action**: Maintain new structure, adapt old routes to fit

### 3. API Endpoints
- **Old**: Direct API calls to backend
- **New**: Proxy through `/api/*` → `/backend-proxy/*` → Django backend
- **Action**: Ensure all API calls go through proxy

### 4. Import Paths
- **Old**: Various import styles
- **New**: `@/` alias for `src/`
- **Action**: Update all import paths to use `@/` alias

### 5. Environment Variables
- Map old env vars to new ones
- Ensure compatibility

### 6. Component Props
- Some components may have different prop interfaces
- Adapt props as needed
- Maintain backward compatibility where possible

## Testing Strategy

### After Each Phase:
1. **Functionality Testing**:
   - Test core features
   - Test API calls
   - Test navigation
   - Test authentication

2. **UI/UX Testing**:
   - Test responsive design
   - Test loading states
   - Test error states
   - Test animations

3. **Performance Testing**:
   - Check bundle size
   - Check load times
   - Check API call optimization

## Success Criteria

- ✅ All contexts working correctly
- ✅ Sidebar & Header fully functional with all features
- ✅ Dashboard page with all widgets and charts
- ✅ Building selection working
- ✅ Authentication flow complete
- ✅ API calls working with throttling & caching
- ✅ No TypeScript errors
- ✅ Responsive design working
- ✅ All critical features accessible
- ✅ Performance optimized

## Execution Approach

1. **Incremental**: One phase at a time
2. **Tested**: Test after each phase
3. **Documented**: Document changes as we go
4. **Small Commits**: Commit after each successful phase
5. **Careful**: Avoid conflicts, adapt carefully

---

**This prompt contains the complete inventory of:**
- 5 Contexts
- 330+ Components
- 68 Hooks
- 12 Types
- 146 Pages/Routes
- Complete dependencies list
- 8-phase migration strategy

**Ready for plan generation and execution.**

