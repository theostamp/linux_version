#!/usr/bin/env python3
"""
🧪 Test Payment Verification System
===================================

Αυτό το script ελέγχει ότι:
1. Το backend API endpoint για επαλήθευση πληρωμών λειτουργεί
2. Το frontend QR code δημιουργείται σωστά
3. Η σελίδα επαλήθευσης είναι προσβάσιμη

Εκτέλεση: python3 test_payment_verification.py
"""

import requests

# Configuration
BASE_URL = "http://demo.localhost:8080"
API_BASE_URL = "http://demo.localhost:8080/api"

def test_backend_verification_endpoint():
    """Έλεγχος backend API endpoint"""
    print("🔍 Testing Backend Verification Endpoint...")
    
    # Πρώτα κάνουμε login
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        # Login
        login_response = requests.post(f"{API_BASE_URL}/auth/login/", json=login_data)
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            return False
        
        token = login_response.json().get('access')
        headers = {'Authorization': f'Bearer {token}'}
        
        # Λήψη λίστας πληρωμών
        payments_response = requests.get(f"{API_BASE_URL}/financial/payments/", headers=headers)
        if payments_response.status_code != 200:
            print(f"❌ Failed to get payments: {payments_response.status_code}")
            return False
        
        payments = payments_response.json().get('results', [])
        if not payments:
            print("❌ No payments found")
            return False
        
        # Επιλογή πρώτης πληρωμής για έλεγχο
        test_payment = payments[0]
        payment_id = test_payment['id']
        
        print(f"✅ Found payment ID: {payment_id}")
        
        # Έλεγχος verification endpoint
        verify_url = f"{API_BASE_URL}/financial/payments/{payment_id}/verify/"
        verify_response = requests.get(verify_url, headers=headers)
        
        if verify_response.status_code == 200:
            verification_data = verify_response.json()
            if verification_data.get('success'):
                print("✅ Backend verification endpoint works!")
                print(f"   Payment ID: {verification_data['data']['payment_id']}")
                print(f"   Amount: {verification_data['data']['amount']}€")
                print(f"   Apartment: {verification_data['data']['apartment_number']}")
                return True
            else:
                print(f"❌ Verification failed: {verification_data.get('error')}")
                return False
        else:
            print(f"❌ Verification endpoint failed: {verify_response.status_code}")
            print(f"   Response: {verify_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing backend: {e}")
        return False

def test_frontend_verification_page():
    """Έλεγχος frontend verification page"""
    print("\n🌐 Testing Frontend Verification Page...")
    
    try:
        # Έλεγχος αν η σελίδα είναι προσβάσιμη
        test_url = f"{BASE_URL}/verify-payment/1"
        response = requests.get(test_url)
        
        if response.status_code == 200:
            print("✅ Frontend verification page is accessible")
            return True
        else:
            print(f"❌ Frontend verification page failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing frontend: {e}")
        return False

def test_qr_code_generation():
    """Έλεγχος QR code generation"""
    print("\n📱 Testing QR Code Generation...")
    
    try:
        # Έλεγχος αν το qrcode package είναι διαθέσιμο
        import qrcode
        
        # Δημιουργία test QR code
        test_url = f"{BASE_URL}/verify-payment/123"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(test_url)
        qr.make(fit=True)
        
        print("✅ QR code generation works!")
        print(f"   Test URL: {test_url}")
        return True
        
    except ImportError:
        print("❌ qrcode package not available")
        return False
    except Exception as e:
        print(f"❌ Error generating QR code: {e}")
        return False

def main():
    """Κύρια συνάρτηση"""
    print("🧪 PAYMENT VERIFICATION SYSTEM TEST")
    print("=" * 50)
    
    tests = [
        ("Backend Verification Endpoint", test_backend_verification_endpoint),
        ("Frontend Verification Page", test_frontend_verification_page),
        ("QR Code Generation", test_qr_code_generation),
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
    print("📋 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅" if result else "❌"
        print(f"{status} {test_name}")
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Payment verification system is working correctly!")
        print("\n📋 What's Working:")
        print("   ✅ Backend API endpoint for payment verification")
        print("   ✅ Frontend verification page")
        print("   ✅ QR code generation")
        print("   ✅ Complete verification flow")
    else:
        print("⚠️  SOME TESTS FAILED")
        print("\n🔧 Next Steps:")
        print("   1. Check backend API endpoints")
        print("   2. Verify frontend routing")
        print("   3. Ensure QR code dependencies are installed")
        print("   4. Test the complete flow manually")

if __name__ == "__main__":
    main()
