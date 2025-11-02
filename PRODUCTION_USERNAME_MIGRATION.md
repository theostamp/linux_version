# 🚀 Production Username Migration - Railway Backend

**Target**: Railway Backend (`linuxversion-production.up.railway.app`)  
**Date**: November 2, 2025  
**Complexity**: Medium  
**Estimated Time**: 10-15 minutes

---

## ⚠️ PRE-MIGRATION CHECKLIST

Before starting, ensure:

- [ ] All code changes are committed and pushed to GitHub
- [ ] Railway backend is deployed with latest code
- [ ] You have access to Railway dashboard
- [ ] You have backed up the database (optional but recommended)
- [ ] No active user registrations in progress

---

## 🎯 Migration Overview

We need to:
1. Deploy model changes to Railway
2. Run Django migration on production database
3. Migrate existing users to have usernames
4. Verify migration success

---

## 📦 Step 1: Deploy Code Changes to Railway

### 1.1 Commit & Push All Changes

```bash
cd /home/theo/project/linux_version

# Backend changes
git add backend/users/models.py
git add backend/users/views.py
git add backend/users/urls.py
git add backend/users/serializers.py
git add backend/users/migrations/0013_add_username_field.py
git add backend/billing/views.py
git add backend/billing/webhooks.py

# Frontend changes
git add frontend/components/RegisterForm.tsx
git add frontend/middleware.ts
git add frontend/app/api/proxy/[...path]/route.ts
git add frontend/lib/apiPublic.ts

# Helper scripts
git add backend/create_username_migration.py
git add backend/migrate_existing_users.py

# Documentation
git add USERNAME_BASED_ARCHITECTURE_IMPLEMENTATION.md
git add FRONTEND_USERNAME_IMPLEMENTATION.md
git add USERNAME_MIGRATION_GUIDE.md
git add PRODUCTION_USERNAME_MIGRATION.md

# Commit
git commit -m "feat: Implement username-based architecture

- Add username field to CustomUser model with validators
- Create username availability check endpoint
- Update registration to use username as tenant subdomain
- Update tenant creation to use username
- Add real-time username validation in RegisterForm
- Add migration for existing users
- Update documentation

BREAKING CHANGE: Registration now requires username field"

# Push
git push origin main
```

### 1.2 Wait for Railway Deployment

1. Go to: https://railway.app/
2. Navigate to your project: `linuxversion-production`
3. Check deployment status
4. Wait for deployment to complete (usually 2-3 minutes)

---

## 🗄️ Step 2: Run Database Migration

### Option A: Via Railway Dashboard (GUI)

1. **Open Railway Project**
   - Go to: https://railway.app/project/[your-project-id]
   - Click on the **backend service**

2. **Open Terminal**
   - Click "⚙️ Settings" → "Terminal" OR
   - Click "💻 Open Terminal" button

3. **Run Migration Commands**
   ```bash
   python manage.py showmigrations users
   # This shows all migrations and their status
   
   python manage.py migrate users
   # This applies the username migration
   ```

4. **Expected Output:**
   ```
   Running migrations:
     Applying users.0013_add_username_field... OK
   
   Migrating X users to have usernames...
     ✓ user1@example.com → user1
     ✓ user2@example.com → user2
   ✅ Migrated X/X users successfully
   ```

### Option B: Via Railway CLI

```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migration
railway run python manage.py migrate users

# Verify
railway run python manage.py shell -c "
from users.models import CustomUser
print(f'Total users: {CustomUser.objects.count()}')
print(f'Users with username: {CustomUser.objects.exclude(username__isnull=True).count()}')
"
```

---

## ✅ Step 3: Verify Migration

### 3.1 Check Database

```bash
# In Railway terminal
python manage.py shell
```

```python
from users.models import CustomUser

# Check field exists
print(f"Username field exists: {hasattr(CustomUser, 'username')}")

# Count users
total = CustomUser.objects.count()
with_username = CustomUser.objects.exclude(username__isnull=True).exclude(username='').count()

print(f"Total users: {total}")
print(f"Users with username: {with_username}")
print(f"Missing usernames: {total - with_username}")

# Show samples
print("\nSample usernames:")
for user in CustomUser.objects.all()[:10]:
    print(f"  {user.email:40} → {user.username}")

# Check for duplicates (should be 0)
from django.db.models import Count
duplicates = CustomUser.objects.values('username').annotate(
    count=Count('username')
).filter(count__gt=1)
print(f"\nDuplicate usernames: {duplicates.count()} (should be 0)")
```

### 3.2 Test Username Availability Endpoint

```bash
# From your local machine
curl -X POST https://linuxversion-production.up.railway.app/api/users/check-username/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser123"}'
```

