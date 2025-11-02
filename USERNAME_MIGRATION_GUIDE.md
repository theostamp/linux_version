# 🗄️ Username Field Database Migration Guide

**Date**: November 2, 2025  
**Migration**: Add `username` field to `CustomUser` model  
**Status**: Ready to Execute

---

## 📋 Overview

This migration adds a `username` field to the `CustomUser` model and migrates existing users.

### What Changes

**Database Schema:**
```sql
ALTER TABLE users_customuser 
ADD COLUMN username VARCHAR(30) UNIQUE NOT NULL;

-- Add validators via Django
-- Add index on username for faster lookups
```

**Model Changes:**
```python
class CustomUser(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(
        max_length=30,
        unique=True,
        validators=[
            RegexValidator(r'^[a-z0-9-]+$'),
            MinLengthValidator(3)
        ]
    )
```

---

## 🚀 Quick Start

### Automated Migration (Recommended)

```bash
cd /home/theo/project/linux_version
./run_username_migration.sh
```

This script will:
1. ✅ Copy migration scripts to Docker container
2. ✅ Create Django migration file
3. ✅ Show migration for review
4. ⏸️  Ask for confirmation
5. ✅ Apply migration to database
6. ✅ Migrate existing users
7. ✅ Verify migration success

---

## 📝 Manual Migration Steps

If you prefer manual control:

### Step 1: Create Migration File

```bash
# Copy script to container
docker cp backend/create_username_migration.py linux_version-backend-1:/app/

# Create migration
docker exec -it linux_version-backend-1 python /app/create_username_migration.py
```

**Expected Output:**
```
Creating migration for users app...
Migrations for 'users':
  users/migrations/0XXX_add_username_field.py
    - Add field username to customuser
✅ Migration created successfully!
```

### Step 2: Review Migration File

```bash
# View the migration file
docker exec linux_version-backend-1 cat /app/users/migrations/0XXX_add_username_field.py
```

**Check for:**
- ✅ `username` field with correct validators
- ✅ `unique=True` constraint
- ✅ `max_length=30`
- ✅ Proper default or null handling

### Step 3: Apply Migration

```bash
docker exec -it linux_version-backend-1 python manage.py migrate users
```

**Expected Output:**
```
Running migrations:
  Applying users.0XXX_add_username_field... OK
```

### Step 4: Migrate Existing Users

```bash
# Copy migration script
docker cp backend/migrate_existing_users.py linux_version-backend-1:/app/

# Run migration
docker exec -it linux_version-backend-1 python /app/migrate_existing_users.py
```

**Expected Output:**
```
👥 Migrating Existing Users to Username-Based System
📊 Found X users without usernames

Generating usernames...
✓ user1@example.com → user1
✓ user2@example.com → user2
✓ user3@example.com → user3-1  (if user3 exists)

✅ All users migrated successfully!
```

### Step 5: Verify Migration

```bash
docker exec linux_version-backend-1 python manage.py shell -c "
from users.models import CustomUser
print(f'Total users: {CustomUser.objects.count()}')
print(f'Users with username: {CustomUser.objects.exclude(username__isnull=True).count()}')
print()
print('Sample usernames:')
for user in CustomUser.objects.all()[:5]:
    print(f'  {user.email} → {user.username}')
"
```

---

## 🔄 Username Generation Logic

For existing users without username:

```python
def generate_username_from_email(email):
    # Extract part before @
    username = email.split('@')[0].lower()
    
    # Remove invalid characters (keep a-z, 0-9, -)
    username = re.sub(r'[^a-z0-9-]', '', username)
    
    # Ensure minimum 3 characters
    if len(username) < 3:
        username = f"user-{username}"
    
    # Truncate to 30 characters max
    username = username[:30]
    
    # Make unique (add -1, -2, etc. if taken)
    return make_unique(username)
```

**Examples:**
```
john.doe@example.com    → johndoe
jane_smith@test.com     → janesmith
a@short.com             → user-a
theo.stamatiou@mail.gr  → theostamatiou
admin@company.com       → admin-1 (if 'admin' reserved)
```

---

## ⚠️ Important Considerations

### Existing Users

**Before Migration:**
```sql
SELECT email, first_name, last_name FROM users_customuser;
```

**After Migration:**
```sql
SELECT email, username, first_name, last_name FROM users_customuser;
```

### Reserved Usernames

These usernames are blocked and will get `-1`, `-2` suffix:
```python
reserved = [
    'admin', 'api', 'www', 'root', 'support',
    'help', 'billing', 'sales', 'info', 'contact'
]
```

### Username Conflicts

If `johndoe` is taken:
- First duplicate: `johndoe-1`
- Second duplicate: `johndoe-2`
- And so on...

---

## 🧪 Testing After Migration

### 1. Check Database

```bash
docker exec linux_version-backend-1 python manage.py dbshell
```

```sql
-- Check username column
\d users_customuser;

-- Count users with usernames
SELECT COUNT(*) FROM users_customuser WHERE username IS NOT NULL;

-- Show sample usernames
SELECT email, username FROM users_customuser LIMIT 10;

-- Check for duplicates (should be 0)
SELECT username, COUNT(*) 
FROM users_customuser 
GROUP BY username 
HAVING COUNT(*) > 1;
```

