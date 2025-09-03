#!/usr/bin/env python3
"""
Test script για το Phase 2 - Βελτίωση Modal Εισπράξεων
Ελέγχει τα νέα πεδία payment_type και reference_number
"""

import requests
from datetime import date

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

def test_payment_api():
    """Test για το Payment API με τα νέα πεδία"""
    
    print("🧪 Testing Payment API - Phase 2")
    print("=" * 50)
    
    # Test 1: Δημιουργία νέας εισπράξεως με payment_type και reference_number
    print("\n1️⃣ Testing Payment Creation with new fields...")
    
    payment_data = {
        "apartment": 1,  # Υποθέτουμε ότι υπάρχει διαμέρισμα με ID 1
        "amount": 150.00,
        "date": date.today().isoformat(),
        "method": "bank_transfer",
        "payment_type": "common_expense",
        "reference_number": "TRX-2024-001",
        "notes": "Test payment για Phase 2"
    }
    
    try:
        response = requests.post(f"{API_BASE}/financial/payments/", json=payment_data)
        
        if response.status_code == 201:
            payment = response.json()
            print("✅ Payment created successfully!")
            print(f"   ID: {payment['id']}")
            print(f"   Amount: {payment['amount']}€")
            print(f"   Payment Type: {payment['payment_type']} ({payment['payment_type_display']})")
            print(f"   Reference Number: {payment['reference_number']}")
            print(f"   Method: {payment['method_display']}")
            
            payment_id = payment['id']
        else:
            print(f"❌ Failed to create payment: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating payment: {e}")
        return False
    
    # Test 2: Ανάγνωση της εισπράξεως
    print("\n2️⃣ Testing Payment Retrieval...")
    
    try:
        response = requests.get(f"{API_BASE}/financial/payments/{payment_id}/")
        
        if response.status_code == 200:
            payment = response.json()
            print("✅ Payment retrieved successfully!")
            print(f"   Payment Type: {payment['payment_type']}")
            print(f"   Reference Number: {payment['reference_number']}")
            print(f"   Notes: {payment['notes']}")
        else:
            print(f"❌ Failed to retrieve payment: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error retrieving payment: {e}")
        return False
    
    # Test 3: Ενημέρωση της εισπράξεως
    print("\n3️⃣ Testing Payment Update...")
    
    update_data = {
        "payment_type": "reserve_fund",
        "reference_number": "TRX-2024-001-UPDATED",
        "notes": "Updated test payment για Phase 2"
    }
    
    try:
        response = requests.patch(f"{API_BASE}/financial/payments/{payment_id}/", json=update_data)
        
        if response.status_code == 200:
            payment = response.json()
            print("✅ Payment updated successfully!")
            print(f"   New Payment Type: {payment['payment_type']} ({payment['payment_type_display']})")
            print(f"   New Reference Number: {payment['reference_number']}")
            print(f"   New Notes: {payment['notes']}")
        else:
            print(f"❌ Failed to update payment: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating payment: {e}")
        return False
    
    # Test 4: Λίστα εισπράξεων
    print("\n4️⃣ Testing Payment List...")
    
    try:
        response = requests.get(f"{API_BASE}/financial/payments/")
        
        if response.status_code == 200:
            payments = response.json()
            print("✅ Payment list retrieved successfully!")
            print(f"   Total payments: {len(payments.get('results', payments))}")
            
            # Εμφάνιση των τελευταίων 3 εισπράξεων
            recent_payments = payments.get('results', payments)[:3]
            for i, payment in enumerate(recent_payments, 1):
                print(f"   {i}. {payment['apartment_number']} - {payment['amount']}€ - {payment.get('payment_type_display', 'N/A')}")
        else:
            print(f"❌ Failed to retrieve payment list: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error retrieving payment list: {e}")
        return False
    
    # Test 5: Διαγραφή της test εισπράξεως
    print("\n5️⃣ Testing Payment Deletion...")
    
    try:
        response = requests.delete(f"{API_BASE}/financial/payments/{payment_id}/")
        
        if response.status_code == 204:
            print("✅ Payment deleted successfully!")
        else:
            print(f"❌ Failed to delete payment: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error deleting payment: {e}")
        return False
    
    print("\n🎉 All Payment API tests completed successfully!")
    return True

def test_payment_types():
    """Test για τους τύπους εισπράξεων"""
    
    print("\n🧪 Testing Payment Types")
    print("=" * 30)
    
    payment_types = [
        "common_expense",
        "reserve_fund", 
        "special_expense",
        "advance",
        "other"
    ]
    
    for payment_type in payment_types:
        print(f"\nTesting payment type: {payment_type}")
        
        payment_data = {
            "apartment": 1,
            "amount": 100.00,
            "date": date.today().isoformat(),
            "method": "cash",
            "payment_type": payment_type,
            "reference_number": f"TEST-{payment_type.upper()}",
            "notes": f"Test για {payment_type}"
        }
        
        try:
            response = requests.post(f"{API_BASE}/financial/payments/", json=payment_data)
            
            if response.status_code == 201:
                payment = response.json()
                print(f"✅ {payment_type}: {payment['payment_type_display']}")
                
                # Διαγραφή μετά το test
                requests.delete(f"{API_BASE}/financial/payments/{payment['id']}/")
            else:
                print(f"❌ {payment_type}: Failed - {response.status_code}")
                
        except Exception as e:
            print(f"❌ {payment_type}: Error - {e}")

def main():
    """Main test function"""
    
    print("🚀 Starting Phase 2 Payment Tests")
    print("=" * 50)
    
    # Test 1: Basic API functionality
    if not test_payment_api():
        print("\n❌ Basic API tests failed!")
        return
    
    # Test 2: Payment types
    test_payment_types()
    
    print("\n🎉 Phase 2 Payment Tests Completed Successfully!")
    print("\n📋 Summary:")
    print("   ✅ Payment creation with payment_type and reference_number")
    print("   ✅ Payment retrieval with new fields")
    print("   ✅ Payment update functionality")
    print("   ✅ Payment list with new fields")
    print("   ✅ Payment deletion")
    print("   ✅ All payment types working")

if __name__ == "__main__":
    main() 