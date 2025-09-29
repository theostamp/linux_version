#!/usr/bin/env python3
"""
Test script για την επαλήθευση των μηνιαίων φίλτρων στο οικονομικό σύστημα
"""

import requests
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"
ADMIN_CREDENTIALS = {
    "username": "admin@demo.localhost",
    "password": "admin123456"
}

def login():
    """Σύνδεση ως admin"""
    try:
        login_data = {
            'email': 'admin@demo.localhost',
            'password': 'admin123456'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/users/login/", 
            json=login_data,
            headers={'Content-Type': 'application/json'}
        )
        response.raise_for_status()
        return response.json()["access"]
    except Exception as e:
        print(f"Σφάλμα σύνδεσης: {e}")
        return None

def test_monthly_filters(token):
    """Δοκιμή των μηνιαίων φίλτρων"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Δοκιμή για τον τρέχοντα μήνα
    current_month = datetime.now().strftime("%Y-%m")
    
    print(f"🔍 Δοκιμή φίλτρων για τον μήνα: {current_month}")
    print("=" * 50)
    
    # 1. Δοκιμή Financial Overview με μηνιαίο φίλτρο
    print("\n1. Δοκιμή Financial Overview...")
    try:
        params = {
            "building_id": 1,
            "period": "month",
            "month": current_month
        }
        response = requests.get(f"{BASE_URL}/api/financial/dashboard/summary/", 
                              headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        print(f"✅ Financial Overview - Τρέχον Αποθεματικό: {float(data.get('current_reserve', 0)):.2f}€")
        print(f"   Δαπάνες Μήνα: {float(data.get('total_expenses_month', 0)):.2f}€")
        print(f"   Εισπράξεις Μήνα: {float(data.get('total_payments_month', 0)):.2f}€")
    except Exception as e:
        print(f"❌ Σφάλμα Financial Overview: {e}")
    
    # 2. Δοκιμή Δαπανών με μηνιαίο φίλτρο
    print("\n2. Δοκιμή Δαπανών...")
    try:
        params = {
            "building_id": 1,
            "month": current_month
        }
        response = requests.get(f"{BASE_URL}/api/financial/expenses/", 
                              headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        expenses = data.get('results', data) if isinstance(data, dict) else data
        print(f"✅ Δαπάνες - Βρέθηκαν {len(expenses)} δαπάνες για τον μήνα")
        for expense in expenses[:3]:  # Εμφάνιση πρώτων 3
            amount = float(expense.get('amount', 0)) if expense.get('amount') else 0
            print(f"   - {expense.get('title', 'Άγνωστη')}: {amount:.2f}€")
    except Exception as e:
        print(f"❌ Σφάλμα Δαπανών: {e}")
    
    # 3. Δοκιμή Εισπράξεων με μηνιαίο φίλτρο
    print("\n3. Δοκιμή Εισπράξεων...")
    try:
        params = {
            "building_id": 1,
            "month": current_month
        }
        response = requests.get(f"{BASE_URL}/api/financial/payments/", 
                              headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        payments = data.get('results', data) if isinstance(data, dict) else data
        print(f"✅ Εισπράξεις - Βρέθηκαν {len(payments)} εισπράξεις για τον μήνα")
        for payment in payments[:3]:  # Εμφάνιση πρώτων 3
            amount = float(payment.get('amount', 0)) if payment.get('amount') else 0
            print(f"   - Διαμέρισμα {payment.get('apartment_number', 'Άγνωστο')}: {amount:.2f}€")
    except Exception as e:
        print(f"❌ Σφάλμα Εισπράξεων: {e}")
    
    # 4. Δοκιμή Ιστορικού Συναλλαγών με μηνιαίο φίλτρο
    print("\n4. Δοκιμή Ιστορικού Συναλλαγών...")
    try:
        params = {
            "building_id": 1,
            "month": current_month,
            "limit": 10
        }
        response = requests.get(f"{BASE_URL}/api/financial/reports/transaction_history/", 
                              headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        transactions = data.get('results', data) if isinstance(data, dict) else data
        print(f"✅ Ιστορικό - Βρέθηκαν {len(transactions)} συναλλαγές για τον μήνα")
        for transaction in transactions[:3]:  # Εμφάνιση πρώτων 3
            amount = float(transaction.get('amount', 0)) if transaction.get('amount') else 0
            print(f"   - {transaction.get('description', 'Άγνωστη')}: {amount:.2f}€")
    except Exception as e:
        print(f"❌ Σφάλμα Ιστορικού: {e}")
    
    # 5. Δοκιμή για διαφορετικούς μήνες
    print("\n5. Δοκιμή για διαφορετικούς μήνες...")
    test_months = [
        (datetime.now() - timedelta(days=30)).strftime("%Y-%m"),  # Προηγούμενος μήνας
        (datetime.now() - timedelta(days=60)).strftime("%Y-%m"),  # 2 μήνες πριν
    ]
    
    for test_month in test_months:
        print(f"\n   Δοκιμή για {test_month}:")
        try:
            params = {
                "building_id": 1,
                "month": test_month
            }
            response = requests.get(f"{BASE_URL}/api/financial/expenses/", 
                                  headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            expenses = data.get('results', data) if isinstance(data, dict) else data
            print(f"   ✅ Βρέθηκαν {len(expenses)} δαπάνες")
        except Exception as e:
            print(f"   ❌ Σφάλμα: {e}")

def main():
    """Κύρια συνάρτηση"""
    print("🚀 Έναρξη δοκιμής μηνιαίων φίλτρων")
    print("=" * 60)
    
    # Σύνδεση
    token = login()
    if not token:
        print("❌ Αποτυχία σύνδεσης")
        return
    
    print("✅ Επιτυχής σύνδεση")
    
    # Δοκιμή φίλτρων
    test_monthly_filters(token)
    
    print("\n" + "=" * 60)
    print("🏁 Ολοκλήρωση δοκιμής")

if __name__ == "__main__":
    main()
