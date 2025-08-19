# Αυτόματη Ανανέωση Δεδομένων - Βελτιώσεις

## Επισκόπηση

Έχουν εφαρμοστεί βελτιώσεις στο σύστημα για την αυτόματη ανανέωση των δεδομένων όταν αλλάζει ο χρήστης κτίριο μέσω του dropdown. Το σύστημα τώρα παρέχει καλύτερη εμπειρία χρήστη με loading states, error handling, και real-time updates.

## Βελτιώσεις που Εφαρμόστηκαν

### 1. Βελτιωμένο `usePublicInfo` Hook

**Αρχείο:** `frontend/hooks/usePublicInfo.ts`

- **Caching Strategy**: Προσθήκη `staleTime: 30000` (30 δευτερόλεπτα)
- **Automatic Refetching**: 
  - `refetchOnWindowFocus: true` - ανανέωση όταν το παράθυρο επιστρέφει στο focus
  - `refetchOnReconnect: true` - ανανέωση όταν επιστρέφει η σύνδεση
  - `refetchInterval: 60000` - αυτόματη ανανέωση κάθε λεπτό
- **Retry Logic**: 
  - Μέχρι 3 προσπάθειες με exponential backoff
  - Δεν επαναλαμβάνει σε 404 errors (κτίριο δεν βρέθηκε)

### 2. Νέο `useBuildingChange` Hook

**Αρχείο:** `frontend/hooks/useBuildingChange.ts`

- **Centralized Building Change Logic**: Κεντρικοποιημένη διαχείριση αλλαγών κτιρίου
- **Loading States**: Διαχείριση loading states κατά την αλλαγή
- **Error Handling**: Καλύτερο χειρισμό σφαλμάτων
- **Toast Notifications**: Επιλογικές ειδοποιήσεις για επιτυχείες/σφάλματα
- **URL Management**: Αυτόματη ενημέρωση URL parameters

### 3. Βελτιωμένο Kiosk Page

**Αρχείο:** `frontend/app/kiosk/page.tsx`

- **Loading Overlay**: Πλήρης οθόνη loading κατά την αλλαγή κτιρίου
- **Data Loading Indicator**: Μικρό indicator για background updates
- **Better Error Handling**: Καλύτερος χειρισμός σφαλμάτων
- **Integration with New Hook**: Χρήση του `useBuildingChange` hook

### 4. Νέο DataStatusIndicator Component

**Αρχείο:** `frontend/components/DataStatusIndicator.tsx`

- **Connection Status**: Εμφάνιση κατάστασης σύνδεσης (online/offline)
- **Loading States**: Indicator για fetching states
- **Error States**: Εμφάνιση σφαλμάτων
- **Last Updated**: Χρόνος τελευταίας ενημέρωσης

### 5. Βελτιωμένο KioskMode Component

**Αρχείο:** `frontend/components/KioskMode.tsx`

- **Loading Indicator**: Μικρό spinner δίπλα στο όνομα κτιρίου
- **Status Display**: Εμφάνιση κατάστασης δεδομένων
- **Better Props**: Περισσότερα props για καλύτερο control

## Πώς Λειτουργεί

### Αυτόματη Ανανέωση

1. **Building Change**: Όταν ο χρήστης αλλάζει κτίριο:
   - Εμφανίζεται loading overlay
   - Ενημερώνεται το URL
   - Αλλάζει το `selectedBuildingId` state
   - Το React Query αυτόματα refetch τα δεδομένα

2. **Background Updates**: 
   - Κάθε λεπτό γίνεται αυτόματη ανανέωση
   - Όταν το παράθυρο επιστρέφει στο focus
   - Όταν επιστρέφει η σύνδεση

3. **Caching**: 
   - Τα δεδομένα θεωρούνται "fresh" για 30 δευτερόλεπτα
   - Αποφεύγονται περιττά API calls

### Loading States

1. **Building Change Loading**: Πλήρης οθόνη με spinner
2. **Data Fetching**: Μικρό indicator πάνω δεξιά
3. **Building Info Loading**: Μικρό spinner δίπλα στο όνομα κτιρίου

### Error Handling

1. **Network Errors**: Αυτόματη retry με exponential backoff
2. **404 Errors**: Δεν επαναλαμβάνει (κτίριο δεν υπάρχει)
3. **User Feedback**: Toast notifications και status indicators

## Χρήση

### Για Developers

```typescript
// Χρήση του useBuildingChange hook
const { isChangingBuilding, changeBuilding } = useBuildingChange({
  onBuildingChange: (buildingId) => {
    // Custom logic
  },
  onError: (error) => {
    // Error handling
  },
  showToast: true // Enable/disable toast notifications
});

// Χρήση του usePublicInfo hook
const { data, isLoading, error, isFetching } = usePublicInfo(buildingId);
```

### Για Users

1. **Αλλαγή Κτιρίου**: 
   - Πατήστε `Ctrl + Alt + B` ή χρησιμοποιήστε το dropdown
   - Εμφανίζεται loading overlay
   - Τα δεδομένα ανανεώνονται αυτόματα

2. **Status Monitoring**:
   - Δείτε την κατάσταση σύνδεσης στο κάτω δεξιά
   - Δείτε το χρόνο τελευταίας ενημέρωσης
   - Δείτε αν γίνεται background update

## Configuration

### React Query Settings

```typescript
// Στο usePublicInfo hook
staleTime: 30000,        // 30 seconds
refetchInterval: 60000,  // 1 minute
retry: 3,               // 3 attempts
```

### Toast Settings

```typescript
// Στο useBuildingChange hook
showToast: false,        // Disable for kiosk mode
duration: 2000,         // 2 seconds for success
duration: 3000,         // 3 seconds for errors
```

## Future Improvements

1. **WebSocket Integration**: Real-time updates με WebSocket
2. **Optimistic Updates**: Άμεση εμφάνιση αλλαγών
3. **Offline Support**: Caching για offline mode
4. **Push Notifications**: Ειδοποιήσεις για σημαντικές αλλαγές
5. **Data Synchronization**: Sync με backend changes

## Troubleshooting

### Common Issues

1. **Data not updating**: Έλεγχος network connection και React Query cache
2. **Loading stuck**: Έλεγχος για infinite loops στο useEffect
3. **Errors not showing**: Έλεγχος error boundaries και toast configuration

### Debug Tools

```typescript
// Enable React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Add to your app
<ReactQueryDevtools initialIsOpen={false} />
``` 