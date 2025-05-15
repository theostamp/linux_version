#!/bin/bash
set -e

# 1. Wait for Postgres
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" >/dev/null 2>&1; do
  echo "⏳ Waiting for Postgres ($POSTGRES_HOST:$POSTGRES_PORT)…"
  sleep 1
done
echo "✅ Postgres is up!"

# 2. Run shared migrations (για public schema)
echo "=== Running shared migrations"
python manage.py migrate_schemas --shared --noinput

# 3. Ensure public tenant exists
echo "=== Ensuring public tenant exists"
python manage.py shell -c "
from tenants.models import Client, Domain
public, _ = Client.objects.get_or_create(schema_name='public', defaults={'name': 'Public'})
Domain.objects.get_or_create(domain='localhost', tenant=public, defaults={'is_primary': True})
print('✅ localhost → public tenant ready')
"

# 4. Run tenant migrations (για όλα τα schemas, π.χ. public + tenants)
echo "=== Running tenant migrations"
python manage.py migrate_schemas --tenant --noinput

# 5. Collect static files
echo "=== Collecting static files"
python manage.py collectstatic --no-input

# 6. Launch Gunicorn
echo "🚀 Launching Gunicorn"
exec gunicorn new_concierge_backend.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 3
