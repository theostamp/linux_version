# 🖥️ Kiosk Display - Migration Plan (Updated)

**Date**: November 19, 2025  
**Option**: B - Review First + Custom Requirements  
**Estimated Time**: ~2.5 hours

---

## 📋 Project Requirements

### ✅ Requirements from User

1. ✅ **Keep Ctrl+Alt+B Functionality**
   - Keyboard shortcut remains active
   - Opens building selector on Ctrl+Alt+B
   - No visual badge needed

2. ❌ **Remove Visual Badges**
   - Remove "Πρωινή Επισκόπηση" scene badge (top-left)
   - Remove "Κτίριο" building badge (top-right)
   - Keep functionality, remove UI elements

3. ✅ **Migrate to BuildingContext**
   - Use unified building state management
   - Eliminate state duplication
   - Consistent with financial module

---

## 🎯 Migration Tasks

### Phase 1: Remove Visual Badges (30 min)

#### Task 1.1: Remove Scene Badge (top-left)

**Location**: `app/kiosk-display/page.tsx` - Lines ~279-282

**Current Code:**
```typescript
{/* Scene badge */}
<div className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur px-4 py-2 rounded-lg text-sm font-semibold">
  Πρωινή Επισκόπηση
</div>
```

**Action**: 🗑️ **REMOVE ENTIRE BLOCK**

**Testing:**
- [ ] Top-left corner is clear
- [ ] No visual badge visible
- [ ] Layout remains correct

#### Task 1.2: Remove Building Selector Badge (top-right)

**Location**: `app/kiosk-display/page.tsx` - Lines ~285-302

**Current Code:**
```typescript
{/* Building selector badge */}
<div className="absolute top-4 right-4 z-20">
  <button
    onClick={openBuildingSelector}
    className="flex items-center gap-3 bg-black/50 backdrop-blur px-4 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-colors"
  >
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10">
      <BuildingIcon className="w-5 h-5 text-white" />
    </div>
    <div className="text-left">
      <p className="text-xs text-white/70">Κτίριο</p>
      <p className="text-sm font-semibold">{buildingLabel}</p>
      <p className="text-[11px] text-white/60 leading-tight">{buildingSubLabel}</p>
    </div>
    <div className="text-[10px] uppercase tracking-wide text-white/60 hidden lg:block">
      Ctrl+Alt+B
    </div>
  </button>
</div>
```

**Action**: 🗑️ **REMOVE ENTIRE BLOCK**

**Note**: 
- ❌ Remove visual badge
- ✅ Keep `openBuildingSelector` function
- ✅ Keep keyboard shortcut (already implemented in `useKeyboardShortcuts`)

**Testing:**
- [ ] Top-right corner is clear
- [ ] No visual badge visible
- [ ] Ctrl+Alt+B still works
- [ ] Building selector opens on keyboard shortcut

---

### Phase 2: Migrate to BuildingContext (1.5 hours)

#### Task 2.1: Update page.tsx (1 hour)

**Location**: `app/kiosk-display/page.tsx`

**Changes Required:**

##### 2.1.1: Add BuildingContext Import

**Add to imports (Line ~13):**
```typescript
import { useBuilding } from '@/components/contexts/BuildingContext';
```

##### 2.1.2: Remove Manual State Management

**Remove (Lines ~67-68):**
```typescript
const [selectedBuildingId, setSelectedBuildingId] = useState<number>(1);
const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
```

**Remove (Lines ~81-92):**
```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;

  const queryId = parseBuildingId(buildingParam);
  const storedRaw =
    window.localStorage.getItem(KIOSK_BUILDING_STORAGE_KEY) ??
    window.localStorage.getItem('selectedBuildingId');
  const storedId = parseBuildingId(storedRaw);
  const nextId = queryId ?? storedId ?? 1;

  setSelectedBuildingId(nextId);
}, [buildingParam]);
```

**Remove (Lines ~94-97):**
```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KIOSK_BUILDING_STORAGE_KEY, selectedBuildingId.toString());
}, [selectedBuildingId]);
```

