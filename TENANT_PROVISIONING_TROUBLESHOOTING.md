# Tenant Provisioning Troubleshooting Guide

## Επισκόπηση

Αυτός ο οδηγός καλύπτει την αντιμετώπιση προβλημάτων στη ροή **tenant provisioning** που ενεργοποιείται από το **Stripe webhook** μετά την ολοκλήρωση πληρωμής.

⚠️ **ΣΗΜΑΝΤΙΚΟ:** Αυτή η ροή είναι **ΔΙΑΦΟΡΕΤΙΚΗ** από τις **resident/tenant invitations** του users module:
- **Tenant Workspace Access** (αυτή η ροή): `/api/tenants/accept-invite/` - πρόσβαση στο workspace μετά από Stripe payment
- **Resident/Tenant Invitations**: `/api/users/invitations/accept/` - προσκλήσεις κατοίκων από tenant admins

---

## 1. Επιβεβαίωση Stripe Webhook Status

### Script: `verify_webhook_completion.py`

```bash
cd linux_version/backend
python scripts/verify_webhook_completion.py --email user@example.com
```

**Αναζήτηση σε logs:**
- `[WEBHOOK] checkout.session.completed: <session_id>`
- `[TENANT_PROVISIONING] ✅ Provisioning complete for <email> → <schema>`
- `[WEBHOOK] Provisioning failed: <error>`

**Railway/Django logs:**
```bash
# Railway CLI
railway logs | grep "\[WEBHOOK\]"
railway logs | grep "\[TENANT_PROVISIONING\]"

# Django logs
tail -f logs/django.log | grep "\[WEBHOOK\]"
```

---

## 2. Έλεγχος Public Schema Database

### Script: `check_tenant_provisioning.py`

```bash
# Έλεγχος user-tenant mapping
python scripts/check_tenant_provisioning.py --email user@example.com

# Έλεγχος tenant schema
python scripts/check_tenant_provisioning.py --schema tenant-name

# List pending users
python scripts/check_tenant_provisioning.py --pending

# Raw SQL queries
python scripts/check_tenant_provisioning.py --email user@example.com --sql
```

**SQL Queries:**
```sql
-- Check user-tenant mapping
SELECT id, email, tenant_id FROM users_customuser WHERE email='<user>';

-- Check tenant schema exists
SELECT id, schema_name FROM tenants_client WHERE schema_name='<expected>';

-- Check pending provisioning
SELECT email, stripe_checkout_session_id, tenant_id 
FROM users_customuser 
WHERE stripe_checkout_session_id IS NOT NULL 
  AND tenant_id IS NULL;
```

---

## 3. Απομόνωση Webhook Failures

### Enhanced Logging

Το `TenantService.create_tenant_and_subscription` έχει αναλυτικό logging:

- `[TENANT_PROVISIONING] Step X: ...` - κάθε βήμα provisioning
- `[MIGRATIONS] FAILED: ...` - σφάλματα migrations
- `[SUBSCRIPTION] FAILED: ...` - σφάλματα subscription
- `[DEMO_DATA] FAILED: ...` - σφάλματα demo data

**Manual Migration Test:**
```bash
python manage.py migrate_schemas --schema=<schema_name>
```

### Test Script: `manual_webhook_trigger.py`

```bash
python manual_webhook_trigger.py user@example.com
```

Αυτό το script:
- Ελέγχει αν ο χρήστης έχει checkout session
- Προσομοιώνει το webhook event
- Επαληθεύει tenant creation
- Επιστρέφει λεπτομερή status report

---

## 4. Email Token Verification

### Logging

Το `EmailService.send_tenant_welcome_email` logάρει:
- `[TENANT_WELCOME_EMAIL] Generated token (preview): <first_10_chars>...`
- `[TENANT_WELCOME_EMAIL] Access URL generated: <url>`

**Verification:**
1. Έλεγχος backend logs για token generation
2. Έλεγχος email inbox για welcome email
3. Αν λείπει token, χρησιμοποίησε το `regenerate_tenant_token` command

---

## 5. Testing Tenant Workspace Access Flow

### Endpoint: `/api/tenants/accept-invite/`

⚠️ **ΔΙΑΦΟΡΕΤΙΚΟ** από `/api/users/invitations/accept/` (resident invitations)

**Test:**
```bash
curl -X POST https://linuxversion-production.up.railway.app/api/tenants/accept-invite/ \
  -H "Content-Type: application/json" \
  -d '{"token": "<token_from_email>"}'
```

