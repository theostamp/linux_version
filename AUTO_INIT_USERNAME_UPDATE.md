# 🔄 Auto-Initialization Script - Username Support

**Date**: November 2, 2025  
**Commit**: `a6fce5e7`  
**File**: `backend/scripts/auto_initialization.py`  
**Status**: ✅ UPDATED

---

## 📋 Τι Άλλαξε

Το `auto_initialization.py` script που τρέχει αυτόματα κατά την εκκίνηση του container τώρα δημιουργεί users με **username field**.

### Πριν
```python
CustomUser.objects.get_or_create(
    email='admin@demo.localhost',
    defaults={
        'first_name': 'Admin',
        'last_name': 'User',
        # ❌ NO USERNAME
    }
)
```

### Τώρα
```python
CustomUser.objects.get_or_create(
    email='admin@demo.localhost',
    defaults={
        'username': 'demo-admin',  # ✅ USERNAME ADDED
        'first_name': 'Admin',
        'last_name': 'User',
    }
)
```

---

## 👥 Demo Users με Usernames

### Public Schema (Ultra-Superuser)

```python
Email: theostam1966@gmail.com
Username: theostam
Password: theo123!@#
Role: Ultra Admin (System Administrator)
```

### Demo Tenant Schema

```python
1. Admin User
   Email: admin@demo.localhost
   Username: demo-admin
   Password: admin123456
   Role: admin

2. Manager User
   Email: manager@demo.localhost
   Username: demo-manager
   Password: manager123456
   Role: manager

3. Resident 1
   Email: resident1@demo.localhost
   Username: demo-resident1
   Password: resident123456
   Role: resident

4. Resident 2
   Email: resident2@demo.localhost
   Username: demo-resident2
   Password: resident123456
   Role: resident
```

---

## 🔄 Auto-Update Logic

Όταν το script τρέχει σε **existing users**:

```python
if created:
    # New user → set username from user_data
    user.username = user_data['username']
else:
    # Existing user → add username if missing
    if not user.username:
        user.username = user_data['username']
```

**Benefits:**
- ✅ Νέοι users δημιουργούνται με username
- ✅ Παλιοί users παίρνουν username automatically
- ✅ Δεν υπάρχει conflict με manual migrations
- ✅ Idempotent (μπορεί να τρέξει πολλές φορές)

---

## 🚀 Πότε Τρέχει

Το script τρέχει αυτόματα:

### Docker Container Startup
```bash
# In entrypoint.sh
python scripts/auto_initialization.py
```

**Triggers:**
- `docker-compose up`
- `docker restart linux_version-backend-1`
- Railway deployment
- Container restart

### Manual Execution
```bash
docker exec -it linux_version-backend-1 python scripts/auto_initialization.py
```

---

## ✅ Τι Κάνει το Script

1. **Wait for Database** - Περιμένει PostgreSQL
2. **Run Migrations** - `python manage.py migrate`
3. **Setup RBAC** - Δημιουργεί Groups (Manager, Resident)
4. **Setup Billing** - Δημιουργεί Subscription Plans
5. **Create Public Tenant** - Δημιουργεί public schema
6. **Create Ultra-Superuser** - theostam1966@gmail.com (**με username: theostam**)
7. **Create Demo Tenant** (disabled in production)
8. **Create Demo Data** (disabled in production)
9. **Save Credentials** - Σώζει στο logs/demo_credentials.log
10. **Warm Up Frontend** - Background thread για frontend optimization

---

## 🎯 Impact on New Deployments

### First Deploy (Fresh Database)

```
1. Container starts
2. auto_initialization.py runs
3. Creates users WITH username:
   - theostam1966@gmail.com → username: theostam ✅
   - admin@demo.localhost → username: demo-admin ✅
   - etc.
4. Database ready with username field populated
```

### Subsequent Deploys (Existing Database)

```
1. Container restarts
2. auto_initialization.py runs
3. Finds existing users
4. Updates users WITHOUT username:
   - Adds username: demo-admin ✅
5. Existing users with username: unchanged ✅
6. Database consistent
```

---

## 🔧 Integration with Migration

### Timeline

```
T+0: Deploy code (username field in model)
T+1: Railway runs auto_initialization.py
T+2: Migration 0013 runs (adds username column)
T+3: auto_initialization updates existing users
T+4: All users have usernames ✅
```

### Safety Measures

```python
# Script checks if username exists before updating
if not user.username:
    user.username = user_data['username']
```

**Prevents:**
- ❌ Overwriting user-chosen usernames
- ❌ Duplicate username errors
- ❌ Data loss

---

## 🧪 Testing the Updated Script

### Test Locally

```bash
# Start containers
docker-compose up -d

# Watch logs
docker logs linux_version-backend-1 -f

# Look for:
✅ Δημιουργήθηκε Ultra-Superuser: theostam1966@gmail.com (username: theostam)
✅ Δημιουργήθηκε χρήστης: admin@demo.localhost (username: demo-admin)
```

### Test on Railway

```bash
# After deployment
railway logs

# Look for same messages
```

### Verify in Database

```bash
# Railway terminal
python manage.py shell -c "
from users.models import CustomUser
for user in CustomUser.objects.all():
    print(f'{user.email:40} → {user.username}')
"
```

