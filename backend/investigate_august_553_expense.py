import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment
from apartments.models import Apartment
from financial.services import FinancialDashboardService
from django.db.models import Sum
from datetime import date

# All database operations within tenant context
with schema_context('demo'):
    print("=== Investigating August 2025 €553 Expense Issue ===")
    
    print("\n1. Checking August 2025 expenses:")
    
    august_expenses = Expense.objects.filter(
        building_id=1,
        date__year=2025,
        date__month=8
    ).order_by('date')
    
    print(f"  Found {august_expenses.count()} expenses in August 2025:")
    
    expense_553 = None
    for expense in august_expenses:
        print(f"    - ID: {expense.id}, Amount: €{expense.amount}, Date: {expense.date}, Title: {expense.title}")
        if abs(expense.amount - 554) < 0.01:  # Find the €554 expense
            expense_553 = expense
            print(f"      ✅ This is the €554 expense we're looking for!")
    
    if not expense_553:
        print("  ❌ No €554 expense found in August 2025!")
        print("  Available expenses:")
        for exp in august_expenses:
            print(f"    - €{exp.amount}")
        exit(1)
    
    print(f"\n2. Analyzing €554 expense (ID: {expense_553.id}):")
    
    # Check transactions created by this expense
    expense_transactions = Transaction.objects.filter(
        reference_type='expense',
        reference_id=str(expense_553.id)
    )
    
    expense_transactions_by_desc = Transaction.objects.filter(
        description__icontains=expense_553.title
    )
    
    print(f"    Transactions by reference_id: {expense_transactions.count()}")
    print(f"    Transactions by description: {expense_transactions_by_desc.count()}")
    
    if expense_transactions_by_desc.exists():
        total_charged = sum(tx.amount for tx in expense_transactions_by_desc)
        print(f"    Total amount charged to apartments: €{total_charged}")
        
        print(f"    Apartment charges:")
        for tx in expense_transactions_by_desc:
            print(f"      - {tx.apartment}: €{tx.amount} on {tx.date} ({tx.type})")
    else:
        print(f"    ❌ No transactions found for this expense!")
    
    print(f"\n3. Checking August payments:")
    
    august_payments = Payment.objects.filter(
        date__year=2025,
        date__month=8
    )
    
    total_august_payments = august_payments.aggregate(total=Sum('amount'))['total'] or 0
    print(f"    August 2025 payments: {august_payments.count()} totaling €{total_august_payments}")
    
    for payment in august_payments:
        print(f"      - Apartment {payment.apartment.number}: €{payment.amount} on {payment.date}")
    
    print(f"\n4. Calculating August net position:")
    
    total_august_expenses = august_expenses.aggregate(total=Sum('amount'))['total'] or 0
    net_august_position = total_august_payments - total_august_expenses
    
    print(f"    Total August expenses: €{total_august_expenses}")
    print(f"    Total August payments: €{total_august_payments}")
    print(f"    Net position: €{net_august_position}")
    
    if net_august_position < 0:
        uncovered_amount = abs(net_august_position)
        print(f"    ❌ Uncovered amount: €{uncovered_amount}")
        print(f"    ✅ This should appear as previous obligations in September!")
    else:
        print(f"    ✅ August was fully covered or overpaid")
    
    print(f"\n5. Checking current apartment balances:")
    
    apartments = Apartment.objects.filter(building_id=1)
    total_debt = 0
    total_credit = 0
    
    for apartment in apartments:
        balance = apartment.current_balance or 0
        if balance < 0:
            debt = abs(balance)
            total_debt += debt
            print(f"    🏠 {apartment.number}: -€{debt} (DEBT)")
        elif balance > 0:
            total_credit += balance
            print(f"    🏠 {apartment.number}: +€{balance} (CREDIT)")
        else:
            print(f"    🏠 {apartment.number}: €0 (BALANCED)")
    
    print(f"\n    Summary:")
    print(f"    - Total debt across apartments: €{total_debt}")
    print(f"    - Total credit across apartments: €{total_credit}")
    print(f"    - Net building position: €{total_credit - total_debt}")
    
    print(f"\n6. Testing FinancialDashboardService for September 2025:")
    
    service = FinancialDashboardService(building_id=1)
    september_data = service.get_summary('2025-09')
    
    print(f"    September previous_obligations: €{september_data.get('previous_obligations', 'ERROR')}")
    
    if total_debt > 0:
        print(f"    ✅ Should show €{total_debt} previous obligations")
    else:
        print(f"    ❌ System shows €0 but should show some debt from August")
    
    print(f"\n=== DIAGNOSIS ===")
    if total_debt == 0 and net_august_position < 0:
        print(f"❌ PROBLEM IDENTIFIED:")
        print(f"   - August had uncovered expenses of €{abs(net_august_position)}")
        print(f"   - But apartments show €0 debt")
        print(f"   - Missing transaction creation or apartment balance updates")
    elif total_debt > 0:
        print(f"✅ WORKING CORRECTLY:")
        print(f"   - Apartments have €{total_debt} debt")
        print(f"   - This should appear as previous obligations")
    else:
        print(f"⚠️ UNCLEAR SITUATION - Need more investigation")