**Enhanced Logging:**
- `[TENANT_WORKSPACE_ACCESS] Received workspace access request...`
- `[TENANT_WORKSPACE_ACCESS] Validating workspace access token...`
- `[TENANT_WORKSPACE_ACCESS] Querying user with id: <id>`
- `[TENANT_WORKSPACE_ACCESS] ✅ Successfully granted workspace access...`

**Common Issues:**
- **404 User not found**: Ο webhook δεν έχει ολοκληρώσει ακόμα
- **404 Tenant not found**: Το schema δεν έχει δημιουργηθεί
- **403 Invalid tenant access**: Το `user.tenant_id` δεν ταιριάζει με το token

---

## 6. Proxy Verification (Next.js Rewrites)

### Logging

Το proxy route (`app/api/proxy/[...path]/route.ts`) logάρει:
```
[PROXY] Forwarding request: {
  method: 'POST',
  originalPath: '/api/tenants/accept-invite/',
  targetUrl: 'https://linuxversion-production.up.railway.app/api/tenants/accept-invite/',
  hasQueryString: false
}
```

**Verification:**
- Έλεγχος browser console για proxy logs
- Έλεγχος network tab για final URL
- Έλεγχος ότι το target είναι το σωστό Django domain

---

## 7. Cross-Schema Verification

### Endpoint: `/api/buildings/public/`

Μετά την επιτυχή workspace access, δοκίμασε:
```bash
curl -X GET https://linuxversion-production.up.railway.app/api/buildings/public/ \
  -H "Authorization: Bearer <access_token>"
```

**Enhanced Logging:**
- `[PUBLIC_BUILDINGS] Authenticated user: <email>`
- `[PUBLIC_BUILDINGS] User has tenant object: <tenant>`
- `[PUBLIC_BUILDINGS] Tenant schema_name: <schema>`
- `[PUBLIC_BUILDINGS] Final target schema: <schema>`
- `[PUBLIC_BUILDINGS] Found <count> buildings in schema <schema>`

Αυτό επιβεβαιώνει ότι ο user έχει access στο σωστό tenant schema.

---

## 8. End-to-End Testing

### Full Flow Test

1. **Create new user account**
2. **Complete Stripe checkout**
3. **Wait for webhook** (poll `/api/billing/subscription-status/<session_id>/`)
4. **Check email** for welcome email with token
5. **Click email link** → `/tenant/accept?token=...`
6. **Verify redirect** to dashboard
7. **Verify buildings** from new tenant schema

### Frontend Guards

Η σελίδα `/tenant/accept` έχει:
- **Subscription status guard**: Ελέγχει αν `subscription-status === 'completed'`
- **Retry logic**: Εκτελεί retry με exponential backoff για 404 errors
- **Timeout handling**: Αν η ρύθμιση δεν ολοκληρωθεί, εμφανίζει μήνυμα

---

## 9. Common Errors & Solutions

### Error: "User not found" (404)
**Cause:** Ο webhook δεν έχει ολοκληρώσει ακόμα το provisioning  
**Solution:**
- Έλεγξε backend logs για `[TENANT_PROVISIONING]`
- Περίμενε λίγο και δοκίμασε ξανά
- Χρησιμοποίησε `manual_webhook_trigger.py` για manual trigger

### Error: "Tenant not found" (404)
**Cause:** Το tenant schema δεν έχει δημιουργηθεί  
**Solution:**
- Έλεγξε αν υπάρχει το schema: `check_tenant_provisioning.py --schema <name>`
- Έλεγξε migration errors: `[MIGRATIONS] FAILED`
- Εκτέλεσε manual migration: `python manage.py migrate_schemas --schema=<name>`

### Error: "Token expired"
**Cause:** Το token έχει λήξει (>24h)  
**Solution:**
- Χρησιμοποίησε `regenerate_tenant_token` command
- Ή συνδέσου κανονικά με email/password

### Error: "Invalid tenant access" (403)
**Cause:** Το `user.tenant_id` δεν ταιριάζει με το token  
**Solution:**
- Έλεγξε user-tenant mapping: `check_tenant_provisioning.py --email <user>`
- Έλεγξε αν ο webhook έχει link-άρει σωστά τον user με το tenant

