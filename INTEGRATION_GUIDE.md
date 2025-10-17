# 🔗 Integration Guide - Frontend & Backend API

## 📋 Overview

Αυτός ο οδηγός περιγράφει πώς έχουν ενσωματωθεί τα νέα API endpoints με τα frontend components για τη διαχείριση χρηστών και συνδρομών.

## 🏗️ Architecture

### Backend API Structure
```
/api/admin/          # Admin endpoints (superuser only)
├── users/           # User management
├── subscriptions/   # Subscription management  
├── billing/         # Billing analytics
└── settings/        # System settings

/api/users/          # User endpoints (authenticated users)
├── profile/         # Profile management
└── subscription/    # Subscription management
```

### Frontend API Services
```
/lib/api/
├── admin.ts         # Admin API services
├── user.ts          # User API services
└── client.ts        # Axios client configuration
```

## 🔧 API Services

### Admin Services (`/lib/api/admin.ts`)

#### User Management
```typescript
// Get all users with filters
const users = await adminUsersApi.getUsers({
  search: 'john',
  status: 'active',
  role: 'manager'
});

// User actions
await adminUsersApi.activateUser(userId);
await adminUsersApi.deactivateUser(userId);
await adminUsersApi.verifyUserEmail(userId);
await adminUsersApi.resetUserPassword(userId);

// Statistics
const stats = await adminUsersApi.getUserStats();

// Export
const csvData = await adminUsersApi.exportUsers();
```

#### Subscription Management
```typescript
// Get subscriptions with filters
const subscriptions = await adminSubscriptionsApi.getSubscriptions({
  search: 'enterprise',
  status: 'active',
  plan: 'professional'
});

// Subscription actions
await adminSubscriptionsApi.cancelSubscription(subscriptionId);
await adminSubscriptionsApi.reactivateSubscription(subscriptionId);
await adminSubscriptionsApi.extendTrial(subscriptionId, 7);

// Statistics
const stats = await adminSubscriptionsApi.getSubscriptionStats();
```

#### Billing Analytics
```typescript
// Get billing statistics
const billingStats = await adminBillingApi.getBillingStats('30d');

// Recent payments
const recentPayments = await adminBillingApi.getRecentPayments(10);

// Generate invoices
await adminBillingApi.generateMonthlyInvoices();
```

#### System Settings
```typescript
// Get/Update settings
const settings = await adminSettingsApi.getSettings();
await adminSettingsApi.updateSettings(newSettings);

// System health
const status = await adminSettingsApi.getSystemStatus();

// Backup
const backupInfo = await adminSettingsApi.getBackupInfo();
await adminSettingsApi.createBackup();
```

### User Services (`/lib/api/user.ts`)

#### Profile Management
```typescript
// Get/Update profile
const profile = await userProfileApi.getProfile();
await userProfileApi.updateProfile(profileData);

// Change password
await userProfileApi.changePassword({
  current_password: 'oldpass',
  new_password: 'newpass',
  confirm_password: 'newpass'
});

// Notification settings
const settings = await userProfileApi.getNotificationSettings();
await userProfileApi.updateNotificationSettings(settings);
```

#### Subscription Management
```typescript
// Get current subscription
const subscription = await userSubscriptionApi.getCurrentSubscription();

// Get available plans
const plans = await userSubscriptionApi.getSubscriptionPlans();

// Subscription actions
await userSubscriptionApi.cancelSubscription();
await userSubscriptionApi.reactivateSubscription();
await userSubscriptionApi.upgradeSubscription(planId);

// Billing history
const history = await userSubscriptionApi.getBillingHistory(10);
```

## 🎨 Frontend Integration

### Updated Components

#### Admin Users Page (`/app/admin/users/page.tsx`)
- ✅ Integrated with `adminUsersApi`
- ✅ Real-time filtering and search
- ✅ User actions (activate, deactivate, verify, reset password)
- ✅ Statistics display
- ✅ Error handling with toast notifications

#### User Profile Page (`/app/my-profile/page.tsx`)
- ✅ Integrated with `userProfileApi`
- ✅ Profile update functionality
- ✅ Password change
- ✅ Notification settings
- ✅ Session management

#### User Subscription Page (`/app/my-subscription/page.tsx`)
- ✅ Integrated with `userSubscriptionApi`
- ✅ Subscription management
- ✅ Billing history
- ✅ Plan comparison

### Key Features

#### 1. **Type Safety**
```typescript
import { type User, type Subscription } from '@/lib/api/admin';
import { type UserProfile } from '@/lib/api/user';
```

#### 2. **Error Handling**
```typescript
try {
  const data = await adminUsersApi.getUsers();
  setUsers(data.users);
} catch (error) {
  toast({
    title: "Σφάλμα",
    description: "Αποτυχία φόρτωσης χρηστών",
    variant: "destructive",
  });
}
```

