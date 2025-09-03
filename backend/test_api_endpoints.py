#!/usr/bin/env python3
"""
Script για έλεγχο των API endpoints
"""

import os
import django
import requests

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from tenants.models import Client

def test_api_endpoints():
    """Ελέγχει τα API endpoints"""
    
    print("🧪 ΕΛΕΓΧΟΣ API ENDPOINTS")
    print("=" * 60)
    
    # Get demo tenant
    try:
        client = Client.objects.get(schema_name='demo')
        print(f"✅ Βρέθηκε tenant: {client.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε demo tenant")
        return
    
    # Test URLs
    base_url = "http://localhost:8000"
    
    endpoints = [
        "/api/buildings/",
        "/api/buildings/service-packages/",
        "/api/buildings/1/",
        "/api/buildings/4/",
    ]
    
    for endpoint in endpoints:
        try:
            url = base_url + endpoint
            print(f"\n🌐 Testing: {url}")
            
            response = requests.get(url, timeout=5)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    print(f"   Results: {len(data)} items")
                elif isinstance(data, dict):
                    print(f"   Keys: {list(data.keys())}")
            else:
                print(f"   Error: {response.text[:100]}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Request failed: {e}")
        except Exception as e:
            print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    test_api_endpoints()
