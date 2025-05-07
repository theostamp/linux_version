#!/bin/bash

# Μεταβαίνουμε στον φάκελο του Django project
cd /path/to/your/django/project

# Φορτώνουμε το Python virtual environment αν υπάρχει
# source venv/bin/activate

# Υπολογίζουμε τρέχον μήνα και έτος
YEAR=$(date +"%Y")
MONTH=$(date +"%m")

# Εκτελούμε το Django command
python manage.py export_urgent_logs --year=$YEAR --month=$MONTH --format=excel
