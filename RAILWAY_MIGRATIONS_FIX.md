# 🔧 Railway Migrations - Σωστές Εντολές

## Προβλήμα
Το Railway CLI δεν βρίσκει το `manage.py` με την εντολή `railway run python manage.py migrate_schemas`

## Λύσεις

### Επιλογή 1: Με bash shell (Συνιστάται)

```bash
# Άνοιξε bash shell στο container
railway run bash

# Μέσα στο shell:
cd /app
python manage.py migrate_schemas --shared
python manage.py migrate_schemas
exit
```

### Επιλογή 2: Με working directory

```bash
# Ορίζουμε το working directory
railway run --workdir /app python manage.py migrate_schemas --shared
railway run --workdir /app python manage.py migrate_schemas
```

### Επιλογή 3: Με sh -c (Single command)

```bash
railway run sh -c "cd /app && python manage.py migrate_schemas --shared"
railway run sh -c "cd /app && python manage.py migrate_schemas"
```

### Επιλογή 4: Με full path

```bash
railway run python /app/manage.py migrate_schemas --shared
railway run python /app/manage.py migrate_schemas
```

## Προτείνεται Λύση

Χρησιμοποίησε την **Επιλογή 1** (bash shell) για καλύτερο control:

```bash
railway run bash
```

Μέσα στο shell:
```bash
cd /app
python manage.py migrate_schemas --shared
python manage.py migrate_schemas
exit
```

## Επαλήθευση

Μετά τις migrations, επαλήθευσε:

```bash
railway run bash
```

```bash
cd /app
python manage.py showmigrations buildings
python manage.py shell
```

Στο Django shell:
```python
from django_tenants.utils import schema_context
from tenants.models import Client
from django.db import connection

tenant = Client.objects.first()
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
        print(f"✅ Table exists: {exists}")
```



