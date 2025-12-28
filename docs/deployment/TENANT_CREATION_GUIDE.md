# 🏗️ Tenant Creation Guide - Production Ready

Πλήρης οδηγός για τη δημιουργία νέου tenant στο New Concierge Platform.

## 📋 Prerequisites

Πριν δημιουργήσετε νέο tenant, βεβαιωθείτε ότι:

1. ✅ Το backend είναι deployed και τρέχει
2. ✅ Η βάση PostgreSQL είναι προσβάσιμη
3. ✅ Το Redis λειτουργεί (optional αλλά recommended)
4. ✅ Όλα τα migrations έχουν εφαρμοστεί
5. ✅ Το public tenant υπάρχει και είναι ρυθμισμένο

---

## 🔍 Step 1: Pre-Deployment Check

Πρώτα τρέξτε το pre-deployment check για να βεβαιωθείτε ότι όλα είναι έτοιμα:

### Local Development:
```bash
python backend/scripts/pre_tenant_creation_check.py
```

### Railway Production:
```bash
railway run python manage.py pre_deploy_check
```

Ή μέσω Railway dashboard:
1. Πηγαίνετε στο backend service
2. Variables → Custom Script
3. Προσθέστε: `python manage.py pre_deploy_check`

### Τι ελέγχει:
- ✅ Database connectivity
- ✅ Redis connectivity
- ✅ Migrations status
- ✅ Environment variables
- ✅ Public tenant setup
- ✅ Existing tenants
- ✅ Schema creation permissions
- ✅ Backend health

---

## 🏗️ Step 2: Create Tenant

### Option 1: Using Management Command (RECOMMENDED)

#### Dry Run (Test mode):
```bash
railway run python manage.py create_production_tenant \
  --schema-name=theo \
  --tenant-name="Theo Stam" \
  --domain=theo.newconcierge.app \
  --admin-email=theo@example.com \
  --admin-password="secure_password_123" \
  --trial-days=30 \
  --dry-run
```

#### Actual Creation:
```bash
railway run python manage.py create_production_tenant \
  --schema-name=theo \
  --tenant-name="Theo Stam" \
  --domain=theo.newconcierge.app \
  --admin-email=theo@example.com \
  --admin-password="secure_password_123" \
  --trial-days=30
```

#### Skip Demo Data:
```bash
railway run python manage.py create_production_tenant \
  --schema-name=theo \
  --tenant-name="Theo Stam" \
  --domain=theo.newconcierge.app \
  --skip-demo-data
```

### Option 2: Using fix_tenant_domain Command

Για υπάρχοντα tenant που χρειάζεται domain:
```bash
railway run python manage.py fix_tenant_domain \
  --schema-name=theo \
  --domain=theo.newconcierge.app
```

### Option 3: Django Admin

1. Πηγαίνετε στο Django Admin: https://linuxversion-production.up.railway.app/admin/
2. Login με Ultra-Superuser credentials
3. Clients → Add Client
4. Συμπληρώστε:
   - Schema name: `theo`
   - Name: `Theo Stam`
   - Paid until: (30 days from now)
   - On trial: ✓
   - Is active: ✓
5. Save
6. Domains → Add Domain
7. Συμπληρώστε:
   - Domain: `theo.newconcierge.app`
   - Tenant: Theo Stam
   - Is primary: ✓
8. Save

### Option 4: Django Shell (Advanced)

```python
railway run python manage.py shell

from tenants.models import Client, Domain
from django.utils import timezone
from datetime import timedelta

# Create tenant
tenant = Client.objects.create(
    schema_name='theo',
    name='Theo Stam',
    paid_until=timezone.now().date() + timedelta(days=30),
    on_trial=True,
    is_active=True,
    trial_days=30
)

# Create domain
domain = Domain.objects.create(
    domain='theo.newconcierge.app',
    tenant=tenant,
    is_primary=True
)

# Run migrations
from django.core.management import call_command
call_command('migrate_schemas', schema_name='theo', interactive=False)

print(f"✅ Tenant created: {tenant.name}")
print(f"✅ Domain: {domain.domain}")
```

---

## ✅ Step 3: Verify Tenant Creation

### Check Database:

```sql
-- Connect to Railway Postgres
railway connect postgres

-- Check tenant
SELECT id, schema_name, name, created_on, is_active, on_trial
FROM tenants_client
WHERE schema_name = 'theo';

-- Check domain
SELECT d.id, d.domain, d.is_primary, c.schema_name
FROM tenants_domain d
JOIN tenants_client c ON d.tenant_id = c.id
WHERE c.schema_name = 'theo';

-- Check schema exists
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'theo';
```

### Check via Management Command:

```bash
railway run python manage.py shell

from tenants.models import Client, Domain

# Get tenant
tenant = Client.objects.get(schema_name='theo')
print(f"Tenant: {tenant.name}")
print(f"Active: {tenant.is_active}")
print(f"Trial: {tenant.on_trial}")

# Get domains
domains = Domain.objects.filter(tenant=tenant)
for d in domains:
    print(f"Domain: {d.domain} (primary: {d.is_primary})")
```

