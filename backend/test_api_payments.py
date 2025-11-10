#!/usr/bin/env python3
"""
Script για έλεγχο του API payments endpoint
"""

import os
import sys
import django
import requests

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.models import Payment
from decimal import Decimal

def test_api_payments():
    """Έλεγχος του API payments endpoint"""
    print("🔍 Έλεγχος API Payments Endpoint")
    print("=" * 50)
    
    # Get demo client
    try:
        client = Client.objects.get(schema_name='demo')
        print(f"📋 Tenant: {client.name} (Schema: {client.schema_name})")
    except Client.DoesNotExist:
        print("❌ Demo tenant δεν βρέθηκε")
        return
    
    # Test API endpoint
    api_url = "http://localhost:8000/api/financial/payments/"
    params = {
        'building_id': 1  # Assuming building ID 1
    }
    
    print(f"🌐 API URL: {api_url}")
    print(f"📋 Parameters: {params}")
    
    try:
        response = requests.get(api_url, params=params)
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"📋 Response Data Type: {type(data)}")
            
            if isinstance(data, dict) and 'results' in data:
                payments = data['results']
                print(f"📊 Total payments from API: {len(payments)}")
                
                # Calculate total from API
                api_total = sum(Decimal(str(payment['amount'])) for payment in payments)
                print(f"💰 API Total Amount: {api_total:10.2f}€")
                
                # Compare with database
                with tenant_context(client):
                    db_payments = Payment.objects.all()
                    db_total = sum(Decimal(str(payment.amount)) for payment in db_payments)
                    print(f"💾 Database Total Amount: {db_total:10.2f}€")
                    
                    if api_total == db_total:
                        print("✅ Τα ποσά ταιριάζουν!")
                    else:
                        print(f"❌ ΔΙΑΦΟΡΑ: {abs(api_total - db_total):10.2f}€")
                        
                        # Show differences
                        print("\n🔍 Ανάλυση διαφορών:")
                        api_payment_ids = {p['id'] for p in payments}
                        db_payment_ids = {p.id for p in db_payments}
                        
                        missing_in_api = db_payment_ids - api_payment_ids
                        if missing_in_api:
                            print(f"⚠️  Πληρωμές που λείπουν από το API: {missing_in_api}")
                        
                        extra_in_api = api_payment_ids - db_payment_ids
                        if extra_in_api:
                            print(f"⚠️  Πληρωμές που υπάρχουν μόνο στο API: {extra_in_api}")
                
                # Show first few payments from API
                print("\n📋 Πρώτες 5 πληρωμές από το API:")
                for i, payment in enumerate(payments[:5], 1):
                    print(f"{i}. ID: {payment['id']} | "
                          f"Διαμέρισμα: {payment['apartment_number']} | "
                          f"Ποσό: {payment['amount']}€ | "
                          f"Ημερομηνία: {payment['date']}")
                
            else:
                print(f"📋 Raw Response: {data}")
                
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"📋 Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing API: {e}")

if __name__ == "__main__":
    test_api_payments() 