**Remove (Lines ~99-111):**
```typescript
useEffect(() => {
  // When "all buildings" is selected (buildingId = 0), set selectedBuilding to null
  if (selectedBuildingId === 0) {
    setSelectedBuilding(null);
    return;
  }
  
  if (!kioskData?.building_info) return;
  if (selectedBuilding && selectedBuilding.id === kioskData.building_info.id) {
    return;
  }
  setSelectedBuilding(mapBuildingInfoToBuilding(kioskData.building_info));
}, [kioskData?.building_info, selectedBuilding, selectedBuildingId]);
```

##### 2.1.3: Add BuildingContext Usage

**Add after component declaration (Line ~60):**
```typescript
function KioskDisplayPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✅ NEW: Use BuildingContext
  const { 
    selectedBuilding, 
    buildingContext,
    setSelectedBuilding: selectBuilding,
  } = useBuilding();
  const selectedBuildingId = selectedBuilding?.id || 1;
  
  // ... rest of component
```

##### 2.1.4: Update handleBuildingSelect

**Replace (Lines ~116-137):**
```typescript
const handleBuildingSelect = useCallback(
  (building: Building | null) => {
    const nextId = building ? building.id : 0;
    setSelectedBuildingId(nextId);
    setSelectedBuilding(building);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(searchParamsString);
      if (nextId > 0) {
        params.set('building', String(nextId));
      } else {
        params.delete('building');
      }
      const nextQuery = params.toString();
      const target = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(target, { scroll: false });
    }

    setIsBuildingSelectorOpen(false);
  },
  [pathname, router, searchParamsString]
);
```

**With:**
```typescript
const handleBuildingSelect = useCallback(
  (building: Building | null) => {
    // ✅ Use BuildingContext method
    selectBuilding(building);
    setIsBuildingSelectorOpen(false);
  },
  [selectBuilding]
);
```

##### 2.1.5: Update Building Labels

**Keep useMemo for labels (Lines ~241-253):**
```typescript
const buildingLabel = useMemo(() => {
  if (selectedBuildingId === 0) {
    return 'Όλα τα Κτίρια';
  }
  return kioskData?.building_info?.name || selectedBuilding?.name || 'Επιλογή Κτιρίου';
}, [kioskData?.building_info?.name, selectedBuilding?.name, selectedBuildingId]);

const buildingSubLabel = useMemo(() => {
  if (selectedBuildingId === 0) {
    return 'Συνδυαστικά δεδομένα';
  }
  return kioskData?.building_info?.address || selectedBuilding?.address || 'Πατήστε Ctrl+Alt+B';
}, [kioskData?.building_info?.address, selectedBuilding?.address, selectedBuildingId]);
```

**Note**: Keep these for BuildingSelector component (still needs labels)

##### 2.1.6: Remove Unused Variables/Constants

**Can remove:**
```typescript
const KIOSK_BUILDING_STORAGE_KEY = 'kioskSelectedBuildingId'; // Not needed anymore
const buildingParam = searchParams?.get('building') ?? null; // BuildingContext handles this
```

#### Task 2.2: Update KioskSceneRenderer.tsx (30 min)

**Location**: `components/KioskSceneRenderer.tsx`

**Changes Required:**

##### 2.2.1: Add BuildingContext Import

**Add to imports (Line ~4):**
```typescript
import { useBuilding } from '@/components/contexts/BuildingContext';
```

##### 2.2.2: Remove selectedBuildingId Prop

**Update interface (Lines ~10-12):**
```typescript
// Before
interface KioskSceneRendererProps {
  selectedBuildingId?: number | null;
}

// After
interface KioskSceneRendererProps {
  // No props needed - gets from context
}
```

##### 2.2.3: Get Building from Context

