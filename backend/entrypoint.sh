#!/bin/bash
set -e

# 1. Wait for Postgres
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" >/dev/null 2>&1; do
  echo "⏳ Waiting for Postgres ($POSTGRES_HOST:$POSTGRES_PORT)…"
  sleep 1
done
echo "✅ Postgres is up!"

echo "⚠️  SKIPPING migrations temporarily to allow manual fix"
python manage.py migrate_schemas --shared

# echo "=== Ensuring public tenant exists"
# python manage.py shell -c "
# from tenants.models import Client, Domain
# public, _ = Client.objects.get_or_create(schema_name='public', defaults={'name': 'Public'})
# Domain.objects.get_or_create(domain='localhost', tenant=public, defaults={'is_primary': True})
# print('✅ localhost → public tenant ready')
# "

# echo "=== Running tenant migrations"
# python manage.py migrate_schemas --tenant --noinput

# echo "=== Collecting static files"
# python manage.py collectstatic --no-input

echo "🚀 Launching Django runserver (DEBUG)"
exec python manage.py runserver 0.0.0.0:8000
