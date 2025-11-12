# 📋 Αναλυτικό Πλάνο Refactoring - Επαναφορά Προηγούμενης Έκδοσης

## 🎯 Στόχος
Επαναφορά της πλήρους λειτουργικότητας της προηγούμενης έκδοσης (commit `4203014f`) στο νέο `public-app` setup, με προσοχή στην αποφυγή conflicts και διατήρηση της συμβατότητας.

---

## 📊 Ανάλυση Προηγούμενης Έκδοσης

### Commit Αναφοράς
- **Commit**: `4203014f` - "feat: Fix all TypeScript errors and prepare for production deployment"
- **Date**: Fri Oct 24 21:28:59 2025
- **Status**: Production-ready με TypeScript fixes

### Αρχιτεκτονική

#### 1. **Contexts** (5 files)
- `AuthContext.tsx` - User authentication & session management
- `BuildingContext.tsx` - Building selection & management
- `DocumentLogContext.tsx` - Document logging
- `LoadingContext.tsx` - Global loading states
- `ReactQueryProvider.tsx` - React Query setup

#### 2. **Components** (~100+ files)
- **Core Components**:
  - `Sidebar.tsx` - Main navigation sidebar με grouped menu
  - `GlobalHeader.tsx` - Header με office logo, building selector
  - `LayoutWrapper.tsx` - Layout wrapper για non-dashboard pages
  - `AppProviders.tsx` - Root providers wrapper
  
- **UI Components** (~30+ shadcn/ui components):
  - Button, Input, Select, Dialog, Toast, κτλ
  
- **Feature Components**:
  - BuildingSelector, BuildingSelectorButton
  - AnnouncementsCarousel, AnnouncementCard
  - DashboardCards, BuildingStats
  - ErrorBoundary, FullPageSpinner
  - κτλ

#### 3. **Hooks** (~60+ files)
- `useAuth.ts`, `useAuthGuard.ts`
- `useBuildings.ts`, `useBuildingCache.ts`, `useBuildingChange.ts`
- `useFinancialDashboard.ts`, `useExpenses.ts`
- `useNavigationWithLoading.ts`
- `useCsrf.ts`, `useEnsureCsrf.ts`
- `useKiosk.ts`, `useKioskWidgets.ts`
- κτλ

#### 4. **Types** (12 files)
- `user.ts` - User types
- `financial.ts` - Financial types
- `kiosk.ts`, `kiosk-widgets.ts` - Kiosk types
- `userRequests.ts`, `vote.ts` - Feature types
- `google-maps.d.ts` - Google Maps types
- κτλ

#### 5. **Pages** (~100+ routes)
- Dashboard pages: `/dashboard`, `/announcements`, `/votes`, `/requests`, `/buildings`, `/financial`, κτλ
- Admin pages: `/admin/*`
- Kiosk pages: `/kiosk/*`, `/kiosk-display`
- Auth pages: `/login`, `/register`, `/logout`

#### 6. **API Layer**
- `lib/api.ts` - Centralized API client με throttling & caching
- API routes: `/api/*` για server-side proxying

#### 7. **Dependencies**
- React Query (`@tanstack/react-query`)
- Radix UI components
- Framer Motion
- Recharts
- Axios
- React Hook Form
- Date-fns
- Sonner & React Hot Toast

---

## 🔄 Σύγκριση με Τρέχουσα Έκδοση

### Τρέχουσα Έκδοση (`public-app`)
- ✅ Basic Sidebar & Header components
- ✅ Dashboard layout
- ✅ Basic API helper (`lib/api.ts`)
- ✅ Simple dashboard page
- ❌ Χωρίς Contexts (AuthContext, BuildingContext)
- ❌ Χωρίς Hooks
- ❌ Χωρίς UI components library
- ❌ Χωρίς feature components

### Προηγούμενη Έκδοση (`frontend`)
- ✅ Πλήρη Contexts system
- ✅ 60+ custom hooks
- ✅ 100+ components
- ✅ Shadcn/ui UI library
- ✅ Πλήρη API layer με throttling
- ✅ TypeScript types

---

## 📝 Πλάνο Refactoring - Φάσεις

### **ΦΑΣΗ 1: Foundation & Dependencies** ⏱️ ~30 min
**Στόχος**: Προετοιμασία infrastructure

#### 1.1 Dependencies Installation
- [ ] Install missing dependencies:
  ```bash
  npm install @tanstack/react-query @tanstack/react-query-devtools
  npm install axios
  npm install react-hot-toast sonner
  npm install framer-motion
  npm install recharts
  npm install react-hook-form @hookform/resolvers
  npm install date-fns
  npm install @radix-ui/* (all UI components)
  ```

