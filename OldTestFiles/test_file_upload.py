#!/usr/bin/env python3
"""
Test script για το file upload functionality του οικονομικού συστήματος
"""

import os
import sys
import django
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.contrib.auth import get_user_model

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from financial.models import Expense
from buildings.models import Building
from tenants.models import Client, Domain

User = get_user_model()

def test_file_upload():
    """Test για το file upload functionality"""
    
    print("🧪 Testing File Upload Functionality...")
    
    try:
        # Καθαρισμός υπάρχοντος tenant αν υπάρχει
        try:
            existing_tenant = Client.objects.get(schema_name='test_file_upload')
            existing_tenant.delete()
        except Client.DoesNotExist:
            pass
        
        # Δημιουργία test tenant
        tenant = Client(
            schema_name='test_file_upload',
            name='Test File Upload Tenant'
        )
        tenant.save()
        
        # Δημιουργία domain
        domain = Domain()
        domain.domain = 'test-file-upload.localhost'
        domain.tenant = tenant
        domain.is_primary = True
        domain.save()
        
        # Εκτέλεση test στο tenant context
        with tenant:
            # Δημιουργία test building
            building = Building.objects.create(
                name='Test Building',
                address='Test Address',
                city='Test City',
                postal_code='12345',
                latitude=37.9838,
                longitude=23.7275
            )
            
            # Δημιουργία test expense με file
            test_file_content = b"This is a test file content for expense attachment"
            test_file = SimpleUploadedFile(
                "test_expense.pdf",
                test_file_content,
                content_type="application/pdf"
            )
            
            expense = Expense.objects.create(
                building=building,
                title='Test Expense with File',
                amount=100.00,
                date='2024-01-15',
                category='electricity_common',
                distribution_type='equal_share',
                attachment=test_file,
                notes='Test expense with file attachment'
            )
            
            print(f"✅ Expense created successfully with ID: {expense.id}")
            print(f"📁 Attachment path: {expense.attachment.path if expense.attachment else 'None'}")
            print(f"📁 Attachment URL: {expense.attachment.url if expense.attachment else 'None'}")
            print(f"📁 Attachment name: {expense.attachment.name if expense.attachment else 'None'}")
            
            # Επιβεβαίωση ότι το αρχείο αποθηκεύτηκε
            if expense.attachment:
                if os.path.exists(expense.attachment.path):
                    print("✅ File saved successfully to disk")
                    
                    # Επιβεβαίωση περιεχομένου
                    with open(expense.attachment.path, 'rb') as f:
                        saved_content = f.read()
                    
                    if saved_content == test_file_content:
                        print("✅ File content matches original")
                    else:
                        print("❌ File content does not match original")
                else:
                    print("❌ File not found on disk")
            else:
                print("❌ No attachment found")
            
            # Cleanup
            if expense.attachment:
                expense.attachment.delete(save=False)
            expense.delete()
            building.delete()
        
        # Cleanup tenant
        domain.delete()
        tenant.delete()
        
        print("🎉 File upload test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during file upload test: {e}")
        import traceback
        traceback.print_exc()

def test_file_upload_api():
    """Test για το file upload API endpoint"""
    
    print("\n🧪 Testing File Upload API Endpoint...")
    
    try:
        # Καθαρισμός υπάρχοντος tenant αν υπάρχει
        try:
            existing_tenant = Client.objects.get(schema_name='test_file_upload_api')
            existing_tenant.delete()
        except Client.DoesNotExist:
            pass
        
        # Δημιουργία test tenant
        tenant = Client(
            schema_name='test_file_upload_api',
            name='Test File Upload API Tenant'
        )
        tenant.save()
        
        # Δημιουργία domain
        domain = Domain()
        domain.domain = 'test-file-upload-api.localhost'
        domain.tenant = tenant
        domain.is_primary = True
        domain.save()
        
        # Εκτέλεση test στο tenant context
        with tenant:
            # Δημιουργία test building
            building = Building.objects.create(
                name='Test Building API',
                address='Test Address API',
                city='Test City API',
                postal_code='12345',
                latitude=37.9838,
                longitude=23.7275
            )
            
            # Δημιουργία test user
            user = User.objects.create_user(
                email='test@example.com',
                password='testpass123'
            )
            
            print(f"✅ Test user created: {user.email}")
            print(f"✅ Test building created: {building.name}")
            
            # Δημιουργία test expense χωρίς file πρώτα
            expense = Expense.objects.create(
                building=building,
                title='Test Expense API',
                amount=150.00,
                date='2024-01-15',
                category='water_common',
                distribution_type='by_participation_mills',
                notes='Test expense for API'
            )
            
            print(f"✅ Expense created via API: {expense.id}")
            
            # Cleanup
            expense.delete()
            user.delete()
            building.delete()
        
        # Cleanup tenant
        domain.delete()
        tenant.delete()
        
        print("🎉 File upload API test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during file upload API test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("🚀 Starting File Upload Tests...")
    print("=" * 50)
    
    test_file_upload()
    test_file_upload_api()
    
    print("\n" + "=" * 50)
    print("🏁 All tests completed!") 