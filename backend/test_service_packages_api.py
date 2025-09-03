#!/usr/bin/env python3
"""
Script για έλεγχο του service packages API με authentication
"""

import os
import django
import requests

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import CustomUser

def test_service_packages_api():
    """Ελέγχει το service packages API με authentication"""
    
    print("🧪 ΕΛΕΓΧΟΣ SERVICE PACKAGES API")
    print("=" * 60)
    
    # Get demo tenant
    try:
        client = Client.objects.get(schema_name='demo')
        print(f"✅ Βρέθηκε tenant: {client.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε demo tenant")
        return
    
    # Check in tenant context
    with tenant_context(client):
        # Get admin user
        try:
            admin_user = CustomUser.objects.get(email='admin@demo.localhost')
            print(f"✅ Βρέθηκε admin user: {admin_user.email}")
        except CustomUser.DoesNotExist:
            print("❌ Δεν βρέθηκε admin user")
            return
        
        # Generate JWT token
        refresh = RefreshToken.for_user(admin_user)
        access_token = str(refresh.access_token)
        print(f"✅ Generated JWT token: {access_token[:20]}...")
        
        # Test API endpoints
        base_url = "http://localhost:8000"
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        endpoints = [
            "/api/buildings/service-packages/",
            "/api/buildings/service-packages/?building_id=4",
            "/api/buildings/4/",
        ]
        
        for endpoint in endpoints:
            try:
                url = base_url + endpoint
                print(f"\n🌐 Testing: {url}")
                
                response = requests.get(url, headers=headers, timeout=5)
                print(f"   Status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list):
                        print(f"   Results: {len(data)} items")
                        if len(data) > 0:
                            print(f"   First item: {data[0].get('name', 'N/A')}")
                    elif isinstance(data, dict):
                        print(f"   Keys: {list(data.keys())}")
                else:
                    print(f"   Error: {response.text[:100]}")
                    
            except requests.exceptions.RequestException as e:
                print(f"   ❌ Request failed: {e}")
            except Exception as e:
                print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    test_service_packages_api()