**Update component (Lines ~14-19):**
```typescript
// Before
export default function KioskSceneRenderer({ 
  selectedBuildingId 
}: KioskSceneRendererProps) {
  const { scenes, isLoading, error } = useKioskScenes(selectedBuildingId ?? null);
  const { data: kioskData } = useKioskData(selectedBuildingId ?? null);

// After
export default function KioskSceneRenderer() {
  // ✅ Get from BuildingContext
  const { selectedBuilding } = useBuilding();
  const selectedBuildingId = selectedBuilding?.id ?? null;
  
  const { scenes, isLoading, error } = useKioskScenes(selectedBuildingId);
  const { data: kioskData } = useKioskData(selectedBuildingId);
```

##### 2.2.4: Update Parent Component (page.tsx)

**Find where KioskSceneRenderer is used** (if applicable) and remove prop:

```typescript
// Before
<KioskSceneRenderer selectedBuildingId={selectedBuildingId} />

// After
<KioskSceneRenderer />
```

**Note**: Check if KioskSceneRenderer is actually used in page.tsx or if it's unused.

---

### Phase 3: Testing & Validation (30 min)

#### 3.1 Functional Testing

**Building Selection:**
- [ ] Press Ctrl+Alt+B
- [ ] Building selector opens
- [ ] Select a building
- [ ] Kiosk data updates
- [ ] URL param updates (check browser address bar)
- [ ] localStorage updates (check DevTools)

**Multi-tab Support:**
- [ ] Open kiosk in Tab 1
- [ ] Open kiosk in Tab 2
- [ ] Change building in Tab 1
- [ ] Tab 2 should update automatically
- [ ] Verify both tabs show same building

**URL Navigation:**
- [ ] Navigate to `/kiosk-display?building=1`
- [ ] Verify correct building loads
- [ ] Navigate to `/kiosk-display?building=2`
- [ ] Verify building changes
- [ ] Navigate to `/kiosk-display` (no param)
- [ ] Verify default building loads

**Data Loading:**
- [ ] Kiosk data loads correctly
- [ ] Announcements show for selected building
- [ ] Financial data (debts) show for selected building
- [ ] Weather shows correctly
- [ ] News ticker shows

**UI/Visual:**
- [ ] ❌ No "Πρωινή Επισκόπηση" badge visible
- [ ] ❌ No "Κτίριο" badge visible
- [ ] ✅ Screen is clean (no badges)
- [ ] ✅ Layout is intact
- [ ] ✅ All sections render correctly

#### 3.2 Integration Testing

**With Financial Module:**
- [ ] Select building in financial module
- [ ] Navigate to kiosk-display
- [ ] Same building should be selected
- [ ] Data should match

**With Main App:**
- [ ] Select building in main app
- [ ] Open kiosk in new tab
- [ ] Same building should be selected

#### 3.3 Technical Validation

**TypeScript:**
```bash
cd public-app
npm run type-check
```
- [ ] No TypeScript errors
- [ ] All types are correct

**Linting:**
```bash
npm run lint
```
- [ ] No linter errors
- [ ] No warnings

**Build:**
```bash
npm run build
```
- [ ] Build succeeds
- [ ] No build errors

---

## 📊 Before/After Comparison

### Visual Changes

#### Before:
```
┌─────────────────────────────────────────────────────┐
│ [Πρωινή Επισκόπηση]           [Κτίριο Badge] │
│                                                     │
│                                                     │
│         KIOSK CONTENT HERE                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### After:
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                                                     │
│         KIOSK CONTENT HERE                         │
│                                                     │
│         (Clean screen, no badges)                  │
└─────────────────────────────────────────────────────┘

Ctrl+Alt+B still works! (invisible but functional)
```

### Code Changes Summary

| File | Lines Removed | Lines Added | Net Change |
|------|--------------|-------------|------------|
| page.tsx | ~80 lines | ~10 lines | -70 lines |
| KioskSceneRenderer.tsx | ~5 lines | ~5 lines | 0 lines |
| **Total** | **~85 lines** | **~15 lines** | **-70 lines** |

**Result**: Cleaner, simpler code! 🎉

---

## 🎯 Success Criteria

### Must Have ✅

