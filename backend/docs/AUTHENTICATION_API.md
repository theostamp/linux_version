# Authentication API Documentation

## Overview

The New Concierge Authentication API provides comprehensive user management functionality including registration, login, invitations, password management, and security features.

## Base URL

```
http://localhost:18000/api/users/
```

## Authentication

The API uses JWT (JSON Web Token) authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Endpoints

### 1. User Registration

**POST** `/register/`

Register a new user account.

**Request Body:**
```json
{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "password_confirm": "SecurePassword123!",
    "first_name": "John",
    "last_name": "Doe"
}
```

**Response:**
```json
{
    "message": "User registered successfully. Please check your email for verification.",
    "user_id": 123
}
```

**Rate Limit:** 3 requests per minute

---

### 2. Email Verification

**POST** `/verify-email/`

Verify user email address with token.

**Request Body:**
```json
{
    "token": "verification-token-from-email"
}
```

**Response:**
```json
{
    "message": "Email verified successfully. Account activated."
}
```

**Rate Limit:** 5 requests per minute

---

### 3. User Login

**POST** `/login/`

Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
    "email": "user@example.com",
    "password": "SecurePassword123!"
}
```

**Response:**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
        "id": 123,
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "is_active": true,
        "email_verified": true,
        "groups": ["Resident"]
    }
}
```

**Rate Limit:** 5 requests per minute

**Security Features:**
- Account lockout after 5 failed attempts (30 minutes)
- Login attempts are tracked with IP and user agent
- Failed attempts are logged for security audit

---

### 4. Token Refresh

**POST** `/token/refresh/`

Refresh expired access token using refresh token.

**Request Body:**
```json
{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response:**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

### 5. User Profile

**GET** `/profile/`

Get current user profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
    "id": 123,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "is_active": true,
    "email_verified": true,
    "date_joined": "2024-01-15T10:30:00Z",
    "groups": ["Resident"],
    "role": "resident",
    "office_name": "Office Name",
    "office_address": "123 Main St",
    "office_phone": "+1234567890",
    "office_logo": "https://example.com/logo.png",
    "office_bank_account": "GR123456789",
    "email_notifications_enabled": true,
    "sms_notifications_enabled": false,
    "notify_financial_updates": true,
    "notify_maintenance_updates": true,
    "notify_announcements": true,
    "notify_votes": true
}
```

**PUT/PATCH** `/profile/`

Update user profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
    "first_name": "Jane",
    "last_name": "Smith",
    "email_notifications_enabled": false,
    "notify_financial_updates": false
}
```

**Response:**
```json
{
    "message": "Profile updated successfully",
    "user": {
        "id": 123,
        "email": "user@example.com",
        "first_name": "Jane",
        "last_name": "Smith",
        // ... other profile fields
    }
}
```

---

### 6. Password Reset Request

**POST** `/password-reset/`

Request password reset email.

**Request Body:**
```json
{
    "email": "user@example.com"
}
```

**Response:**
```json
{
    "message": "Password reset email sent if account exists."
}
```

**Rate Limit:** 3 requests per minute

---

### 7. Password Reset Confirmation

**POST** `/password-reset-confirm/`

Confirm password reset with token.

**Request Body:**
```json
{
    "token": "reset-token-from-email",
    "new_password": "NewSecurePassword123!"
}
```

**Response:**
```json
{
    "message": "Password reset successfully."
}
```

---

### 8. Change Password

**POST** `/change-password/`

Change password for authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
    "current_password": "OldPassword123!",
    "new_password": "NewPassword123!",
    "new_password_confirm": "NewPassword123!"
}
```

**Response:**
```json
{
    "message": "Password changed successfully."
}
```

---

### 9. Create User Invitation (Manager Only)

**POST** `/invite/`

Create invitation for new user (Manager role required).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
    "email": "newuser@example.com",
    "first_name": "New",
    "last_name": "User",
    "invitation_type": "resident",
    "building_id": 1
}
```

**Response:**
```json
{
    "message": "Invitation sent successfully",
    "invitation_id": 456
}
```

**Rate Limit:** 10 invitations per hour

---

### 10. List Invitations

**GET** `/invitations/`

List invitations sent by current user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
[
    {
        "id": 456,
        "email": "newuser@example.com",
        "first_name": "New",
        "last_name": "User",
        "invitation_type": "resident",
        "status": "pending",
        "invited_by_name": "Manager Name",
        "building_name": "Building Name",
        "created_at": "2024-01-15T10:30:00Z",
        "expires_at": "2024-01-22T10:30:00Z"
    }
]
```

---

### 11. Accept Invitation

**POST** `/accept-invitation/`

Accept user invitation and create account.

**Request Body:**
```json
{
    "token": "invitation-token-from-email",
    "password": "SecurePassword123!"
}
```

**Response:**
```json
{
    "message": "Invitation accepted successfully",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
        "id": 789,
        "email": "newuser@example.com",
        "first_name": "New",
        "last_name": "User",
        "is_active": true,
        "email_verified": true,
        "groups": ["Resident"]
    }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
    "error": ["Validation error message"]
}
```

### 401 Unauthorized
```json
{
    "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
    "detail": "You do not have permission to perform this action."
}
```

### 429 Too Many Requests
```json
{
    "detail": "Request was throttled. Expected available in 60 seconds."
}
```

### 500 Internal Server Error
```json
{
    "error": "Internal server error"
}
```

---

## Security Features

### Rate Limiting
- **Login**: 5 attempts per minute
- **Registration**: 3 attempts per minute
- **Password Reset**: 3 requests per minute
- **Email Verification**: 5 requests per minute
- **Invitations**: 10 per hour (Managers only)

### Account Security
- **Account Lockout**: 5 failed login attempts = 30 minute lockout
- **Login Tracking**: All attempts logged with IP, user agent, success/failure
- **Security Audit**: Comprehensive logging of all authentication events
- **Password Strength**: Enforced strong password requirements

### Email Security
- **Email Verification**: Required for account activation
- **Secure Tokens**: UUID-based tokens for verification and resets
- **Token Expiration**: 24 hours for verification, 1 hour for password reset
- **Professional Templates**: HTML email templates with consistent branding

---

## User Roles

### Manager
- Can create and send user invitations
- Full access to building management features
- Can view and manage all building data

### Resident
- Can accept invitations and create accounts
- Limited access to own building/apartment data
- Can view financial and maintenance information for their building

---

## Testing

The API includes comprehensive test coverage for all endpoints and security features. Tests can be run with:

```bash
docker compose exec backend python manage.py test tests.test_authentication_comprehensive
```

---

## Support

For API support or questions, please contact the development team or refer to the project documentation.



