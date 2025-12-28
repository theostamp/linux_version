# 🎯 Comprehensive Refactoring Plan Prompt

## Task Overview

Επαναφορά της πλήρης λειτουργικότητας της προηγούμενης έκδοσης (commit `4203014f`) στο νέο `public-app` setup. Η προηγούμενη έκδοση είχε πλήρη λειτουργικότητα με contexts, hooks, components, και features που λείπουν από την τρέχουσα έκδοση.

## Current State Analysis

### Τρέχουσα Έκδοση (`public-app`)
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

### Προηγούμενη Έκδοση (`frontend` - commit `4203014f`)
- ✅ 5 Contexts (AuthContext, BuildingContext, LoadingContext, ReactQueryProvider, DocumentLogContext)
- ✅ 60+ Custom Hooks
- ✅ 100+ Components
- ✅ Shadcn/ui UI Library (~41 components)
- ✅ Complete API layer with throttling & caching
- ✅ 12 Type Definition files
- ✅ 100+ Pages/Routes
- ✅ Full-featured Sidebar (~590 lines)
- ✅ Full-featured GlobalHeader (~235 lines)
- ✅ Complete Dashboard with widgets

## Source Reference

**Commit**: `4203014f` - "feat: Fix all TypeScript errors and prepare for production deployment"  
**Date**: Fri Oct 24 21:28:59 2025  
**Location**: `frontend/` directory in repository  
**Status**: Production-ready, TypeScript errors fixed

## Complete Component Inventory

### 1. Contexts (5 files)
```
frontend/components/contexts/AuthContext.tsx (~291 lines)
frontend/components/contexts/BuildingContext.tsx (~200 lines)
frontend/components/contexts/DocumentLogContext.tsx
frontend/components/contexts/LoadingContext.tsx
frontend/components/contexts/ReactQueryProvider.tsx
```

**Key Features**:
- AuthContext: User authentication, session management, token handling
- BuildingContext: Building selection, caching, building data management
- LoadingContext: Global loading states management
- ReactQueryProvider: React Query setup with devtools
- DocumentLogContext: Document logging functionality

### 2. Core Layout Components
```
frontend/components/Sidebar.tsx (~590 lines)
  - Grouped navigation with categories
  - Role-based filtering
  - Building selector integration
  - Calculator modal
  - Mobile responsive with overlay
  - Loading states
  - "No access" states

frontend/components/GlobalHeader.tsx (~235 lines)
  - Office logo display
  - Building selector button
  - Notifications bell
  - Settings modal
  - Calendar button
  - User role display
  - Responsive design

frontend/components/LayoutWrapper.tsx
  - Wrapper for non-dashboard pages
  - Sidebar integration
  - Loading overlay
  - Toast notifications

frontend/components/AppProviders.tsx
  - Root providers wrapper
  - Context providers hierarchy
  - Route-based layout logic
  - Kiosk mode handling
  - Info screen handling
```

### 3. Supporting Core Components
```
frontend/components/AuthGate.tsx
frontend/components/SubscriptionGate.tsx
frontend/components/BuildingSelector.tsx
frontend/components/BuildingSelectorButton.tsx
frontend/components/ErrorMessage.tsx
frontend/components/FullPageSpinner.tsx
frontend/components/ErrorBoundary.tsx
frontend/components/GlobalLoadingOverlay.tsx
frontend/components/GoToTopButton.tsx
frontend/components/LogoutButton.tsx
frontend/components/OfficeSettingsModal.tsx
frontend/components/Breadcrumb.tsx
frontend/components/DevCompileIndicator.tsx
frontend/components/NavigationLoader.tsx
frontend/components/StartupWrapper.tsx
frontend/components/IntroWrapper.tsx
frontend/components/EnhancedIntroAnimation.tsx
```

### 4. Dashboard Components
```
frontend/components/DashboardCards.tsx
frontend/components/BuildingStats.tsx
frontend/components/AnnouncementsCarousel.tsx
frontend/components/AnnouncementsFallback.tsx
frontend/components/AnnouncementCard.tsx
frontend/components/AnnouncementContent.tsx
frontend/components/AnnouncementSkeleton.tsx
frontend/components/SelectedBuildingInfo.tsx
```