### Error: "Subscription status not completed"
**Cause:** Το provisioning δεν έχει ολοκληρωθεί  
**Solution:**
- Έλεγξε subscription status: `/api/billing/subscription-status/<session_id>/`
- Περίμενε για webhook completion
- Έλεγξε backend logs για provisioning errors

---

## 10. Dependencies Checklist

### Stripe Webhook
- ✅ Webhook endpoint configured: `/api/billing/webhook/stripe/`
- ✅ Events enabled: `checkout.session.completed`
- ✅ Webhook secret configured: `STRIPE_WEBHOOK_SECRET`

### Database
- ✅ Public schema migrations applied
- ✅ Tenant migrations working: `migrate_schemas`
- ✅ Schema exists verification

### Email Service
- ✅ Email configuration: `DEFAULT_FROM_EMAIL`
- ✅ Frontend URL: `FRONTEND_URL` (for access link)

### Frontend
- ✅ Proxy routes configured (`next.config.js`)
- ✅ Subscription status polling
- ✅ Retry logic for 404 errors

---

## 11. Manual Repair Steps

### 1. Regenerate Tenant Access Token

```bash
python manage.py regenerate_tenant_token user@example.com
```

### 2. Manual Webhook Trigger

```bash
python manual_webhook_trigger.py user@example.com
```

### 3. Manual Migration

```bash
python manage.py migrate_schemas --schema=<schema_name>
```

### 4. Fix User-Tenant Link

```python
from users.models import CustomUser
from tenants.models import Client

user = CustomUser.objects.get(email='user@example.com')
tenant = Client.objects.get(schema_name='tenant-name')
user.tenant = tenant
user.save()
```

---

## 12. Operational Queries

### Check Provisioning Status
```bash
python scripts/verify_webhook_completion.py --email user@example.com
python scripts/check_tenant_provisioning.py --email user@example.com
```

### Check Pending Provisioning
```bash
python scripts/check_tenant_provisioning.py --pending
python manual_webhook_trigger.py  # without email argument
```

### Verify Schema Exists
```bash
python scripts/check_tenant_provisioning.py --schema <schema_name>
```

---

## 13. Differences: Workspace Access vs Resident Invitations

| Feature | **Tenant Workspace Access** (Stripe) | **Resident Invitations** (Users Module) |
|---------|-------------------------------------|------------------------------------------|
| **Endpoint** | `/api/tenants/accept-invite/` | `/api/users/invitations/accept/` |
| **Trigger** | Stripe webhook (after payment) | Tenant admin sends invitation |
| **Token Source** | `EmailService.send_tenant_welcome_email` | `TenantInvitation.generate_token` |
| **Model** | N/A (signed token) | `TenantInvitation` |
| **Purpose** | Access to workspace after subscription | Invite residents/tenants to join |
| **Log Tag** | `[TENANT_WORKSPACE_ACCESS]` | `[TENANT_INVITATION]` |
| **User Role** | Always Manager (subscription owner) | Resident/Manager/Staff (as assigned) |

---

## 14. Scripts Reference

### Verification Scripts
- `scripts/verify_webhook_completion.py` - Check webhook status
- `scripts/check_tenant_provisioning.py` - Check DB provisioning status

### Manual Tools
- `manual_webhook_trigger.py` - Manually trigger webhook for user

### Management Commands
- `python manage.py regenerate_tenant_token <email>` - Regenerate access token
- `python manage.py migrate_schemas --schema=<name>` - Manual migration

---

## 15. Log Tags Reference

| Tag | Purpose | Location |
|-----|---------|----------|
| `[WEBHOOK]` | Stripe webhook events | `billing/webhooks.py` |
| `[TENANT_PROVISIONING]` | Tenant creation process | `tenants/services.py` |
| `[MIGRATIONS]` | Schema migrations | `tenants/services.py` |
| `[SUBSCRIPTION]` | Subscription creation | `tenants/services.py` |
| `[DEMO_DATA]` | Demo data creation | `tenants/services.py` |
| `[TENANT_WELCOME_EMAIL]` | Welcome email sending | `users/services.py` |
| `[TENANT_WORKSPACE_ACCESS]` | Workspace access (Stripe) | `tenants/views.py` |
| `[PUBLIC_BUILDINGS]` | Building listing | `buildings/views.py` |
| `[PROXY]` | API proxy forwarding | `frontend/app/api/proxy/[...path]/route.ts` |

⚠️ **Σημείωση:** `[TENANT_INVITATION]` tag χρησιμοποιείται για resident invitations, όχι για workspace access.