### 2. Test New Registration

```bash
curl -X POST http://localhost:18000/api/users/check-username/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser"}'

# Expected: {"available": true, "message": "..."}
```

```bash
curl -X POST http://localhost:18000/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!"
  }'

# Expected: 200 OK with user data
```

### 3. Verify Unique Constraint

```bash
# Try to create duplicate username (should fail)
docker exec linux_version-backend-1 python manage.py shell -c "
from users.models import CustomUser
try:
    CustomUser.objects.create(
        email='another@test.com',
        username='testuser',  # Duplicate!
        password='test'
    )
    print('ERROR: Duplicate username allowed!')
except Exception as e:
    print(f'✓ Unique constraint working: {e}')
"
```

---

## 🔙 Rollback Plan

If migration fails or causes issues:

### Option 1: Django Rollback

```bash
# Find the migration before username
docker exec linux_version-backend-1 python manage.py showmigrations users

# Rollback to previous migration
docker exec linux_version-backend-1 python manage.py migrate users 0XXX_previous_migration
```

### Option 2: Manual SQL Rollback

```sql
-- Remove username column
ALTER TABLE users_customuser DROP COLUMN username;

-- Remove unique constraint
DROP INDEX IF EXISTS users_customuser_username_unique;
```

### Option 3: Database Backup Restore

```bash
# Restore from backup (if you created one)
docker exec -i linux_version-db-1 psql -U postgres dbname < backup.sql
```

---

## 📊 Expected Results

### Before Migration
```
CustomUser Model:
- email (unique)
- first_name
- last_name
- password
- ... other fields

Total Users: X
```

### After Migration
```
CustomUser Model:
- email (unique)
- username (unique, required)  ← NEW!
- first_name
- last_name
- password
- ... other fields

Total Users: X (same)
Users with username: X (all)
```

---

## 🚨 Troubleshooting

### Error: "Column already exists"

```bash
# Check if username already exists
docker exec linux_version-backend-1 python manage.py shell -c "
from users.models import CustomUser
print(hasattr(CustomUser, 'username'))
"

# If true, migration already ran
```

**Solution:** Skip migration, proceed to user migration

### Error: "Duplicate username"

```bash
# Find duplicates
docker exec linux_version-backend-1 python manage.py shell -c "
from users.models import CustomUser
from django.db.models import Count
duplicates = CustomUser.objects.values('username').annotate(count=Count('username')).filter(count__gt=1)
print(list(duplicates))
"
```

**Solution:** Run `migrate_existing_users.py` again (it handles duplicates)

### Error: "Null constraint violation"

The migration should allow null temporarily during migration.

**Solution:** Check migration file has:
```python
migrations.AddField(
    model_name='customuser',
    name='username',
    field=models.CharField(max_length=30, null=True),  # Temporarily allow null
)
```

Then run user migration, then add unique constraint.

---

## ✅ Success Checklist

- [ ] Migration file created successfully
- [ ] Migration applied to database (no errors)
- [ ] All existing users have usernames
- [ ] No duplicate usernames exist
- [ ] New user registration works with username
- [ ] Username availability check works
- [ ] Unique constraint enforced
- [ ] No null usernames in database

---

## 📈 Monitoring After Deployment

### Metrics to Watch

1. **Registration Success Rate**
   - Monitor for username validation errors
   - Check for unique constraint violations

2. **Username Distribution**
   - Track most common patterns
   - Identify potential conflicts

3. **Performance**
   - Query time with username index
   - Login speed (username vs email)

### Database Queries

```sql
-- Most common username patterns
SELECT SUBSTRING(username, 1, 5) as prefix, COUNT(*) 
FROM users_customuser 
GROUP BY prefix 
ORDER BY COUNT(*) DESC 
LIMIT 10;

-- Users needing username update
SELECT COUNT(*) FROM users_customuser 
WHERE username LIKE '%-[0-9]%';

-- Average username length
SELECT AVG(LENGTH(username)) FROM users_customuser;
```

---

## 🔗 Related Files

### Migration Scripts
- `backend/create_username_migration.py` - Creates Django migration
- `backend/migrate_existing_users.py` - Migrates existing users
- `run_username_migration.sh` - Automated full migration

### Modified Models
- `backend/users/models.py` - Added username field

### Frontend
- `frontend/components/RegisterForm.tsx` - Uses username

### Documentation
- `USERNAME_BASED_ARCHITECTURE_IMPLEMENTATION.md` - Full architecture
- `FRONTEND_USERNAME_IMPLEMENTATION.md` - Frontend details

---

## 📞 Support

If you encounter issues:

1. **Check Logs:**
   ```bash
   docker logs linux_version-backend-1 --tail 100
   ```

2. **Database Status:**
   ```bash
   docker exec linux_version-backend-1 python manage.py showmigrations
   ```

3. **Rollback if Needed:**
   See "Rollback Plan" section above

---

**Last Updated**: November 2, 2025  
**Status**: Ready to Execute  
**Estimated Time**: 5-10 minutes