**Expected Output:**
```
theostam1966@gmail.com                   → theostam
admin@demo.localhost                     → demo-admin
manager@demo.localhost                   → demo-manager
resident1@demo.localhost                 → demo-resident1
resident2@demo.localhost                 → demo-resident2
```

---

## 📊 Username Naming Convention

### Pattern: `{context}-{role}`

**Public Schema:**
```
theostam           (personal username, no prefix)
```

**Demo Tenant:**
```
demo-admin         (demo tenant admin)
demo-manager       (demo tenant manager)
demo-resident1     (demo tenant resident #1)
demo-resident2     (demo tenant resident #2)
```

**Production Tenants:**
```
company-admin      (company's admin)
mycompany          (user-chosen during registration)
theo-eth           (user-chosen, clean)
```

---

## 🔒 Security Considerations

### Reserved Usernames Protected

The demo usernames are automatically created:
- `demo-admin` ✅ Created by script
- `demo-manager` ✅ Created by script
- `demo-resident1` ✅ Created by script
- `demo-resident2` ✅ Created by script

These are **already taken** when the system initializes, so new users can't register with them.

### Ultra-Superuser

```
Username: theostam
Email: theostam1966@gmail.com
```

This user can:
- ✅ Login with: `theostam` or `theostam1966@gmail.com`
- ✅ Access all tenants
- ✅ Full system administration

---

## ⚙️ Configuration Files

### entrypoint.sh
```bash
# Line 48-49
echo "🎯 Running auto-initialization..."
python scripts/auto_initialization.py
```

**No changes needed** - script runs automatically

### docker-compose.yml
```yaml
backend:
  command: /app/entrypoint.sh
```

**No changes needed** - uses entrypoint

---

## 📝 Credentials After Initialization

### Log File Location
```
backend/logs/demo_credentials.log
```

### Updated Content (with usernames)
```
👑 Ultra-Superuser (System Administrator):
   Email: theostam1966@gmail.com
   Username: theostam
   Password: theo123!@#

👥 Demo Users:
   🔧 Admin: admin@demo.localhost / demo-admin / admin123456
   👨‍💼 Manager: manager@demo.localhost / demo-manager / manager123456
   👤 Resident 1: resident1@demo.localhost / demo-resident1 / resident123456
   👤 Resident 2: resident2@demo.localhost / demo-resident2 / resident123456
```

---

## 🎯 Benefits

### For Developers

- ✅ Automatic username population on restart
- ✅ No manual migration needed for demo users
- ✅ Consistent state after every deploy
- ✅ Easy local development setup

### For Production

- ✅ Fresh deploys have usernames
- ✅ Existing users auto-updated
- ✅ No downtime needed
- ✅ Self-healing on restart

### For Testing

- ✅ Demo users always have valid usernames
- ✅ Can test username login immediately
- ✅ Predictable demo credentials
- ✅ Easy QA testing

---

## 🔄 Workflow Integration

### Development Cycle

```bash
1. Developer: git pull
2. Developer: docker-compose restart
3. Container: Runs auto_initialization.py
4. Script: Updates users with usernames
5. Database: Ready with username field
6. Developer: Tests immediately ✅
```

### Production Deploy

```bash
1. git push origin main
2. Railway: Detects push
3. Railway: Builds & deploys
4. Container: Starts with entrypoint.sh
5. Script: Runs auto_initialization.py
6. Users: Auto-updated with usernames
7. System: Fully operational ✅
```

---

## 📊 Validation

After script runs, verify:

```bash
# Check users table
docker exec linux_version-backend-1 python manage.py shell -c "
from users.models import CustomUser

# Count users
total = CustomUser.objects.count()
with_username = CustomUser.objects.exclude(username__isnull=True).exclude(username='').count()

print(f'Total users: {total}')
print(f'With username: {with_username}')
print(f'Missing username: {total - with_username} (should be 0)')

# Show all usernames
print('\nAll usernames:')
for user in CustomUser.objects.all().order_by('email'):
    print(f'  {user.email:40} → {user.username}')
"
```

**Expected Output:**
```
Total users: 5
With username: 5
Missing username: 0 (should be 0)

All usernames:
  admin@demo.localhost                     → demo-admin
  manager@demo.localhost                   → demo-manager
  resident1@demo.localhost                 → demo-resident1
  resident2@demo.localhost                 → demo-resident2
  theostam1966@gmail.com                   → theostam
```

---

## 🎉 Summary

### Changes Made

- ✅ Added username to ultra-superuser creation
- ✅ Added username to all demo users
- ✅ Auto-update logic for existing users
- ✅ Logging shows usernames
- ✅ Backward compatible

### Files Modified

- `backend/scripts/auto_initialization.py` (+18 lines, -6 lines)

### Impact

- ✅ Clean database after every restart
- ✅ No manual username assignment needed
- ✅ Demo environment always ready
- ✅ Production deployments seamless

---

## 🔗 Related Documentation

- `USERNAME_ARCHITECTURE_SUMMARY.md` - Overall architecture
- `USERNAME_MIGRATION_GUIDE.md` - Manual migration steps
- `PRODUCTION_USERNAME_MIGRATION.md` - Railway deployment
- `DEPLOYMENT_INSTRUCTIONS.md` - Complete deployment guide

---

**Last Updated**: November 2, 2025, 21:15 EET  
**Status**: ✅ COMPLETE - Ready for Production  
**Commit**: `a6fce5e7`

