# ✅ Tenant Creation System - Complete

## 📦 Τι δημιουργήθηκε

### 1. **Pre-Deployment Check Script**
- Αρχείο: `backend/scripts/pre_tenant_creation_check.py`
- Ελέγχει 8 κρίσιμα σημεία πριν τη δημιουργία tenant
- Χρήση: `python backend/scripts/pre_tenant_creation_check.py`

### 2. **Pre-Deploy Check Management Command**
- Αρχείο: `backend/tenants/management/commands/pre_deploy_check.py`
- Railway-friendly wrapper για το check script
- Χρήση: `railway run python manage.py pre_deploy_check`

### 3. **Production Tenant Creation Command**
- Αρχείο: `backend/tenants/management/commands/create_production_tenant.py`
- Πλήρης δημιουργία tenant με ένα command
- Features:
  - ✅ Δημιουργία tenant & schema
  - ✅ Domain mapping
  - ✅ Migrations
  - ✅ Admin user creation
  - ✅ Demo data (optional)
  - ✅ Dry-run mode
  - ✅ Transaction safety

### 4. **Comprehensive Documentation**
- `TENANT_CREATION_GUIDE.md` - Πλήρης οδηγός
- `TENANT_CREATION_QUICK_START.md` - Γρήγορος οδηγός

---

## 🚀 Επόμενα Βήματα

### Βήμα 1: Έλεγχος Συστήματος

```bash
railway run python manage.py pre_deploy_check
```

**Τι ελέγχει:**
- ✅ Database connectivity (Postgres)
- ✅ Redis connectivity
- ✅ Migrations status
- ✅ Environment variables
- ✅ Public tenant
- ✅ Existing tenants
- ✅ Schema permissions
- ✅ Backend health

**Αναμενόμενο:** Όλα τα 8 checks να περάσουν ✅

---

### Βήμα 2: Δημιουργία Νέου Tenant

#### Test Run (Dry Run):
```bash
railway run python manage.py create_production_tenant \
  --schema-name=theo \
  --tenant-name="Theo Stam" \
  --domain=theo.newconcierge.app \
  --admin-email=theo@example.com \
  --admin-password="SecurePass123!" \
  --dry-run
```

#### Actual Creation:
```bash
railway run python manage.py create_production_tenant \
  --schema-name=theo \
  --tenant-name="Theo Stam" \
  --domain=theo.newconcierge.app \
  --admin-email=theo@example.com \
  --admin-password="SecurePass123!"
```

**Τι κάνει:**
1. ✅ Δημιουργεί tenant με schema `theo`
2. ✅ Δημιουργεί domain `theo.newconcierge.app`
3. ✅ Τρέχει migrations για το νέο schema
4. ✅ Δημιουργεί admin user
5. ✅ Δημιουργεί demo building (optional)

---

### Βήμα 3: Επαλήθευση

#### Frontend Test:
```
1. Πηγαίνετε: https://theo.newconcierge.app
2. Login με admin credentials
3. Ελέγξτε dashboard
```

#### Database Check:
```bash
railway connect postgres

SELECT c.schema_name, c.name, d.domain, d.is_primary
FROM tenants_client c
LEFT JOIN tenants_domain d ON d.tenant_id = c.id
WHERE c.schema_name = 'theo';
```

---

## 🔧 Εναλλακτικοί Τρόποι

### 1. Django Admin (GUI)
- URL: https://linuxversion-production.up.railway.app/admin/
- Login: `theostam1966@gmail.com` / `theo123!@#`
- Πηγαίνετε: Clients → Add Client
- Συμπληρώστε φόρμα
- Domains → Add Domain
- Συνδέστε domain με tenant

### 2. Fix Existing Tenant
Αν ο tenant υπάρχει ΑΛΛ Α λείπει το domain:

```bash
railway run python manage.py fix_tenant_domain \
  --schema-name=theo \
  --domain=theo.newconcierge.app
```

### 3. Django Shell (Manual)
```bash
railway run python manage.py shell
```