#### 3. **Loading States**
```typescript
const [loading, setLoading] = useState(true);

// In component
if (loading) {
  return <Loader2 className="animate-spin" />;
}
```

#### 4. **Real-time Updates**
```typescript
useEffect(() => {
  if (isAccessAllowed) {
    fetchUsers();
  }
}, [searchTerm, statusFilter, roleFilter]);
```

## 🔐 Authentication & Permissions

### Admin Endpoints
- **Permission**: `IsSuperUser` (superuser/staff only)
- **Token**: Bearer token from localStorage
- **Error**: 403 Forbidden for unauthorized access

### User Endpoints  
- **Permission**: `IsAuthenticated` (any logged-in user)
- **Token**: Bearer token from localStorage
- **Error**: 401 Unauthorized for unauthenticated requests

### Token Management
```typescript
// Automatic token refresh on 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token and retry
      await refreshToken();
      return apiClient(originalRequest);
    }
    return Promise.reject(error);
  }
);
```

## 📊 Data Flow

### 1. **Component Mount**
```typescript
useEffect(() => {
  if (isAccessAllowed) {
    fetchUsers();
    fetchStats();
  }
}, [isAccessAllowed]);
```

### 2. **User Interaction**
```typescript
const handleUserAction = async (userId: number, action: string) => {
  try {
    const result = await adminUsersApi.activateUser(userId);
    toast({ title: "Επιτυχία", description: result.message });
    await fetchUsers(); // Refresh data
  } catch (error) {
    toast({ title: "Σφάλμα", description: "Αποτυχία ενέργειας", variant: "destructive" });
  }
};
```

### 3. **Real-time Updates**
```typescript
// Filter changes trigger API calls
useEffect(() => {
  if (isAccessAllowed) {
    fetchUsers(); // Refetch with new filters
  }
}, [searchTerm, statusFilter, roleFilter]);
```

## 🚀 Usage Examples

### Admin Dashboard
```typescript
// Get user statistics for dashboard
const stats = await adminUsersApi.getUserStats();
console.log(`Total users: ${stats.total_users}`);
console.log(`Active users: ${stats.active_users}`);
```

### User Profile Update
```typescript
// Update user profile
await userProfileApi.updateProfile({
  first_name: 'John',
  last_name: 'Doe',
  phone: '+30 210 1234567',
  address: 'Main St 123, Athens'
});
```

### Subscription Management
```typescript
// Cancel subscription
await userSubscriptionApi.cancelSubscription();
toast({ title: "Subscription cancelled successfully" });
```

## 🔧 Configuration

### API Base URL
```typescript
// Automatic detection based on environment
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: localhost:18000
    return 'http://localhost:18000/api';
  }
  // Server-side: backend container
  return 'http://backend:8000/api';
};
```

### Request/Response Interceptors
```typescript
// Add authentication headers
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## 📝 Best Practices

### 1. **Error Handling**
- Always wrap API calls in try-catch
- Show user-friendly error messages
- Log errors for debugging

### 2. **Loading States**
- Show loading indicators during API calls
- Disable buttons during operations
- Use skeleton loaders for better UX

### 3. **Data Validation**
- Validate input before API calls
- Handle server validation errors
- Show field-specific error messages

### 4. **Performance**
- Use debouncing for search inputs
- Cache frequently accessed data
- Implement pagination for large datasets

## 🧪 Testing

### API Testing
```bash
# Test admin endpoints (requires superuser token)
curl -H "Authorization: Bearer <admin_token>" \
     http://localhost:18000/api/admin/users/stats/

# Test user endpoints (requires user token)  
curl -H "Authorization: Bearer <user_token>" \
     http://localhost:18000/api/users/profile/
```

### Frontend Testing
```typescript
// Mock API responses for testing
jest.mock('@/lib/api/admin', () => ({
  adminUsersApi: {
    getUsers: jest.fn().mockResolvedValue({ users: [] }),
    getUserStats: jest.fn().mockResolvedValue({ total_users: 0 }),
  },
}));
```

## 🔄 Migration Status

### ✅ Completed
- [x] Backend API endpoints
- [x] Frontend API services
- [x] Admin users page integration
- [x] User profile page integration
- [x] Error handling and loading states
- [x] Type safety with TypeScript
- [x] Authentication and permissions

### 🚧 In Progress
- [ ] Admin subscriptions page integration
- [ ] Admin billing dashboard integration
- [ ] Admin settings page integration
- [ ] User subscription page integration

### 📋 Next Steps
1. Complete remaining page integrations
2. Add comprehensive error boundaries
3. Implement offline support
4. Add performance monitoring
5. Create automated tests

---

**Status**: ✅ Core Integration Complete  
**Last Updated**: $(date)  
**Version**: 1.0.0

