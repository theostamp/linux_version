#!/bin/bash
set -e

echo "🚀 DIGITAL CONCIERGE - CONTAINER STARTUP"
echo "========================================"

# 1. Wait for Postgres
echo "⏳ Waiting for Postgres ($POSTGRES_HOST:$POSTGRES_PORT)..."
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" >/dev/null 2>&1; do
  echo "   Still waiting..."
  sleep 1
done
echo "✅ Postgres is up!"

# 2. Run migrations directly (skip auto_initialization for now)
echo ""
echo "🔄 Running migrations..."
echo "   AUTO_MAKEMIGRATIONS=${AUTO_MAKEMIGRATIONS:-unset}"
if [ "${AUTO_MAKEMIGRATIONS:-false}" = "true" ]; then
  echo "   AUTO_MAKEMIGRATIONS is enabled. Checking for model changes..."
  python manage.py makemigrations --noinput || true
fi
python manage.py migrate --run-syncdb

# 3. Collect static files
echo ""
echo "📦 Collecting static files..."
python manage.py collectstatic --no-input

# 4. Start Django server
echo ""
echo "🚀 Launching Django runserver..."
echo "   Frontend: http://demo.localhost:8080"
echo "   Backend: http://demo.localhost:8000"
echo "   Admin: http://demo.localhost:8000/admin/"
echo ""
exec python manage.py runserver 0.0.0.0:8000
