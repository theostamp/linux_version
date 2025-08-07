#!/usr/bin/env python3
"""
Test script to verify monthly filtering fix for financial dashboard
"""

import requests
import json
from datetime import datetime, timedelta
import time

# Configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/users/login/"
FINANCIAL_SUMMARY_URL = f"{BASE_URL}/api/financial/dashboard/summary/"

# Test credentials
ADMIN_CREDENTIALS = {
    "email": "admin@demo.localhost",
    "password": "admin123456"
}

def login():
    """Login and get access token"""
    try:
        response = requests.post(LOGIN_URL, json=ADMIN_CREDENTIALS)
        response.raise_for_status()
        data = response.json()
        return data.get('access')
    except Exception as e:
        print(f"❌ Σφάλμα σύνδεσης: {e}")
        return None

def test_monthly_filtering(token):
    """Test monthly filtering functionality"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("🔍 Δοκιμή μηνιαίου φιλτραρίσματος")
    print("=" * 50)
    
    # Test different months
    test_months = [
        "2025-01",  # Ιανουάριος 2025
        "2025-02",  # Φεβρουάριος 2025
        "2025-08",  # Αύγουστος 2025 (τρέχον)
    ]
    
    for month in test_months:
        print(f"\n📅 Δοκιμή για μήνα: {month}")
        print("-" * 30)
        
        try:
            params = {
                "building_id": 3,  # Building 3 as specified in the URL
                "month": month
            }
            
            response = requests.get(FINANCIAL_SUMMARY_URL, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            print(f"✅ Τρέχον Αποθεματικό: {float(data.get('current_reserve', 0)):.2f}€")
            print(f"   Δαπάνες Μήνα: {float(data.get('total_expenses_month', 0)):.2f}€")
            print(f"   Εισπράξεις Μήνα: {float(data.get('total_payments_month', 0)):.2f}€")
            print(f"   Ανέκδοτες Δαπάνες: {float(data.get('pending_expenses', 0)):.2f}€")
            print(f"   Πρόσφατες Κινήσεις: {data.get('recent_transactions_count', 0)}")
            
            # Verify that current_reserve = payments - expenses for the month
            payments = float(data.get('total_payments_month', 0))
            expenses = float(data.get('total_expenses_month', 0))
            reserve = float(data.get('current_reserve', 0))
            calculated_reserve = payments - expenses
            
            if abs(reserve - calculated_reserve) < 0.01:  # Allow small floating point differences
                print(f"✅ Επιβεβαίωση: Αποθεματικό = Εισπράξεις - Δαπάνες ({reserve:.2f} = {payments:.2f} - {expenses:.2f})")
            else:
                print(f"❌ Σφάλμα: Αποθεματικό δεν ταιριάζει ({reserve:.2f} ≠ {payments:.2f} - {expenses:.2f})")
                
        except Exception as e:
            print(f"❌ Σφάλμα για μήνα {month}: {e}")

def test_current_month_button():
    """Test that current month functionality works"""
    print("\n🔘 Δοκιμή κουμπιού 'Τρέχων Μήνας'")
    print("=" * 40)
    
    current_month = datetime.now().strftime("%Y-%m")
    print(f"📅 Τρέχων μήνας: {current_month}")
    
    # This would be tested in the frontend, but we can verify the API works
    token = login()
    if token:
        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            params = {
                "building_id": 3,
                "month": current_month
            }
            
            response = requests.get(FINANCIAL_SUMMARY_URL, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            print(f"✅ API επιστρέφει δεδομένα για τρέχον μήνα")
            print(f"   Αποθεματικό: {float(data.get('current_reserve', 0)):.2f}€")
            
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")

def main():
    """Main test function"""
    print("🚀 Έναρξη δοκιμής μηνιαίου φιλτραρίσματος")
    print("=" * 60)
    
    # Login
    token = login()
    if not token:
        print("❌ Αδυναμία σύνδεσης. Διακοπή δοκιμής.")
        return
    
    print("✅ Επιτυχής σύνδεσης")
    
    # Test monthly filtering
    test_monthly_filtering(token)
    
    # Test current month button
    test_current_month_button()
    
    print("\n🎉 Ολοκλήρωση δοκιμής!")

if __name__ == "__main__":
    main()
