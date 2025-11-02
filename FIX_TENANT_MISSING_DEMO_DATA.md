# 🔧 Fix Tenant Missing Demo Data

**Problem**: Tenant exists but `/api/buildings/public` returns 404  
**Cause**: Tenant created without demo buildings/apartments  
**Solution**: Run demo data creation script  

---

## 🔍 Diagnosis

From your logs:
```
✅ Login: 200 OK
✅ GET /api/users/me: 200 OK
✅ GET /api/users/subscription: 200 OK
❌ GET /api/buildings/public: 404 Not Found

[SessionTenantMiddleware] Resolved tenant from X-Tenant-Schema header: theo
WARNING: Not Found: /api/buildings/public
```

**Analysis:**
- ✅ Tenant `theo` **exists** in database
- ✅ User authentication **works**
- ✅ Middleware routing **works**  
- ❌ Tenant has **NO buildings** (empty schema)

---

## 🚀 Quick Fix (Railway)

### Option 1: Railway Dashboard Terminal (Easiest)

1. **Open Railway**
   - Go to: https://railway.app/
   - Navigate to: `linuxversion-production`
   - Click: Backend service
   - Click: "Terminal" or "💻" button

2. **Create Fix Script**
   ```bash
   # Create the script
   cat > /app/fix_tenant_theo.py << 'EOF'
#!/usr/bin/env python
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from tenants.services import TenantService

print("Creating demo data for tenant 'theo'...")

with schema_context('theo'):
    from buildings.models import Building
    if Building.objects.count() == 0:
        tenant_service = TenantService()
        tenant_service._create_demo_data('theo')
        print(f"✅ Created {Building.objects.count()} building(s)")
    else:
        print("✅ Buildings already exist")
EOF
   ```

3. **Run the Script**
   ```bash
   python /app/fix_tenant_theo.py
   ```

4. **Expected Output**
   ```
   Creating demo data for tenant 'theo'...
   [DEMO_DATA] Starting demo data creation in schema theo
   [DEMO_DATA] Creating building with tenant user: ...
   [DEMO_DATA] Created building 1: 🎓 Demo Building - Αλκμάνος 22
   [DEMO_DATA] Created demo building 'Αλκμάνος 22' with 10/10 apartments
   ✅ Created 1 building(s)
   ```

5. **Verify**
   ```bash
   python manage.py shell -c "
   from django_tenants.utils import schema_context
   with schema_context('theo'):
       from buildings.models import Building
       print(f'Buildings in theo: {Building.objects.count()}')
       for b in Building.objects.all():
           print(f'  - {b.name}')
   "
   ```

### Option 2: Using Prepared Script

If you have access to the repository files on Railway:

```bash
# The script is already in your repo
python /app/fix_tenant_theo_demo_data.py
```

---

## 🧪 Test After Fix

1. **Refresh Browser**
   ```
   https://theo.newconcierge.app/
   ```

2. **Expected Behavior**
   - ✅ Dashboard loads
   - ✅ Shows "Αλκμάνος 22" building
   - ✅ Shows 10 apartments
   - ✅ No 404 errors

---

## 🔄 Prevent This Issue in Future

The tenant provisioning webhook should **always** create demo data. Let's verify the webhook code:

### Check Webhook Logic

```bash
# In Railway terminal
python manage.py shell
```

```python
from billing.webhooks import StripeWebhookView
# The webhook should call tenant_service._create_demo_data(schema_name)
```

### Verify in Code

File: `backend/tenants/services.py`

The `create_tenant_infrastructure` method should call `_create_demo_data`:

```python
def create_tenant_infrastructure(self, schema_name, user, ...):
    # ... tenant creation ...
    # ... domain creation ...
    # ... migrations ...
    self._create_demo_data(schema_name)  # ← Must be called!
```

---

## 🐛 Root Cause Analysis

### Why Did This Happen?

**Possible Causes:**

