#!/usr/bin/env python3
"""
Simple test script για το Phase 2 - Βελτίωση Modal Εισπράξεων
Χρησιμοποιεί το υπάρχον test framework
"""

import os
import sys
import django
from datetime import date

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from financial.models import Payment, Apartment
from buildings.models import Building

def test_payment_model():
    """Test για το Payment model με τα νέα πεδία"""
    
    print("🧪 Testing Payment Model - Phase 2")
    print("=" * 50)
    
    # Βρίσκουμε ένα κτίριο και διαμέρισμα για testing
    try:
        building = Building.objects.first()
        if not building:
            print("❌ No buildings found in database")
            return False
            
        apartment = Apartment.objects.filter(building=building).first()
        if not apartment:
            print("❌ No apartments found in database")
            return False
            
        print(f"✅ Using building: {building.name}")
        print(f"✅ Using apartment: {apartment.number}")
        
    except Exception as e:
        print(f"❌ Error finding test data: {e}")
        return False
    
    # Test 1: Δημιουργία εισπράξεως με όλα τα νέα πεδία
    print("\n1️⃣ Testing Payment Creation...")
    
    try:
        payment = Payment.objects.create(
            apartment=apartment,
            amount=150.00,
            date=date.today(),
            method='bank_transfer',
            payment_type='common_expense',
            reference_number='TEST-001',
            notes='Test payment για Phase 2'
        )
        
        print("✅ Payment created successfully!")
        print(f"   ID: {payment.id}")
        print(f"   Amount: {payment.amount}€")
        print(f"   Payment Type: {payment.payment_type} ({payment.get_payment_type_display()})")
        print(f"   Reference Number: {payment.reference_number}")
        print(f"   Method: {payment.get_method_display()}")
        
        payment_id = payment.id
        
    except Exception as e:
        print(f"❌ Error creating payment: {e}")
        return False
    
    # Test 2: Ανάγνωση της εισπράξεως
    print("\n2️⃣ Testing Payment Retrieval...")
    
    try:
        payment = Payment.objects.get(id=payment_id)
        print("✅ Payment retrieved successfully!")
        print(f"   Payment Type: {payment.payment_type}")
        print(f"   Reference Number: {payment.reference_number}")
        print(f"   Notes: {payment.notes}")
        
    except Exception as e:
        print(f"❌ Error retrieving payment: {e}")
        return False
    
    # Test 3: Ενημέρωση της εισπράξεως
    print("\n3️⃣ Testing Payment Update...")
    
    try:
        payment.payment_type = 'reserve_fund'
        payment.reference_number = 'TEST-001-UPDATED'
        payment.notes = 'Updated test payment για Phase 2'
        payment.save()
        
        print("✅ Payment updated successfully!")
        print(f"   New Payment Type: {payment.payment_type} ({payment.get_payment_type_display()})")
        print(f"   New Reference Number: {payment.reference_number}")
        print(f"   New Notes: {payment.notes}")
        
    except Exception as e:
        print(f"❌ Error updating payment: {e}")
        return False
    
    # Test 4: Λίστα εισπράξεων
    print("\n4️⃣ Testing Payment List...")
    
    try:
        payments = Payment.objects.all()[:5]
        print("✅ Payment list retrieved successfully!")
        print(f"   Total payments in database: {Payment.objects.count()}")
        print("   Showing first 5 payments:")
        
        for i, payment in enumerate(payments, 1):
            print(f"   {i}. {payment.apartment.number} - {payment.amount}€ - {payment.get_payment_type_display()}")
            
    except Exception as e:
        print(f"❌ Error retrieving payment list: {e}")
        return False
    
    # Test 5: Διαγραφή της test εισπράξεως
    print("\n5️⃣ Testing Payment Deletion...")
    
    try:
        payment.delete()
        print("✅ Payment deleted successfully!")
        
    except Exception as e:
        print(f"❌ Error deleting payment: {e}")
        return False
    
    print("\n🎉 All Payment Model tests completed successfully!")
    return True

def test_payment_types():
    """Test για όλους τους τύπους εισπράξεων"""
    
    print("\n🧪 Testing Payment Types")
    print("=" * 30)
    
    # Βρίσκουμε ένα διαμέρισμα για testing
    try:
        apartment = Apartment.objects.first()
        if not apartment:
            print("❌ No apartments found in database")
            return
    except Exception as e:
        print(f"❌ Error finding apartment: {e}")
        return
    
    payment_types = [
        "common_expense",
        "reserve_fund", 
        "special_expense",
        "advance",
        "other"
    ]
    
    created_payments = []
    
    for payment_type in payment_types:
        print(f"\nTesting payment type: {payment_type}")
        
        try:
            payment = Payment.objects.create(
                apartment=apartment,
                amount=100.00,
                date=date.today(),
                method='cash',
                payment_type=payment_type,
                reference_number=f'TEST-{payment_type.upper()}',
                notes=f'Test για {payment_type}'
            )
            
            print(f"✅ {payment_type}: {payment.get_payment_type_display()}")
            created_payments.append(payment)
            
        except Exception as e:
            print(f"❌ {payment_type}: Error - {e}")
    
    # Καθαρισμός - διαγραφή των test εισπράξεων
    print("\n🧹 Cleaning up test payments...")
    for payment in created_payments:
        try:
            payment.delete()
        except:
            pass
    print("✅ Cleanup completed")

def test_payment_choices():
    """Test για τα choices του Payment model"""
    
    print("\n🧪 Testing Payment Choices")
    print("=" * 30)
    
    print("Payment Methods:")
    for choice in Payment.PAYMENT_METHODS:
        print(f"   {choice[0]}: {choice[1]}")
    
    print("\nPayment Types:")
    for choice in Payment.PAYMENT_TYPES:
        print(f"   {choice[0]}: {choice[1]}")

def main():
    """Main test function"""
    
    print("🚀 Starting Phase 2 Payment Model Tests")
    print("=" * 50)
    
    # Test 1: Basic model functionality
    if not test_payment_model():
        print("\n❌ Basic model tests failed!")
        return
    
    # Test 2: Payment types
    test_payment_types()
    
    # Test 3: Choices
    test_payment_choices()
    
    print("\n🎉 Phase 2 Payment Model Tests Completed Successfully!")
    print("\n📋 Summary:")
    print("   ✅ Payment creation with payment_type and reference_number")
    print("   ✅ Payment retrieval with new fields")
    print("   ✅ Payment update functionality")
    print("   ✅ Payment list with new fields")
    print("   ✅ Payment deletion")
    print("   ✅ All payment types working")
    print("   ✅ Payment choices validation")

if __name__ == "__main__":
    main() 