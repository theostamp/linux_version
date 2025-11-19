# 🔄 Global Refresh System

Ένα κεντρικό σύστημα αυτόματης ανανέωσης δεδομένων για όλη την εφαρμογή.

## 🎯 Χαρακτηριστικά

### 1. **Αυτόματη Ανανέωση (Auto-Refresh)**

Το σύστημα ανανεώνει αυτόματα τα δεδομένα σε τρεις περιπτώσεις:

#### 🔍 Window Focus Detection
```typescript
// Όταν ο χρήστης επιστρέφει στο tab:
// - Αν ήταν away > 30 δευτερόλεπτα → Refresh ΟΛΑ
// - Αν ήταν away < 30 δευτερόλεπτα → Refresh μόνο financial data
```

#### 📡 Network Reconnection
```typescript
// Όταν επανασυνδέεται το internet → Refresh ΟΛΑ
```

#### 🎪 Custom Events
```typescript
// Dispatch custom event από οπουδήποτε:
window.dispatchEvent(new CustomEvent('app:refresh', { 
  detail: { scope: 'financial' } 
}));
```

### 2. **React Query Configuration**

```typescript
// Aggressive refetching settings:
staleTime: 0                    // Data is stale immediately
gcTime: 10 * 60 * 1000         // Cache for 10 minutes
refetchOnWindowFocus: true     // Refetch on tab focus
refetchOnReconnect: true       // Refetch on internet reconnect
refetchOnMount: 'always'       // Always refetch on mount
```

### 3. **API-Level Cache Clearing**

```typescript
// Μετά από κάθε mutation (POST/PATCH/DELETE):
invalidateApiCache()  // ← Clears ALL API cache
```

## 📚 Χρήση

### Option 1: Χρήση του Hook

```tsx
import { useGlobalRefresh } from '@/hooks/useGlobalRefresh';

function MyComponent() {
  const { refreshFinancial, refreshBuildings, refreshAll } = useGlobalRefresh();
  
  const handleSave = async () => {
    await saveData();
    await refreshFinancial(); // Refresh financial data only
  };
  
  return (
    <button onClick={refreshAll}>
      Refresh Everything
    </button>
  );
}
```

### Option 2: Χρήση του RefreshButton Component

```tsx
import { RefreshButton } from '@/components/ui/RefreshButton';

function MyPage() {
  return (
    <div>
      <h1>Financial Dashboard</h1>
      
      {/* Refresh button for financial data */}
      <RefreshButton 
        scope="financial" 
        label="Ανανέωση" 
        showToast={true}
      />
      
      {/* Icon-only refresh button */}
      <RefreshButton 
        scope="all" 
        size="icon" 
        variant="ghost"
      />
    </div>
  );
}
```

### Option 3: Χρήση των Utility Functions

```tsx
import { 
  refreshFinancialData, 
  refreshBuildingData, 
  refreshAllData,
  triggerRefresh 
} from '@/lib/globalRefresh';

// Direct function calls:
await refreshFinancialData();
await refreshBuildingData();
await refreshAllData();

// Or trigger via event (useful from non-React code):
triggerRefresh('financial');
triggerRefresh('buildings');
triggerRefresh('all');
```

## 🏗️ Αρχιτεκτονική

```
┌─────────────────────────────────────────────────────┐
│                ReactQueryProvider                    │
│  ├─ staleTime: 0 (always check for fresh data)     │
│  ├─ refetchOnWindowFocus: true                      │
│  ├─ refetchOnReconnect: true                        │
│  └─ refetchOnMount: 'always'                        │
└─────────────────────────────────────────────────────┘
                         │
                         ├──> Global Refresh System
                         │    ├─ Visibility Change Listener
                         │    ├─ Network Reconnect Listener
                         │    └─ Custom Event Listener
                         │
┌────────────────────────┴──────────────────────────┐
│                  3-Layer Caching                   │
│  1. API Cache (lib/api.ts)                        │
│     └─ Clear ALL on mutations                     │
│  2. React Query Cache                             │
│     └─ Invalidate & Refetch                       │
│  3. Component State                               │
│     └─ loadExpenses/loadPayments                  │
└───────────────────────────────────────────────────┘
```

## 🎨 RefreshButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `scope` | `'all'` \| `'financial'` \| `'buildings'` | `'all'` | Τι data να ανανεώσει |
| `label` | `string` | `undefined` | Κείμενο κουμπιού (optional) |
| `variant` | `'default'` \| `'outline'` \| `'ghost'` \| `'link'` | `'outline'` | Button variant |
| `size` | `'default'` \| `'sm'` \| `'lg'` \| `'icon'` | `'sm'` | Button size |
| `className` | `string` | `undefined` | Custom CSS classes |
| `showToast` | `boolean` | `true` | Εμφάνιση toast notification |

## 🔧 Advanced Usage

### Custom Refresh Scopes

Μπορείτε να προσθέσετε custom refresh scopes στο `globalRefresh.ts`:

```typescript
export async function refreshNotifications() {
  if (!globalQueryClient) return;
  
  await globalQueryClient.invalidateQueries({ queryKey: ['notifications'] });
  await globalQueryClient.refetchQueries({ queryKey: ['notifications'] });
}
```

### Conditional Refresh

```tsx
const { refreshFinancial } = useGlobalRefresh();

// Refresh only if data is older than X minutes
const conditionalRefresh = async () => {
  const lastUpdate = localStorage.getItem('last_financial_update');
  const age = Date.now() - Number(lastUpdate);
  
  if (age > 5 * 60 * 1000) { // 5 minutes
    await refreshFinancial();
    localStorage.setItem('last_financial_update', Date.now().toString());
  }
};
```

## 🐛 Debugging

Ανοίξτε το console για να δείτε τα logs:

```
[Global Refresh] Initializing global refresh system
[Global Refresh] Tab hidden
[Global Refresh] Tab visible again after 45s
[Global Refresh] Long absence detected, refreshing all data
[Global Refresh] Refreshing ALL data...
[Global Refresh] ALL data refreshed
```

## 📊 Performance Impact

- **Minimal**: Το cache ζει μόνο 5-10 λεπτά anyway
- **Smart**: Refetch μόνο όταν χρειάζεται (focus, reconnect)
- **Optimistic**: Χρήση cached data κατά το fetching (gcTime)

## ✅ Benefits

1. **No More Stale Data** - Πάντα φρέσκα δεδομένα
2. **No Manual Refresh Needed** - Αυτόματο refresh
3. **Better UX** - Ο χρήστης βλέπει πάντα τα τελευταία δεδομένα
4. **Centralized Control** - Ένα σημείο ελέγχου για όλη την εφαρμογή
5. **Easy to Use** - Simple hooks και components

## 🚀 Migration από Παλιό Σύστημα

### Before:
```tsx
const { loadExpenses } = useExpenses();

await createExpense(data);
await loadExpenses(); // Manual refresh
```

### After:
```tsx
const { refreshFinancial } = useGlobalRefresh();

await createExpense(data);
// Auto-refreshes! Αλλά μπορείς να κάνεις και manual:
await refreshFinancial();
```

## 📝 Notes

- Το σύστημα είναι **opt-in** - Τα components που δεν το χρησιμοποιούν συνεχίζουν να δουλεύουν κανονικά
- Το **React Query** κάνει ήδη auto-refresh με τα default settings
- Το **Global Refresh System** προσθέτει επιπλέον έλεγχο και visibility-based refresh
- Τα **mutations** (POST/PATCH/DELETE) καθαρίζουν **αυτόματα** το API cache