### 5. Building Management Components
```
frontend/components/BuildingCard.tsx
frontend/components/BuildingTable.tsx
frontend/components/BuildingDetailsModal.tsx
frontend/components/CreateBuildingForm.tsx
frontend/components/BuildingContextHelp.tsx
frontend/components/BuildingFilterIndicator.tsx
frontend/components/BuildingStreetView.tsx
```

### 6. Apartment Components
```
frontend/components/ApartmentCard.tsx
frontend/components/ApartmentTable.tsx
frontend/components/ApartmentTableEnhanced.tsx
frontend/components/ApartmentEditModal.tsx
frontend/components/ApartmentStatusModal.tsx
frontend/components/AssignResidentForm.tsx
```

### 7. Financial Components
```
frontend/components/DataStatusIndicator.tsx
frontend/components/DocumentStatusLog.tsx
frontend/components/DocumentUploadModal.tsx
```

### 8. Request & Resident Components
```
frontend/components/CreateRequestForm.tsx
frontend/components/CreateResidentForm.tsx
```

### 9. Assembly & Announcement Components
```
frontend/components/AssemblyForm.tsx
```

### 10. Chat Components
```
frontend/components/ChatInterface.tsx
frontend/components/ChatNotificationBadge.tsx
```

### 11. Contact & Utility Components
```
frontend/components/ContactLink.tsx
frontend/components/GreekThemeElements.tsx
frontend/components/GoogleMapsVisualization.tsx
```

### 12. Guards
```
frontend/components/Guards/BuildingGuard.tsx
```

### 13. UI Components (Shadcn/ui + Custom)
```
frontend/components/ui/button.tsx
frontend/components/ui/input.tsx
frontend/components/ui/select.tsx
frontend/components/ui/dialog.tsx
frontend/components/ui/toast.tsx
frontend/components/ui/dropdown-menu.tsx
frontend/components/ui/tabs.tsx
frontend/components/ui/card.tsx
frontend/components/ui/alert.tsx
frontend/components/ui/alert-dialog.tsx
frontend/components/ui/avatar.tsx
frontend/components/ui/badge.tsx
frontend/components/ui/calendar.tsx
frontend/components/ui/checkbox.tsx
frontend/components/ui/label.tsx
frontend/components/ui/popover.tsx
frontend/components/ui/progress.tsx
frontend/components/ui/radio-group.tsx
frontend/components/ui/scroll-area.tsx
frontend/components/ui/separator.tsx
frontend/components/ui/switch.tsx
frontend/components/ui/tooltip.tsx

# Custom UI Components
frontend/components/ui/AppButton.tsx
frontend/components/ui/AppCard.tsx
frontend/components/ui/BackButton.tsx
frontend/components/ui/CalculatorModal.tsx
frontend/components/ui/CategorySelector.tsx
frontend/components/ui/ConfirmDialog.tsx
frontend/components/ui/CustomProgress.tsx
frontend/components/ui/DistributionSelector.tsx
frontend/components/ui/FileOpenWith.tsx
frontend/components/ui/FilePreview.tsx
frontend/components/ui/FileUpload.tsx
frontend/components/ui/ProgressBar.tsx
frontend/components/ui/SidebarNavItem.tsx
```

### 14. Todos Components
```
frontend/components/todos/TodoSidebar.tsx
frontend/components/todos/TodoSidebarContext.tsx
frontend/components/todos/TodoNotificationBell.tsx
```

### 15. Events Components
```
frontend/components/events/EventNotificationBell.tsx
frontend/components/events/EventSidebar.tsx
```

### 16. Notifications Components
```
frontend/components/notifications/MonthlyTaskReminderModal.tsx
```

### 17. Kiosk Components (Optional - can be added later)
```
frontend/components/kiosk/KioskNavigation.tsx
frontend/components/kiosk/KioskSidebar.tsx
frontend/components/kiosk/scenes/MorningOverviewSceneCustom.tsx
frontend/components/kiosk/widgets/* (multiple widget components)
```

## Complete Hooks Inventory (60+ files)

### Core Authentication & Authorization Hooks
```
frontend/hooks/useAuth.ts
frontend/hooks/useAuthGuard.ts
frontend/hooks/useCurrentUser.ts
frontend/hooks/useLogout.ts
frontend/hooks/useSuperUserGuard.ts
```

### Building Management Hooks
```
frontend/hooks/useBuildings.ts
frontend/hooks/useBuildingCache.ts
frontend/hooks/useBuildingChange.ts
```

