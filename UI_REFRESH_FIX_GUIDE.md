# 🔄 UI Refresh Fix - Οδηγός Διόρθωσης

**Πρόβλημα**: Μετά από save/delete χρειάζεται hard refresh για να δούμε τις αλλαγές στο UI.

**Αιτία**: React Query configuration με μεγάλο `staleTime` και όχι αρκετά aggressive refetching.

---

## 🎯 ΓΡΗΓΟΡΕΣ ΛΥΣΕΙΣ

### Λύση 1: Βελτίωση React Query Configuration (ΣΥΝΙΣΤ push)

**Αρχείο**: `public-app/src/components/contexts/ReactQueryProvider.tsx`

```typescript
// ΠΡΙΝ:
staleTime: 5 * 60 * 1000, // 5 minutes
refetchOnWindowFocus: false,

// ΜΕΤΑ:
staleTime: 30 * 1000, // 30 seconds (πολύ πιο aggressive)
refetchOnWindowFocus: true, // Auto-refresh όταν ο user επιστρέφει στο tab
refetchOnMount: 'always', // Πάντα refetch όταν mount το component
```

### Λύση 2: Explicit Refetch σε Mutations

Όλα τα React Query mutations πρέπει να κάνουν ΚΑΙ `invalidateQueries` ΚΑΙ `refetch`:

```typescript
// ΠΡΙΝ (useOffers.ts):
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['offers'] });
  toast.success('Η προσφορά δημιουργήθηκε επιτυχώς');
},

// ΜΕΤΑ:
onSuccess: async () => {
  await queryClient.invalidateQueries({ queryKey: ['offers'] });
  await queryClient.refetchQueries({ queryKey: ['offers'] }); // ✅ EXPLICIT REFETCH
  toast.success('Η προσφορά δημιουργήθηκε επιτυχώς');
},
```

### Λύση 3: Optimistic Updates (Προχωρημένο)

Για άμεση UX χωρίς περιμένουμε το API:

```typescript
const createMutation = useMutation({
  mutationFn: async (data: Partial<Expense>) => {
    return await api.post('/financial/expenses/', data);
  },
  onMutate: async (newExpense) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['expenses'] });
    
    // Snapshot previous value
    const previousExpenses = queryClient.getQueryData(['expenses']);
    
    // Optimistically update
    queryClient.setQueryData(['expenses'], (old: any) => {
      return [...(old || []), { ...newExpense, id: 'temp-' + Date.now() }];
    });
    
    return { previousExpenses };
  },
  onError: (err, newExpense, context) => {
    // Rollback on error
    queryClient.setQueryData(['expenses'], context?.previousExpenses);
    toast.error('Σφάλμα κατά τη δημιουργία');
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  },
});
```

---

## 🔧 ΣΥΓΚΕΚΡΙΜΕΝΕΣ ΔΙΟΡΘΩΣΕΙΣ ΑΝΑ MODULE

### 1. Financial Modules (useExpenses, usePayments, etc.)

**Πρόβλημα**: Τα custom hooks καλούν `loadExpenses()` αλλά αυτό μπορεί να μην trigger re-render.

**Λύση**:

```typescript
// useExpenses.ts - ΠΡΙΝ:
const createExpense = async (data: ExpenseFormData) => {
  const response = await api.post('/financial/expenses/', data);
  await loadExpenses(); // ❌ Μπορεί να μην trigger re-render
  toast.success('Η δαπάνη δημιουργήθηκε επιτυχώς');
  return response.data;
};

// ΜΕΤΑ:
const createExpense = async (data: ExpenseFormData) => {
  const response = await api.post('/financial/expenses/', data);
  await loadExpenses(); // Reload data
  
  // Force state update
  setExpenses(prev => [...prev]); // Trigger re-render
  
  toast.success('Η δαπάνη δημιουργήθηκε επιτυχώς');
  return response.data;
};
```

**Ακόμα Καλύτερα**: Μετατροπή σε React Query:

