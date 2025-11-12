# 📋 Λεπτομερής Checklist - File-by-File Refactoring

## 📊 Στατιστικά Προηγούμενης Έκδοσης

- **Components**: ~100+ files
- **Hooks**: ~60+ files  
- **Types**: 12 files
- **Contexts**: 5 files
- **Pages**: ~100+ routes
- **UI Components**: ~41 files

---

## 🔍 Phase-by-Phase Detailed Checklist

### **PHASE 1: Foundation & Dependencies**

#### 1.1 Dependencies Installation
```bash
# Core
npm install @tanstack/react-query@^5.90.5 @tanstack/react-query-devtools@^5.90.2
npm install axios@^1.3.0
npm install react-hot-toast@^2.6.0 sonner@^2.0.7

# UI & Animation
npm install framer-motion@^12.23.24
npm install recharts@^3.3.0
npm install @radix-ui/react-alert-dialog@^1.1.15
npm install @radix-ui/react-dialog@^1.1.15
npm install @radix-ui/react-dropdown-menu@^2.1.16
npm install @radix-ui/react-select@^2.2.6
npm install @radix-ui/react-toast@^1.2.15
npm install @radix-ui/react-tabs@^1.1.13
npm install @radix-ui/react-tooltip@^1.2.8
npm install @radix-ui/react-popover@^1.1.15
npm install @radix-ui/react-avatar@^1.1.10
npm install @radix-ui/react-checkbox@^1.3.3
npm install @radix-ui/react-radio-group@^1.3.8
npm install @radix-ui/react-scroll-area@^1.2.10
npm install @radix-ui/react-separator@^1.1.7
npm install @radix-ui/react-switch@^1.2.6
npm install @radix-ui/react-progress@^1.1.7
npm install @radix-ui/react-label@^2.1.7
npm install @radix-ui/react-slot@^1.2.3

# Forms & Validation
npm install react-hook-form@^7.43.0 @hookform/resolvers@^3.10.0
npm install react-day-picker@^9.11.1

# Utilities
npm install date-fns@^4.1.0
npm install class-variance-authority@^0.7.1
npm install qrcode@^1.5.4 @types/qrcode@^1.5.5
npm install file-saver@^2.0.5
npm install html2canvas@^1.4.1
npm install jspdf@^3.0.3
npm install react-dropzone@^14.3.8
npm install keen-slider@^6.8.6

# Fonts
npm install @fontsource/inter-tight@^5.1.0
npm install @fontsource/open-sans@^5.1.0
npm install @fontsource/roboto-condensed@^5.1.0
npm install @fontsource/ubuntu-condensed@^5.1.0
```

#### 1.2 Directory Structure
```
public-app/src/
├── components/
│   ├── contexts/          [NEW]
│   ├── ui/               [NEW - shadcn/ui]
│   ├── guards/           [NEW]
│   ├── todos/            [NEW]
│   ├── events/           [NEW]
│   ├── kiosk/            [NEW - optional]
│   └── ...               [existing]
├── hooks/                [NEW]
├── types/                [NEW]
└── lib/
    ├── api.ts            [ENHANCE]
    └── utils.ts          [ENHANCE]
```

#### 1.3 Configuration Files
- [ ] Copy `components.json` from old version
- [ ] Update `tsconfig.json` paths:
  ```json
  {
    "compilerOptions": {
      "paths": {
        "@/*": ["./src/*"],
        "@/components/*": ["./src/components/*"],
        "@/hooks/*": ["./src/hooks/*"],
        "@/types/*": ["./src/types/*"],
        "@/lib/*": ["./src/lib/*"]
      }
    }
  }
  ```

---

### **PHASE 2: Types System**

#### 2.1 Core Types
- [ ] `types/user.ts` - User interface & types
- [ ] `types/financial.ts` - Financial data types
- [ ] `types/userRequests.ts` - Request types
- [ ] `types/vote.ts` - Vote types
- [ ] `types/notifications.ts` - Notification types

