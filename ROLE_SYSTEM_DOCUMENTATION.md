# 🎭 Role System Documentation

## 📋 Overview

This document describes the comprehensive role-based access control (RBAC) system implemented in the New Concierge platform. The system provides unified permission management across frontend and backend components.

## 🏗️ Architecture

### **Dual Permission System**
The system uses both Django Groups and custom role fields for maximum flexibility and backward compatibility:

1. **Django Groups**: For fine-grained permissions and Django admin integration
2. **Custom Role Field**: For application-level role hierarchy and business logic

### **Role Hierarchy**
```
superuser (100) > admin (90) > manager (80) > staff (70) > resident (60) > guest (50)
```

## 👥 Role Definitions

### **1. Ultra Superuser (theostam1966@gmail.com)**
- **Role**: `superuser`
- **Django Flags**: `is_superuser=True`, `is_staff=True`
- **Groups**: None (superuser privileges)
- **Permissions**:
  - Complete system administration
  - Manage all tenants and users
  - Access to all buildings and data
  - Full billing and analytics access
  - System settings management

### **2. Tenant Administrator**
- **Role**: `admin`
- **Django Flags**: `is_superuser=False`, `is_staff=True`
- **Groups**: `Manager`
- **Permissions**:
  - Full admin access within tenant
  - Manage tenant users and buildings
  - Access tenant analytics and billing
  - Invite new users

### **3. Office Manager**
- **Role**: `manager`
- **Django Flags**: `is_superuser=False`, `is_staff=True`
- **Groups**: `Manager`
- **Permissions**:
  - Building management
  - Invite residents
  - Manage financials
  - View building analytics
  - Manage maintenance requests

### **4. Staff Member**
- **Role**: `staff`
- **Django Flags**: `is_superuser=False`, `is_staff=True`
- **Groups**: `Manager`
- **Permissions**:
  - View buildings
  - Manage maintenance
  - View financials
  - Cannot manage residents

### **5. Resident**
- **Role**: `resident`
- **Django Flags**: `is_superuser=False`, `is_staff=False`
- **Groups**: `Resident`
- **Permissions**:
  - View own data
  - Submit maintenance requests
  - Participate in votes
  - View building announcements
  - Manage own profile

### **6. Guest**
- **Role**: `guest`
- **Django Flags**: `is_superuser=False`, `is_staff=False`
- **Groups**: None
- **Permissions**:
  - No access (unauthenticated users)

## 🔧 Implementation Files

### **Backend Components**

#### **1. Role Management (`users/role_management.py`)**
- Centralized role assignment and permission management
- Role hierarchy validation
- User management permissions
- Role definitions and permissions

#### **2. Unified Permissions (`core/unified_permissions.py`)**
- Permission classes for different access levels
- Building-scoped permissions
- Permission mixins for views
- Role validation utilities

#### **3. Management Command (`users/management/commands/fix_role_system.py`)**
- Fix and standardize role assignments
- Create missing Django groups
- Validate role hierarchy
- System status reporting

### **Frontend Components**

#### **1. Role Types (`frontend/types/kiosk/index.ts`)**
- TypeScript type definitions
- Role permission mappings
- Kiosk-specific permissions

#### **2. Permission Hooks**
- `useFinancialPermissions.ts`: Financial operation permissions
- `useSuperUserGuard.ts`: Superuser access control
- `RoleGuard.tsx`: Component-level role protection

## 🚀 Usage Examples

### **Backend Permission Checking**

```python
from core.unified_permissions import IsManagerOrHigher, CanManageUsers
from users.role_management import RoleManager

# View-level permission
class MyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsManagerOrHigher]

# Permission checking in code
if RoleManager.has_permission(user, 'can_manage_financials'):
    # Allow financial operations
    pass

# Role assignment
RoleManager.assign_role(user, 'manager')
```

### **Frontend Permission Checking**

