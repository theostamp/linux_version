import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Building
from financial.serializers import TransactionSerializer

# Test the transaction history endpoint
with schema_context('demo'):
    try:
        # Check what buildings exist
        buildings = Building.objects.all()
        print(f"Available buildings in demo schema: {buildings.count()}")
        for building in buildings:
            print(f"  - Building ID: {building.id}, Name: {building.name}")
        
        if buildings.exists():
            # Use the first available building
            building = buildings.first()
            print(f"\nTesting transaction history for building: {building.name} (ID: {building.id})")
            
            # Get some transactions
            transactions = Transaction.objects.filter(building=building).order_by('-date')[:5]
            print(f"Found {transactions.count()} transactions")
            
            # Test serialization
            serializer = TransactionSerializer(transactions, many=True)
            serialized_data = serializer.data
            print(f"Successfully serialized {len(serialized_data)} transactions")
            
            # Print first transaction details
            if serialized_data:
                first_transaction = serialized_data[0]
                print(f"First transaction: {first_transaction.get('description', 'No description')} - {first_transaction.get('amount', 'No amount')}")
            
            print("✅ Transaction history API test passed!")
        else:
            print("❌ No buildings found in demo schema")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
