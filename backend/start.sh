#!/bin/bash

# Περιμένουμε να ξεκινήσει η βάση δεδομένων
echo "⏳ Περιμένουμε τη βάση..."
while ! nc -z db 5432; do sleep 1; done

echo "✅ DB έτοιμη. Τρέχουν migrate + collectstatic..."

python manage.py collectstatic --noinput

# Εντοπίζουμε το Django project folder (το φάκελο με wsgi.py)
PROJECT_MODULE=$(find . -maxdepth 2 -name wsgi.py | head -n 1 | cut -d '/' -f2)

if [ -z "$PROJECT_MODULE" ]; then
  echo "❌ Δεν βρέθηκε αρχείο wsgi.py"
  exit 1
fi

echo "🚀 Εκκίνηση Gunicorn για: $PROJECT_MODULE.wsgi:application"
exec gunicorn "$PROJECT_MODULE.wsgi:application" --bind 0.0.0.0:8000 --workers 3 --timeout 120