```python
from tenants.models import Client, Domain
from django.utils import timezone
from datetime import timedelta

tenant = Client.objects.create(
    schema_name='theo',
    name='Theo Stam',
    paid_until=timezone.now().date() + timedelta(days=30),
    on_trial=True,
    is_active=True
)

domain = Domain.objects.create(
    domain='theo.newconcierge.app',
    tenant=tenant,
    is_primary=True
)

from django.core.management import call_command
call_command('migrate_schemas', schema_name='theo')
```

---

## ⚠️ Common Issues & Fixes

### Issue: "Domain not found"
```bash
railway run python manage.py fix_tenant_domain --schema-name=theo
```

### Issue: "Tenant already exists"
Έλεγξε αν έχει domain:
```python
from tenants.models import Client, Domain
tenant = Client.objects.get(schema_name='theo')
domains = Domain.objects.filter(tenant=tenant)
print(f"Domains: {[d.domain for d in domains]}")
```

Αν δεν έχει:
```bash
railway run python manage.py fix_tenant_domain --schema-name=theo
```

### Issue: 404 on API endpoints
Το domain δεν είναι mapped. Τρέξε:
```bash
railway run python manage.py fix_tenant_domain --schema-name=theo
```

### Issue: "Schema does not exist"
Τρέξε migrations:
```bash
railway run python manage.py migrate_schemas --schema=theo
```

---

## 📊 Monitoring

### Check Tenant Status:
```bash
railway run python manage.py shell

from tenants.models import Client
tenant = Client.objects.get(schema_name='theo')
print(f"Name: {tenant.name}")
print(f"Active: {tenant.is_active}")
print(f"Trial: {tenant.on_trial}")
print(f"Paid until: {tenant.paid_until}")
```

### Check Logs:
```bash
railway logs --service backend
```

---

## 🎯 Συνιστώμενη Διαδικασία

### Για Production Tenant (Χωρίς Demo Data):

1. **Pre-check:**
   ```bash
   railway run python manage.py pre_deploy_check
   ```

2. **Dry run:**
   ```bash
   railway run python manage.py create_production_tenant \
     --schema-name=theo \
     --tenant-name="Theo Stam" \
     --domain=theo.newconcierge.app \
     --admin-email=theo@example.com \
     --skip-demo-data \
     --dry-run
   ```

3. **Create:**
   ```bash
   railway run python manage.py create_production_tenant \
     --schema-name=theo \
     --tenant-name="Theo Stam" \
     --domain=theo.newconcierge.app \
     --admin-email=theo@example.com \
     --skip-demo-data
   ```

4. **Verify:**
   - Frontend: https://theo.newconcierge.app
   - Database check
   - API health check

5. **Configure:**
   - Login και άλλαξε password
   - Δημιούργησε κτίρια
   - Πρόσθεσε διαμερίσματα
   - Πρόσκαλεσε χρήστες

---

## 📚 Documentation

1. **Quick Start:** [TENANT_CREATION_QUICK_START.md](./TENANT_CREATION_QUICK_START.md)
2. **Full Guide:** [TENANT_CREATION_GUIDE.md](./TENANT_CREATION_GUIDE.md)
3. **Deployment:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## ✅ Checklist

Πριν τη δημιουργία:
- [ ] Pre-deployment check πέρασε
- [ ] Database accessible
- [ ] Migrations applied
- [ ] Public tenant exists
- [ ] Domain name αποφασισμένο
- [ ] Admin credentials ετοιμασμένα

Μετά τη δημιουργία:
- [ ] Frontend login works
- [ ] API endpoints respond
- [ ] Database records verified
- [ ] Default password changed
- [ ] Buildings created
- [ ] Users invited

---

## 🆘 Support

Αν συναντήσετε πρόβλημα:

1. Τρέξτε: `railway run python manage.py pre_deploy_check`
2. Ελέγξτε logs: `railway logs`
3. Διαβάστε troubleshooting στο TENANT_CREATION_GUIDE.md

---

**Ready to create your tenant!** 🚀

Τρέξε το pre-check και πες μου τα αποτελέσματα!


