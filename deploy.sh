#!/bin/bash

# New Concierge - Quick Deployment Script
# This script helps with production deployment

set -e  # Exit on error

echo "======================================================================"
echo "  New Concierge - Production Deployment"
echo "======================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo -e "\n${GREEN}==>${NC} $1"
}

# Check if running in project root
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

echo "Select deployment option:"
echo "1) Build frontend for production"
echo "2) Generate production QR codes"
echo "3) Run backend migrations"
echo "4) Full deployment (all of the above)"
echo "5) Test deployment locally"
echo ""
read -p "Enter option (1-5): " option

case $option in
    1)
        print_step "Building frontend for production..."
        cd frontend

        print_warning "Installing dependencies..."
        npm ci

        print_warning "Building Next.js production bundle..."
        npm run build

        print_success "Frontend build complete!"
        print_warning "Build output is in frontend/.next/"

        echo ""
        echo "Next steps:"
        echo "  1. Test locally: npm start"
        echo "  2. Deploy to server or Vercel"
        ;;

    2)
        print_step "Generating production QR codes..."

        read -p "Enter production URL (e.g., https://newconcierge.gr): " prod_url
        read -p "Enter tenant schema (default: demo): " schema
        schema=${schema:-demo}

        print_warning "Generating QR codes with URL: $prod_url"

        docker exec linux_version-backend-1 python manage.py generate_apartment_qr_codes \
            --schema "$schema" \
            --base-url "$prod_url"

        print_success "QR codes generated!"
        print_warning "Download from: docker cp backend:/app/media/qr_codes/ ./qr_codes/"
        ;;

    3)
        print_step "Running backend migrations..."

        print_warning "Migrating apartments..."
        docker exec linux_version-backend-1 python manage.py migrate apartments

        print_warning "Migrating notifications..."
        docker exec linux_version-backend-1 python manage.py migrate notifications

        print_warning "Migrating all apps..."
        docker exec linux_version-backend-1 python manage.py migrate

        print_success "All migrations complete!"
        ;;

    4)
        print_step "Full deployment started..."

        # Step 1: Migrations
        print_step "Step 1/3: Running migrations..."
        docker exec linux_version-backend-1 python manage.py migrate
        print_success "Migrations complete!"

        # Step 2: Build frontend
        print_step "Step 2/3: Building frontend..."
        cd frontend
        npm ci
        npm run build
        cd ..
        print_success "Frontend built!"

        # Step 3: Generate QR codes
        print_step "Step 3/3: Generating QR codes..."
        read -p "Enter production URL (e.g., https://newconcierge.gr): " prod_url

        docker exec linux_version-backend-1 python manage.py generate_apartment_qr_codes \
            --schema demo \
            --base-url "$prod_url"

        print_success "QR codes generated!"

        echo ""
        print_success "🎉 Full deployment complete!"
        echo ""
        echo "Next steps:"
        echo "  1. Download QR codes: docker cp backend:/app/media/qr_codes/ ./qr_codes/"
        echo "  2. Deploy frontend: cd frontend && npm start"
        echo "  3. Test: curl http://localhost:8000/api/personal/{TOKEN}/dashboard/"
        ;;

    5)
        print_step "Testing deployment locally..."

        # Test backend API
        print_warning "Testing backend API..."
        docker exec linux_version-backend-1 python -c "
import sys
sys.path.append('/app')
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
import django
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
import urllib.request
import json

with schema_context('demo'):
    apartment = Apartment.objects.first()
    token = str(apartment.kiosk_token)

    try:
        url = f'http://localhost:8000/api/personal/{token}/dashboard/'
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read())
            print(f'✅ Backend API: OK (Apartment {data[\"apartment\"][\"number\"]})')
            print(f'   Token: {token}')
    except Exception as e:
        print(f'❌ Backend API: FAILED - {e}')
        sys.exit(1)
"

        # Test frontend build
        print_warning "Checking frontend build..."
        if [ -d "frontend/.next" ]; then
            print_success "Frontend: Built (frontend/.next/ exists)"
        else
            print_warning "Frontend: Not built yet (run option 1 first)"
        fi

        # Test PWA manifest
        print_warning "Checking PWA manifest..."
        if [ -f "frontend/public/manifest.json" ]; then
            print_success "PWA Manifest: Found"
        else
            print_error "PWA Manifest: Missing!"
        fi

        # Test QR codes
        print_warning "Checking QR codes..."
        qr_count=$(docker exec linux_version-backend-1 find /app/media/qr_codes -name "*.pdf" 2>/dev/null | wc -l || echo "0")
        if [ "$qr_count" -gt 0 ]; then
            print_success "QR Codes: $qr_count PDF(s) generated"
        else
            print_warning "QR Codes: None generated yet (run option 2)"
        fi

        echo ""
        print_success "Local deployment test complete!"
        ;;

    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "======================================================================"
echo "  Deployment task completed!"
echo "======================================================================"