### Test Frontend Access:

1. Πηγαίνετε στο: https://theo.newconcierge.app
2. Δοκιμάστε login με admin credentials
3. Ελέγξτε ότι φορτώνουν τα API endpoints

---

## 🔧 Step 4: Configure Tenant (Optional)

### Add Demo Data:

```bash
railway run python manage.py shell

from django_tenants.utils import schema_context
from buildings.models import Building
from datetime import date

with schema_context('theo'):
    building = Building.objects.create(
        name='Κτίριο Demo',
        address='Διεύθυνση 123',
        city='Αθήνα',
        postal_code='10000',
        apartments_count=10,
        financial_system_start_date=date.today().replace(day=1)
    )
    print(f"✅ Building created: {building.name}")
```

### Create Additional Users:

```bash
railway run python manage.py shell

from django_tenants.utils import schema_context
from users.models import CustomUser

with schema_context('theo'):
    user = CustomUser.objects.create(
        email='manager@theo.newconcierge.app',
        first_name='Γιώργος',
        last_name='Διαχειριστής',
        is_staff=True,
        role='manager',
        is_active=True,
        email_verified=True
    )
    user.set_password('manager123')
    user.save()
    print(f"✅ User created: {user.email}")
```

---

## 🐛 Troubleshooting

### Problem: Domain not found error

**Σφάλμα:**
```
❌ [TENANT MIDDLEWARE] Domain 'theo.newconcierge.app' not found
❌ [TENANT MIDDLEWARE] Tenant with schema_name 'theo' not found
```

**Λύση:**
```bash
# Check if domain exists
railway run python manage.py fix_tenant_domain \
  --schema-name=theo \
  --domain=theo.newconcierge.app
```

### Problem: Schema doesn't exist

**Σφάλμα:**
```
django.db.utils.ProgrammingError: schema "theo" does not exist
```

**Λύση:**
```bash
# Run migrations for the schema
railway run python manage.py migrate_schemas --schema=theo
```

### Problem: 404 on all API endpoints

**Αιτία:** Tenant middleware δεν βρίσκει το domain.

**Λύση:**
1. Ελέγξτε ότι το domain υπάρχει στη βάση:
   ```sql
   SELECT * FROM tenants_domain WHERE domain = 'theo.newconcierge.app';
   ```
2. Αν δεν υπάρχει, δημιουργήστε το:
   ```bash
   railway run python manage.py fix_tenant_domain --schema-name=theo
   ```

### Problem: Migrations not applied

**Λύση:**
```bash
# Public schema
railway run python manage.py migrate_schemas --shared

# Tenant schema
railway run python manage.py migrate_schemas --schema=theo

# All schemas
railway run python manage.py migrate_schemas
```

### Problem: Cannot create schema

**Σφάλμα:**
```
permission denied to create schema
```

**Λύση:**
Railway database user χρειάζεται CREATE permission:
```sql
ALTER USER your_database_user CREATEDB;
GRANT CREATE ON DATABASE your_database TO your_database_user;
```

---

## 📊 Monitoring

### Check Tenant Status:

```bash
railway run python manage.py shell

from tenants.models import Client
from django.utils import timezone

tenant = Client.objects.get(schema_name='theo')

print(f"Name: {tenant.name}")
print(f"Created: {tenant.created_on}")
print(f"Active: {tenant.is_active}")
print(f"Trial: {tenant.on_trial}")
print(f"Paid until: {tenant.paid_until}")
print(f"Days remaining: {(tenant.paid_until - timezone.now().date()).days}")
```

### Check Tenant Data:

```bash
railway run python manage.py shell

from django_tenants.utils import schema_context
from buildings.models import Building
from users.models import CustomUser

with schema_context('theo'):
    buildings = Building.objects.count()
    users = CustomUser.objects.count()
    
    print(f"Buildings: {buildings}")
    print(f"Users: {users}")
```

---

## 🔒 Security Checklist

Μετά τη δημιουργία tenant:

- [ ] Αλλάξτε το default admin password
- [ ] Ενεργοποιήστε email verification
- [ ] Ρυθμίστε 2FA για admin users
- [ ] Ελέγξτε permissions
- [ ] Ρυθμίστε rate limiting
- [ ] Ενεργοποιήστε audit logging
- [ ] Backup του schema

---

## 📚 Related Documentation

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Full deployment guide
- [TENANT_DOMAIN_SETUP.md](./TENANT_DOMAIN_SETUP.md) - Domain configuration
- [DJANGO_ADMIN_ACCESS.md](./DJANGO_ADMIN_ACCESS.md) - Admin panel access

---

## 🆘 Support

Αν αντιμετωπίζετε προβλήματα:

1. Τρέξτε pre-deployment check: `railway run python manage.py pre_deploy_check`
2. Ελέγξτε logs: `railway logs`
3. Επικοινωνήστε με support

---

**Last Updated:** 2025-11-23
**Version:** 1.0.0