#### 2.2 Feature Types
- [ ] `types/kiosk.ts` - Kiosk types
- [ ] `types/kiosk-widgets.ts` - Widget types
- [ ] `types/improved-financial.ts` - Enhanced financial types

#### 2.3 Type Definitions
- [ ] `types/google-maps.d.ts` - Google Maps types
- [ ] `types/axios-augment.d.ts` - Axios augmentation
- [ ] `types/react-hot-toast.d.ts` - Toast types

**Action**: Copy all files from `frontend/types/` → `public-app/src/types/`

---

### **PHASE 3: API Layer Enhancement**

#### 3.1 Enhance `lib/api.ts`
**Current**: Basic API helper
**Target**: Full-featured API client with:
- [ ] Request throttling & caching
- [ ] Exponential backoff retry logic
- [ ] CSRF token handling
- [ ] All API functions:
  - [ ] `getCurrentUser()`
  - [ ] `loginUser()`
  - [ ] `logoutUser()`
  - [ ] `fetchAllBuildings()`
  - [ ] `fetchAllBuildingsPublic()`
  - [ ] `fetchObligationsSummary()`
  - [ ] `fetchAnnouncements()`
  - [ ] `fetchVotes()`
  - [ ] `fetchRequests()`
  - [ ] `fetchTopRequests()`
  - [ ] All other API functions

**Action**: Merge old `lib/api.ts` functionality into new one

---

### **PHASE 4: Contexts System**

#### 4.1 AuthContext
**File**: `components/contexts/AuthContext.tsx` (~291 lines)
- [ ] Copy file
- [ ] Adapt localStorage keys:
  - Old: `access`, `refresh`
  - New: `access_token`, `refresh_token`
- [ ] Update API calls to use new `lib/api.ts`
- [ ] Test authentication flow

#### 4.2 BuildingContext  
**File**: `components/contexts/BuildingContext.tsx` (~200 lines)
- [ ] Copy file
- [ ] Update API calls
- [ ] Ensure building selection works
- [ ] Test context provider

#### 4.3 LoadingContext
**File**: `components/contexts/LoadingContext.tsx`
- [ ] Copy file
- [ ] Test global loading states

#### 4.4 ReactQueryProvider
**File**: `components/contexts/ReactQueryProvider.tsx`
- [ ] Copy file
- [ ] Configure React Query defaults
- [ ] Add devtools (dev only)

#### 4.5 DocumentLogContext (Optional)
**File**: `components/contexts/DocumentLogContext.tsx`
- [ ] Copy if needed for document features

#### 4.6 AppProviders
**File**: `components/AppProviders.tsx`
- [ ] Copy file
- [ ] Adapt routing logic:
  - Old: Different route structure
  - New: `(dashboard)` route group
- [ ] Integrate all contexts
- [ ] Test provider hierarchy

---

### **PHASE 5: UI Components Library**

#### 5.1 Shadcn/UI Core Components
Install via CLI:
```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add dialog
npx shadcn@latest add toast
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tabs
npx shadcn@latest add card
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add calendar
npx shadcn@latest add checkbox
npx shadcn@latest add label
npx shadcn@latest add popover
npx shadcn@latest add progress
npx shadcn@latest add radio-group
npx shadcn@latest add scroll-area
npx shadcn@latest add separator
npx shadcn@latest add switch
npx shadcn@latest add tooltip
```

#### 5.2 Custom UI Components
Copy from `frontend/components/ui/`:
- [ ] `AppButton.tsx`
- [ ] `AppCard.tsx`
- [ ] `BackButton.tsx`
- [ ] `CalculatorModal.tsx`
- [ ] `CategorySelector.tsx`
- [ ] `ConfirmDialog.tsx`
- [ ] `CustomProgress.tsx`
- [ ] `DistributionSelector.tsx`
- [ ] `FileOpenWith.tsx`
- [ ] `FilePreview.tsx`
- [ ] `FileUpload.tsx`
- [ ] `ProgressBar.tsx`
- [ ] `SidebarNavItem.tsx`

---

### **PHASE 6: Core Components**

