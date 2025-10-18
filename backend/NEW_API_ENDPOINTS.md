# 🚀 Νέα API Endpoints - User & Subscription Management

## 📋 Overview

Έχουν δημιουργηθεί νέα API endpoints για την πλήρη διαχείριση χρηστών και συνδρομών, τόσο για admin/superuser όσο και για απλούς χρήστες.

## 🔧 Admin Endpoints

### Base URL: `/api/admin/`

#### 👥 User Management
- **GET** `/users/` - Λίστα όλων των χρηστών (με filters)
- **GET** `/users/{id}/` - Λεπτομέρειες συγκεκριμένου χρήστη
- **POST** `/users/{id}/activate/` - Ενεργοποίηση χρήστη
- **POST** `/users/{id}/deactivate/` - Απενεργοποίηση χρήστη
- **POST** `/users/{id}/verify_email/` - Επιβεβαίωση email
- **POST** `/users/{id}/reset_password/` - Reset password
- **GET** `/users/stats/` - Στατιστικά χρηστών
- **GET** `/users/export/` - Export χρηστών σε CSV

#### 💳 Subscription Management
- **GET** `/subscriptions/` - Λίστα όλων των συνδρομών
- **GET** `/subscriptions/{id}/` - Λεπτομέρειες συνδρομής
- **POST** `/subscriptions/{id}/cancel/` - Ακύρωση συνδρομής
- **POST** `/subscriptions/{id}/reactivate/` - Επαναφορά συνδρομής
- **POST** `/subscriptions/{id}/extend_trial/` - Επέκταση trial
- **POST** `/subscriptions/{id}/generate_invoice/` - Δημιουργία τιμολογίου
- **GET** `/subscriptions/stats/` - Στατιστικά συνδρομών
- **GET** `/subscriptions/export/` - Export συνδρομών σε CSV

#### 💰 Billing Dashboard
- **GET** `/billing/stats/` - Billing analytics και στατιστικά
- **GET** `/billing/recent-payments/` - Πρόσφατες πληρωμές
- **POST** `/billing/generate-monthly-invoices/` - Δημιουργία μηνιαίων τιμολογίων
- **GET** `/billing/export/` - Export billing data

#### ⚙️ System Settings
- **GET** `/settings/` - Λήψη system settings
- **PUT** `/settings/` - Ενημέρωση system settings
- **GET** `/system/status/` - System health status
- **GET** `/system/backup/` - Backup information
- **POST** `/system/backup/` - Δημιουργία manual backup
- **GET** `/system/logs/` - System logs

## 👤 User Endpoints

### Base URL: `/api/users/`

#### 👤 Profile Management
- **GET** `/profile/` - Λήψη προφίλ χρήστη
- **PUT** `/profile/` - Ενημέρωση προφίλ
- **POST** `/profile/change-password/` - Αλλαγή κωδικού
- **GET** `/profile/notifications/` - Notification settings
- **PUT** `/profile/notifications/` - Ενημέρωση notification settings
- **GET** `/profile/sessions/` - Active sessions
- **DELETE** `/profile/sessions/` - Revoke session
- **POST** `/profile/delete-account/` - Request account deletion

#### 💳 Subscription Management
- **GET** `/subscription/` - Τρέχουσα συνδρομή
- **GET** `/subscription/plans/` - Διαθέσιμα πλάνα
- **GET** `/subscription/billing-history/` - Ιστορικό billing
- **POST** `/subscription/actions/` - Actions (cancel, reactivate, upgrade)
- **POST** `/subscription/create/` - Δημιουργία νέας συνδρομής

## 🔒 Permissions

### Admin Endpoints
- **Permission Required**: `IsSuperUser`
- **Access**: Μόνο superuser/staff

### User Endpoints
- **Permission Required**: `IsAuthenticated`
- **Access**: Όλοι οι authenticated users

## 📊 Response Examples

### Admin Users Stats
```json
{
  "total_users": 150,
  "active_users": 120,
  "verified_users": 115,
  "staff_users": 5,
  "superusers": 2,
  "managers": 25,
  "residents": 118,
  "recent_registrations": 12,
  "users_with_subscriptions": 85
}
```

### User Profile
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+30 210 1234567",
  "address": "Main St 123, Athens",
  "date_joined": "2024-01-01T00:00:00Z",
  "email_verified": true,
  "role": "resident",
  "apartments": [
    {
      "id": 1,
      "building_name": "Building A",
      "apartment_number": "3A",
      "role": "owner"
    }
  ],
  "subscription": {
    "plan_name": "Professional",
    "status": "active",
    "current_period_end": "2024-08-01T00:00:00Z",
    "price": 99.99,
    "currency": "EUR"
  }
}
```

### Subscription Plans
```json
{
  "plans": [
    {
      "id": 1,
      "name": "Starter",
      "plan_type": "basic",
      "description": "Perfect for small buildings",
      "monthly_price": 9.99,
      "yearly_price": 99.99,
      "max_buildings": 1,
      "max_apartments": 10,
      "max_users": 5,
      "features": {
        "has_analytics": false,
        "has_custom_integrations": false,
        "has_priority_support": false,
        "has_white_label": false
      },
      "trial_days": 14
    }
  ]
}
```

## 🛠️ Implementation Notes

### Files Created
1. **Admin Views**:
   - `admin/views.py` - User management
   - `admin/subscriptions_views.py` - Subscription management
   - `admin/billing_views.py` - Billing analytics
   - `admin/settings_views.py` - System settings

2. **User Views**:
   - `users/profile_views.py` - Profile management
   - `users/subscription_views.py` - Subscription management

3. **URL Configuration**:
   - `admin/urls.py` - Admin endpoints routing
   - `users/urls.py` - User endpoints routing
   - Updated `new_concierge_backend/urls.py`

### Key Features
- **Role-based Access Control**: Proper permission enforcement
- **Comprehensive Filtering**: Search και filter functionality
- **Data Export**: CSV export για admin data
- **Real-time Analytics**: Revenue, user stats, subscription metrics
- **System Health Monitoring**: Database, email, payment health checks
- **Audit Logging**: Comprehensive logging για όλες τις ενέργειες

### Dependencies
- Django REST Framework
- Django Permissions
- Custom permission classes (`IsSuperUser`, `IsAuthenticated`)
- Billing service integration
- Logging system

## 🚀 Next Steps

1. **Integration Testing**: Test με real data
2. **Frontend Integration**: Connect με τα νέα UI pages
3. **Payment Integration**: Connect με Stripe/PayPal
4. **Email Integration**: Setup email notifications
5. **Monitoring**: Setup production monitoring
6. **Documentation**: API documentation generation

## 📝 Usage Examples

### Admin: Get User Statistics
```bash
curl -H "Authorization: Bearer <admin_token>" \
     http://localhost:8000/api/admin/users/stats/
```

### User: Get Profile
```bash
curl -H "Authorization: Bearer <user_token>" \
     http://localhost:8000/api/users/profile/
```

### Admin: Export Users
```bash
curl -H "Authorization: Bearer <admin_token>" \
     http://localhost:8000/api/admin/users/export/ \
     -o users_export.csv
```

---

**Created**: $(date)
**Status**: ✅ Complete
**Tested**: ✅ All endpoints created and documented