```typescript
// Convert to React Query
export function useExpenses(buildingId?: number) {
  const queryClient = useQueryClient();
  
  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['expenses', buildingId],
    queryFn: () => fetchExpenses(buildingId),
    enabled: !!buildingId,
    staleTime: 0, // Always fresh για financial data
  });

  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormData) => api.post('/financial/expenses/', data),
    onSuccess: async () => {
      // Invalidate AND refetch
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.refetchQueries({ queryKey: ['expenses', buildingId] });
      toast.success('Η δαπάνη δημιουργήθηκε επιτυχώς');
    },
  });

  return { expenses, isLoading, error, createExpense: createMutation.mutate };
}
```

### 2. Projects/Offers (Ήδη React Query)

**Πρόβλημα**: Κάνουν μόνο `invalidateQueries`.

**Λύση**: Προσθήκη `refetchQueries`:

```typescript
// useOffers.ts
const createMutation = useMutation({
  mutationFn: async (data: Partial<Offer>) => {
    const response = await api.post('/projects/offers/', data);
    return response.data;
  },
  onSuccess: async () => {
    // ✅ Invalidate multiple related queries
    await queryClient.invalidateQueries({ queryKey: ['offers'] });
    await queryClient.invalidateQueries({ queryKey: ['projects'] });
    
    // ✅ ΠΡΟΣΘΗΚΗ: Explicit refetch
    await queryClient.refetchQueries({ queryKey: ['offers'] });
    await queryClient.refetchQueries({ queryKey: ['projects'] });
    
    toast.success('Η προσφορά δημιουργήθηκε επιτυχώς');
  },
});
```

### 3. Buildings (Context + Custom Hook)

**Πρόβλημα**: Το `refreshBuildings()` στο context μπορεί να μην trigger UI update.

**Λύση**:

```typescript
// BuildingContext.tsx - Βελτίωση του refreshBuildings
const refreshBuildings = async () => {
  setIsRefreshing(true);
  try {
    const data = await fetchBuildings();
    setBuildings(data);
    
    // ✅ Force invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: ['buildings'] });
    
    // ✅ Update localStorage
    if (data.length > 0) {
      localStorage.setItem('buildings_cache', JSON.stringify(data));
      localStorage.setItem('buildings_cache_time', Date.now().toString());
    }
    
    // ✅ Trigger dependent queries
    if (currentBuilding) {
      queryClient.invalidateQueries({ queryKey: ['financial', currentBuilding.id] });
      queryClient.invalidateQueries({ queryKey: ['apartments', currentBuilding.id] });
    }
  } catch (error) {
    console.error('Error refreshing buildings:', error);
  } finally {
    setIsRefreshing(false);
  }
};
```

---

## 📋 CHECKLIST ΔΙΟΡΘΩΣΕΩΝ

### Άμεσες (High Priority)

- [ ] **ReactQueryProvider.tsx**: Μείωση `staleTime` σε 30s
- [ ] **ReactQueryProvider.tsx**: Ενεργοποίηση `refetchOnWindowFocus: true`
- [ ] **useOffers.ts**: Προσθήκη `refetchQueries` σε όλα τα mutations
- [ ] **useProjects.ts**: Προσθήκη `refetchQueries` σε όλα τα mutations
- [ ] **BuildingContext.tsx**: Ενίσχυση `refreshBuildings()` με invalidate

### Μεσαίες (Medium Priority)

- [ ] **useExpenses.ts**: Force state update με `setExpenses(prev => [...prev])`
- [ ] **usePayments.ts**: Force state update με `setPayments(prev => [...prev])`
- [ ] **useSuppliers.ts**: Force state update με `setSuppliers(prev => [...prev])`
- [ ] **Όλα τα edit pages**: Refetch μετά από router.push()

### Μακροπρόθεσμες (Long Term)

- [ ] Μετατροπή όλων των custom hooks σε React Query
- [ ] Optimistic updates για καλύτερη UX
- [ ] WebSocket για real-time updates
- [ ] Server-Sent Events για notifications

---