**Expected Response:**
```json
{
  "username": "testuser123",
  "available": true,
  "message": "Το username είναι διαθέσιμο! ✨",
  "subdomain_preview": "testuser123.newconcierge.app"
}
```

### 3.3 Test Registration with Username

```bash
curl -X POST https://linuxversion-production.up.railway.app/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "migration-test@example.com",
    "username": "migration-test",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "...",
    "email": "migration-test@example.com",
    "username": "migration-test",
    ...
  },
  "message": "Registration successful"
}
```

---

## 🚨 Troubleshooting

### Issue 1: "Column username already exists"

**Cause:** Migration already ran  
**Solution:**
```bash
python manage.py migrate users --fake 0013
```

### Issue 2: "Duplicate key violation"

**Cause:** Some users have duplicate usernames  
**Solution:**
```bash
# Find duplicates
python manage.py shell -c "
from users.models import CustomUser
from django.db.models import Count
dups = CustomUser.objects.values('username').annotate(count=Count('username')).filter(count__gt=1)
for d in dups:
    users = CustomUser.objects.filter(username=d['username'])
    for i, user in enumerate(users):
        if i > 0:
            user.username = f\"{user.username}-{i}\"
            user.save()
            print(f'Fixed: {user.email} → {user.username}')
"
```

### Issue 3: "Null value in column username violates not-null constraint"

**Cause:** Some users still don't have usernames  
**Solution:** Run Step 2 of migration again

---

## 📊 Post-Migration Monitoring

### Check Railway Logs

```bash
# In Railway Dashboard
Project → Backend Service → Logs

# Look for:
[WEBHOOK] Tenant creation with username: theo-eth
[REGISTER] User created with username: theo-eth
```

### Database Queries

```sql
-- Count users by username pattern
SELECT 
  CASE 
    WHEN username ~ '^[a-z]+-[0-9]+$' THEN 'auto-generated'
    ELSE 'user-chosen'
  END as type,
  COUNT(*)
FROM users_customuser
GROUP BY type;

-- Find longest usernames
SELECT username, LENGTH(username) as len
FROM users_customuser
ORDER BY len DESC
LIMIT 10;

-- Check unique constraint
SELECT COUNT(*), COUNT(DISTINCT username)
FROM users_customuser;
-- Both should be equal
```

---

## 🎉 Success Criteria

After migration, verify:

- ✅ All users have unique usernames
- ✅ No null usernames in database
- ✅ Username availability check works
- ✅ New user registration works with username
- ✅ Tenant creation uses username as schema_name
- ✅ No duplicate usernames
- ✅ Frontend shows username input field
- ✅ Subdomain preview displays correctly

---

## 🔄 Rollback Plan

If anything goes wrong:

### Rollback Migration

```bash
# In Railway terminal
python manage.py migrate users 0012_add_stripe_and_tenant_fields
```

This will:
- Remove username field from database
- Revert to previous state
- Preserve all other data

### Rollback Code

```bash
# On your machine
git revert HEAD
git push origin main
```

---

## 📞 Next Steps After Migration

1. **Test Registration Flow**
   - Go to: https://newconcierge.app/register
   - Try registering with username `test-user-123`
   - Verify subdomain preview shows
   - Complete registration and payment
   - Verify tenant created at `test-user-123.newconcierge.app`

2. **Update Frontend Deployment**
   - Vercel should auto-deploy from GitHub push
   - Wait 2-3 minutes
   - Test on production

3. **Monitor for Issues**
   - Watch Railway logs
   - Check Sentry (if configured)
   - Monitor user reports

---

## 📋 Migration Execution Checklist

```
BEFORE:
[ ] Code committed and pushed
[ ] Railway deployment complete
[ ] Database backup created (optional)
[ ] Maintenance window scheduled (optional)

DURING:
[ ] Run: python manage.py migrate users
[ ] Monitor output for errors
[ ] Check users migrated successfully
[ ] Verify no duplicate usernames

AFTER:
[ ] Test username availability endpoint
[ ] Test user registration
[ ] Test tenant creation
[ ] Test login (both username and email)
[ ] Monitor logs for 24 hours

ROLLBACK (if needed):
[ ] python manage.py migrate users 0012
[ ] git revert HEAD && git push
[ ] Notify users of temporary issues
```

---

## 🔗 Related Commands

### Useful Railway Commands

```bash
# View logs
railway logs

# Open shell
railway run bash

# Run specific command
railway run python manage.py <command>

# Check environment variables
railway vars

# Redeploy
railway up
```

---

**Last Updated**: November 2, 2025  
**Status**: Ready for Production Execution  
**Risk Level**: Low (reversible migration)