#### 6.1 Sidebar Enhancement
**File**: `components/Sidebar.tsx`
**Current**: Basic sidebar (~140 lines)
**Target**: Full-featured sidebar (~590 lines)

**Changes Needed**:
- [ ] Add grouped navigation structure
- [ ] Add role-based filtering
- [ ] Add building selector integration
- [ ] Add calculator modal
- [ ] Improve mobile responsiveness
- [ ] Add loading states
- [ ] Add "no access" states

**Action**: Merge old Sidebar logic into new one

#### 6.2 GlobalHeader Enhancement
**File**: `components/Header.tsx` → Rename to `GlobalHeader.tsx`
**Current**: Basic header (~116 lines)
**Target**: Full-featured header (~235 lines)

**Changes Needed**:
- [ ] Add office logo display
- [ ] Add building selector button
- [ ] Add notifications bell
- [ ] Add settings modal
- [ ] Add calendar button
- [ ] Add user role display
- [ ] Improve responsive design

**Action**: Merge old GlobalHeader logic into new one

#### 6.3 Layout Components
- [ ] Copy `components/LayoutWrapper.tsx`
- [ ] Update `app/(dashboard)/layout.tsx`:
  - [ ] Integrate with AuthContext
  - [ ] Integrate with BuildingContext
  - [ ] Add loading states
  - [ ] Add error boundaries
  - [ ] Add monthly tasks reminder modal

#### 6.4 Supporting Components
Copy essential components:
- [ ] `components/BuildingSelector.tsx`
- [ ] `components/BuildingSelectorButton.tsx`
- [ ] `components/ErrorMessage.tsx`
- [ ] `components/FullPageSpinner.tsx`
- [ ] `components/ErrorBoundary.tsx`
- [ ] `components/GlobalLoadingOverlay.tsx`
- [ ] `components/GoToTopButton.tsx`
- [ ] `components/AuthGate.tsx`
- [ ] `components/SubscriptionGate.tsx`
- [ ] `components/LogoutButton.tsx`
- [ ] `components/OfficeSettingsModal.tsx`

---

### **PHASE 7: Essential Hooks**

#### 7.1 Core Hooks (Priority)
- [ ] `hooks/useAuth.ts`
- [ ] `hooks/useAuthGuard.ts`
- [ ] `hooks/useBuildings.ts`
- [ ] `hooks/useBuildingCache.ts`
- [ ] `hooks/useBuildingChange.ts`
- [ ] `hooks/useCurrentUser.ts`
- [ ] `hooks/useNavigationWithLoading.ts`
- [ ] `hooks/useCsrf.ts`
- [ ] `hooks/useEnsureCsrf.ts`
- [ ] `hooks/useLogout.ts`

#### 7.2 Feature Hooks (As Needed)
- [ ] `hooks/useFinancialDashboard.ts`
- [ ] `hooks/useExpenses.ts`
- [ ] `hooks/useAnnouncements.ts`
- [ ] `hooks/useVotes.ts`
- [ ] `hooks/useRequests.ts`
- [ ] `hooks/useResidents.ts`
- [ ] `hooks/useNotifications.ts`
- [ ] `hooks/useMonthlyTasksReminder.ts`

**Action**: Copy hooks one by one, test each

---

### **PHASE 8: Dashboard Page Enhancement**

#### 8.1 Current Dashboard
**File**: `app/(dashboard)/dashboard/page.tsx`
**Current**: Basic dashboard with buildings list
**Target**: Full-featured dashboard with widgets

#### 8.2 Components to Add
- [ ] `components/DashboardCards.tsx`
- [ ] `components/BuildingStats.tsx`
- [ ] `components/AnnouncementsCarousel.tsx`
- [ ] `components/SelectedBuildingInfo.tsx`
- [ ] Weather widget integration
- [ ] Subscription info widget
- [ ] Charts (Recharts integration)

#### 8.3 Features to Add
- [ ] Obligations summary
- [ ] Announcements carousel
- [ ] Votes display
- [ ] Requests display
- [ ] Top requests
- [ ] Weather widget
- [ ] Subscription status
- [ ] Charts & graphs