### CSRF & Security Hooks
```
frontend/hooks/useCsrf.ts
frontend/hooks/useEnsureCsrf.ts
```

### Navigation Hooks
```
frontend/hooks/useNavigationWithLoading.ts
frontend/hooks/useVoiceNavigation.ts
frontend/hooks/useOfflineVoiceNavigation.ts
```

### Financial Hooks
```
frontend/hooks/useFinancialDashboard.ts
frontend/hooks/useExpenses.ts
frontend/hooks/useExpensesQuery.ts
frontend/hooks/useCommonExpenses.ts
frontend/hooks/useMonthlyExpenses.ts
frontend/hooks/useExpenseCalculator.ts
frontend/hooks/useExpenseTemplates.ts
frontend/hooks/useImprovedFinancialData.ts
frontend/hooks/useFinancialAutoRefresh.ts
frontend/hooks/useFinancialPermissions.ts
frontend/hooks/usePayments.ts
frontend/hooks/useMeterReadings.ts
frontend/hooks/useMeterReadingsQuery.ts
frontend/hooks/useReceipts.ts
frontend/hooks/useChartData.ts
```

### Announcements Hooks
```
frontend/hooks/useAnnouncements.ts
```

### Votes Hooks
```
frontend/hooks/useVotes.ts
frontend/hooks/useVoteDetail.ts
frontend/hooks/useVoteResults.ts
frontend/hooks/useMyVote.ts
frontend/hooks/useSubmitVote.ts
```

### Requests Hooks
```
frontend/hooks/useRequests.ts
frontend/hooks/useCreateRequest.ts
frontend/hooks/useTopRequests.ts
```

### Residents Hooks
```
frontend/hooks/useResidents.ts
frontend/hooks/useCreateResident.ts
frontend/hooks/useApartmentsWithFinancialData.ts
```

### Notifications Hooks
```
frontend/hooks/useNotifications.ts
frontend/hooks/useNotificationTemplates.ts
frontend/hooks/useNotificationEvents.ts
frontend/hooks/useMonthlyTasksReminder.ts
```

### Documents Hooks
```
frontend/hooks/useDocuments.ts
frontend/hooks/useDocumentParser.ts
frontend/hooks/useFileUpload.ts
frontend/hooks/useFileOpenWith.ts
```

### Kiosk Hooks
```
frontend/hooks/useKiosk.ts
frontend/hooks/useKioskData.ts
frontend/hooks/useKioskScenes.ts
frontend/hooks/useKioskWidgets.ts
frontend/hooks/useKioskWidgetManagement.ts
frontend/hooks/useKioskWeather.ts
```

### Public Info Hooks
```
frontend/hooks/usePublicInfo.ts
```

### News Hooks
```
frontend/hooks/useNews.ts
```

### Suppliers Hooks
```
frontend/hooks/useSuppliers.ts
```

### Todos Hooks
```
frontend/hooks/useTodos.ts
frontend/hooks/useTodoMutations.ts
```

### Events Hooks
```
frontend/hooks/useEvents.ts
frontend/hooks/useGoogleCalendar.ts
```

### Projects Hooks (if exists)
```
frontend/hooks/useProjects.ts (if exists)
```

### Utility Hooks
```
frontend/hooks/useModalState.ts
frontend/hooks/useKeyboardShortcuts.ts
frontend/hooks/usePerformance.ts
frontend/hooks/useResizableColumns.ts
frontend/hooks/useSmartDateDefault.ts
frontend/hooks/useMonthRefresh.ts
frontend/hooks/useSupportRequest.ts
frontend/hooks/use-toast.ts
```

## Complete Types Inventory (12 files)

```
frontend/types/user.ts
frontend/types/financial.ts
frontend/types/improved-financial.ts
frontend/types/userRequests.ts
frontend/types/vote.ts
frontend/types/notifications.ts
frontend/types/kiosk.ts
frontend/types/kiosk-widgets.ts
frontend/types/kiosk/index.ts
frontend/types/google-maps.d.ts
frontend/types/axios-augment.d.ts
frontend/types/react-hot-toast.d.ts
```

## Complete Pages Inventory (~100+ routes)

### Dashboard Routes
```
frontend/app/(dashboard)/dashboard/page.tsx
frontend/app/(dashboard)/layout.tsx
```

