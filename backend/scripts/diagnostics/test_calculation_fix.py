#!/usr/bin/env python3
"""
Test script to verify that the calculation infinite loop issue is fixed.
This script will test the API endpoints that were causing the infinite loop.
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

def test_calculation_endpoints():
    """Test the calculation endpoints to ensure they work without infinite loops."""
    
    base_url = "http://demo.localhost:8000/api"
    
    # Test 1: Check if the dashboard summary endpoint works
    print("🧪 Testing dashboard summary endpoint...")
    try:
        response = requests.get(f"{base_url}/financial/dashboard/summary/?building_id=1&month=2025-06", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Dashboard summary works: {data.get('total_balance', 'N/A')}")
        else:
            print(f"❌ Dashboard summary failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Dashboard summary error: {e}")
    
    # Test 2: Check if the apartments summary endpoint works
    print("🧪 Testing apartments summary endpoint...")
    try:
        response = requests.get(f"{base_url}/financial/building/1/apartments-summary/?month=2025-06", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Apartments summary works: {len(data) if isinstance(data, list) else 'N/A'} apartments")
        else:
            print(f"❌ Apartments summary failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Apartments summary error: {e}")
    
    # Test 3: Check if the advanced calculation endpoint works
    print("🧪 Testing advanced calculation endpoint...")
    try:
        payload = {
            "building_id": 1,
            "period_start_date": "2025-06-01",
            "period_end_date": "2025-06-30",
            "month_filter": "2025-06"
        }
        response = requests.post(f"{base_url}/financial/common-expenses/calculate_advanced/", json=payload, timeout=15)
        if response.status_code == 200:
            data = response.json()
            shares_count = len(data.get('shares', {}))
            print(f"✅ Advanced calculation works: {shares_count} shares calculated")
        else:
            print(f"❌ Advanced calculation failed: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Advanced calculation error: {e}")
    
    # Test 4: Check if the simple calculation endpoint works
    print("🧪 Testing simple calculation endpoint...")
    try:
        payload = {
            "building_id": 1,
            "month_filter": "2025-06"
        }
        response = requests.post(f"{base_url}/financial/common-expenses/calculate/", json=payload, timeout=15)
        if response.status_code == 200:
            data = response.json()
            shares_count = len(data.get('shares', {}))
            print(f"✅ Simple calculation works: {shares_count} shares calculated")
        else:
            print(f"❌ Simple calculation failed: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Simple calculation error: {e}")

def test_database_connection():
    """Test database connection and basic queries."""
    print("🧪 Testing database connection...")
    
    try:
        with schema_context('demo'):
            from buildings.models import Building
            from apartments.models import Apartment
            
            # Test building query
            building = Building.objects.first()
            if building:
                print(f"✅ Database connection works: Found building '{building.name}'")
            else:
                print("❌ No buildings found in database")
            
            # Test apartments query
            apartments = Apartment.objects.all()
            print(f"✅ Apartments query works: {apartments.count()} apartments found")
            
    except Exception as e:
        print(f"❌ Database connection error: {e}")

if __name__ == "__main__":
    print("🔧 Testing calculation infinite loop fix...")
    print("=" * 50)
    
    # Test database connection first
    test_database_connection()
    print()
    
    # Test API endpoints
    test_calculation_endpoints()
    print()
    
    print("✅ Testing completed!")
    print("If all tests pass, the infinite loop issue should be fixed.")