#### 1.2 Project Structure Setup
- [ ] Create directories:
  ```
  public-app/src/
    ├── components/
    │   ├── contexts/
    │   ├── ui/
    │   └── ...
    ├── hooks/
    ├── types/
    └── lib/
  ```

#### 1.3 Configuration Files
- [ ] Copy `components.json` (shadcn/ui config)
- [ ] Update `tsconfig.json` paths
- [ ] Update `tailwind.config.js` (if needed)

---

### **ΦΑΣΗ 2: Core Infrastructure** ⏱️ ~1-2 hours
**Στόχος**: Core contexts & utilities

#### 2.1 Types System
- [ ] Copy all types from `frontend/types/`:
  - `types/user.ts`
  - `types/financial.ts`
  - `types/userRequests.ts`
  - `types/vote.ts`
  - `types/kiosk.ts`
  - `types/kiosk-widgets.ts`
  - Type definitions files

#### 2.2 API Layer Enhancement
- [ ] Enhance `lib/api.ts`:
  - Add throttling & caching
  - Add retry logic with exponential backoff
  - Add CSRF handling
  - Add all API functions from old version

#### 2.3 Utils & Helpers
- [ ] Copy utility functions:
  - `lib/utils.ts` (enhance with date formatting, amount formatting)
  - Any other utility files

---

### **ΦΑΣΗ 3: Contexts System** ⏱️ ~2-3 hours
**Στόχος**: Core state management

#### 3.1 AuthContext
- [ ] Copy `components/contexts/AuthContext.tsx`
- [ ] Adapt to new API structure:
  - Update API calls to use new `lib/api.ts`
  - Ensure localStorage keys match (`access_token` vs `access`)
  - Test authentication flow

#### 3.2 BuildingContext
- [ ] Copy `components/contexts/BuildingContext.tsx`
- [ ] Adapt API calls
- [ ] Ensure building selection works

#### 3.3 Other Contexts
- [ ] Copy `LoadingContext.tsx`
- [ ] Copy `ReactQueryProvider.tsx`
- [ ] Copy `DocumentLogContext.tsx` (if needed)

#### 3.4 AppProviders
- [ ] Copy `components/AppProviders.tsx`
- [ ] Adapt routing logic
- [ ] Integrate with new layout structure

---

### **ΦΑΣΗ 4: UI Components Library** ⏱️ ~2-3 hours
**Στόχος**: Shadcn/ui components

#### 4.1 Core UI Components
- [ ] Install shadcn/ui components:
  ```bash
  npx shadcn@latest add button
  npx shadcn@latest add input
  npx shadcn@latest add select
  npx shadcn@latest add dialog
  npx shadcn@latest add toast
  npx shadcn@latest add dropdown-menu
  npx shadcn@latest add tabs
  # ... all other components
  ```

#### 4.2 Custom UI Components
- [ ] Copy custom UI components from `frontend/components/ui/`
- [ ] Adapt imports & paths

---

### **ΦΑΣΗ 5: Core Components** ⏱️ ~3-4 hours
**Στόχος**: Main navigation & layout

#### 5.1 Sidebar Enhancement
- [ ] Enhance `components/Sidebar.tsx`:
  - Add grouped navigation
  - Add role-based filtering
  - Add building selector integration
  - Add calculator modal
  - Improve mobile responsiveness

#### 5.2 GlobalHeader Enhancement
- [ ] Enhance `components/Header.tsx`:
  - Add office logo display
  - Add building selector button
  - Add notifications
  - Add settings modal
  - Add calendar button

#### 5.3 Layout Components
- [ ] Copy `components/LayoutWrapper.tsx`
- [ ] Update `app/(dashboard)/layout.tsx`:
  - Integrate with contexts
  - Add loading states
  - Add error boundaries

#### 5.4 Supporting Components
- [ ] Copy `components/BuildingSelector.tsx`
- [ ] Copy `components/BuildingSelectorButton.tsx`
- [ ] Copy `components/ErrorMessage.tsx`
- [ ] Copy `components/FullPageSpinner.tsx`
- [ ] Copy `components/ErrorBoundary.tsx`
- [ ] Copy `components/GlobalLoadingOverlay.tsx`

---

### **ΦΑΣΗ 6: Hooks System** ⏱️ ~2-3 hours
**Στόχος**: Custom hooks

#### 6.1 Core Hooks
- [ ] Copy essential hooks:
  - `hooks/useAuth.ts`
  - `hooks/useAuthGuard.ts`
  - `hooks/useBuildings.ts`
  - `hooks/useBuildingCache.ts`
  - `hooks/useNavigationWithLoading.ts`
  - `hooks/useCsrf.ts`

