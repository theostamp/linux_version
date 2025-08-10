#!/usr/bin/env python3
"""
Test tenant API call directly to apartment transactions
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.test import RequestFactory
from django.http import HttpRequest
from financial.views import ApartmentTransactionViewSet
from apartments.models import Apartment
from django_tenants.utils import schema_context
from tenants.models import Client

def test_apartment_api():
    """Test apartment transaction API with proper tenant context"""
    print("🔍 Testing Apartment Transaction API...")
    print("=" * 50)
    
    try:
        # Get demo tenant
        demo_client = Client.objects.get(schema_name='demo')
        print(f"Demo tenant found: {demo_client.name}")
        
        # Test with proper tenant context
        with schema_context('demo'):
            print("\n1. Testing within demo schema context...")
            
            # Check if apartment 14 exists in demo schema
            try:
                apartment = Apartment.objects.get(id=14)
                print(f"   ✅ Apartment 14 found: {apartment.number} in building {apartment.building.name}")
            except Apartment.DoesNotExist:
                print("   ❌ Apartment 14 not found in demo schema")
                return False
            
            # Test the ViewSet directly
            print("\n2. Testing ApartmentTransactionViewSet...")
            
            # Create a mock request
            factory = RequestFactory()
            request = factory.get('/api/financial/apartments/14/transactions/')
            request.META['HTTP_HOST'] = 'demo.localhost:8000'
            
            # Create viewset instance
            viewset = ApartmentTransactionViewSet()
            viewset.request = request
            
            # Test the list method
            try:
                response = viewset.list(request, apartment_id=14)
                print(f"   ✅ ViewSet response status: {response.status_code}")
                print(f"   Response data type: {type(response.data)}")
                print(f"   Response data length: {len(response.data) if hasattr(response.data, '__len__') else 'N/A'}")
                
                if response.data and len(response.data) > 0:
                    print("   Sample transaction data:")
                    for i, item in enumerate(response.data[:3]):
                        print(f"     {i+1}. {item.get('type')}: {item.get('amount')} on {item.get('date')}")
                else:
                    print("   No transaction data returned")
                    
                return True
                
            except Exception as e:
                print(f"   ❌ ViewSet test failed: {e}")
                import traceback
                traceback.print_exc()
                return False
    
    except Exception as e:
        print(f"❌ Error during tenant API test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_current_schema():
    """Test what schema Django is currently using"""
    print("\n3. Testing current schema...")
    from django.db import connection
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_schema()")
        current_schema = cursor.fetchone()[0]
        print(f"   Current schema: {current_schema}")
        
        # Check if apartments table exists in current schema
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = current_schema()
                AND table_name = 'apartments_apartment'
            );
        """)
        table_exists = cursor.fetchone()[0]
        print(f"   apartments_apartment table exists in current schema: {table_exists}")

if __name__ == '__main__':
    test_current_schema()
    test_apartment_api()
