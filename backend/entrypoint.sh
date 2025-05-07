#!/bin/bash

# Περιμένει τη βάση να είναι έτοιμη
echo "Waiting for DB..."
while ! nc -z db 5432; do sleep 1; done

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting Gunicorn..."
exec gunicorn new_digital_concierge.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 3 \
  --timeout 120 \
  --log-level info
