import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Payment, Building, Expense
from apartments.models import Apartment
from datetime import datetime, timedelta

# Debug transaction creation in demo schema
with schema_context('demo'):
    try:
        print("🔍 DEBUGGING TRANSACTION CREATION")
        print("=" * 60)
        
        # Check all buildings
        buildings = Building.objects.all()
        print(f"🏢 Found {buildings.count()} buildings:")
        for building in buildings:
            print(f"  - {building.name} (ID: {building.id})")
        print()
        
        # Focus on Αραχώβης 12 building (ID: 3) which has transactions
        building = Building.objects.get(id=3)
        print(f"🏢 Analyzing building: {building.name}")
        print()
        
        # Check all payments
        payments = Payment.objects.filter(apartment__building=building)
        print(f"💰 PAYMENTS ({payments.count()} total):")
        for payment in payments:
            print(f"  - Payment {payment.id}: {payment.amount}€ from {payment.apartment.number}")
            print(f"    Date: {payment.date}, Method: {payment.get_method_display()}")
            print(f"    Notes: {payment.notes}")
            
            # Check if there's a corresponding transaction
            transaction = Transaction.objects.filter(
                building=building,
                reference_id=str(payment.id),
                reference_type='payment'
            ).first()
            
            if transaction:
                print(f"    ✅ Has transaction: {transaction.id} - {transaction.type}")
            else:
                print(f"    ❌ No corresponding transaction found!")
            print()
        
        # Check all transactions
        transactions = Transaction.objects.filter(building=building)
        print(f"📋 TRANSACTIONS ({transactions.count()} total):")
        for transaction in transactions:
            print(f"  - Transaction {transaction.id}: {transaction.type} - {transaction.amount}€")
            print(f"    Date: {transaction.date}")
            print(f"    Description: {transaction.description}")
            print(f"    Reference: {transaction.reference_type} - {transaction.reference_id}")
            if transaction.apartment:
                print(f"    Apartment: {transaction.apartment.number}")
            print()
        
        # Check expenses
        expenses = Expense.objects.filter(building=building)
        print(f"💸 EXPENSES ({expenses.count()} total):")
        for expense in expenses:
            print(f"  - Expense {expense.id}: {expense.title} - {expense.amount}€")
            print(f"    Date: {expense.date}, Category: {expense.get_category_display()}")
            
            # Check if there are transactions for this expense
            expense_transactions = Transaction.objects.filter(
                building=building,
                reference_id=str(expense.id),
                reference_type='expense'
            )
            print(f"    Transactions: {expense_transactions.count()}")
            for t in expense_transactions:
                print(f"      - {t.id}: {t.type} - {t.amount}€")
            print()
        
        # Check apartments
        apartments = Apartment.objects.filter(building=building)
        print(f"🏠 APARTMENTS ({apartments.count()} total):")
        for apartment in apartments:
            print(f"  - {apartment.number}: {apartment.owner_name}")
            print(f"    Current balance: {apartment.current_balance}€")
            print(f"    Participation mills: {apartment.participation_mills}")
            
            # Count payments and transactions for this apartment
            apartment_payments = Payment.objects.filter(apartment=apartment).count()
            apartment_transactions = Transaction.objects.filter(apartment=apartment).count()
            print(f"    Payments: {apartment_payments}, Transactions: {apartment_transactions}")
            print()
        
        print("✅ Transaction creation debugging complete!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
