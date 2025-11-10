#!/usr/bin/env python3
"""
Test script to check if the current token in the browser is valid.
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

def test_current_token():
    """Test the current token that should be in the browser."""
    
    base_url = "http://demo.localhost:8000/api"
    
    print("🔍 Testing current browser token...")
    print("=" * 50)
    
    # First, let's get a fresh token
    print("🧪 Step 1: Getting fresh token...")
    
    try:
        login_payload = {
            "email": "admin@demo.localhost",
            "password": "admin123456"
        }
        
        response = requests.post(f"{base_url}/users/login/", json=login_payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access')
            
            print(f"✅ Fresh token obtained: {access_token[:20]}...{access_token[-10:] if access_token else 'None'}")
            
            # Test 2: Check if this token works with the calculation endpoint
            print("\n🧪 Step 2: Testing calculation with fresh token...")
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Test simple calculation
            calc_payload = {
                "building_id": 1,
                "month_filter": "2025-06"
            }
            
            calc_response = requests.post(f"{base_url}/financial/common-expenses/calculate/", 
                                        json=calc_payload, 
                                        headers=headers, 
                                        timeout=30)
            
            print(f"📥 Calculation response status: {calc_response.status_code}")
            
            if calc_response.status_code == 200:
                calc_data = calc_response.json()
                print("✅ Calculation successful!")
                print(f"   - Shares count: {len(calc_data.get('shares', {}))}")
                print(f"   - Total expenses: {calc_data.get('total_expenses', 0)}")
                
                # Test 3: Test advanced calculation
                print("\n🧪 Step 3: Testing advanced calculation...")
                
                adv_calc_payload = {
                    "building_id": 1,
                    "period_start_date": "2025-06-01",
                    "period_end_date": "2025-06-30",
                    "month_filter": "2025-06"
                }
                
                adv_calc_response = requests.post(f"{base_url}/financial/common-expenses/calculate_advanced/", 
                                                json=adv_calc_payload, 
                                                headers=headers, 
                                                timeout=30)
                
                print(f"📥 Advanced calculation response status: {adv_calc_response.status_code}")
                
                if adv_calc_response.status_code == 200:
                    adv_calc_data = adv_calc_response.json()
                    print("✅ Advanced calculation successful!")
                    print(f"   - Shares count: {len(adv_calc_data.get('shares', {}))}")
                    print(f"   - Total expenses: {adv_calc_data.get('total_expenses', 0)}")
                else:
                    print(f"❌ Advanced calculation failed: {adv_calc_response.status_code}")
                    print(f"📥 Response body: {adv_calc_response.text}")
                    
            else:
                print(f"❌ Calculation failed: {calc_response.status_code}")
                print(f"📥 Response body: {calc_response.text}")
                
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"📥 Response body: {response.text}")
            
    except Exception as e:
        print(f"❌ Token test error: {e}")
    
    print()
    
    # Test 4: Check what data is available for calculation
    print("🧪 Step 4: Checking available data for calculation...")
    
    try:
        with schema_context('demo'):
            from buildings.models import Building
            from apartments.models import Apartment
            from financial.models import Expense
            
            building = Building.objects.first()
            if building:
                print(f"✅ Building: {building.name} (ID: {building.id})")
            else:
                print("❌ No building found")
            
            apartments = Apartment.objects.all()
            print(f"✅ Apartments: {apartments.count()}")
            
            # Check for expenses in June 2025
            expenses = Expense.objects.filter(
                date__year=2025,
                date__month=6
            )
            print(f"✅ Expenses in June 2025: {expenses.count()}")
            
            if expenses.count() == 0:
                print("⚠️  No expenses found for June 2025 - this might be why calculation returns 0")
                print("   This is expected for demo data with zero amounts")
            
    except Exception as e:
        print(f"❌ Data check error: {e}")

if __name__ == "__main__":
    test_current_token()
