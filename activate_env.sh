#!/bin/bash
# Αυτόματη ενεργοποίηση virtual environment για το New Concierge project

echo "🚀 Ενεργοποίηση virtual environment..."
source .venv/bin/activate

echo "📊 Τρέχουσα κατάσταση:"
echo "Virtual Env: $VIRTUAL_ENV"
echo "Python Path: $(which python)"
echo "Python Version: $(python --version)"

echo "🔧 Έλεγχος Docker..."
if command -v docker &> /dev/null; then
    echo "Docker Version: $(docker --version)"
else
    echo "❌ Docker δεν είναι διαθέσιμο"
fi

echo "📁 Τρέχον Directory: $(pwd)"
echo ""
echo "✅ Έτοιμο για εργασία! Μπορείς να εκτελέσεις:"
echo "   • cd backend && python manage.py runserver"
echo "   • cd frontend && npm run dev"
echo "   • docker-compose up -d"
