#!/bin/bash
set -e

echo "🚀 DIGITAL CONCIERGE - CONTAINER STARTUP"
echo "========================================"

# 0. Create logs directory if it doesn't exist
mkdir -p /app/logs
echo "📁 Logs directory ready"

# 1. Wait for Postgres
# Parse DATABASE_URL to get host and port
if [ -n "$DATABASE_URL" ]; then
  # Extract host and port from DATABASE_URL
  # Format: postgresql://user:pass@host:port/db
  DB_HOST=$(echo $DATABASE_URL | sed -E 's|.*@([^:]+):.*|\1|')
  DB_PORT=$(echo $DATABASE_URL | sed -E 's|.*:([0-9]+)/.*|\1|')
else
  # Fallback to environment variables
  DB_HOST=${POSTGRES_HOST:-localhost}
  DB_PORT=${POSTGRES_PORT:-5432}
fi

echo "⏳ Waiting for Postgres ($DB_HOST:$DB_PORT)..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; do
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

# 5. Start frontend warm-up in background
echo ""
echo "🔥 Initiating frontend warm-up process..."
if [ -f "/app/entrypoint_warm_up.sh" ]; then
  /app/entrypoint_warm_up.sh &
  echo "   Warm-up running in background..."
else
  echo "   Warm-up script not found, skipping..."
fi

# 6. Start Django server
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
