import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment, MonthlyBalance
from apartments.models import Apartment

# All database operations within tenant context
with schema_context('demo'):
    print("=== Debugging August 2025 Data ===")
    
    print("\n🔍 August 2025 Expenses:")
    august_expenses = Expense.objects.filter(
        building_id=1,
        date__year=2025,
        date__month=8
    )
    
    for expense in august_expenses:
        print(f"  💰 Expense ID {expense.id}: €{expense.amount}")
        print(f"      Date: {expense.date}, Category: {getattr(expense, 'category', 'N/A')}")
        print(f"      Distribution Method: {getattr(expense, 'distribution_method', 'N/A')}")
    
    print(f"\n📋 August 2025 Transactions:")
    august_transactions = Transaction.objects.filter(
        date__year=2025,
        date__month=8
    ).order_by('date', 'apartment_number')
    
    transaction_count = august_transactions.count()
    print(f"  Total transactions: {transaction_count}")
    
    if transaction_count > 0:
        for transaction in august_transactions[:20]:  # Μόνο τις πρώτες 20
            print(f"  📝 {transaction.date}: Apt {transaction.apartment_number} - €{transaction.amount}")
            print(f"      Type: {transaction.type}, Ref: {transaction.reference_type}:{transaction.reference_id}")
    else:
        print(f"  ❌ NO transactions found for August 2025!")
    
    print(f"\n💸 August 2025 Payments:")
    august_payments = Payment.objects.filter(
        date__year=2025,
        date__month=8
    )
    
    for payment in august_payments:
        print(f"  💳 Apt {payment.apartment.number}: €{payment.amount} on {payment.date}")
    
    print(f"\n📊 MonthlyBalance Records:")
    monthly_balances = MonthlyBalance.objects.filter(
        building_id=1,
        year=2025
    ).order_by('month')
    
    for mb in monthly_balances:
        print(f"  🗓️ {mb.year}-{mb.month:02d}: expenses=€{mb.total_expenses}, payments=€{mb.total_payments}")
        print(f"      previous_obligations=€{mb.previous_obligations}, carry_forward=€{mb.carry_forward}")
    
    print(f"\n🎯 PROBLEM DIAGNOSIS:")
    if august_expenses.count() > 0 and august_transactions.count() == 0:
        print(f"  ❌ FOUND THE ISSUE: August expenses exist but NO transactions were created!")
        print(f"  ❌ This means the expense distribution system didn't run")
        print(f"  ❌ Without transactions, apartments don't have individual charges")
    elif august_expenses.count() == 0:
        print(f"  ❌ NO August expenses found - missing base data")
    else:
        print(f"  ✅ August expenses and transactions both exist")
        
    print(f"\n📋 Current Apartment Balances (raw current_balance):")
    apartments = Apartment.objects.filter(building_id=1).order_by('number')
    for apt in apartments:
        print(f"  🏠 Apartment {apt.number}: current_balance = €{apt.current_balance or 0}")
        
    print(f"\n🔧 NEXT STEPS:")
    if august_expenses.count() > 0 and august_transactions.count() == 0:
        print(f"  1. Need to trigger expense distribution for August expenses")
        print(f"  2. This will create transactions for each apartment")
        print(f"  3. Then apartment balances will show correct previous_balance data")