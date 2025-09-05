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

# 2. Auto-initialization (creates tenants, users, demo data)
echo ""
echo "🎯 Running auto-initialization..."
python scripts/auto_initialization.py

# 3. Additional migrations if needed
echo ""
echo "🔄 Running additional migrations..."
echo "   AUTO_MAKEMIGRATIONS=${AUTO_MAKEMIGRATIONS:-unset}"
if [ "${AUTO_MAKEMIGRATIONS:-false}" = "true" ]; then
  echo "   AUTO_MAKEMIGRATIONS is enabled. Checking for model changes..."
  python manage.py makemigrations --noinput || true
  python manage.py migrate --run-syncdb || true
fi

# 4. Collect static files
echo ""
echo "📦 Collecting static files..."
python manage.py collectstatic --no-input

# 5. Start Django server
echo ""
echo "🚀 Launching Django runserver..."
echo "   Frontend: http://demo.localhost:8080"
echo "   Backend: http://demo.localhost:8000"
echo "   Admin: http://demo.localhost:8000/admin/"
echo ""
echo "👥 Demo Login Credentials:"
echo "   Admin: admin@demo.localhost / admin123456"
echo "   Manager: manager@demo.localhost / manager123456"
echo "   Resident: resident1@demo.localhost / resident123456"
echo ""
exec python manage.py runserver 0.0.0.0:8000
