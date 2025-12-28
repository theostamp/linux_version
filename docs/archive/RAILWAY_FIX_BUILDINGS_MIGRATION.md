# 🔧 Fix: Missing buildings_buildingmembership Table

## Προβλήμα

Κατά τη διαγραφή ενός χρήστη από το Django admin, εμφανίζεται το σφάλμα:
```
psycopg2.errors.UndefinedTable: relation "buildings_buildingmembership" does not exist
```

## Αιτία

Το μοντέλο `BuildingMembership` ανήκει στην εφαρμογή `buildings`, η οποία είναι **TENANT_APP** (όχι SHARED_APP). Αυτό σημαίνει ότι τα migrations πρέπει να τρέξουν σε κάθε tenant schema, όχι μόνο στο shared schema.

Το πρόβλημα προέκυψε επειδή:
1. Το `Procfile` χρησιμοποιούσε `migrate` αντί για `migrate_schemas`
2. Τα migrations του `buildings` δεν έχουν τρέξει σε όλα τα tenant schemas

## Λύση

### Βήμα 1: Έλεγχος κατάστασης migrations

Συνδέσου στο Railway console και τρέξε:

```bash
# Έλεγχος shared schema migrations
railway run python manage.py showmigrations buildings --shared

# Έλεγχος tenant schema migrations (για ένα συγκεκριμένο tenant)
railway run python manage.py shell
```

Στο Django shell:
```python
from django_tenants.utils import schema_context
from tenants.models import Client

# Βρες ένα tenant
tenant = Client.objects.first()
print(f"Migrating tenant: {tenant.name}")

# Έλεγχος migrations σε αυτό το tenant
with schema_context(tenant.schema_name):
    from django.core.management import call_command
    call_command('showmigrations', 'buildings')
```

### Βήμα 2: Εφαρμογή migrations

#### Επιλογή Α: Χρήση του script (Συνιστάται)

```bash
# Το script είναι στο /app directory στο container
railway run python run_migrations.py
```

Αυτό το script:
- Τρέχει migrations στο shared schema
- Τρέχει migrations σε **όλα** τα tenant schemas αυτόματα

#### Επιλογή Β: Χειροκίνητη εκτέλεση

```bash
# 1. Migrate shared schema
railway run python manage.py migrate_schemas --shared

# 2. Migrate όλα τα tenant schemas
railway run python manage.py migrate_schemas
```

**Σημείωση:** Το `migrate_schemas` χωρίς `--shared` τρέχει migrations σε όλα τα tenant schemas.

### Βήμα 3: Επαλήθευση

Μετά την εκτέλεση των migrations, επαλήθευσε ότι ο πίνακας δημιουργήθηκε:

```bash
railway run python manage.py shell
```

```python
from django_tenants.utils import schema_context
from tenants.models import Client
from django.db import connection

# Επίλεξε ένα tenant
tenant = Client.objects.first()

# Έλεγχος αν υπάρχει ο πίνακας
with schema_context(tenant.schema_name):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = %s 
                AND table_name = 'buildings_buildingmembership'
            );
        """, [tenant.schema_name])
        exists = cursor.fetchone()[0]
        print(f"Table exists in {tenant.schema_name}: {exists}")
```

## Προληπτικά Μέτρα

### 1. Διόρθωση Procfile

Το `Procfile` έχει ήδη διορθωθεί να χρησιμοποιεί `migrate_schemas`:

```procfile
release: python manage.py migrate_schemas --shared && python manage.py migrate_schemas && python manage.py collectstatic --noinput
```

Αυτό εξασφαλίζει ότι σε κάθε deployment:
- Τρέχουν migrations στο shared schema
- Τρέχουν migrations σε όλα τα tenant schemas
- Συλλέγονται τα static files

### 2. Script για Manual Migration

Το script `backend/run_migrations.py` μπορεί να χρησιμοποιηθεί για manual migrations όταν χρειάζεται.

## Troubleshooting

### Αν το migration αποτύχει σε ένα tenant

```bash
# Migrate συγκεκριμένο tenant
railway run python manage.py shell
```

```python
from django_tenants.utils import schema_context
from tenants.models import Client
from django.core.management import call_command

tenant = Client.objects.get(name="TENANT_NAME")
with schema_context(tenant.schema_name):
    call_command('migrate', 'buildings', verbosity=2)
```

### Αν χρειάζεται fake migration

**Προσοχή:** Χρησιμοποίησε μόνο αν είσαι σίγουρος ότι ο πίνακας υπάρχει ήδη.

```python
with schema_context(tenant.schema_name):
    call_command('migrate', 'buildings', '--fake')
```

## Σημαντικές Σημειώσεις

1. **Backup:** Πάντα κάνε backup της βάσης πριν από migrations σε production
2. **Downtime:** Τα migrations μπορεί να χρειαστούν λίγο downtime ανάλογα με το μέγεθος της βάσης
3. **Monitoring:** Παρακολούθησε τα Railway logs κατά τη διάρκεια των migrations
4. **Testing:** Δοκίμασε πρώτα σε staging environment αν είναι δυνατό

## Σχετικά Αρχεία

- `backend/Procfile` - Release command για Railway
- `backend/run_migrations.py` - Script για manual migrations
- `backend/buildings/models.py` - BuildingMembership model definition
- `backend/buildings/migrations/` - Migration files

