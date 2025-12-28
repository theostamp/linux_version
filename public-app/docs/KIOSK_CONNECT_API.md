# Kiosk Connect API - Backend Implementation Guide

## Overview
This API enables residents to connect to the building management system by scanning a QR code from the kiosk display. The system automatically handles both existing users (login) and new users (invitation).

---

## API Endpoint

### `POST /api/kiosk/connect/`

**Purpose:** Handle resident connection requests from QR code scans.

---

## Request

### Headers
```
Content-Type: application/json
```

### Body
```json
{
  "email": "user@example.com",
  "building_id": 1,
  "token": "abc123..."
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | Resident's email address |
| `building_id` | integer | Yes | Building ID from QR code |
| `token` | string | Yes | Security token from QR code |

---

## Response

### Success Response (200 OK)

#### Scenario 1: Existing User with Building Access
```json
{
  "status": "existing_user",
  "action": "login_link_sent",
  "message": "Ελέγξτε το email σας για σύνδεση!",
  "user_id": 123
}
```

#### Scenario 2: Existing User without Building Access
```json
{
  "status": "existing_user_new_building",
  "action": "invitation_sent",
  "message": "Ελέγξτε το email σας για να προσθέσετε αυτό το κτίριο στον λογαριασμό σας!",
  "user_id": 123,
  "invitation_id": 789
}
```

#### Scenario 3: New User (No Email in System)
```json
{
  "status": "new_user",
  "action": "invitation_sent",
  "message": "Ελέγξτε το email σας για να ολοκληρώσετε την εγγραφή!",
  "invitation_id": 456
}
```

### Error Responses

#### 400 Bad Request - Invalid Token
```json
{
  "error": "Μη έγκυρο ή ληγμένο QR code. Παρακαλώ σαρώστε ξανά.",
  "code": "INVALID_TOKEN"
}
```

#### 400 Bad Request - Missing Fields
```json
{
  "error": "Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία.",
  "code": "MISSING_FIELDS"
}
```

#### 404 Not Found - Building Not Found
```json
{
  "error": "Το κτίριο δεν βρέθηκε.",
  "code": "BUILDING_NOT_FOUND"
}
```

#### 429 Too Many Requests
```json
{
  "error": "Πάρα πολλές προσπάθειες. Παρακαλώ δοκιμάστε σε λίγα λεπτά.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

---

## Implementation Logic

### Step 1: Validate Request
```python
def validate_request(email, building_id, token):
    # Check required fields
    if not all([email, building_id, token]):
        raise ValidationError("Missing required fields")

    # Validate email format
    if not validate_email_format(email):
        raise ValidationError("Invalid email format")

    # Validate building exists
    building = Building.objects.filter(id=building_id).first()
    if not building:
        raise NotFoundError("Building not found")

    # Validate token
    if not validate_qr_token(token, building_id):
        raise ValidationError("Invalid or expired token")

    return building
```

### Step 2: Check User Status
```python
def check_user_status(email, building):
    # Check if user exists
    user = User.objects.filter(email=email).first()

    if not user:
        return {
            'exists': False,
            'user': None,
            'has_access': False
        }

    # Check if user has access to this building
    has_access = check_building_access(user, building)

    return {
        'exists': True,
        'user': user,
        'has_access': has_access
    }
```

### Step 3: Handle User Flow
```python
def handle_connection(email, building, user_status):
    if user_status['exists'] and user_status['has_access']:
        # Existing user with access → Send magic link for login
        send_magic_link(email, building)
        return {
            'status': 'existing_user',
            'action': 'login_link_sent'
        }

    elif user_status['exists'] and not user_status['has_access']:
        # User exists but no access to this building
        # → Send invitation to add building to their account
        # (Direct account creation with email verification)
        invitation = create_building_invitation_for_existing_user(
            user_status['user'],
            building
        )
        send_invitation_email(invitation)
        return {
            'status': 'existing_user_new_building',
            'action': 'invitation_sent'
        }

    else:
        # New user (no email in system) → Send invitation
        invitation = create_invitation(email, building)
        send_invitation_email(invitation)
        return {
            'status': 'new_user',
            'action': 'invitation_sent'
        }
```

---

## Security Considerations

### 1. Token Generation & Validation

**Token Format:**
```python
token = generate_secure_token(building_id, timestamp)
# Example: hmac_sha256(f"{building_id}-{timestamp}-{SECRET_KEY}")
```

**Token Validation:**
```python
def validate_qr_token(token, building_id):
    try:
        # Decode token
        decoded = decode_token(token)

        # Check building ID matches
        if decoded['building_id'] != building_id:
            return False

        # Check token age (max 24 hours)
        token_age = time.now() - decoded['timestamp']
        if token_age > timedelta(hours=24):
            return False

        return True
    except Exception:
        return False
```

### 2. Rate Limiting

Implement rate limiting to prevent abuse:

```python
# Rate limits:
# - 5 requests per email per hour
# - 20 requests per IP per hour
# - 100 requests per building per hour

@ratelimit(key='email', rate='5/h')
@ratelimit(key='ip', rate='20/h')
@ratelimit(key='building', rate='100/h')
def kiosk_connect_view(request):
    ...
```

### 3. Email Verification

All emails sent should include:
- Unique verification link
- Expiration time (24-48 hours)
- Building information
- Clear instructions

---

## Email Templates

### 1. Magic Link Email (Existing User with Access)
```
Subject: Σύνδεση στο {building_name}

Γεια σας,

Ζητήσατε σύνδεση στο σύστημα διαχείρισης για το κτίριο {building_name}.

Πατήστε εδώ για να συνδεθείτε:
{magic_link}

Ο σύνδεσμος ισχύει για 24 ώρες.

Αν δεν ζητήσατε αυτό το email, παρακαλώ αγνοήστε το.
```

### 2. Add Building Email (Existing User without Access)
```
Subject: Προσθήκη νέου κτιρίου - {building_name}

Γεια σας,

Ζητήσατε πρόσβαση στο κτίριο {building_name}.

Επειδή έχετε ήδη λογαριασμό στο σύστημά μας, μπορείτε να προσθέσετε
αυτό το κτίριο στον λογαριασμό σας πατώντας τον παρακάτω σύνδεσμο:

{add_building_link}

Μετά την επιβεβαίωση, θα έχετε πρόσβαση σε όλες τις λειτουργίες
του κτιρίου {building_name}.

Ο σύνδεσμος ισχύει για 48 ώρες.

Αν δεν ζητήσατε αυτό το email, παρακαλώ αγνοήστε το.
```

### 3. Invitation Email (New User)
```
Subject: Πρόσκληση στο {building_name}

Καλώς ήρθατε!

Έχετε προσκληθεί να εγγραφείτε στο σύστημα διαχείρισης του κτιρίου {building_name}.

Πατήστε εδώ για να ολοκληρώσετε την εγγραφή σας:
{invitation_link}

Ο σύνδεσμος ισχύει για 48 ώρες.

Καλή σας εμπειρία!
```

---

## Database Models (Reference)

### QRToken Model (Optional - for persistent tokens)
```python
class QRToken(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def is_valid(self):
        return self.is_active and self.expires_at > timezone.now()
```

### ConnectionRequest Model (Optional - for tracking)
```python
class KioskConnectionRequest(models.Model):
    email = models.EmailField()
    building = models.ForeignKey(Building, on_delete=models.CASCADE)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    status = models.CharField(max_length=50)  # 'sent', 'completed', 'failed'
    created_at = models.DateTimeField(auto_now_add=True)
```

---

## Example Django View Implementation

```python
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import json

@csrf_exempt
@require_http_methods(["POST"])
def kiosk_connect(request):
    try:
        # Parse request
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        building_id = data.get('building_id')
        token = data.get('token')

        # Validate required fields
        if not all([email, building_id, token]):
            return JsonResponse({
                'error': 'Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία.',
                'code': 'MISSING_FIELDS'
            }, status=400)

        # Validate email
        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({
                'error': 'Μη έγκυρη διεύθυνση email.',
                'code': 'INVALID_EMAIL'
            }, status=400)

        # Validate building
        building = Building.objects.filter(id=building_id).first()
        if not building:
            return JsonResponse({
                'error': 'Το κτίριο δεν βρέθηκε.',
                'code': 'BUILDING_NOT_FOUND'
            }, status=404)

        # Validate token (implement your token validation logic)
        if not validate_qr_token(token, building_id):
            return JsonResponse({
                'error': 'Μη έγκυρο ή ληγμένο QR code.',
                'code': 'INVALID_TOKEN'
            }, status=400)

        # Check if user exists
        user = User.objects.filter(email=email).first()

        if user:
            # Check if user has access to this building
            has_access = check_user_building_access(user, building)

            if has_access:
                # User exists with access → Send magic link for login
                send_magic_link_email(user, building)
                return JsonResponse({
                    'status': 'existing_user',
                    'action': 'login_link_sent',
                    'message': 'Ελέγξτε το email σας για σύνδεση!'
                })
            else:
                # User exists but no access → Send invitation to add building
                # (Direct account creation with email verification)
                invitation = create_building_invitation_for_existing_user(user, building)
                send_invitation_email(invitation)
                return JsonResponse({
                    'status': 'existing_user_new_building',
                    'action': 'invitation_sent',
                    'message': 'Ελέγξτε το email σας για να προσθέσετε αυτό το κτίριο στον λογαριασμό σας!'
                })
        else:
            # Create invitation
            invitation = create_building_invitation(email, building)
            send_invitation_email(invitation)
            return JsonResponse({
                'status': 'new_user',
                'action': 'invitation_sent',
                'message': 'Ελέγξτε το email σας για να ολοκληρώσετε την εγγραφή!'
            })

    except Exception as e:
        logger.error(f"Kiosk connect error: {str(e)}")
        return JsonResponse({
            'error': 'Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.',
            'code': 'INTERNAL_ERROR'
        }, status=500)
```

---

## Testing Checklist

- [ ] Valid email with existing user and access → Magic link sent
- [ ] Valid email with existing user but no access → Access request created
- [ ] Valid email with new user → Invitation sent
- [ ] Invalid email format → Error returned
- [ ] Missing fields → Error returned
- [ ] Invalid token → Error returned
- [ ] Expired token → Error returned
- [ ] Invalid building ID → Error returned
- [ ] Rate limiting works correctly
- [ ] Emails are sent correctly
- [ ] Links in emails work correctly

---

## Next Steps

1. Implement the backend API endpoint in Django
2. Add QR token generation endpoint (for rotating tokens)
3. Create email templates
4. Set up rate limiting
5. Add monitoring and logging
6. Test the complete flow

---

## Notes

- Consider adding analytics to track QR code scans
- Consider adding A/B testing for different messages
- Consider adding multi-language support
- Consider adding SMS option for users without email
