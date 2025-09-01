#!/bin/bash

# Script για τη διόρθωση των εκτελέσιμων permissions των .sh αρχείων
# Χρήσιμο μετά από git clone σε νέο σύστημα

echo "🔧 Διόρθωση permissions για .sh αρχεία..."

# Βρίσκουμε όλα τα .sh αρχεία (εκτός από .venv και node_modules)
find . -name "*.sh" -type f | grep -v ".venv" | grep -v "node_modules" | while read -r file; do
    if [ -f "$file" ]; then
        chmod +x "$file"
        echo "✅ Έδωσα εκτελέσιμα permissions στο: $file"
    fi
done

echo "🎉 Ολοκληρώθηκε η διόρθωση των permissions!"
echo ""
echo "Τώρα μπορείτε να τρέξετε τα scripts, π.χ.:"
echo "  ./quick_start.sh"
echo "  ./startup.sh"
echo "  ./run_backend.sh"
echo "  ./run_frontend.sh"
