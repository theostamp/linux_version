# Progress Tracker: Phase 1 - Authorization

**Objective:** Implement a robust Role-Based Access Control (RBAC) system.

| Step | Task                                                    | Status      | Files Modified / Created                               |
|------|---------------------------------------------------------|-------------|--------------------------------------------------------|
| 1.1  | Create `create_user_groups` data migration.             | [ ] Pending | `users/migrations/XXXX_create_user_groups.py`          |
| 1.2  | Implement `create_groups_and_permissions` function.     | [ ] Pending | `users/migrations/XXXX_create_user_groups.py`          |
| 2.1  | Create `IsManager` permission class.                    | [ ] Pending | `core/permissions.py`                                  |
| 2.2  | Create `IsResident` permission class.                   | [ ] Pending | `core/permissions.py`                                  |
| 2.3  | Create `IsRelatedToBuilding` object-level permission.   | [ ] Pending | `core/permissions.py`                                  |
| 3.1  | Update `FinancialWritePermission` with Group checks.    | [ ] Pending | `financial/permissions.py`                             |
| 3.2  | Update `ExpensePermission` with Group checks.           | [ ] Pending | `financial/permissions.py`                             |
| 3.3  | Update `PaymentPermission` with Group checks.           | [ ] Pending | `financial/permissions.py`                             |
| 3.4  | Update `MaintenancePermission` with Group checks.       | [ ] Pending | `maintenance/permissions.py`                           |
| 4.1  | Update `ExpenseViewSet` permissions.                    | [ ] Pending | `financial/views.py`                                   |
| 4.2  | Update `MaintenanceTicketViewSet` permissions.          | [ ] Pending | `maintenance/views.py`                                 |
| 5.1  | Run migrations to verify permissions.                   | [ ] Pending | N/A                                                    |
| 5.2  | Manual API testing with different user roles.          | [ ] Pending | N/A                                                    |
| 5.3  | Final review and commit.                               | [ ] Pending | N/A                                                    |

## Implementation Notes

### User Groups Created
- **Manager**: Full CRUD access to Expenses, Payments, MaintenanceTickets
- **Resident**: View/Add access to MaintenanceTickets, View access to financial data

### Permission Classes Enhanced
- `IsManager`: Checks if user belongs to 'Manager' group
- `IsResident`: Checks if user belongs to 'Resident' group  
- `IsRelatedToBuilding`: Object-level permission using BuildingMembership model

### Key Integration Points
- Uses existing `BuildingMembership` model for building associations
- Extends existing permission classes without breaking changes
- Maintains backward compatibility with current authentication system

### Testing Scenarios
1. **Resident User**:
   - ❌ Cannot create Expense (403 Forbidden)
   - ✅ Can create MaintenanceTicket (201 Created)
   - ✅ Can view financial data for their building

2. **Manager User**:
   - ✅ Can create Expense (201 Created)
   - ✅ Can create MaintenanceTicket (201 Created)
   - ✅ Can view all financial data

3. **Superuser**:
   - ✅ Full access to all operations
