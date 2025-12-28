#!/usr/bin/env python3
"""
Test script to verify payment creation via API endpoint
"""

import os
import sys
import django
import requests
import json
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
from financial.models import Payment, Transaction

def test_api_payment_creation():
    """Test payment creation via API endpoint"""
    
    with schema_context('demo'):
        try:
            # Get first apartment
            apartment = Apartment.objects.first()
            if not apartment:
                print("❌ No apartments found")
                return False
            
            print(f"🏠 Testing with apartment: {apartment.number}")
            
            # Prepare payment data
            payment_data = {
                'apartment': apartment.id,
                'amount': '30.00',
                'date': '2025-08-26',
                'method': 'cash',
                'payment_type': 'common_expense',
                'payer_type': 'owner',
                'payer_name': 'Test API User',
                'notes': 'Test payment via API'
            }
            
            # Make API request
            url = 'http://localhost:8000/api/financial/payments/'
            headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'  # You might need to get a real token
            }
            
            print(f"📡 Making API request to: {url}")
            print(f"📦 Data: {json.dumps(payment_data, indent=2)}")
            
            response = requests.post(url, json=payment_data, headers=headers)
            
            print(f"📊 Response status: {response.status_code}")
            print(f"📄 Response: {response.text}")
            
            if response.status_code == 201:
                payment_response = response.json()
                payment_id = payment_response['id']
                
                print(f"✅ Payment created via API: {payment_id}")
                
                # Check if transaction was created
                transaction = Transaction.objects.filter(
                    reference_id=str(payment_id),
                    reference_type='payment'
                ).first()
                
                if transaction:
                    print(f"✅ Transaction created: {transaction.id}")
                    print(f"   Date: {transaction.date}")
                    print(f"   Type: {type(transaction.date)}")
                    return True
                else:
                    print("❌ No transaction found")
                    return False
            else:
                print(f"❌ API request failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return False

def test_direct_payment_creation():
    """Test direct payment creation to see if transaction is created"""
    
    with schema_context('demo'):
        try:
            # Get first apartment
            apartment = Apartment.objects.first()
            if not apartment:
                print("❌ No apartments found")
                return False
            
            print(f"🏠 Testing direct payment creation with apartment: {apartment.number}")
            
            # Create payment directly
            payment = Payment.objects.create(
                apartment=apartment,
                amount=25.00,
                date=date(2025, 8, 26),
                method='cash',
                payment_type='common_expense',
                payer_type='owner',
                payer_name='Test Direct User'
            )
            
            print(f"✅ Payment created directly: {payment.id}")
            
            # Check if transaction was created
            transaction = Transaction.objects.filter(
                reference_id=str(payment.id),
                reference_type='payment'
            ).first()
            
            if transaction:
                print(f"✅ Transaction created: {transaction.id}")
                print(f"   Date: {transaction.date}")
                print(f"   Type: {type(transaction.date)}")
                return True
            else:
                print("❌ No transaction found for direct payment")
                return False
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return False

if __name__ == "__main__":
    print("🧪 Testing payment creation...")
    
    print("\n1️⃣ Testing direct payment creation:")
    direct_success = test_direct_payment_creation()
    
    print("\n2️⃣ Testing API payment creation:")
    api_success = test_api_payment_creation()
    
    if direct_success and api_success:
        print("\n✅ Both payment creation methods work!")
    elif direct_success:
        print("\n⚠️ Direct payment works but API needs investigation")
    elif api_success:
        print("\n⚠️ API payment works but direct creation needs investigation")
    else:
        print("\n❌ Both payment creation methods have issues")