1. **Webhook Failure**: The Stripe webhook ran but crashed before demo data creation
2. **Manual Tenant**: Someone created the tenant manually without demo data
3. **Race Condition**: Demo data creation failed silently
4. **Migration Issue**: Tenant created before demo data method was available

### Evidence from Logs

```
[TENANT_PROVISIONING] Step 7: Creating demo data in schema theo-etherm202
[DEMO_DATA] Starting demo data creation in schema theo-etherm202
[DEMO_DATA] Created demo building 'Αλκμάνος 22' with 10/10 apartments
```

But for tenant `theo`, we don't see these logs! This means:
- Either tenant `theo` was created manually
- Or the webhook failed before Step 7

---

## 🔧 Comprehensive Fix Script

For fixing **any** tenant with missing demo data:

```python
#!/usr/bin/env python
"""
Universal tenant demo data fixer
Usage: Fix any tenant that's missing demo data
"""
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context, get_tenant_model
from tenants.services import TenantService

# Get all tenants
TenantModel = get_tenant_model()
tenant_service = TenantService()

for tenant in TenantModel.objects.exclude(schema_name='public'):
    print(f"\nChecking tenant: {tenant.schema_name}")
    
    with schema_context(tenant.schema_name):
        from buildings.models import Building
        count = Building.objects.count()
        
        if count == 0:
            print(f"  ⚠️ No buildings! Creating demo data...")
            try:
                tenant_service._create_demo_data(tenant.schema_name)
                print(f"  ✅ Demo data created")
            except Exception as e:
                print(f"  ❌ Failed: {e}")
        else:
            print(f"  ✅ Has {count} building(s)")

print("\n✅ All tenants checked!")
```

---

## 📊 Verify All Tenants

After fixing, verify all tenants have buildings:

```bash
python manage.py shell -c "
from django_tenants.utils import schema_context, get_tenant_model

TenantModel = get_tenant_model()

print('Tenant Building Status:')
print('-' * 60)

for tenant in TenantModel.objects.exclude(schema_name='public'):
    with schema_context(tenant.schema_name):
        from buildings.models import Building
        count = Building.objects.count()
        status = '✅' if count > 0 else '❌'
        print(f'{status} {tenant.schema_name:30} {count} buildings')
"
```

**Expected Output:**
```
Tenant Building Status:
------------------------------------------------------------
✅ demo                          1 buildings
✅ theo                          1 buildings
✅ theo-etherm202                1 buildings
```

---

## 🎯 Long-term Solution

Update the webhook to **always** ensure demo data exists:

**File**: `backend/billing/webhooks.py`

Add verification after tenant creation:

```python
# After tenant creation
tenant, subscription = tenant_service.create_tenant_and_subscription(...)

# VERIFY demo data was created
with schema_context(tenant.schema_name):
    from buildings.models import Building
    if Building.objects.count() == 0:
        logger.warning(f"Demo data missing for {tenant.schema_name}, creating now...")
        tenant_service._create_demo_data(tenant.schema_name)
```

---

## 🚀 Execute Fix Now

### For Tenant 'theo'

```bash
# In Railway terminal
python << 'EOF'
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from tenants.services import TenantService

with schema_context('theo'):
    from buildings.models import Building
    if Building.objects.count() == 0:
        print("Creating demo data...")
        TenantService()._create_demo_data('theo')
        print(f"✅ Created {Building.objects.count()} building(s)")
    else:
        print(f"✅ Already has {Building.objects.count()} building(s)")
EOF
```

### Then Test

```
https://theo.newconcierge.app/
```

Should now show dashboard with Αλκμάνος 22 building! ✅

---

## 📋 Summary

**Problem**: `/api/buildings/public` → 404  
**Cause**: Tenant exists but no buildings  
**Fix**: Run demo data creation script  
**Prevention**: Webhook should verify demo data exists  

**Time**: 2 minutes to fix  
**Impact**: Tenant fully operational after fix  

---

**Last Updated**: November 2, 2025  
**Status**: Ready to Execute on Railway

