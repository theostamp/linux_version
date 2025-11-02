# 🎯 Username-Based Architecture Implementation

**Date**: November 2, 2025  
**Status**: 🚧 IN PROGRESS (Backend 90% Complete)

---

## 📋 Overview

Implementing username-based architecture where:
```
Username = Tenant Schema = Subdomain = Login Identifier
```

**Example:**
- Username: `theo-eth`
- Email: `theo@example.com`
- Tenant Schema: `theo-eth`
- Subdomain: `theo-eth.newconcierge.app`
- Login: `theo-eth` or `theo@example.com`

---

## ✅ Completed Tasks

### 1. Backend Model Changes
**File**: `backend/users/models.py`

✅ Added `username` field to `CustomUser` model:
```python
username = models.CharField(
    max_length=30,
    unique=True,
    validators=[
        RegexValidator(
            regex=r'^[a-z0-9-]+$',
            message='Username can only contain lowercase letters, numbers, and hyphens'
        ),
        MinLengthValidator(3)
    ]
)
```

**Features:**
- Unique constraint
- 3-30 characters
- Lowercase alphanumeric + hyphens only
- Used as tenant subdomain

### 2. Username Availability Check Endpoint
**Files**: 
- `backend/users/views.py` (lines 509-600)
- `backend/users/urls.py` (lines 40-41)

✅ Created `POST /api/users/check-username/` endpoint

**Features:**
- Real-time availability checking
- Reserved words blocking (admin, api, www, etc.)
- Validation rules enforcement
- Returns subdomain preview

**Request:**
```json
{
  "username": "theo-eth"
}
```

**Response:**
```json
{
  "username": "theo-eth",
  "available": true,
  "message": "Το username είναι διαθέσιμο! ✨",
  "subdomain_preview": "theo-eth.newconcierge.app"
}
```

### 3. Registration Serializer Update
**File**: `backend/users/serializers.py`

✅ Updated `UserRegistrationSerializer`:
- Added `username` field (required)
- Made `first_name` and `last_name` optional
- Added username validation logic
- Check for duplicates in both User and Tenant models

### 4. Tenant Creation Logic Update
**Files**:
- `backend/billing/views.py` (CreateCheckoutSessionView)
- `backend/billing/webhooks.py` (handle_checkout_session_completed)

✅ Modified tenant creation flow:
```python
# Priority: user.username > metadata.tenant_subdomain > generated
if hasattr(user, 'username') and user.username:
    schema_name = user.username
else:
    schema_name = tenant_service.generate_unique_schema_name(...)
```

---

## 🚧 Pending Tasks

### 5. Frontend Registration Form
**File**: `frontend/components/RegisterForm.tsx`

❌ **TODO**: Replace first_name/last_name with username input

**Required Changes:**
```typescript
type RegisterFormInputs = {
  email: string;
  username: string;  // NEW!
  password: string;
  confirmPassword: string;
  // first_name and last_name are optional now
}
```

**UI Requirements:**
1. Username input field with real-time validation
2. Display subdomain preview: `{username}.newconcierge.app`
3. Check availability on blur/change
4. Show validation errors inline
5. Visual feedback (✓ available, ✗ taken)

**Example UI:**
```
┌─────────────────────────────────────┐
│ Username *                          │
│ ┌─────────────────────────────────┐ │
│ │ theo-eth              ✓         │ │
│ └─────────────────────────────────┘ │
│ Το workspace σας: theo-eth.newconcie│
│ rge.app                             │
└─────────────────────────────────────┘
```

### 6. Authentication Update  
**File**: `backend/users/views.py` (login_view)

❌ **TODO**: Support login with username OR email

**Current:** Login only with email  
**Target:** Login with username OR email

```python
# Accept username or email
username_or_email = request.data.get('username')

# Try email first
try:
    user = CustomUser.objects.get(email=username_or_email)
except CustomUser.DoesNotExist:
    # Try username
    try:
        user = CustomUser.objects.get(username=username_or_email)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Invalid credentials'})
```

### 7. Database Migration
**Command**: 
```bash
docker exec -it linux_version-backend-1 python manage.py makemigrations
docker exec -it linux_version-1 python manage.py migrate
```

❌ **TODO**: Create and run migration for username field

**Migration will:**
- Add `username` field to CustomUser table
- Handle existing users (generate username from email)
- Add unique constraint
- Add validators

### 8. Documentation
**Files to Update:**
- `README.md`
- `CLAUDE.md`
- API documentation

❌ **TODO**: Document new username-based flow

---

## 🎯 Testing Plan

### Backend Testing

1. **Username Availability Check**
```bash
curl -X POST http://localhost:18000/api/users/check-username/ \
  -H "Content-Type: application/json" \
  -d '{"username": "theo-eth"}'
```

