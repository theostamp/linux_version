#!/usr/bin/env python3
"""
Test tenant API call with detailed error reporting
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
from rest_framework.response import Response

def test_apartment_api_detailed():
    """Test apartment transaction API with detailed error reporting"""
    print("🔍 Testing Apartment Transaction API (Detailed)...")
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
                print(f"   Response status: {response.status_code}")
                print(f"   Response data type: {type(response.data)}")
                
                if isinstance(response.data, dict):
                    print("   Response data keys:", list(response.data.keys()))
                    if 'error' in response.data:
                        print(f"   ❌ Error response: {response.data['error']}")
                    else:
                        print("   Response data:", response.data)
                elif isinstance(response.data, list):
                    print(f"   Response data length: {len(response.data)}")
                    if len(response.data) > 0:
                        print("   Sample transaction data:")
                        for i, item in enumerate(response.data[:3]):
                            print(f"     {i+1}. {item}")
                else:
                    print("   Unexpected response data format")
                    
                return response.status_code == 200
                
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

def test_direct_database_access():
    """Test direct database access in demo schema"""
    print("\n3. Testing direct database access...")
    
    with schema_context('demo'):
        from financial.models import Payment, Transaction
        
        try:
            # Test apartment lookup
            apartment = Apartment.objects.get(id=14)
            print(f"   ✅ Apartment 14: {apartment.number}")
            
            # Test payments
            payments = Payment.objects.filter(apartment=apartment)
            print(f"   Payments for apartment 14: {payments.count()}")
            
            # Test transactions  
            transactions = Transaction.objects.filter(apartment=apartment)
            print(f"   Transactions for apartment 14: {transactions.count()}")
            
            if payments.count() > 0:
                print("   Sample payments:")
                for payment in payments[:3]:
                    print(f"     - Payment {payment.id}: {payment.amount} on {payment.date}")
            
            if transactions.count() > 0:
                print("   Sample transactions:")
                for transaction in transactions[:3]:
                    print(f"     - Transaction {transaction.id}: {transaction.amount} on {transaction.date}")
            
            return True
            
        except Exception as e:
            print(f"   ❌ Database access failed: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == '__main__':
    test_direct_database_access()
    test_apartment_api_detailed()