```typescript
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';

function FinancialComponent() {
  const { canCreateExpense, canEditExpense } = useFinancialPermissions();
  
  return (
    <div>
      {canCreateExpense() && <CreateExpenseButton />}
      {canEditExpense() && <EditExpenseButton />}
    </div>
  );
}
```

## 🛠️ Management Commands

### **Fix Role System**
```bash
# Show what would be changed (dry run)
python manage.py fix_role_system --dry-run

# Fix ultra user permissions
python manage.py fix_role_system --fix-ultra-user

# Fix all users in the system
python manage.py fix_role_system --fix-all-users

# Create missing Django groups
python manage.py fix_role_system --create-groups
```

### **Test Role System**
```bash
# Run comprehensive role system tests
python scripts/test_role_system.py
```

## 🔍 Troubleshooting

### **Common Issues**

#### **1. "Hrisstis" Role Error**
- **Problem**: User mentioned "Hrisstis" role causing 500 error
- **Solution**: This role doesn't exist in the system. Check for typos or legacy data
- **Fix**: Run `python manage.py fix_role_system --fix-all-users`

#### **2. Permission Denied Errors**
- **Problem**: Users getting 403/500 errors despite having correct role
- **Solution**: Check both role field and Django groups
- **Fix**: Ensure user is in correct Django group

#### **3. Inconsistent Permissions**
- **Problem**: Frontend and backend showing different permissions
- **Solution**: Use unified permission system
- **Fix**: Update frontend to use `get_user_effective_role()`

### **Debugging Tools**

#### **Check User Permissions**
```python
from core.unified_permissions import get_user_permissions_summary

user = CustomUser.objects.get(email='user@example.com')
permissions = get_user_permissions_summary(user)
print(permissions)
```

#### **Validate Role Assignment**
```python
from users.role_management import RoleManager

# Check if assigner can assign role to target
is_valid, error = RoleManager.validate_role_assignment(
    assigner=manager_user,
    target_user=resident_user,
    new_role='manager'
)
```

## 📊 System Status

### **Current Role Distribution**
- **Ultra Superuser**: 1 (theostam1966@gmail.com)
- **Tenant Admins**: Variable (per tenant)
- **Managers**: Variable (per building)
- **Residents**: Variable (per building)

### **Django Groups**
- **Manager**: Users with management permissions
- **Resident**: Regular users with building access

## 🔐 Security Considerations

### **Role Escalation Prevention**
- Users cannot assign roles with equal or higher privileges
- Role hierarchy enforced at both application and database level
- Audit logging for all role changes

### **Building Access Control**
- Users can only access buildings they're associated with
- Managers can only manage their assigned buildings
- Residents can only see their own data

### **Permission Validation**
- All permissions checked at both view and object level
- Consistent permission checking across frontend and backend
- Graceful degradation for missing permissions

## 🎯 Best Practices

### **Role Assignment**
1. Always use `RoleManager.assign_role()` for role changes
2. Validate role assignments before applying
3. Log all role changes for audit purposes
4. Test role changes in development first

### **Permission Checking**
1. Use unified permission classes in views
2. Check permissions at both view and object level
3. Provide clear error messages for permission denials
4. Use permission hooks in frontend components

### **User Management**
1. Ensure users are in correct Django groups
2. Validate role hierarchy before management operations
3. Use building-scoped permissions where appropriate
4. Regular audit of user permissions

## 📈 Future Enhancements

### **Planned Features**
- Dynamic role creation and management
- Custom permission sets per role
- Role-based UI customization
- Advanced audit logging and reporting
- Multi-tenant role inheritance

### **Integration Points**
- Stripe billing integration for role-based features
- Analytics dashboard for role usage
- API endpoints for role management
- Frontend role management interface

---

## 🆘 Support

For issues with the role system:

1. **Check System Status**: Run `python manage.py fix_role_system --dry-run`
2. **Test Permissions**: Run `python scripts/test_role_system.py`
3. **Review Logs**: Check Django logs for permission errors
4. **Validate Data**: Ensure users have correct role and group assignments

**Ultra User Access**: theostam1966@gmail.com (password: theo123!@#)
