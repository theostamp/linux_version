#!/bin/bash

# 🚀 New Concierge - Complete Startup Script
# Αυτό το script εκτελεί όλες τις αρχικές ενέργειες για το project

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

# Main startup function
main() {
    print_header "🚀 NEW CONCIERGE STARTUP"
    
    # 1. Check if we're in the correct directory
    if [ ! -f "readme.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        print_error "❌ Δεν βρίσκεστε στον σωστό φάκελο του project!"
        print_error "Παρακαλώ εκτελέστε το script από τον φάκελο linux_version"
        exit 1
    fi
    
    print_header "📁 ENVIRONMENT SETUP"
    
    # 2. Activate virtual environment
    print_status "Ενεργοποίηση virtual environment..."
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
        print_success "✅ Virtual environment ενεργοποιήθηκε: $VIRTUAL_ENV"
        print_status "Python Path: $(which python)"
        print_status "Python Version: $(python --version)"
    else
        print_error "❌ Virtual environment δεν βρέθηκε!"
        print_status "Δημιουργία νέου virtual environment..."
        python3 -m venv .venv
        source .venv/bin/activate
        print_success "✅ Νέο virtual environment δημιουργήθηκε"
    fi
    
    print_header "🔧 DOCKER SERVICES"
    
    # 3. Check Docker status
    print_status "Έλεγχος Docker..."
    if command -v docker &> /dev/null; then
        print_success "✅ Docker είναι διαθέσιμο: $(docker --version)"
        
        # Check if containers are running
        if docker-compose ps | grep -q "Up"; then
            print_warning "⚠️  Κάποια containers τρέχουν ήδη"
            print_status "Restarting Docker services..."
            docker-compose down
            sleep 2
        fi
        
        print_status "Εκκίνηση Docker services..."
        docker-compose up -d
        
        # Wait for services to be ready
        print_status "Αναμονή για έτοιμα services..."
        sleep 10
        
        # Check if services are running
        if docker-compose ps | grep -q "Up"; then
            print_success "✅ Docker services ξεκίνησαν επιτυχώς"
            docker-compose ps
        else
            print_warning "⚠️  Κάποια Docker services ίσως να χρειάζονται περισσότερο χρόνο"
        fi
    else
        print_warning "⚠️  Docker δεν είναι διαθέσιμο - συνεχίζουμε χωρίς containerized services"
    fi
    
    print_header "📦 BACKEND SETUP"
    
    # 4. Backend setup
    cd backend
    
    # Install/update dependencies
    print_status "Έλεγχος Backend dependencies..."
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt --quiet
        print_success "✅ Backend dependencies εγκαταστάθηκαν"
    fi
    
    # Database migrations
    print_status "Εφαρμογή Database migrations..."
    python manage.py migrate --run-syncdb
    print_success "✅ Database migrations ολοκληρώθηκαν"
    
    # Collect static files (for production)
    if [ "$1" = "production" ]; then
        print_status "Συλλογή static files..."
        python manage.py collectstatic --noinput
        print_success "✅ Static files συλλέχθηκαν"
    fi
    
    # Check if we can connect to database
    print_status "Έλεγχος σύνδεσης βάσης δεδομένων..."
    if python manage.py check --database default; then
        print_success "✅ Σύνδεση με βάση δεδομένων επιτυχής"
    else
        print_warning "⚠️  Πρόβλημα σύνδεσης με βάση δεδομένων"
    fi
    
    cd ..
    
    print_header "🎨 FRONTEND SETUP"
    
    # 5. Frontend setup
    cd frontend
    
    # Check if node_modules exist
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        print_status "Εγκατάσταση Frontend dependencies..."
        npm install
        print_success "✅ Frontend dependencies εγκαταστάθηκαν"
    else
        print_status "Έλεγχος για updates στα Frontend dependencies..."
        npm update
        print_success "✅ Frontend dependencies ενημερώθηκαν"
    fi
    
    cd ..
    
    print_header "🏁 STARTUP COMPLETE"
    
    # 6. Final status and instructions
    print_success "🎉 Όλες οι αρχικές ενέργειες ολοκληρώθηκαν επιτυχώς!"
    echo ""
    print_status "📋 Επόμενα βήματα:"
    echo "   • Backend Server:  cd backend && python manage.py runserver"
    echo "   • Frontend Server: cd frontend && npm run dev"
    echo "   • Admin Panel:     http://localhost:8000/admin/"
    echo "   • Frontend App:    http://localhost:3000/"
    echo ""
    print_status "🔧 Χρήσιμες εντολές:"
    echo "   • Docker status:   docker-compose ps"
    echo "   • View logs:       docker-compose logs -f"
    echo "   • Stop services:   docker-compose down"
    echo ""
    print_status "📊 Τρέχουσα κατάσταση συστήματος:"
    echo "   • Virtual Env:     $VIRTUAL_ENV"
    echo "   • Python:          $(which python) ($(python --version))"
    echo "   • Working Dir:     $(pwd)"
    echo "   • Git Branch:      $(git branch --show-current 2>/dev/null || echo 'N/A')"
}

# Handle script arguments
case "$1" in
    "production")
        print_status "🏭 Production mode enabled"
        main production
        ;;
    "help"|"-h"|"--help")
        echo "🚀 New Concierge Startup Script"
        echo ""
        echo "Usage: ./startup.sh [mode]"
        echo ""
        echo "Modes:"
        echo "  (default)    Development mode"
        echo "  production   Production mode (includes collectstatic)"
        echo "  help         Show this help message"
        echo ""
        echo "This script will:"
        echo "  ✅ Activate virtual environment"
        echo "  ✅ Start Docker services"
        echo "  ✅ Install/update dependencies"
        echo "  ✅ Run database migrations"
        echo "  ✅ Prepare frontend"
        echo "  ✅ Show next steps"
        ;;
    *)
        main development
        ;;
esac
