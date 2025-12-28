#!/usr/bin/env python3
"""
Τεστ script για δημιουργία service packages μέσω API
"""
import os
import sys
import django
import requests

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import ServicePackage

def test_api_auth():
    """Τεστ για authentication"""
    login_url = "http://localhost:8000/api/users/login/"
    login_data = {
        "email": "admin@demo.localhost",
        "password": "admin123456"
    }
    
    print("🔐 Δοκιμή σύνδεσης...")
    response = requests.post(login_url, json=login_data)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        access_token = data.get('access')
        print(f"✅ Επιτυχής σύνδεση! Token: {access_token[:20]}...")
        return access_token
    else:
        print(f"❌ Αποτυχία σύνδεσης: {response.text}")
        return None

def test_service_packages_api(token):
    """Τεστ για service packages API"""
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test GET
    print("\n📦 Δοκιμή λήψης service packages...")
    get_url = "http://localhost:8000/api/buildings/service-packages/"
    response = requests.get(get_url, headers=headers)
    print(f"GET Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        packages = data.get('results', [])
        print(f"✅ Βρέθηκαν {len(packages)} πακέτα")
        for pkg in packages:
            print(f"  - {pkg['name']}: {pkg['fee_per_apartment']}€/διαμέρισμα")
    else:
        print(f"❌ Αποτυχία λήψης: {response.text}")
        return False
    
    # Test POST (Create new package)
    print("\n🆕 Δοκιμή δημιουργίας νέου πακέτου...")
    create_data = {
        "name": "API Test Πακέτο",
        "description": "Πακέτο δημιουργημένο από API test",
        "fee_per_apartment": "12.50",
        "services_included": [
            "Test υπηρεσία 1",
            "Test υπηρεσία 2",
            "Test υπηρεσία 3"
        ],
        "is_active": True
    }
    
    response = requests.post(get_url, json=create_data, headers=headers)
    print(f"POST Status: {response.status_code}")
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ Επιτυχής δημιουργία πακέτου: {data['name']} (ID: {data['id']})")
        return True
    else:
        print(f"❌ Αποτυχία δημιουργίας: {response.text}")
        return False

def check_database_packages():
    """Έλεγχος πακέτων στη βάση δεδομένων"""
    print("\n💾 Έλεγχος πακέτων στη βάση δεδομένων...")
    
    with schema_context('demo'):
        packages = ServicePackage.objects.all()
        print(f"Συνολικά πακέτα στη ΒΔ: {packages.count()}")
        
        for pkg in packages:
            print(f"  - {pkg.name}: {pkg.fee_per_apartment}€, Ενεργό: {pkg.is_active}")
            print(f"    Υπηρεσίες: {pkg.services_included}")
            print(f"    Δημιουργήθηκε: {pkg.created_at}")
            print()

if __name__ == "__main__":
    print("🚀 ΤΕΣΤ SERVICE PACKAGES API")
    print("=" * 50)
    
    # Test database first
    check_database_packages()
    
    # Test API
    token = test_api_auth()
    if token:
        success = test_service_packages_api(token)
        if success:
            print("\n✅ Όλα τα tests πέρασαν επιτυχώς!")
            check_database_packages()  # Check again after creation
        else:
            print("\n❌ Κάποια tests απέτυχαν")
    else:
        print("\n❌ Αποτυχία authentication")
