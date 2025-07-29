# Global Loading System

Αυτό το σύστημα παρέχει ένα global loading indicator που εμφανίζεται κατά τη διάρκεια navigation και άλλων operations για καλύτερη user experience.

## Components

### LoadingContext
Το context που διαχειρίζεται το global loading state.

```typescript
import { useLoading } from '@/components/contexts/LoadingContext';

const { isLoading, loadingMessage, startLoading, stopLoading } = useLoading();
```

### GlobalLoadingOverlay
Το overlay component που εμφανίζεται όταν `isLoading` είναι `true`.

### useNavigationWithLoading
Custom hook που συνδυάζει Next.js navigation με loading states.

```typescript
import { useNavigationWithLoading } from '@/hooks/useNavigationWithLoading';

const { navigateWithLoading, replaceWithLoading } = useNavigationWithLoading();

// Χρήση
await navigateWithLoading('/dashboard', 'Μετάβαση στον πίνακα ελέγχου...');
```

## Χρήση

### 1. Απλή Navigation με Loading
```typescript
const { navigateWithLoading } = useNavigationWithLoading();

const handleClick = async () => {
  await navigateWithLoading('/some-page', 'Φόρτωση σελίδας...');
};
```

### 2. Manual Loading Control
```typescript
const { startLoading, stopLoading } = useLoading();

const handleAsyncOperation = async () => {
  startLoading('Επεξεργασία δεδομένων...');
  try {
    await someAsyncOperation();
  } finally {
    stopLoading();
  }
};
```

### 3. Σε Forms με Redirect
```typescript
const { navigateWithLoading } = useNavigationWithLoading();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  
  try {
    await submitForm();
    await navigateWithLoading('/success', 'Μετάβαση στη σελίδα επιτυχίας...');
  } catch (error) {
    // Handle error
  } finally {
    setSubmitting(false);
  }
};
```

## Features

- **Backdrop Blur**: Το overlay έχει backdrop blur effect
- **Animated Spinner**: Περιστρεφόμενος spinner με gradient
- **Progress Dots**: Animated dots για επιπλέον visual feedback
- **Customizable Messages**: Δυνατότητα προσαρμογής του μηνύματος
- **Auto-hide**: Το loading σταματάει αυτόματα μετά από navigation
- **Dark Mode Support**: Υποστηρίζει dark mode

## Integration

Το σύστημα είναι ήδη ενσωματωμένο στα:
- `AppProviders` - Για global availability
- `DashboardLayout` - Για dashboard pages
- `LayoutWrapper` - Για άλλες σελίδες
- `Sidebar` - Για navigation
- `BuildingCard` & `BuildingTable` - Για building selection
- `CreateRequestForm` - Για form submission

## Best Practices

1. **Χρησιμοποιήστε περιγραφικά μηνύματα** που εξηγούν τι συμβαίνει
2. **Συνδυάστε με local loading states** για forms και buttons
3. **Μην χρησιμοποιήστε για πολύ γρήγορες operations** (< 100ms)
4. **Παραδώστε το control στο user** όταν χρειάζεται

## Example Messages

- "Μετάβαση σε νέα σελίδα..."
- "Φόρτωση δεδομένων..."
- "Επεξεργασία αιτήματος..."
- "Αποθήκευση αλλαγών..."
- "Σύνδεση με τον server..."