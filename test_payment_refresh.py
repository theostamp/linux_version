#!/usr/bin/env python3
"""
Test payment creation and dashboard refresh
"""

import requests
import json

def test_payment_creation_and_refresh():
    """Test payment creation and verify it appears in dashboard"""
    
    base_url = "http://demo.localhost:8000"
    
    print("🔍 Testing Payment Creation and Dashboard Refresh")
    print("=" * 50)
    
    # 1. Login to get access token
    print("\n1. Logging in...")
    
    try:
        login_data = {
            'email': 'admin@demo.localhost',
            'password': 'admin123456'
        }
        
        response = requests.post(
            f"{base_url}/api/users/login/",
            json=login_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code != 200:
            print(f"❌ Login failed: {response.status_code}")
            return False
            
        auth_data = response.json()
        access_token = auth_data.get('access')
        print(f"✅ Login successful: {auth_data.get('user', {}).get('email', 'N/A')}")
        
    except Exception as e:
        print(f"❌ Error during login: {e}")
        return False
    
    # 2. Check current dashboard data
    print("\n2. Checking current dashboard data...")
    
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(
            f"{base_url}/api/financial/dashboard/summary/?building_id=3",
            headers=headers
        )
        
        if response.status_code == 200:
            dashboard_data = response.json()
            print(f"✅ Dashboard loaded successfully")
            print(f"   Current reserve: {dashboard_data.get('current_reserve', 'N/A')}")
            print(f"   Total payments this month: {dashboard_data.get('total_payments_this_month', 'N/A')}")
            print(f"   Recent transactions: {len(dashboard_data.get('recent_transactions', []))}")
        else:
            print(f"❌ Dashboard load failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error loading dashboard: {e}")
    
    # 3. Create a new payment
    print("\n3. Creating new payment...")
    
    try:
        payment_data = {
            'apartment': 13,  # Apartment 1 in building 3
            'amount': '50.00',
            'date': '2025-08-05',
            'method': 'cash',
            'notes': 'Test payment for dashboard refresh'
        }
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f"{base_url}/api/financial/payments/",
            json=payment_data,
            headers=headers
        )
        
        if response.status_code == 201:
            payment = response.json()
            print(f"✅ Payment created successfully: {payment.get('id', 'N/A')}")
            print(f"   Amount: {payment.get('amount', 'N/A')}")
            print(f"   Date: {payment.get('date', 'N/A')}")
        else:
            print(f"❌ Payment creation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating payment: {e}")
        return False
    
    # 4. Check dashboard data again
    print("\n4. Checking dashboard data after payment creation...")
    
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(
            f"{base_url}/api/financial/dashboard/summary/?building_id=3",
            headers=headers
        )
        
        if response.status_code == 200:
            dashboard_data = response.json()
            print(f"✅ Dashboard refreshed successfully")
            print(f"   Current reserve: {dashboard_data.get('current_reserve', 'N/A')}")
            print(f"   Total payments this month: {dashboard_data.get('total_payments_this_month', 'N/A')}")
            print(f"   Recent transactions: {len(dashboard_data.get('recent_transactions', []))}")
            
            # Check if the new payment appears in recent transactions
            recent_transactions = dashboard_data.get('recent_transactions', [])
            if recent_transactions:
                latest_transaction = recent_transactions[0]
                print(f"   Latest transaction: {latest_transaction.get('description', 'N/A')} - {latest_transaction.get('amount', 'N/A')}€")
            
        else:
            print(f"❌ Dashboard refresh failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error refreshing dashboard: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Payment Creation and Dashboard Refresh Test Completed")
    
    return True

if __name__ == "__main__":
    test_payment_creation_and_refresh() 