## 🚀 ΓΡΗΓΟΡΗ ΕΦΑΡΜΟΓΗ (10 λεπτά)

### Βήμα 1: Update ReactQueryProvider

```bash
# Edit: public-app/src/components/contexts/ReactQueryProvider.tsx
```

```typescript
staleTime: 30 * 1000, // 30 seconds
refetchOnWindowFocus: true,
refetchOnMount: 'always',
```

### Βήμα 2: Update useOffers & useProjects

Προσθήκη σε κάθε `onSuccess`:

```typescript
await queryClient.refetchQueries({ queryKey: ['offers'] });
await queryClient.refetchQueries({ queryKey: ['projects'] });
```

### Βήμα 3: Update Custom Hooks

Σε **useExpenses**, **usePayments**, **useSuppliers** - προσθήκη στο τέλος του `loadXXX()`:

```typescript
setExpenses(prev => [...prev]); // Force re-render
```

### Βήμα 4: Test!

1. Δημιουργήστε μία δαπάνη
2. Ελέγξτε αν εμφανίζεται αυτόματα (χωρίς refresh)
3. Διαγράψτε τη δαπάνη
4. Ελέγξτε αν εξαφανίζεται αυτόματα

---

## 🔍 DEBUGGING

Αν δεν λειτουργεί ακόμα:

### 1. Enable React Query Devtools

Ήδη ενεργοποιημένο - πατήστε το λογότυπο κάτω δεξιά για να δείτε:
- Ποια queries τρέχουν
- Τι data έχουν cached
- Πότε κάνουν refetch

### 2. Console Logging

Προσθήκη logs για debugging:

```typescript
const createExpense = async (data: ExpenseFormData) => {
  console.log('🔵 Creating expense...', data);
  const response = await api.post('/financial/expenses/', data);
  console.log('✅ Expense created:', response.data);
  
  console.log('🔄 Refreshing expenses...');
  await loadExpenses();
  console.log('✅ Expenses refreshed, count:', expenses.length);
  
  toast.success('Η δαπάνη δημιουργήθηκε επιτυχώς');
  return response.data;
};
```

### 3. Check Network Tab

Βεβαιωθείτε ότι:
- Το POST/PUT/DELETE πετυχαίνει (200/201)
- Το επόμενο GET τρέχει αυτόματα
- Τα νέα data επιστρέφονται από το backend

---

## 💡 BEST PRACTICES (Μελλοντικά)

### 1. React Query Everywhere

```typescript
// ❌ Παλιό pattern (custom hook με useState)
const [expenses, setExpenses] = useState([]);
const loadExpenses = async () => { ... };

// ✅ Νέο pattern (React Query)
const { data: expenses } = useQuery({
  queryKey: ['expenses', buildingId],
  queryFn: () => fetchExpenses(buildingId),
});
```

### 2. Optimistic Updates

```typescript
// Δείχνει αμέσως το αποτέλεσμα, rollback αν fail
onMutate: async (newData) => {
  queryClient.setQueryData(['expenses'], (old) => [...old, newData]);
},
```

### 3. Polling για Critical Data

```typescript
useQuery({
  queryKey: ['balances', buildingId],
  queryFn: () => fetchBalances(buildingId),
  refetchInterval: 10000, // Refetch κάθε 10s
});
```

---

## 📊 ΑΝΑΜΕΝΟΜΕΝΑ ΑΠΟΤΕΛΕΣΜΑΤΑ

Μετά τις διορθώσεις:

- ✅ **Άμεση ενημέρωση** μετά από save/delete
- ✅ **Χωρίς hard refresh** ποτέ πια
- ✅ **Auto-refresh** όταν επιστρέφεις στο tab
- ✅ **Consistent state** σε όλο το app
- ✅ **Καλύτερη UX** με optimistic updates (προαιρετικό)

---

**Ημερομηνία**: 19 Νοεμβρίου 2025  
**Προτεραιότητα**: 🔴 HIGH  
**Εκτιμώμενος Χρόνος**: 10-30 λεπτά για τις βασικές διορθώσεις

