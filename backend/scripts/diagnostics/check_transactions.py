import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Payment, Building

# Check transaction history in demo schema
with schema_context('demo'):
    try:
        # First check what buildings exist
        buildings = Building.objects.all()
        print("🏢 AVAILABLE BUILDINGS:")
        for building in buildings:
            print(f"  - ID: {building.id}, Name: {building.name}, Address: {building.address}")
        print()
        
        if not buildings.exists():
            print("❌ No buildings found in demo schema!")
            sys.exit(0)
        
        # Check both buildings
        for building in buildings:
            print(f"🏢 BUILDING: {building.name} (ID: {building.id})")
            print(f"📍 Address: {building.address}")
            print()
            
            # Count transactions and payments
            total_transactions = Transaction.objects.filter(building=building).count()
            total_payments = Payment.objects.filter(apartment__building=building).count()
            
            print("📊 STATISTICS:")
            print(f"  - Total transactions: {total_transactions}")
            print(f"  - Total payments: {total_payments}")
            print()
            
            if total_transactions > 0:
                # Show recent transactions
                recent_transactions = Transaction.objects.filter(building=building).order_by('-date')[:5]
                print("📋 RECENT TRANSACTIONS (last 5):")
                for i, transaction in enumerate(recent_transactions, 1):
                    print(f"  {i}. {transaction.date.strftime('%d/%m/%Y %H:%M')} - {transaction.type} - {transaction.amount}€")
                    print(f"     Description: {transaction.description}")
                    if transaction.apartment:
                        print(f"     Apartment: {transaction.apartment.number}")
                    print()
                
                # Show transaction types breakdown
                print("📈 TRANSACTION TYPES BREAKDOWN:")
                type_counts = {}
                for transaction in Transaction.objects.filter(building=building):
                    type_name = transaction.get_type_display()
                    type_counts[type_name] = type_counts.get(type_name, 0) + 1
                
                for type_name, count in sorted(type_counts.items()):
                    print(f"  - {type_name}: {count}")
                print()
            
            # Check if there are any issues with transaction creation
            print("🔍 TRANSACTION CREATION ANALYSIS:")
            
            # Check for payments without corresponding transactions
            payments_without_transactions = []
            for payment in Payment.objects.filter(apartment__building=building):
                # Check if there's a corresponding transaction
                corresponding_transaction = Transaction.objects.filter(
                    building=building,
                    reference_id=str(payment.id),
                    reference_type='payment'
                ).first()
                
                if not corresponding_transaction:
                    payments_without_transactions.append(payment)
            
            print(f"  - Payments without transactions: {len(payments_without_transactions)}")
            if payments_without_transactions:
                print("     ⚠️  This could cause missing transaction history!")
                for payment in payments_without_transactions[:3]:  # Show first 3
                    print(f"       - Payment {payment.id}: {payment.amount}€ from {payment.apartment.number}")
            
            # Check for duplicate transactions
            duplicate_transactions = []
            seen_references = set()
            for transaction in Transaction.objects.filter(building=building):
                if transaction.reference_id and transaction.reference_type:
                    ref_key = f"{transaction.reference_type}_{transaction.reference_id}"
                    if ref_key in seen_references:
                        duplicate_transactions.append(transaction)
                    else:
                        seen_references.add(ref_key)
            
            print(f"  - Duplicate transactions: {len(duplicate_transactions)}")
            if duplicate_transactions:
                print("     ⚠️  This could cause confusion in transaction history!")
            
            print()
            print("=" * 80)
            print()
        
        print("✅ Transaction history analysis complete!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
