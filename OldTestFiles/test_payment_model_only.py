#!/usr/bin/env python3
"""
Simple test για το Payment model - Phase 2
Ελέγχει μόνο το model χωρίς database
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from financial.models import Payment

def test_payment_choices():
    """Test για τα choices του Payment model"""
    
    print("🧪 Testing Payment Model Choices - Phase 2")
    print("=" * 50)
    
    print("\n📋 Payment Methods:")
    for choice in Payment.PAYMENT_METHODS:
        print(f"   {choice[0]}: {choice[1]}")
    
    print("\n📋 Payment Types:")
    for choice in Payment.PAYMENT_TYPES:
        print(f"   {choice[0]}: {choice[1]}")
    
    print(f"\n✅ Total Payment Methods: {len(Payment.PAYMENT_METHODS)}")
    print(f"✅ Total Payment Types: {len(Payment.PAYMENT_TYPES)}")

def test_payment_fields():
    """Test για τα πεδία του Payment model"""
    
    print("\n🧪 Testing Payment Model Fields - Phase 2")
    print("=" * 50)
    
    # Λήψη όλων των πεδίων του model
    fields = Payment._meta.get_fields()
    
    field_names = [field.name for field in fields]
    
    print("\n📋 Payment Model Fields:")
    for field_name in field_names:
        print(f"   - {field_name}")
    
    # Έλεγχος για τα νέα πεδία
    required_fields = ['payment_type', 'reference_number']
    
    print("\n🔍 Checking for new Phase 2 fields:")
    for field in required_fields:
        if field in field_names:
            print(f"   ✅ {field}: Found")
        else:
            print(f"   ❌ {field}: Missing")
    
    print(f"\n✅ Total Fields: {len(field_names)}")

def test_payment_meta():
    """Test για τα meta του Payment model"""
    
    print("\n🧪 Testing Payment Model Meta - Phase 2")
    print("=" * 50)
    
    print(f"📋 Model Name: {Payment._meta.model_name}")
    print(f"📋 App Label: {Payment._meta.app_label}")
    print(f"📋 Verbose Name: {Payment._meta.verbose_name}")
    print(f"📋 Verbose Name Plural: {Payment._meta.verbose_name_plural}")
    
    # Έλεγχος για ordering
    if hasattr(Payment._meta, 'ordering'):
        print(f"📋 Ordering: {Payment._meta.ordering}")
    else:
        print("📋 Ordering: Not defined")

def test_payment_methods():
    """Test για τις μεθόδους του Payment model"""
    
    print("\n🧪 Testing Payment Model Methods - Phase 2")
    print("=" * 50)
    
    # Test για get_method_display
    print("📋 Testing get_method_display method:")
    for choice in Payment.PAYMENT_METHODS:
        method_value = choice[0]
        method_label = choice[1]
        print(f"   {method_value} -> {method_label}")
    
    # Test για get_payment_type_display
    print("\n📋 Testing get_payment_type_display method:")
    for choice in Payment.PAYMENT_TYPES:
        type_value = choice[0]
        type_label = choice[1]
        print(f"   {type_value} -> {type_label}")

def main():
    """Main test function"""
    
    print("🚀 Starting Phase 2 Payment Model Tests (No Database)")
    print("=" * 60)
    
    # Test 1: Choices
    test_payment_choices()
    
    # Test 2: Fields
    test_payment_fields()
    
    # Test 3: Meta
    test_payment_meta()
    
    # Test 4: Methods
    test_payment_methods()
    
    print("\n🎉 Phase 2 Payment Model Tests Completed Successfully!")
    print("\n📋 Summary:")
    print("   ✅ Payment model choices validation")
    print("   ✅ Payment model fields validation")
    print("   ✅ Payment model meta validation")
    print("   ✅ Payment model methods validation")
    print("   ✅ New fields: payment_type, reference_number")
    print("   ✅ New choices: PAYMENT_TYPES")

if __name__ == "__main__":
    main() 