- [x] No visual badges displayed
- [x] Ctrl+Alt+B keyboard shortcut works
- [x] Building selector opens on Ctrl+Alt+B
- [x] Uses BuildingContext for state
- [x] No manual URL/localStorage sync
- [x] Consistent with financial module
- [x] Multi-tab support works
- [x] TypeScript compiles
- [x] No linter errors

### Nice to Have 🎁

- [ ] Improved loading states
- [ ] Better error messages
- [ ] Performance optimizations
- [ ] Additional keyboard shortcuts

---

## 🚨 Risk Assessment

### Low Risk ✅

- Removing badges (simple UI change)
- Using BuildingContext (proven pattern)
- Keyboard shortcut already implemented
- No logic changes to core functionality

### Medium Risk ⚠️

- State management changes (test thoroughly)
- Multi-tab synchronization (new feature)

### Mitigation

- ✅ Test in development first
- ✅ Test multi-tab behavior
- ✅ Test keyboard shortcuts
- ✅ Keep backup of current code
- ✅ Deploy to staging before production

---

## 📋 Implementation Checklist

### Pre-Implementation
- [x] Review compatibility report
- [x] Review migration plan
- [ ] Backup current kiosk-display code
- [ ] Create feature branch
- [ ] Test current functionality

### Phase 1: Remove Badges (30 min)
- [ ] Remove scene badge (top-left)
- [ ] Remove building badge (top-right)
- [ ] Test visual appearance
- [ ] Verify layout is intact
- [ ] Commit changes

### Phase 2: BuildingContext Migration (1.5h)
- [ ] Add BuildingContext import
- [ ] Remove manual state management
- [ ] Remove URL/localStorage sync
- [ ] Update handleBuildingSelect
- [ ] Update KioskSceneRenderer
- [ ] Remove unused code
- [ ] Commit changes

### Phase 3: Testing (30 min)
- [ ] Test Ctrl+Alt+B shortcut
- [ ] Test building selection
- [ ] Test multi-tab behavior
- [ ] Test URL navigation
- [ ] Test data loading
- [ ] Run TypeScript check
- [ ] Run linter
- [ ] Run build

### Post-Implementation
- [ ] Code review
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 📝 Code Snippets

### Remove Scene Badge

**File**: `app/kiosk-display/page.tsx`  
**Line**: ~279-282

```typescript
// DELETE THIS ENTIRE BLOCK:
{/* Scene badge */}
<div className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur px-4 py-2 rounded-lg text-sm font-semibold">
  Πρωινή Επισκόπηση
</div>
```

### Remove Building Badge

**File**: `app/kiosk-display/page.tsx`  
**Line**: ~285-302

```typescript
// DELETE THIS ENTIRE BLOCK:
{/* Building selector badge */}
<div className="absolute top-4 right-4 z-20">
  <button
    onClick={openBuildingSelector}
    className="flex items-center gap-3 bg-black/50 backdrop-blur px-4 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-colors"
  >
    {/* ... entire button content ... */}
  </button>
</div>
```

### Add BuildingContext

**File**: `app/kiosk-display/page.tsx`  
**Line**: ~13 (imports)

```typescript
import { useBuilding } from '@/components/contexts/BuildingContext';
```

**Line**: ~60 (in component)

```typescript
// ADD THIS:
const { 
  selectedBuilding, 
  buildingContext,
  setSelectedBuilding: selectBuilding,
} = useBuilding();
const selectedBuildingId = selectedBuilding?.id || 1;
```

### Simplified Building Selection

**File**: `app/kiosk-display/page.tsx`  
**Replace handleBuildingSelect:**

```typescript
const handleBuildingSelect = useCallback(
  (building: Building | null) => {
    selectBuilding(building);
    setIsBuildingSelectorOpen(false);
  },
  [selectBuilding]
);
```

---

## 🎓 Notes

### Why Remove Badges?

1. **Cleaner UI**: Less visual clutter
2. **Focus on Content**: More space for kiosk data
3. **Professional Look**: Clean, minimalist design
4. **Functionality Preserved**: Ctrl+Alt+B still works

### Why Keep Ctrl+Alt+B?

