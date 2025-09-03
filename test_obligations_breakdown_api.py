#!/usr/bin/env python3
"""
Test το νέο obligations breakdown API endpoint
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


def test_obligations_breakdown_api():
    """Test το νέο API endpoint"""
    
    # Test the API endpoint
    building_id = 3  # Αραχώβης 12
    url = f"http://localhost:8000/api/financial/obligations/breakdown/?building_id={building_id}"
    
    print("=" * 60)
    print(" 🧪 TESTING OBLIGATIONS BREAKDOWN API ")
    print("=" * 60)
    print(f"🌐 URL: {url}")
    
    try:
        response = requests.get(url)
        
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API Success!")
            print("\n📋 Response Data:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            # Validate the data structure
            required_fields = [
                'building_name', 'apartment_debts', 'total_apartment_debts',
                'total_expenses', 'total_management_fees', 'total_obligations',
                'apartments_with_debt', 'apartments_count'
            ]
            
            print("\n🔍 VALIDATION:")
            for field in required_fields:
                if field in data:
                    print(f"✅ {field}: {data[field]}")
                else:
                    print(f"❌ Missing field: {field}")
            
            # Check if totals match our previous analysis
            expected_total = 334.85
            actual_total = data.get('total_obligations', 0)
            
            print("\n🎯 TOTAL COMPARISON:")
            print(f"   Expected: {expected_total} €")
            print(f"   Actual: {actual_total} €")
            print(f"   Match: {'✅' if abs(actual_total - expected_total) < 0.01 else '❌'}")
            
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_obligations_breakdown_api()

