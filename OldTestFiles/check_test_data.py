#!/usr/bin/env python3
"""
Check test data in tenant database
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Payment, Transaction

def check_test_data():
    """Check what test data exists"""
    
    print("🔍 Checking Test Data")
    print("=" * 30)
    
    # Get test tenant
    try:
        tenant = Client.objects.filter(schema_name='test_tenant').first()
        if not tenant:
            print("❌ Test tenant 'test_tenant' not found")
            return
        
        print(f"✅ Tenant: {tenant.name} (schema: {tenant.schema_name})")
        
    except Exception as e:
        print(f"❌ Error getting tenant: {e}")
        return
    
    # Use tenant context
    with tenant_context(tenant):
        print("\n📊 Data Counts:")
        print(f"   - Buildings: {Building.objects.count()}")
        print(f"   - Apartments: {Apartment.objects.count()}")
        print(f"   - Payments: {Payment.objects.count()}")
        print(f"   - Transactions: {Transaction.objects.count()}")
        
        print("\n🏢 Buildings:")
        buildings = Building.objects.all()
        for building in buildings:
            apartments = building.apartments.all()
            print(f"   - {building.name} (ID: {building.id})")
            print(f"     Apartments: {apartments.count()}")
            for apt in apartments[:3]:  # Show first 3
                print(f"       * {apt.number} - {apt.owner_name}")
            if apartments.count() > 3:
                print(f"       ... and {apartments.count() - 3} more")
        
        print("\n💰 Payments:")
        payments = Payment.objects.all()
        for payment in payments[:5]:  # Show first 5
            print(f"   - Payment {payment.id}: {payment.amount}€ for {payment.apartment.number}")
        if payments.count() > 5:
            print(f"   ... and {payments.count() - 5} more")
        
        print("\n💳 Transactions:")
        transactions = Transaction.objects.all()
        for transaction in transactions[:5]:  # Show first 5
            print(f"   - Transaction {transaction.id}: {transaction.type} - {transaction.amount}€")
        if transactions.count() > 5:
            print(f"   ... and {transactions.count() - 5} more")

if __name__ == "__main__":
    check_test_data() 