2. **Registration with Username**
```bash
curl -X POST http://localhost:18000/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "theo-eth",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!"
  }'
```

3. **Tenant Creation Verification**
```sql
SELECT username, email, tenant_id FROM users_customuser WHERE username='theo-eth';
SELECT schema_name FROM tenants_client WHERE schema_name='theo-eth';
```

### Frontend Testing

1. Navigate to `/register`
2. Enter username `theo-eth`
3. Check availability (should show ✓)
4. Complete registration
5. Verify subdomain works: `https://theo-eth.newconcierge.app/`

---

## 🔧 Migration Strategy

### For Existing Users (Without Username)

**Option 1: Auto-generate from email**
```python
def generate_username_from_email(email):
    username = email.split('@')[0].lower()
    username = re.sub(r'[^a-z0-9-]', '', username)
    
    # Ensure uniqueness
    base = username
    counter = 1
    while CustomUser.objects.filter(username=username).exists():
        username = f"{base}-{counter}"
        counter += 1
    
    return username
```

**Option 2: Force username selection on next login**
- Redirect to `/complete-profile`
- Require username input
- Update user record

**Recommendation**: Option 1 for automatic migration

---

## 📝 Reserved Usernames

The following usernames are blocked:
```python
reserved_words = [
    'admin', 'api', 'www', 'mail', 'smtp', 'ftp', 'ssh', 'root',
    'newconcierge', 'support', 'help', 'billing', 'sales', 'info',
    'contact', 'about', 'login', 'register', 'signup', 'signin',
    'logout', 'dashboard', 'settings', 'profile', 'account',
    'test', 'demo', 'staging', 'dev', 'development', 'prod', 'production'
]
```

---

## 🎨 UI/UX Improvements

### Username Input Component

```typescript
const UsernameInput = () => {
  const [username, setUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [message, setMessage] = useState('')
  
  const checkAvailability = async (value: string) => {
    setChecking(true)
    try {
      const { data } = await api.post('/api/users/check-username/', {
        username: value
      })
      setAvailable(data.available)
      setMessage(data.message)
    } finally {
      setChecking(false)
    }
  }
  
  return (
    <div>
      <input 
        value={username}
        onChange={(e) => {
          const val = e.target.value.toLowerCase()
          setUsername(val)
        }}
        onBlur={() => checkAvailability(username)}
      />
      {checking && <Spinner />}
      {available === true && <Check className="text-green-500" />}
      {available === false && <X className="text-red-500" />}
      <p className="text-sm text-gray-600">
        Το workspace σας: {username}.newconcierge.app
      </p>
    </div>
  )
}
```

---

## 🚀 Deployment Checklist

### Before Deploying

- [ ] Run migrations on production database
- [ ] Test username availability endpoint
- [ ] Test registration with username
- [ ] Test tenant creation
- [ ] Verify DNS wildcard subdomain setup
- [ ] Test login with username
- [ ] Test login with email (backward compatibility)

### After Deploying

- [ ] Monitor error logs for migration issues
- [ ] Verify existing users can still login
- [ ] Test new user registration flow
- [ ] Verify tenant subdomains work
- [ ] Update user documentation

---

## 📊 Progress Summary

| Task | Status | File(s) Modified | Lines Changed |
|------|--------|-----------------|---------------|
| Add username field | ✅ | users/models.py | +16 |
| Availability endpoint | ✅ | users/views.py, urls.py | +92 |
| Registration serializer | ✅ | users/serializers.py | +20 |
| Tenant creation logic | ✅ | billing/views.py, webhooks.py | +12 |
| Frontend form | ❌ | RegisterForm.tsx | Pending |
| Auth with username | ❌ | users/views.py | Pending |
| Database migration | ❌ | - | Pending |
| Documentation | ❌ | Various | Pending |

**Overall Progress**: 🟢 50% Complete (Backend mostly done, Frontend pending)

---

## 🔗 Related Issues

- #TENANT-001: Confused subdomain names (theo-etherm202 vs theo-eth)
- #AUTH-001: Login endpoint 405 on tenant subdomains (RESOLVED)
- #UI-001: Need better tenant naming UX

---

## 👥 Next Steps

**Immediate:**
1. Update `RegisterForm.tsx` with username input
2. Add real-time username validation in frontend
3. Create database migration
4. Test full registration flow

**Soon:**
5. Update authentication to support username login
6. Add username to user profile editing
7. Document new architecture
8. Update onboarding emails with username info

**Future:**
9. Allow username change (with constraints)
10. Username history/audit log
11. Username recovery system
12. Username suggestions based on email

---

**Last Updated**: November 2, 2025  
**Contributors**: Claude, Theo  
**Status**: Backend implementation complete, ready for frontend integration

