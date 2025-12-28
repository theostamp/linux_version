#!/usr/bin/env python3
"""
Test script για το office logo upload functionality
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from users.models import CustomUser

def test_office_logo_field():
    """Test ότι το office_logo field προστέθηκε σωστά"""
    print("🔍 Testing office_logo field...")
    
    with schema_context('demo'):
        # Βρες τον πρώτο χρήστη
        user = CustomUser.objects.first()
        if not user:
            print("❌ Δεν βρέθηκε χρήστης για testing")
            return False
        
        print(f"✅ Βρέθηκε χρήστης: {user.email}")
        print(f"   Office Name: {user.office_name}")
        print(f"   Office Phone: {user.office_phone}")
        print(f"   Office Address: {user.office_address}")
        print(f"   Office Logo: {user.office_logo}")
        
        # Έλεγχος ότι το πεδίο υπάρχει
        if hasattr(user, 'office_logo'):
            print("✅ Το office_logo field υπάρχει στο model")
        else:
            print("❌ Το office_logo field δεν υπάρχει")
            return False
        
        return True

def test_office_logo_upload_path():
    """Test το upload path για το logo"""
    print("\n🔍 Testing upload path...")
    
    with schema_context('demo'):
        user = CustomUser.objects.first()
        if not user:
            print("❌ Δεν βρέθηκε χρήστης")
            return False
        
        # Δημιουργία ενός dummy logo path
        from django.core.files.base import ContentFile
        dummy_content = b"dummy logo content"
        dummy_file = ContentFile(dummy_content, name="test_logo.png")
        
        # Δοκιμή αποθήκευσης
        user.office_logo.save("test_logo.png", dummy_file, save=True)
        
        print(f"✅ Logo αποθηκεύτηκε: {user.office_logo}")
        print(f"   Path: {user.office_logo.path}")
        print(f"   URL: {user.office_logo.url}")
        
        # Καθαρισμός
        if user.office_logo:
            user.office_logo.delete(save=True)
            print("✅ Test logo διαγράφηκε")
        
        return True

def test_serializer_fields():
    """Test ότι τα serializers περιλαμβάνουν το logo field"""
    print("\n🔍 Testing serializer fields...")
    
    from users.serializers import OfficeDetailsSerializer, UserSerializer
    
    # Test OfficeDetailsSerializer
    office_serializer = OfficeDetailsSerializer()
    office_fields = list(office_serializer.fields.keys())
    print(f"OfficeDetailsSerializer fields: {office_fields}")
    
    if 'office_logo' in office_fields:
        print("✅ Το office_logo περιλαμβάνεται στο OfficeDetailsSerializer")
    else:
        print("❌ Το office_logo δεν περιλαμβάνεται στο OfficeDetailsSerializer")
        return False
    
    # Test UserSerializer
    user_serializer = UserSerializer()
    user_fields = list(user_serializer.fields.keys())
    print(f"UserSerializer fields: {user_fields}")
    
    if 'office_logo' in user_fields:
        print("✅ Το office_logo περιλαμβάνεται στο UserSerializer")
    else:
        print("❌ Το office_logo δεν περιλαμβάνεται στο UserSerializer")
        return False
    
    return True

def main():
    """Main test function"""
    print("🚀 Starting office logo upload tests...\n")
    
    tests = [
        test_office_logo_field,
        test_office_logo_upload_path,
        test_serializer_fields,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
                print("✅ Test passed\n")
            else:
                print("❌ Test failed\n")
        except Exception as e:
            print(f"❌ Test failed with error: {e}\n")
    
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Office logo upload is ready.")
    else:
        print("⚠️  Some tests failed. Please check the implementation.")

if __name__ == "__main__":
    main()