### Building Routes
```
frontend/app/(dashboard)/buildings/page.tsx
frontend/app/(dashboard)/buildings/new/page.tsx
frontend/app/(dashboard)/buildings/[id]/page.tsx
frontend/app/(dashboard)/buildings/[id]/edit/page.tsx
frontend/app/(dashboard)/buildings/[id]/layout.tsx
frontend/app/(dashboard)/buildings/[id]/dashboard/page.tsx
frontend/app/(dashboard)/buildings/[id]/announcements/page.tsx
frontend/app/(dashboard)/buildings/[id]/requests/page.tsx
frontend/app/(dashboard)/buildings/assign-resident/page.tsx
```

### Apartment Routes
```
frontend/app/(dashboard)/apartments/page.tsx
frontend/app/(dashboard)/apartments/new/page.tsx
frontend/app/(dashboard)/apartments/enhanced/page.tsx
```

### Announcement Routes
```
frontend/app/(dashboard)/announcements/page.tsx
frontend/app/(dashboard)/announcements/new/page.tsx
frontend/app/(dashboard)/announcements/[id]/page.tsx
frontend/app/(dashboard)/announcements/new-assembly/page.tsx
```

### Vote Routes
```
frontend/app/(dashboard)/votes/page.tsx
frontend/app/(dashboard)/votes/new/page.tsx
frontend/app/(dashboard)/votes/[id]/page.tsx
frontend/app/(dashboard)/votes/new/NewVoteClient.tsx
```

### Request Routes
```
frontend/app/(dashboard)/requests/page.tsx
frontend/app/(dashboard)/requests/new/page.tsx
frontend/app/(dashboard)/requests/[id]/page.tsx
frontend/app/(dashboard)/requests/[id]/edit/page.tsx
```

### Financial Routes
```
frontend/app/(dashboard)/financial/page.tsx
frontend/app/(dashboard)/financial/layout.tsx
frontend/app/(dashboard)/financial-tests/page.tsx
```

### Maintenance Routes
```
frontend/app/(dashboard)/maintenance/page.tsx
frontend/app/(dashboard)/maintenance/tickets/page.tsx
frontend/app/(dashboard)/maintenance/tickets/new/page.tsx
frontend/app/(dashboard)/maintenance/tickets/[id]/page.tsx
frontend/app/(dashboard)/maintenance/work-orders/page.tsx
frontend/app/(dashboard)/maintenance/work-orders/new/page.tsx
frontend/app/(dashboard)/maintenance/work-orders/[id]/page.tsx
frontend/app/(dashboard)/maintenance/scheduled/page.tsx
frontend/app/(dashboard)/maintenance/scheduled/new/page.tsx
frontend/app/(dashboard)/maintenance/scheduled/[id]/page.tsx
frontend/app/(dashboard)/maintenance/scheduled/[id]/edit/page.tsx
frontend/app/(dashboard)/maintenance/receipts/page.tsx
frontend/app/(dashboard)/maintenance/receipts/new/page.tsx
frontend/app/(dashboard)/maintenance/receipts/[id]/edit/page.tsx
frontend/app/(dashboard)/maintenance/contractors/page.tsx
frontend/app/(dashboard)/maintenance/contractors/new/page.tsx
frontend/app/(dashboard)/maintenance/contractors/[id]/edit/page.tsx
frontend/app/(dashboard)/maintenance/reports/page.tsx
```

### Project Routes
```
frontend/app/(dashboard)/projects/page.tsx
frontend/app/(dashboard)/projects/new/page.tsx
frontend/app/(dashboard)/projects/[id]/page.tsx
frontend/app/(dashboard)/projects/[id]/edit/page.tsx
frontend/app/(dashboard)/projects/layout.tsx
frontend/app/(dashboard)/projects/projects/page.tsx
frontend/app/(dashboard)/projects/offers/page.tsx
frontend/app/(dashboard)/projects/offers/new/page.tsx
frontend/app/(dashboard)/projects/offers/[id]/page.tsx
frontend/app/(dashboard)/projects/offers/[id]/edit/page.tsx
frontend/app/(dashboard)/projects/contracts/page.tsx
frontend/app/(dashboard)/projects/contracts/new/page.tsx
frontend/app/(dashboard)/projects/milestones/new/page.tsx
frontend/app/(dashboard)/projects/reports/page.tsx
```

