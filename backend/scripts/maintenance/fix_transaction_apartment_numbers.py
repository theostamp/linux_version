import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction
from apartments.models import Apartment

# All database operations within tenant context
with schema_context('demo'):
    print("=== Fixing Transaction Apartment Numbers ===")
    
    # Βρίσκουμε τα transactions του Αυγούστου με apartment_number = None
    august_transactions = Transaction.objects.filter(
        date__year=2025,
        date__month=8,
        apartment_number__isnull=True,
        reference_type='expense',
        reference_id='17'
    ).order_by('id')
    
    print(f"\n🔍 Found {august_transactions.count()} transactions with apartment_number=None")
    
    # Βρίσκουμε όλα τα διαμερίσματα
    apartments = Apartment.objects.filter(building_id=1).order_by('number')
    apartment_list = list(apartments)
    
    print(f"📋 Found {len(apartment_list)} apartments: {[apt.number for apt in apartment_list]}")
    
    print(f"\n🔧 Assigning apartment numbers to transactions...")
    
    # Εκχωρούμε apartment_number σε κάθε transaction
    for i, transaction in enumerate(august_transactions):
        if i < len(apartment_list):
            apartment = apartment_list[i]
            old_apartment_number = transaction.apartment_number
            transaction.apartment_number = apartment.number
            transaction.save()
            
            print(f"  ✅ Transaction {transaction.id}: €{transaction.amount} → Apartment {apartment.number}")
            print(f"      Changed from: {old_apartment_number} to: {apartment.number}")
        else:
            print(f"  ⚠️ No apartment available for transaction {transaction.id}")
    
    print(f"\n🎯 Verification - Check updated transactions:")
    updated_transactions = Transaction.objects.filter(
        date__year=2025,
        date__month=8,
        reference_type='expense',
        reference_id='17'
    ).order_by('apartment_number')
    
    for transaction in updated_transactions:
        print(f"  📝 Apartment {transaction.apartment_number}: €{transaction.amount}")
    
    print(f"\n✅ Transaction apartment number fix completed!")
    print(f"   Now each August expense transaction is properly assigned to an apartment")
    print(f"   This should fix the previous_balance calculations in apartment balances")