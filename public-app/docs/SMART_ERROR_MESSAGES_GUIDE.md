# 🎨 Smart Error Messages - Usage Guide

## Overview

Αντί για generic error messages όπως "Error occurred", το σύστημα παρέχει:
- ✅ **Actionable messages**: Λέει στον user τι να κάνει
- ✅ **Context-aware**: Διαφορετικά messages για διαφορετικά errors
- ✅ **User-friendly**: Ελληνικά, απλά, κατανοητά
- ✅ **Consistent**: Ενιαία εμφάνιση σε όλη την εφαρμογή

---

## Quick Start

### Basic Usage

```typescript
import { showBuildingError } from '@/lib/errorMessages';

// Show error
showBuildingError('NO_BUILDINGS');
```

### With Additional Info

```typescript
showBuildingError('PERMISSION_DENIED', 'Edit access required');
```

### From Exception

```typescript
import { showErrorFromException } from '@/lib/errorMessages';

try {
  await api.get('/buildings/');
} catch (error) {
  showErrorFromException(error);  // Auto-detects error type
}
```

---

## Error Types

### 1. NO_BUILDINGS
**When to use**: User has no access to any buildings

```typescript
if (buildings.length === 0) {
  showBuildingError('NO_BUILDINGS');
}
```

**Shows**:
- Title: "Δεν βρέθηκαν κτίρια"
- Message: "Δεν έχετε πρόσβαση σε κανένα κτίριο."
- Action: "Επικοινωνήστε με τον διαχειριστή..."

---

### 2. BUILDING_NOT_FOUND
**When to use**: Specific building not found (404)

```typescript
try {
  const building = await fetchBuilding(id);
} catch (error) {
  if (error.response?.status === 404) {
    showBuildingError('BUILDING_NOT_FOUND');
  }
}
```

---

### 3. PERMISSION_DENIED
**When to use**: User tries action without permission (403)

```typescript
const handleEdit = () => {
  if (!permissions?.can_edit) {
    showBuildingError('PERMISSION_DENIED', 'Edit permission required');
    return;
  }
  // Proceed with edit
};
```

---

### 4. NETWORK_ERROR
**When to use**: Network/connection problems

```typescript
try {
  await api.get('/buildings/');
} catch (error) {
  if (error.message === 'Network Error') {
    showBuildingError('NETWORK_ERROR');
  }
}
```

---

### 5. SERVER_ERROR
**When to use**: 500+ errors

```typescript
if (error.response?.status >= 500) {
  showBuildingError('SERVER_ERROR');
}
```

---

## Advanced Usage

### Inline Error Display

Instead of toast, show error inline:

```typescript
import { ErrorDisplay } from '@/lib/errorMessages';

return (
  <div>
    {error && (
      <ErrorDisplay 
        errorType="NO_BUILDINGS"
        additionalInfo="Contact: admin@example.com"
        showAction={true}
      />
    )}
  </div>
);
```

### Get Error Message Object

```typescript
import { getErrorMessage } from '@/lib/errorMessages';

const errorInfo = getErrorMessage('PERMISSION_DENIED');

console.log(errorInfo.title);   // "Δεν έχετε δικαίωμα"
console.log(errorInfo.message); // "Δεν μπορείτε να εκτελέσετε..."
console.log(errorInfo.action);  // "Ζητήστε δικαιώματα..."
```

### Custom Duration

```typescript
showBuildingError('SERVER_ERROR', undefined, 10000); // 10 seconds
```

---

## Real-World Examples

### Example 1: Building Context Loading

```typescript
const { 
  buildings, 
  isLoading, 
  error 
} = useBuilding();

useEffect(() => {
  if (!isLoading && buildings.length === 0 && !error) {
    showBuildingError('NO_BUILDINGS');
  }
}, [buildings, isLoading, error]);
```

### Example 2: API Call με Error Handling

```typescript
const fetchBuilding = async (id: number) => {
  try {
    setLoading(true);
    const response = await api.get(`/buildings/${id}/`);
    setBuilding(response.data);
    
  } catch (error: any) {
    // Smart error handling
    showErrorFromException(error);
    
  } finally {
    setLoading(false);
  }
};
```

### Example 3: Permission-Protected Action

```typescript
const handleDelete = async () => {
  // Check permission first
  if (!permissions?.can_delete) {
    showBuildingError('PERMISSION_DENIED', 'Delete permission required');
    return;
  }
  
  try {
    await api.delete(`/buildings/${buildingId}/`);
    toast.success('Το κτίριο διαγράφηκε επιτυχώς');
    
  } catch (error) {
    showErrorFromException(error);
  }
};
```

### Example 4: Form Validation

