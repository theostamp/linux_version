#!/usr/bin/env python3
"""
Debug script for apartment 14 transaction API issues
"""
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from apartments.models import Apartment
from financial.models import Payment, Transaction
from decimal import Decimal
import traceback

def debug_apartment_14():
    """Debug apartment 14 transaction data"""
    print("🔍 Debugging Apartment 14 Transactions...")
    print("=" * 50)
    
    try:
        # Check if apartment 14 exists
        print("1. Checking if apartment 14 exists...")
        apartment = Apartment.objects.get(id=14)
        print(f"✅ Apartment found: {apartment.number} in building {apartment.building.name}")
        print(f"   Building ID: {apartment.building.id}")
        print(f"   Apartment owner: {apartment.owner_name if hasattr(apartment, 'owner_name') else 'N/A'}")
        print()
        
        # Check payments for apartment 14
        print("2. Checking payments for apartment 14...")
        payments = Payment.objects.filter(apartment=apartment)
        print(f"   Found {payments.count()} payments")
        
        if payments.exists():
            print("   Payment details:")
            for i, payment in enumerate(payments[:5], 1):  # Show first 5
                print(f"     {i}. ID: {payment.id}, Amount: {payment.amount}, Date: {payment.date}")
        print()
        
        # Check transactions for apartment 14
        print("3. Checking transactions for apartment 14...")
        transactions = Transaction.objects.filter(apartment=apartment)
        print(f"   Found {transactions.count()} transactions")
        
        if transactions.exists():
            print("   Transaction details:")
            for i, transaction in enumerate(transactions[:5], 1):  # Show first 5
                print(f"     {i}. ID: {transaction.id}, Amount: {transaction.amount}, Date: {transaction.date}")
        print()
        
        # Test the actual view logic
        print("4. Testing the _get_apartment_transactions logic...")
        
        # Simulate the viewset logic
        payments = Payment.objects.filter(apartment=apartment).order_by('date', 'id')
        transactions = Transaction.objects.filter(apartment=apartment).order_by('date', 'id')
        
        print(f"   Payments query: {payments.count()} results")
        print(f"   Transactions query: {transactions.count()} results")
        
        # Build the response data
        transaction_history = []
        running_balance = Decimal('0.00')
        
        # Collect all items
        all_items = []
        
        print("   Processing payments...")
        for payment in payments:
            try:
                item = {
                    'type': 'payment',
                    'date': payment.date,
                    'amount': payment.amount,
                    'description': f'Είσπραξη - {payment.get_method_display()}',
                    'method': payment.method,
                    'id': payment.id,
                    'created_at': payment.created_at
                }
                all_items.append(item)
                print(f"     Added payment: {item['id']}")
            except Exception as e:
                print(f"     ERROR processing payment {payment.id}: {e}")
                traceback.print_exc()
        
        print("   Processing transactions...")
        for transaction in transactions:
            try:
                item = {
                    'type': 'charge',
                    'date': transaction.date,
                    'amount': -transaction.amount,
                    'description': transaction.description or 'Χρέωση',
                    'method': None,
                    'id': transaction.id,
                    'created_at': transaction.created_at
                }
                all_items.append(item)
                print(f"     Added transaction: {item['id']}")
            except Exception as e:
                print(f"     ERROR processing transaction {transaction.id}: {e}")
                traceback.print_exc()
        
        print(f"   Total items collected: {len(all_items)}")
        
        # Sort items
        print("   Sorting items...")
        try:
            all_items.sort(key=lambda x: (x['date'], x['created_at']))
            print("   ✅ Sorting successful")
        except Exception as e:
            print(f"   ❌ Sorting failed: {e}")
            traceback.print_exc()
        
        # Calculate balances
        print("   Calculating running balances...")
        try:
            for item in all_items:
                running_balance += Decimal(str(item['amount']))
                item['balance_after'] = float(running_balance)
            print("   ✅ Balance calculation successful")
        except Exception as e:
            print(f"   ❌ Balance calculation failed: {e}")
            traceback.print_exc()
        
        print(f"   Final running balance: {running_balance}")
        print(f"   Total items in response: {len(all_items)}")
        
        if all_items:
            print("   Sample items:")
            for i, item in enumerate(all_items[:3], 1):
                print(f"     {i}. {item['type']}: {item['amount']} on {item['date']} (balance: {item.get('balance_after', 'N/A')})")
        
    except Apartment.DoesNotExist:
        print("❌ Apartment 14 does not exist!")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        traceback.print_exc()
        return False
    
    print("\n✅ Debug completed successfully!")
    return True

if __name__ == '__main__':
    debug_apartment_14()