**Action**: Enhance dashboard page incrementally

---

### **PHASE 9: Feature Pages (Priority Order)**

#### 9.1 Buildings Pages
- [ ] `app/(dashboard)/buildings/page.tsx` - List
- [ ] `app/(dashboard)/buildings/[id]/page.tsx` - Detail
- [ ] `app/(dashboard)/buildings/[id]/edit/page.tsx` - Edit
- [ ] `app/(dashboard)/buildings/new/page.tsx` - Create
- [ ] `app/(dashboard)/buildings/[id]/layout.tsx` - Layout

**Components Needed**:
- [ ] `components/BuildingCard.tsx`
- [ ] `components/BuildingTable.tsx`
- [ ] `components/CreateBuildingForm.tsx`
- [ ] `components/BuildingDetailsModal.tsx`

#### 9.2 Announcements Pages
- [ ] `app/(dashboard)/announcements/page.tsx` - List
- [ ] `app/(dashboard)/announcements/[id]/page.tsx` - Detail
- [ ] `app/(dashboard)/announcements/new/page.tsx` - Create
- [ ] `app/(dashboard)/announcements/new-assembly/page.tsx` - Assembly

**Components Needed**:
- [ ] `components/AnnouncementCard.tsx`
- [ ] `components/AnnouncementContent.tsx`
- [ ] `components/AnnouncementsCarousel.tsx`
- [ ] `components/AssemblyForm.tsx`

#### 9.3 Financial Pages
- [ ] `app/(dashboard)/financial/page.tsx` - Dashboard
- [ ] `app/(dashboard)/financial/layout.tsx` - Layout

**Components Needed**: (Many financial components)

#### 9.4 Votes Pages
- [ ] `app/(dashboard)/votes/page.tsx` - List
- [ ] `app/(dashboard)/votes/[id]/page.tsx` - Detail
- [ ] `app/(dashboard)/votes/new/page.tsx` - Create

#### 9.5 Requests Pages
- [ ] `app/(dashboard)/requests/page.tsx` - List
- [ ] `app/(dashboard)/requests/[id]/page.tsx` - Detail
- [ ] `app/(dashboard)/requests/new/page.tsx` - Create

---

### **PHASE 10: Testing & Polish**

#### 10.1 Functionality Testing
- [ ] Authentication flow
- [ ] Building selection
- [ ] Navigation
- [ ] API calls
- [ ] Form submissions
- [ ] Data loading
- [ ] Error handling

#### 10.2 UI/UX Testing
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Animations
- [ ] Transitions

#### 10.3 Performance Testing
- [ ] Page load times
- [ ] API call optimization
- [ ] Bundle size
- [ ] Memory leaks

#### 10.4 Bug Fixes
- [ ] TypeScript errors
- [ ] Runtime errors
- [ ] Console warnings
- [ ] Styling issues

---

## 🔄 Migration Strategy

### Approach: Incremental & Tested
1. **Copy → Adapt → Test** for each component
2. **Small commits** per feature
3. **Test after each phase**
4. **Document changes** as we go

### Conflict Resolution
- **API**: Standardize on `access_token`
- **Routing**: Maintain `(dashboard)` structure
- **Imports**: Update all import paths
- **Dependencies**: Use latest compatible versions

---

## 📝 Session Planning

### Session 1 (Foundation)
- Dependencies installation
- Directory structure
- Types system
- API layer enhancement

### Session 2 (Contexts)
- All contexts
- AppProviders
- Testing

### Session 3 (UI Components)
- Shadcn/ui installation
- Custom UI components
- Testing

### Session 4 (Core Components)
- Sidebar enhancement
- Header enhancement
- Layout updates
- Supporting components

### Session 5 (Hooks & Dashboard)
- Essential hooks
- Dashboard enhancement
- Testing

### Session 6+ (Feature Pages)
- Buildings
- Announcements
- Financial
- Other features

---

**Status**: Ready for execution
**Estimated Total Time**: 15-20 hours across multiple sessions