```typescript
const handleSubmit = async (data: FormData) => {
  try {
    await api.post('/buildings/', data);
    toast.success('Αποθηκεύτηκε επιτυχώς');
    
  } catch (error: any) {
    if (error.response?.status === 400) {
      // Validation error από backend
      showBuildingError('VALIDATION_ERROR', error.response.data.detail);
    } else {
      showErrorFromException(error);
    }
  }
};
```

### Example 5: Inline Error Display

```typescript
const BuildingSelector = () => {
  const { buildings, isLoading, error } = useBuilding();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (buildings.length === 0) {
    return (
      <ErrorDisplay 
        errorType="NO_BUILDINGS"
        additionalInfo="You need at least one building to continue"
      />
    );
  }
  
  return (
    <select>
      {buildings.map(building => (
        <option key={building.id} value={building.id}>
          {building.name}
        </option>
      ))}
    </select>
  );
};
```

---

## Migration από Old Error Handling

### Before (Generic)

```typescript
// ❌ Generic, not helpful
try {
  await api.get('/buildings/');
} catch (error) {
  toast.error("Σφάλμα");  // Not actionable
}
```

### After (Smart)

```typescript
// ✅ Specific, actionable
try {
  await api.get('/buildings/');
} catch (error) {
  showErrorFromException(error);  // Context-aware, with action
}
```

---

## Customization

### Add New Error Type

Edit `src/lib/errorMessages.ts`:

```typescript
export type BuildingErrorType =
  | 'NO_BUILDINGS'
  // ... existing types ...
  | 'CUSTOM_ERROR';  // Add new type

export const BuildingErrorMessages: Record<BuildingErrorType, ErrorMessage> = {
  // ... existing messages ...
  
  CUSTOM_ERROR: {
    title: 'Custom Error Title',
    message: 'Custom error message',
    action: 'What user should do',
    icon: 'alert-circle',
    severity: 'error',
  },
};
```

### Customize Styling

The `ErrorDisplay` component uses Tailwind classes. Customize in the component:

```typescript
// Change colors
const bgColor = {
  'error': 'bg-red-50 border-red-200',  // Customize here
};
```

---

## Best Practices

### 1. Always Use Specific Error Types

```typescript
// ❌ Bad
showBuildingError('SERVER_ERROR');  // Too generic

// ✅ Good
if (error.response?.status === 403) {
  showBuildingError('PERMISSION_DENIED');
}
```

### 2. Provide Additional Context

```typescript
// ❌ Bad
showBuildingError('PERMISSION_DENIED');

// ✅ Good
showBuildingError('PERMISSION_DENIED', 'Manager role required');
```

### 3. Use showErrorFromException για API Errors

```typescript
// ❌ Bad - manual parsing
if (error.response?.status === 404) {
  showBuildingError('BUILDING_NOT_FOUND');
} else if (error.response?.status === 403) {
  showBuildingError('PERMISSION_DENIED');
} // ... many conditions

// ✅ Good - automatic
showErrorFromException(error);
```

### 4. Toast για Async Actions, Inline για Forms

```typescript
// Toast για async (API calls)
try {
  await api.post('/buildings/', data);
} catch (error) {
  showErrorFromException(error);  // Toast
}

// Inline για forms
if (formErrors.name) {
  return <ErrorDisplay errorType="VALIDATION_ERROR" />;  // Inline
}
```

---

## Testing

### Manual Testing

```typescript
// Test different error types
const TestErrors = () => {
  return (
    <div className="space-y-4 p-4">
      <button onClick={() => showBuildingError('NO_BUILDINGS')}>
        Test NO_BUILDINGS
      </button>
      <button onClick={() => showBuildingError('PERMISSION_DENIED')}>
        Test PERMISSION_DENIED
      </button>
      <button onClick={() => showBuildingError('NETWORK_ERROR')}>
        Test NETWORK_ERROR
      </button>
    </div>
  );
};
```

### Automated Testing

```typescript
import { render, screen } from '@testing-library/react';
import { ErrorDisplay } from '@/lib/errorMessages';

test('renders error display correctly', () => {
  render(<ErrorDisplay errorType="NO_BUILDINGS" />);
  
  expect(screen.getByText('Δεν βρέθηκαν κτίρια')).toBeInTheDocument();
  expect(screen.getByText(/Επικοινωνήστε/)).toBeInTheDocument();
});
```

---

## Summary

### Key Benefits
- ✅ **Better UX**: Users know what to do
- ✅ **Consistent**: Same pattern everywhere
- ✅ **Maintainable**: Easy to update messages
- ✅ **Actionable**: Every error has a suggestion

### Key Functions
- `showBuildingError()` - Show toast με error
- `showErrorFromException()` - Auto-detect + show error
- `ErrorDisplay` - Inline error component
- `getErrorMessage()` - Get error object

### When to Use
- ✅ API errors
- ✅ Permission checks
- ✅ Form validation
- ✅ Network issues
- ✅ Business logic errors

---

**Created**: 2025-11-19  
**Version**: 1.0  
**Status**: Production Ready

