#!/usr/bin/env python3
"""
Debug script to test the calculation API endpoints and see what's causing the issue.
"""

import os
import sys
import django
import requests
import json

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def test_calculation_apis():
    """Test the calculation API endpoints to see what's happening."""
    
    base_url = "http://demo.localhost:8000/api"
    
    print("🔧 Testing calculation API endpoints...")
    print("=" * 50)
    
    # Test 1: Check if we can access the calculation endpoints
    print("🧪 Test 1: Checking calculation endpoints accessibility...")
    
    # Test simple calculation endpoint
    try:
        payload = {
            "building_id": 1,
            "month_filter": "2025-06"
        }
        print("📤 Sending request to /financial/common-expenses/calculate/")
        print(f"📤 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(f"{base_url}/financial/common-expenses/calculate/", json=payload, timeout=30)
        print(f"📥 Response status: {response.status_code}")
        print(f"📥 Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Simple calculation works: {len(data.get('shares', {}))} shares")
        else:
            print(f"❌ Simple calculation failed: {response.status_code}")
            print(f"📥 Response body: {response.text}")
            
    except Exception as e:
        print(f"❌ Simple calculation error: {e}")
    
    print()
    
    # Test 2: Advanced calculation endpoint
    print("🧪 Test 2: Testing advanced calculation endpoint...")
    
    try:
        payload = {
            "building_id": 1,
            "period_start_date": "2025-06-01",
            "period_end_date": "2025-06-30",
            "month_filter": "2025-06"
        }
        print("📤 Sending request to /financial/common-expenses/calculate_advanced/")
        print(f"📤 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(f"{base_url}/financial/common-expenses/calculate_advanced/", json=payload, timeout=30)
        print(f"📥 Response status: {response.status_code}")
        print(f"📥 Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Advanced calculation works: {len(data.get('shares', {}))} shares")
        else:
            print(f"❌ Advanced calculation failed: {response.status_code}")
            print(f"📥 Response body: {response.text}")
            
    except Exception as e:
        print(f"❌ Advanced calculation error: {e}")
    
    print()
    
    # Test 3: Check database data
    print("🧪 Test 3: Checking database data...")
    
    try:
        with schema_context('demo'):
            from buildings.models import Building
            from apartments.models import Apartment
            from financial.models import Expense
            
            building = Building.objects.first()
            if building:
                print(f"✅ Building found: {building.name}")
                print(f"   - Reserve fund goal: {building.reserve_fund_goal}")
                print(f"   - Reserve fund start date: {building.reserve_fund_start_date}")
                print(f"   - Reserve fund target date: {building.reserve_fund_target_date}")
            else:
                print("❌ No building found")
            
            apartments = Apartment.objects.all()
            print(f"✅ Apartments found: {apartments.count()}")
            
            # Check for expenses in June 2025
            expenses = Expense.objects.filter(
                date__year=2025,
                date__month=6
            )
            print(f"✅ Expenses in June 2025: {expenses.count()}")
            
            if expenses.count() > 0:
                for expense in expenses[:3]:  # Show first 3
                    print(f"   - {expense.title}: {expense.amount}€")
            
    except Exception as e:
        print(f"❌ Database check error: {e}")

if __name__ == "__main__":
    test_calculation_apis()