### Notification Routes
```
frontend/app/(dashboard)/notifications/page.tsx
frontend/app/(dashboard)/notifications/[id]/page.tsx
frontend/app/(dashboard)/notifications/send/page.tsx
frontend/app/(dashboard)/notifications/templates/page.tsx
```

### Other Feature Routes
```
frontend/app/(dashboard)/residents/list/page.tsx
frontend/app/(dashboard)/residents/new/page.tsx
frontend/app/(dashboard)/residents/assign/page.tsx
frontend/app/(dashboard)/teams/page.tsx
frontend/app/(dashboard)/collaborators/page.tsx
frontend/app/(dashboard)/suppliers/page.tsx
frontend/app/(dashboard)/chat/page.tsx
frontend/app/(dashboard)/calendar/page.tsx
frontend/app/(dashboard)/map-visualization/page.tsx
frontend/app/(dashboard)/documents/page.tsx
frontend/app/(dashboard)/documents/[id]/review/page.tsx
frontend/app/(dashboard)/documents/[id]/review/useDocumentParser.ts
frontend/app/(dashboard)/kiosk-management/page.tsx
frontend/app/(dashboard)/kiosk-management/preview/page.tsx
frontend/app/(dashboard)/kiosk-management/widgets/page.tsx
frontend/app/(dashboard)/kiosk-management/widgets/create/page.tsx
frontend/app/(dashboard)/kiosk-management/widgets/[id]/edit/page.tsx
frontend/app/(dashboard)/data-migration/page.tsx
frontend/app/(dashboard)/system-health/page.tsx
frontend/app/(dashboard)/my-profile/page.tsx
frontend/app/(dashboard)/my-subscription/page.tsx
frontend/app/(dashboard)/admin/calendar/page.tsx
```

### Admin Routes
```
frontend/app/admin/page.tsx
frontend/app/admin/layout.tsx
frontend/app/admin/billing/page.tsx
frontend/app/admin/settings/page.tsx
frontend/app/admin/subscriptions/page.tsx
frontend/app/admin/users/page.tsx
```

### Auth Routes
```
frontend/app/login/page.tsx
frontend/app/register/page.tsx
frontend/app/logout/page.tsx
frontend/app/auth/callback/page.tsx
frontend/app/auth/verify/page.tsx
frontend/app/forgot-password/page.tsx
frontend/app/unauthorized/page.tsx
```

### Payment Routes
```
frontend/app/payment/page.tsx
frontend/app/payment/success/page.tsx
frontend/app/verify-payment/[id]/page.tsx
```

### Kiosk Routes
```
frontend/app/kiosk/page.tsx
frontend/app/kiosk/[id]/page.tsx
frontend/app/kiosk-display/page.tsx
frontend/app/kiosk-public/page.tsx
frontend/app/simple-kiosk/page.tsx
frontend/app/test-kiosk/page.tsx
```

### Other Routes
```
frontend/app/page.tsx
frontend/app/layout.tsx
frontend/app/connect/page.tsx
frontend/app/my-apartment/[token]/page.tsx
frontend/app/info-screen/[buildingId]/page.tsx
frontend/app/display/layout.tsx
frontend/app/demo/page.tsx
frontend/app/debug/page.tsx
frontend/app/debug-street-view/page.tsx
frontend/app/test-form-submission/page.tsx
frontend/app/test-intro-animation/page.tsx
frontend/app/test-loading-indicators/page.tsx
frontend/app/test-logo/page.tsx
frontend/app/test-street-view/page.tsx
```

### API Routes
```
frontend/app/api/community-messages/route.ts
frontend/app/api/financial/common-expenses/route.ts
frontend/app/api/financial/dashboard/apartment_balances/route.ts
frontend/app/api/financial/previous-balance/route.ts
frontend/app/api/kiosk-latest-bill/route.ts
frontend/app/api/kiosk-scenes-active/route.ts
frontend/app/api/kiosk-widgets-public/route.ts
frontend/app/api/kiosk/widgets/config/route.ts
frontend/app/api/maintenance/contractors/route.ts
frontend/app/api/news/multiple/route.ts
frontend/app/api/news/route.ts
frontend/app/api/projects/[id]/route.ts
frontend/app/api/projects/contracts/route.ts
frontend/app/api/projects/dashboard/route.ts
frontend/app/api/projects/offers/[id]/route.ts
frontend/app/api/projects/offers/route.ts
frontend/app/api/projects/rfqs/route.ts
frontend/app/api/projects/route.ts
frontend/app/api/public-info/[buildingId]/route.ts
frontend/app/api/quote/route.ts
frontend/app/api/weather/route.ts
```

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