#### 6.2 Feature Hooks
- [ ] Copy feature-specific hooks as needed:
  - Financial hooks
  - Announcements hooks
  - Votes hooks
  - Requests hooks
  - κτλ

---

### **ΦΑΣΗ 7: Dashboard & Feature Pages** ⏱️ ~4-6 hours
**Στόχος**: Main application pages

#### 7.1 Dashboard Page
- [ ] Enhance `app/(dashboard)/dashboard/page.tsx`:
  - Add charts (Recharts)
  - Add announcements carousel
  - Add building stats
  - Add obligations summary
  - Add weather widget
  - Add subscription info

#### 7.2 Feature Pages (Priority Order)
1. **Buildings** (`/buildings`)
   - [ ] List page
   - [ ] Detail page
   - [ ] Create/Edit forms

2. **Announcements** (`/announcements`)
   - [ ] List page
   - [ ] Create/Edit forms
   - [ ] Detail page

3. **Financial** (`/financial`)
   - [ ] Dashboard
   - [ ] Expenses
   - [ ] Payments
   - [ ] Reports

4. **Votes** (`/votes`)
   - [ ] List page
   - [ ] Create/Edit forms
   - [ ] Detail page with voting

5. **Requests** (`/requests`)
   - [ ] List page
   - [ ] Create/Edit forms
   - [ ] Detail page

---

### **ΦΑΣΗ 8: Testing & Polish** ⏱️ ~2-3 hours
**Στόχος**: Quality assurance

#### 8.1 Testing
- [ ] Test authentication flow
- [ ] Test building selection
- [ ] Test navigation
- [ ] Test API calls
- [ ] Test responsive design

#### 8.2 Bug Fixes
- [ ] Fix any TypeScript errors
- [ ] Fix any runtime errors
- [ ] Fix styling issues
- [ ] Fix mobile responsiveness

#### 8.3 Documentation
- [ ] Update README
- [ ] Document new components
- [ ] Document hooks usage

---

## ⚠️ Προσοχή - Potential Conflicts

### 1. **API Structure**
- **Conflict**: Old version uses `access` token, new uses `access_token`
- **Solution**: Standardize on `access_token` and update AuthContext

### 2. **Routing**
- **Conflict**: Old version has different route structure
- **Solution**: Maintain new `(dashboard)` route group structure

### 3. **API Endpoints**
- **Conflict**: Old version may use different API paths
- **Solution**: Ensure backend-proxy handles all paths correctly

### 4. **Environment Variables**
- **Conflict**: Different env var names
- **Solution**: Map old env vars to new ones or use both

### 5. **Dependencies Versions**
- **Conflict**: Version mismatches
- **Solution**: Use latest compatible versions, test thoroughly

---

## 📋 Checklist per Session

### Session 1: Foundation
- [ ] Install all dependencies
- [ ] Setup project structure
- [ ] Copy types
- [ ] Enhance API layer

### Session 2: Contexts
- [ ] Copy & adapt AuthContext
- [ ] Copy & adapt BuildingContext
- [ ] Copy other contexts
- [ ] Setup AppProviders

### Session 3: UI Components
- [ ] Install shadcn/ui components
- [ ] Copy custom UI components
- [ ] Test component rendering

### Session 4: Core Components
- [ ] Enhance Sidebar
- [ ] Enhance Header
- [ ] Update Layout
- [ ] Copy supporting components

### Session 5: Hooks & Features
- [ ] Copy essential hooks
- [ ] Enhance Dashboard page
- [ ] Test functionality

### Session 6: Feature Pages
- [ ] Buildings pages
- [ ] Announcements pages
- [ ] Financial pages
- [ ] Other priority pages

### Session 7: Testing & Polish
- [ ] Comprehensive testing
- [ ] Bug fixes
- [ ] Documentation

---

## 🎯 Success Criteria

- ✅ All contexts working
- ✅ Sidebar & Header fully functional
- ✅ Dashboard page with all widgets
- ✅ Building selection working
- ✅ Authentication flow working
- ✅ API calls working with throttling
- ✅ No TypeScript errors
- ✅ Responsive design working
- ✅ All critical features accessible

---

## 📝 Notes

- Προτεραιότητα: Core functionality πρώτα, features μετά
- Testing: Test after each phase
- Commits: Small, focused commits per phase
- Documentation: Update as we go

---

**Created**: 2025-11-12
**Last Updated**: 2025-11-12
**Status**: Ready for execution

