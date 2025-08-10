#!/usr/bin/env python3
"""
Test script to check API endpoints and identify issues
"""

import requests
import json

# Base URL
base_url = "http://demo.localhost:8000/api"

# Demo credentials
demo_credentials = {
    'email': 'admin@demo.localhost',
    'password': 'admin123456'
}

def login():
    """Login and get access token"""
    print("🔐 Logging in with demo credentials...")
    
    try:
        response = requests.post(f"{base_url}/users/login/", json=demo_credentials)
        print(f"Login status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access')
            print(f"✅ Login successful! User: {data.get('user', {}).get('email', 'N/A')}")
            return access_token
        else:
            print(f"❌ Login failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_apartment_transactions(access_token):
    """Test apartment transactions endpoint"""
    print("\nTesting apartment transactions endpoint...")
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # Test with apartment ID 14
    url = f"{base_url}/financial/apartments/14/transactions/"
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Found {len(data)} transactions")
        else:
            print(f"❌ Error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_expense_creation(access_token):
    """Test expense creation endpoint"""
    print("\nTesting expense creation endpoint...")
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    url = f"{base_url}/financial/expenses/"
    print(f"URL: {url}")
    
    # Sample expense data
    expense_data = {
        "building": 1,
        "title": "Test Expense",
        "amount": "100.00",
        "date": "2025-01-15",
        "category": "electricity_common",
        "distribution_type": "by_participation_mills",
        "notes": "Test expense for debugging"
    }
    
    print(f"Data: {json.dumps(expense_data, indent=2)}")
    
    try:
        response = requests.post(url, headers=headers, json=expense_data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Success! Created expense with ID: {data.get('id')}")
        else:
            print(f"❌ Error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_expense_categories(access_token):
    """Test expense categories endpoint"""
    print("\nTesting expense categories endpoint...")
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    url = f"{base_url}/financial/expenses/categories/"
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Found {len(data)} categories")
        else:
            print(f"❌ Error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_payments_building_3(access_token):
    """Test payments endpoint for building 3 and summarize results"""
    print("\nTesting payments endpoint for building 3...")
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    url = f"{base_url}/financial/payments/?building_id=3"
    print(f"URL: {url}")
    try:
        response = requests.get(url, headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            # Support both paginated and non-paginated responses
            payments = data.get('results', data) if isinstance(data, dict) else data
            print(f"✅ Success! Found {len(payments)} payments for building 3")
            total_amount = sum(float(p.get('amount', 0)) for p in payments)
            print(f"💰 Total payments amount: {total_amount:.2f}€")
            # Show a couple of sample lines
            for sample in payments[:5]:
                print(f"  • Apt {sample.get('apartment_number','?')}: {sample.get('amount')}€ on {sample.get('date')} ({sample.get('method_display', sample.get('method'))}) | current_balance={sample.get('current_balance')}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    print("🔍 Testing API Endpoints with Authentication")
    print("=" * 50)
    
    # Login first
    access_token = login()
    
    if access_token:
        test_payments_building_3(access_token)
        test_apartment_transactions(access_token)
        test_expense_creation(access_token)
        test_expense_categories(access_token)
    else:
        print("❌ Cannot proceed without authentication token")
    
    print("\n" + "=" * 50)
    print("✅ Testing completed!")