1. **Power User Feature**: Advanced users can change building
2. **No UI Clutter**: Keyboard shortcut is invisible
3. **Quick Access**: Faster than clicking badge
4. **Already Implemented**: useKeyboardShortcuts hook exists

### Why Migrate to BuildingContext?

1. **Consistency**: Same pattern as financial module
2. **No Duplication**: Single source of truth
3. **Multi-tab Support**: State syncs across tabs
4. **Maintainability**: Update once, works everywhere
5. **Less Code**: -70 lines of code!

---

## 📞 Support

### If Something Goes Wrong

1. **Ctrl+Alt+B doesn't work**
   - Check useKeyboardShortcuts is imported
   - Check onBuildingSelector is passed
   - Check keyboard event listener

2. **Building doesn't change**
   - Check BuildingContext is wrapping component
   - Check selectBuilding is called
   - Check BuildingProvider is in layout

3. **Multi-tab doesn't work**
   - Check localStorage events
   - Check BuildingContext listens to storage events
   - Test in different browsers

4. **TypeScript errors**
   - Check all imports are correct
   - Check prop interfaces are updated
   - Run `npm run type-check`

---

## 🏆 Expected Results

### After Migration

✅ **Visual**
- Clean screen (no badges)
- More content space
- Professional appearance

✅ **Functional**
- Ctrl+Alt+B works perfectly
- Building selection works
- Data updates correctly
- Multi-tab support

✅ **Technical**
- Uses BuildingContext
- No state duplication
- 70 fewer lines of code
- Consistent with financial module
- Better maintainability

---

**Status**: 📋 **READY TO IMPLEMENT**  
**Estimated Time**: ~2.5 hours  
**Risk**: LOW  
**Complexity**: MEDIUM  

**Next Step**: Θέλεις να προχωρήσουμε με implementation;

---

## ✨ Ambient Showcase Configuration (νέα σκηνή)

- Η νέα σκηνή `Ambient Showcase` βρίσκεται στο [`public-app/src/components/kiosk/scenes/AmbientShowcaseScene.tsx`](public-app/src/components/kiosk/scenes/AmbientShowcaseScene.tsx) και χρησιμοποιεί ρυθμίσεις από το helper [`branding.ts`](public-app/src/components/kiosk/scenes/branding.ts).
- Τα assets παρασκηνίου αποθηκεύονται στον φάκελο [`public-app/public/kiosk/assets`](public-app/public/kiosk/assets). Προστέθηκε το προεπιλεγμένο `ambient-default.png`, αλλά μπορείτε να ανεβάσετε δικές σας εικόνες/βίντεο (π.χ. `/kiosk/assets/lobby.mp4`).
- Για να παραμετροποιηθεί η σκηνή μέσω backend, το κάθε `scene.settings` μπορεί να περιλαμβάνει πεδίο `ambientBranding` με το παρακάτω σχήμα:

```json
{
  "ambientBranding": {
    "background": {
      "type": "video",
      "src": "/kiosk/assets/lobby-loop.mp4",
      "overlayColor": "rgba(5,10,32,0.55)"
    },
    "tagline": "Καλωσορίσατε στο Αtrium",
    "subline": "Συνδεθείτε για ζωντανή ενημέρωση",
    "cta": {
      "label": "Ζήστε το demo",
      "sublabel": "Σκανάρετε για πρόσβαση"
    }
  }
}
```

- Το διακριτικό promotion card βρίσκεται στο [`AppSpotlightCard`](public-app/src/components/kiosk/widgets/AppSpotlightCard.tsx) και εμφανίζεται στην αριστερή sidebar, με δυναμικά δεδομένα (όνομα κτιρίου, CTA, QR).
- Ο renderer ενημερώθηκε ώστε η σκηνή `Ambient Showcase` να λειτουργεί τόσο ως fallback όσο και ως κανονική σκηνή αν έρθει από API, άρα νέα backgrounds/κειμενικά στοιχεία μπορούν να αλλάζουν χωρίς κώδικα.

