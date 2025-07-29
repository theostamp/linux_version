#!/bin/bash

echo "🧹 DIGITAL CONCIERGE - CLEAN & RESTART"
echo "======================================"

# Επιλογές καθαρισμού
echo ""
echo "Επιλέξτε τύπο καθαρισμού:"
echo "1) Πλήρες reset (άδειασμα όλων)"
echo "2) Γρήγορο reset (διατήρηση images)"
echo "3) Reset μόνο database"
echo "4) Έξοδος"
echo ""

read -p "Επιλογή (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🧹 ΠΛΗΡΕΣ RESET..."
        echo "=================="
        
        # 1. Διακοπή και διαγραφή όλων των containers
        echo "🛑 Διακοπή containers..."
        docker compose down --volumes --remove-orphans
        
        # 2. Διαγραφή όλων των images
        echo "🗑️ Διαγραφή images..."
        docker rmi $(docker images -q) 2>/dev/null || true
        
        # 3. Καθαρισμός volumes
        echo "🧹 Καθαρισμός volumes..."
        docker volume prune -f
        
        # 4. Καθαρισμός networks
        echo "🌐 Καθαρισμός networks..."
        docker network prune -f
        
        # 5. Πλήρες καθαρισμός συστήματος
        echo "🔧 Πλήρες καθαρισμός συστήματος..."
        docker system prune -a --volumes -f
        
        # 6. Επανεκκίνηση με νέα build
        echo "🚀 Επανεκκίνηση..."
        docker compose up --build -d
        ;;
        
    2)
        echo ""
        echo "⚡ ΓΡΗΓΟΡΟ RESET..."
        echo "=================="
        
        # 1. Διακοπή containers και καθαρισμός volumes
        echo "🛑 Διακοπή containers..."
        docker compose down --volumes
        
        # 2. Καθαρισμός μόνο unused resources
        echo "🧹 Καθαρισμός unused resources..."
        docker system prune -f
        
        # 3. Επανεκκίνηση
        echo "🚀 Επανεκκίνηση..."
        docker compose up --build -d
        ;;
        
    3)
        echo ""
        echo "🗄️ RESET ΜΟΝΟ DATABASE..."
        echo "========================="
        
        # 1. Διακοπή containers
        echo "🛑 Διακοπή containers..."
        docker compose down
        
        # 2. Διαγραφή μόνο του database volume
        echo "🗄️ Διαγραφή database volume..."
        docker volume rm linux_version_pgdata_dev 2>/dev/null || true
        
        # 3. Επανεκκίνηση (νέα βάση δεδομένων)
        echo "🚀 Επανεκκίνηση..."
        docker compose up -d
        ;;
        
    4)
        echo "👋 Έξοδος..."
        exit 0
        ;;
        
    *)
        echo "❌ Λάθος επιλογή"
        exit 1
        ;;
esac

# Αναμονή για containers να ξεκινήσουν
echo ""
echo "⏳ Αναμονή για containers να ξεκινήσουν..."
sleep 10

# Έλεγχος κατάστασης
echo ""
echo "📊 ΚΑΤΑΣΤΑΣΗ CONTAINERS:"
echo "======================="
docker compose ps

# Έλεγχος logs
echo ""
echo "📋 ΠΡΟΣΦΑΤΑ LOGS:"
echo "================"
docker compose logs --tail=10

echo ""
echo "✅ ΟΛΟΚΛΗΡΩΘΗΚΕ!"
echo "================"
echo "👑 Ultra-Superuser: http://localhost:8000/admin/"
echo "   Email: theostam1966@gmail.com"
echo "   Password: theo123!@#"
echo ""
echo "🌐 Demo Tenant: http://demo.localhost:3000"
echo "🔧 Demo Admin: http://demo.localhost:8000/admin/"
echo ""
echo "📄 Credentials: backend/logs/demo_credentials.log"