#!/bin/bash
# Cron job script για αυτόματη καταχώρηση μηνιαίων διαχειριστικών εξόδων
# Προσθήκη στο crontab: 0 1 1 * * /path/to/monthly_management_fees_cron.sh

# Ορισμός μεταβλητών περιβάλλοντος
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/monthly_management_fees_$(date +%Y%m%d).log"

# Δημιουργία φακέλου logs αν δεν υπάρχει
mkdir -p "$LOG_DIR"

# Καταγραφή έναρξης
echo "========================================" >> "$LOG_FILE"
echo "Έναρξη αυτόματης καταχώρησης: $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Μετάβαση στον φάκελο του project
cd "$PROJECT_DIR"

# Εκτέλεση του Django command μέσω Docker
docker exec -it linux_version-backend-1 python manage.py create_monthly_management_fees >> "$LOG_FILE" 2>&1

# Έλεγχος επιτυχίας
if [ $? -eq 0 ]; then
    echo "✅ Επιτυχής ολοκλήρωση: $(date)" >> "$LOG_FILE"
else
    echo "❌ Σφάλμα κατά την εκτέλεση: $(date)" >> "$LOG_FILE"
    # Προαιρετικά: Αποστολή email ειδοποίησης σε περίπτωση σφάλματος
fi

echo "" >> "$LOG_FILE"
