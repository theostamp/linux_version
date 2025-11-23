# 🚀 Quick Start: Δημιουργία Νέου Tenant

Γρήγορος οδηγός για δημιουργία νέου tenant στο production.

---

## ⚡ Γρήγορη Διαδικασία (3 Βήματα)

### 1️⃣ Έλεγχος Προαπαιτούμενων

```bash
railway run python manage.py pre_deploy_check
```

**Αναμενόμενο:** Όλα τα checks να είναι ✅ PASSED

---

### 2️⃣ Δημιουργία Tenant

**Με Demo Data:**
```bash
railway run python manage.py create_production_tenant \
  --schema-name=theo \
  --tenant-name="Theo Stam" \
  --domain=theo.newconcierge.app \
  --admin-email=theo@example.com \
  --admin-password="YourSecurePassword123!"
```

**Χωρίς Demo Data:**
```bash
railway run python manage.py create_production_tenant \
  --schema-name=theo \
  --tenant-name="Theo Stam" \
  --domain=theo.newconcierge.app \
  --admin-email=theo@example.com \
  --admin-password="YourSecurePassword123!" \
  --skip-demo-data
```

**Αναμενόμενο Output:**
```
🏗️  PRODUCTION TENANT CREATION
======================================================================

📋 Configuration:
   Schema Name: theo
   Tenant Name: Theo Stam
   Domain: theo.newconcierge.app
   Admin Email: theo@example.com
   ...

✅ TENANT CREATION COMPLETED!
======================================================================

📊 Tenant Details:
   Schema Name: theo
   Tenant ID: 2
   Domain: theo.newconcierge.app
   Status: Trial
   Trial Until: 2025-12-23

🔐 Admin Credentials:
   Email: theo@example.com
   Password: YourSecurePassword123!

🌐 Access URLs:
   Frontend: https://theo.newconcierge.app
   Backend API: https://linuxversion-production.up.railway.app/api/
   Admin Panel: https://linuxversion-production.up.railway.app/admin/
```

---

### 3️⃣ Επαλήθευση

#### Option A: Frontend Test
1. Πηγαίνετε στο: https://theo.newconcierge.app
2. Login με τα admin credentials
3. Ελέγξτε ότι φορτώνει το dashboard

#### Option B: Database Check
```bash
railway connect postgres
```

```sql
SELECT c.schema_name, c.name, d.domain, d.is_primary
FROM tenants_client c
LEFT JOIN tenants_domain d ON d.tenant_id = c.id
WHERE c.schema_name = 'theo';
```

**Αναμενόμενο:**
```
 schema_name |    name    |         domain          | is_primary
-------------+------------+-------------------------+------------
 theo        | Theo Stam  | theo.newconcierge.app  | t
```

---

## 🔧 Εναλλακτικοί Τρόποι

### Μέσω Django Admin (GUI)

1. Πηγαίνετε στο: https://linuxversion-production.up.railway.app/admin/
2. Login: `theostam1966@gmail.com` / `theo123!@#`
3. **Clients** → **Add Client**
   - Schema name: `theo`
   - Name: `Theo Stam`
   - Paid until: `2025-12-23` (30 days)
   - On trial: ✓
   - Is active: ✓
   - Save
4. **Domains** → **Add Domain**
   - Domain: `theo.newconcierge.app`
   - Tenant: `Theo Stam`
   - Is primary: ✓
   - Save

### Μέσω fix_tenant_domain (Αν ο tenant υπάρχει ήδη)

```bash
railway run python manage.py fix_tenant_domain \
  --schema-name=theo \
  --domain=theo.newconcierge.app
```

---

## ❌ Troubleshooting

### Πρόβλημα: "Domain not found"

**Λύση:**
```bash
railway run python manage.py fix_tenant_domain --schema-name=theo
```

### Πρόβλημα: "Tenant already exists"

**Έλεγχος:**
```bash
railway run python manage.py shell
```

```python
from tenants.models import Client, Domain

tenant = Client.objects.get(schema_name='theo')
print(f"Tenant: {tenant.name}")
print(f"Active: {tenant.is_active}")

domains = Domain.objects.filter(tenant=tenant)
for d in domains:
    print(f"Domain: {d.domain}")
```

**Αν δεν έχει domain:**
```bash
railway run python manage.py fix_tenant_domain --schema-name=theo
```

### Πρόβλημα: 404 σε όλα τα endpoints

**Αιτία:** Domain δεν είναι συνδεδεμένο με tenant.

**Λύση:**
1. Ελέγξτε στη βάση:
   ```sql
   SELECT * FROM tenants_domain WHERE domain = 'theo.newconcierge.app';
   ```
2. Αν δεν υπάρχει:
   ```bash
   railway run python manage.py fix_tenant_domain --schema-name=theo
   ```

---

## 🎯 Next Steps

Μετά τη δημιουργία του tenant:

1. **Login** στο frontend: https://theo.newconcierge.app
2. **Δημιουργία κτιρίων** στο Buildings section
3. **Προσθήκη διαμερισμάτων** για κάθε κτίριο
4. **Πρόσκληση χρηστών** μέσω του User Management

---

## 📚 Περισσότερες Πληροφορίες

- **Πλήρης Οδηγός:** [TENANT_CREATION_GUIDE.md](./TENANT_CREATION_GUIDE.md)
- **Deployment:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Domain Setup:** [TENANT_DOMAIN_SETUP.md](./TENANT_DOMAIN_SETUP.md)

---

**Σημείωση:** Αλλάξτε πάντα το default password μετά την πρώτη σύνδεση!


