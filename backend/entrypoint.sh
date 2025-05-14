#!/bin/bash
set -e

# 1. Wait for Postgres
 until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" >/dev/null 2>&1; do
   echo "⏳ Waiting for Postgres ($POSTGRES_HOST:$POSTGRES_PORT)…"
  sleep 1
done
echo "✅ Postgres is up!"

# 2. Run migrations & collectstatic
echo "=== Starting migration"
python manage.py migrate_schemas --shared --noinput
python manage.py migrate_schemas --tenant --noinput

echo "=== Collecting static"
python manage.py collectstatic --no-input

# 3. Launch Gunicorn
echo "🚀 Launching Gunicorn"
exec gunicorn new_concierge_backend.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 3