### Radix UI Components
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

## Key Features to Restore

### 1. Authentication & Authorization
- [ ] Full AuthContext with token management
- [ ] Auth guards (AuthGate, SubscriptionGate)
- [ ] Role-based access control
- [ ] Session persistence
- [ ] Auto-refresh tokens

### 2. Building Management
- [ ] BuildingContext with caching
- [ ] Building selector with modal
- [ ] Building selection persistence
- [ ] Building data management
- [ ] Multi-building support

### 3. Navigation System
- [ ] Grouped sidebar navigation
- [ ] Role-based menu filtering
- [ ] Active route highlighting
- [ ] Mobile responsive sidebar
- [ ] Navigation loading states

### 4. Dashboard Features
- [ ] Building stats widgets
- [ ] Announcements carousel
- [ ] Obligations summary
- [ ] Votes display
- [ ] Requests display
- [ ] Weather widget
- [ ] Subscription info
- [ ] Charts & graphs (Recharts)

### 5. API Layer
- [ ] Request throttling
- [ ] Response caching
- [ ] Exponential backoff retry
- [ ] CSRF token handling
- [ ] Error handling
- [ ] Loading states

### 6. UI Components
- [ ] Complete shadcn/ui library
- [ ] Custom UI components
- [ ] Form components
- [ ] Modal components
- [ ] Toast notifications
- [ ] Loading indicators

### 7. Feature Pages
- [ ] Buildings management
- [ ] Announcements
- [ ] Votes
- [ ] Requests
- [ ] Financial dashboard
- [ ] Maintenance
- [ ] Projects
- [ ] Residents
- [ ] Notifications

## Migration Strategy

### Phase 1: Foundation
1. Install all dependencies
2. Create directory structure
3. Copy all types
4. Enhance API layer

### Phase 2: Core Infrastructure
1. Copy all contexts
2. Adapt to new API structure
3. Setup AppProviders
4. Test context providers

### Phase 3: UI Components
1. Install shadcn/ui components
2. Copy custom UI components
3. Test component rendering

### Phase 4: Core Components
1. Enhance Sidebar
2. Enhance Header
3. Update Layout
4. Copy supporting components

### Phase 5: Hooks System
1. Copy essential hooks
2. Adapt API calls
3. Test hooks functionality

### Phase 6: Dashboard Enhancement
1. Add dashboard widgets
2. Integrate charts
3. Add all dashboard features

### Phase 7: Feature Pages
1. Buildings pages
2. Announcements pages
3. Financial pages
4. Other priority pages

### Phase 8: Testing & Polish
1. Comprehensive testing
2. Bug fixes
3. Performance optimization
4. Documentation

## Critical Considerations

### 1. API Token Standardization
- **Old**: `access`, `refresh` (localStorage)
- **New**: `access_token`, `refresh_token` (localStorage)
- **Action**: Update AuthContext to use `access_token`

### 2. Route Structure
- **Old**: Different route structure
- **New**: `(dashboard)` route group
- **Action**: Maintain new structure, adapt old routes

### 3. API Endpoints
- **Old**: Direct API calls
- **New**: Proxy through `/api/*` → `/backend-proxy/*`
- **Action**: Ensure all API calls go through proxy

### 4. Import Paths
- **Old**: Various import styles
- **New**: `@/` alias for `src/`
- **Action**: Update all import paths

### 5. Environment Variables
- Map old env vars to new ones
- Ensure compatibility

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

## Execution Instructions

1. **Start with Phase 1**: Foundation & Dependencies
2. **Test after each phase**: Ensure no regressions
3. **Small commits**: Commit after each successful phase
4. **Document changes**: Update documentation as we go
5. **Incremental approach**: Don't rush, test thoroughly

## Expected Outcome

A fully functional application with:
- Complete authentication system
- Building management
- Full-featured dashboard
- All feature pages
- Complete UI component library
- Optimized API layer
- Type-safe codebase
- Production-ready code

---

**This prompt contains the complete inventory of all components, hooks, types, and pages from the previous version. Use this as a reference for the comprehensive refactoring plan.**

