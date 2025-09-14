import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Payment, Transaction
from django.db.models import Sum

# All database operations within tenant context
with schema_context('demo'):
    print("=== Real August 2025 Data Check ===")
    
    print("\n1. August 2025 Expenses:")
    august_expenses = Expense.objects.filter(
        building_id=1,
        date__year=2025,
        date__month=8
    )
    
    for exp in august_expenses:
        print(f"   - {exp.date}: €{exp.amount} - {exp.title}")
    
    total_august_exp = august_expenses.aggregate(total=Sum('amount'))['total'] or 0
    print(f"   TOTAL: €{total_august_exp}")
    
    print("\n2. August 2025 Payments:")
    august_payments = Payment.objects.filter(
        apartment__building_id=1,
        date__year=2025,
        date__month=8
    )
    
    for pay in august_payments:
        print(f"   - {pay.date}: €{pay.amount} - Apartment {pay.apartment.number}")
    
    total_august_pay = august_payments.aggregate(total=Sum('amount'))['total'] or 0
    print(f"   TOTAL: €{total_august_pay}")
    
    print("\n3. August Net Position:")
    august_net = total_august_pay - total_august_exp
    print(f"   Payments - Expenses = €{august_net}")
    
    if august_net < 0:
        debt = abs(august_net)
        print(f"   ❌ DEBT: €{debt} (should carry to September)")
    else:
        print(f"   ✅ SURPLUS: €{august_net}")
    
    print("\n4. All Expense Transactions (for verification):")
    all_expense_transactions = Transaction.objects.filter(
        building_id=1,
        type__in=['expense_created', 'expense_issued'],
        date__year=2025,
        date__month=8
    )
    
    for tx in all_expense_transactions:
        print(f"   - {tx.date}: €{tx.amount} - {tx.description} - {tx.apartment}")
    
    total_tx_amount = all_expense_transactions.aggregate(total=Sum('amount'))['total'] or 0
    print(f"   TOTAL TRANSACTIONS: €{total_tx_amount}")
    
    print(f"\n📊 SUMMARY:")
    print(f"   August Expenses (models): €{total_august_exp}")
    print(f"   August Expense Transactions: €{total_tx_amount}")
    print(f"   August Payments: €{total_august_pay}")
    print(f"   NET POSITION: €{august_net}")
    
    if total_august_exp != total_tx_amount:
        print(f"   ⚠️  INCONSISTENCY: Expenses ≠ Transactions")
    else:
        print(f"   ✅ CONSISTENT: Expenses = Transactions")