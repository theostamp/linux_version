#!/usr/bin/env python3
"""
🔍 Debug Payment Form Success Message
====================================

Αυτό το script ελέγχει γιατί δεν εμφανίζεται το success message με το κουμπί εκτύπωσης.
"""

import requests
import json

# Configuration
BASE_URL = "http://demo.localhost:8080"
API_BASE_URL = "http://localhost:8000/api"

def test_payment_creation():
    """Έλεγχος δημιουργίας πληρωμής"""
    print("🔍 Testing Payment Creation...")
    
    # Πρώτα κάνουμε login
    login_data = {
        "email": "admin@demo.localhost",
        "password": "admin123456"
    }
    
    try:
        # Login
        login_response = requests.post(f"{API_BASE_URL}/users/login/", json=login_data)
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            return False
        
        token = login_response.json().get('access')
        headers = {'Authorization': f'Bearer {token}'}
        
        print("✅ Login successful")
        
        # Δημιουργία test πληρωμής
        payment_data = {
            "apartment": 1,  # Υποθέτουμε ότι υπάρχει διαμέρισμα με ID 1
            "amount": 100.00,
            "date": "2025-08-10",
            "method": "cash",
            "payment_type": "common_expense",
            "payer_type": "owner",
            "payer_name": "Test Payer",
            "notes": "Test payment for debugging"
        }
        
        print(f"📤 Sending payment data: {payment_data}")
        
        # Δημιουργία πληρωμής
        payment_response = requests.post(
            f"{API_BASE_URL}/financial/payments/", 
            json=payment_data, 
            headers=headers
        )
        
        print(f"📊 Payment creation response status: {payment_response.status_code}")
        print(f"📊 Response headers: {dict(payment_response.headers)}")
        
        if payment_response.status_code == 201:
            payment = payment_response.json()
            print(f"✅ Payment created successfully!")
            print(f"   Payment ID: {payment.get('id')}")
            print(f"   Amount: {payment.get('amount')}€")
            print(f"   Apartment: {payment.get('apartment')}")
            print(f"   Method: {payment.get('method')}")
            return True
        else:
            print(f"❌ Payment creation failed")
            print(f"   Response: {payment_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing payment creation: {e}")
        return False

def test_frontend_page():
    """Έλεγχος frontend σελίδας"""
    print("\n🌐 Testing Frontend Page...")
    
    try:
        # Έλεγχος αν η σελίδα financial είναι προσβάσιμη
        response = requests.get(f"{BASE_URL}/financial")
        
        if response.status_code == 200:
            print("✅ Frontend financial page is accessible")
            return True
        else:
            print(f"❌ Frontend page failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing frontend: {e}")
        return False

def check_payment_form_component():
    """Έλεγχος PaymentForm component"""
    print("\n🔧 Checking PaymentForm Component...")
    
    try:
        import os
        
        # Έλεγχος αν το PaymentForm component υπάρχει
        payment_form_path = "frontend/components/financial/PaymentForm.tsx"
        
        if os.path.exists(payment_form_path):
            with open(payment_form_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Έλεγχος για τα βασικά elements
            checks = [
                ("createdPayment state", "const [createdPayment, setCreatedPayment]"),
                ("success message", "Επιτυχής Καταχώρηση"),
                ("print button", "🖨️ Εκτύπωση Απόδειξης"),
                ("handlePrintReceipt", "handlePrintReceipt"),
                ("onSubmit function", "const onSubmit = async"),
                ("setCreatedPayment", "setCreatedPayment(payment)"),
            ]
            
            for check_name, search_term in checks:
                if search_term in content:
                    print(f"✅ {check_name}: Found")
                else:
                    print(f"❌ {check_name}: Missing")
                    
            return True
        else:
            print("❌ PaymentForm component not found")
            return False
            
    except Exception as e:
        print(f"❌ Error checking PaymentForm: {e}")
        return False

def main():
    """Κύρια συνάρτηση"""
    print("🔍 PAYMENT FORM DEBUG")
    print("=" * 50)
    
    tests = [
        ("Payment Creation", test_payment_creation),
        ("Frontend Page", test_frontend_page),
        ("PaymentForm Component", check_payment_form_component),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Error in {test_name}: {e}")
            results.append((test_name, False))
    
    # Τελική σύνοψη
    print("\n" + "=" * 50)
    print("📋 DEBUG SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅" if result else "❌"
        print(f"{status} {test_name}")
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All components are working!")
        print("\n🔍 Possible issues:")
        print("   1. Check browser console for JavaScript errors")
        print("   2. Verify that the form is being submitted correctly")
        print("   3. Check if the payment is actually being created")
        print("   4. Verify that setCreatedPayment is being called")
    else:
        print("⚠️  Some issues found")
        print("\n🔧 Next Steps:")
        print("   1. Fix backend payment creation if failing")
        print("   2. Check frontend routing")
        print("   3. Verify PaymentForm component structure")
        print("   4. Test manually in browser")

if __name__ == "__main__":
    main()
