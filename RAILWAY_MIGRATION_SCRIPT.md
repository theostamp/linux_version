# Railway Database Migration Script

## Migration Commands

### 1. Apply Migration to Shared Schema
```bash
# Connect to Railway console
railway run python manage.py migrate_schemas --shared
```

### 2. Verify Migration Applied
```bash
# Check if the new field exists
railway run python manage.py shell
```

```python
# In Django shell
from billing.models import UserSubscription
print(UserSubscription._meta.get_field('stripe_checkout_session_id'))
```

### 3. Check Migration Status
```bash
# List all migrations
railway run python manage.py showmigrations billing
```

## Migration Content

The migration adds the `stripe_checkout_session_id` field:

```python
# billing/migrations/0007_add_stripe_checkout_session_id.py
operations = [
    migrations.AddField(
        model_name='usersubscription',
        name='stripe_checkout_session_id',
        field=models.CharField(
            max_length=255,
            blank=True,
            unique=True,
            help_text='Stripe checkout session ID for idempotency'
        ),
    ),
]
```

## Verification Steps

### 1. Check Database Schema
```sql
-- Connect to Railway database and run:
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'billing_usersubscription'
AND column_name = 'stripe_checkout_session_id';
```

### 2. Test Model Creation
```python
# In Django shell
from billing.models import UserSubscription
from users.models import CustomUser

# Test creating a subscription with the new field
user = CustomUser.objects.first()
subscription = UserSubscription.objects.create(
    user=user,
    plan_id=1,
    stripe_checkout_session_id='cs_test_123',
    status='trial'
)
print("Migration successful:", subscription.stripe_checkout_session_id)
```

## Rollback Plan

If migration fails:

### 1. Rollback Migration
```bash
# Rollback to previous migration
railway run python manage.py migrate_schemas --shared billing 0006
```

### 2. Fix Issues
- Check for data conflicts
- Resolve any constraint violations
- Re-run migration

### 3. Re-apply Migration
```bash
railway run python manage.py migrate_schemas --shared
```

## Production Considerations

1. **Backup database before migration**
2. **Test migration on staging first**
3. **Monitor Railway logs during migration**
4. **Have rollback plan ready**

## Troubleshooting

### Migration Fails
1. Check Railway logs for specific error
2. Verify database connection
3. Check for existing data conflicts
4. Consider manual migration if needed

### Field Already Exists
```bash
# If field already exists, skip migration
railway run python manage.py migrate_schemas --shared --fake
```

### Database Locked
```bash
# Wait for other operations to complete
# Check Railway logs for active connections
```
