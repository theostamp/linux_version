import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Expense, ApartmentShare, CommonExpensePeriod
from apartments.models import Apartment

# All database operations within tenant context
with schema_context('demo'):
    print("=== UI DISCREPANCY INVESTIGATION ===\n")
    
    # Check all expenses for September 2025
    expenses_sept = Expense.objects.filter(
        date__year=2025,
        date__month=9
    )
    
    print(f"Expenses for September 2025: {expenses_sept.count()}")
    for exp in expenses_sept:
        print(f"  ID {exp.id}: {exp.title} - {exp.amount:.2f} €")
    print()
    
    # Check if there are any other calculation systems (CommonExpensePeriod, ApartmentShare)
    print("=== CHECKING OTHER CALCULATION SYSTEMS ===")
    
    # Check CommonExpensePeriod for September 2025
    common_periods = CommonExpensePeriod.objects.filter(
        start_date__year=2025,
        start_date__month__lte=9,
        end_date__year=2025,
        end_date__month__gte=9
    )
    
    print(f"Common Expense Periods covering September 2025: {common_periods.count()}")
    for period in common_periods:
        print(f"  {period.period_name}: {period.start_date} to {period.end_date}")
        
        # Check apartment shares for this period
        shares = ApartmentShare.objects.filter(period=period)
        if shares.exists():
            print(f"    Has {shares.count()} apartment shares:")
            total_shares = Decimal('0')
            for share in shares:
                print(f"      Apt {share.apartment.number}: {share.total_due:.2f} € (prev: {share.previous_balance:.2f} €)")
                total_shares += share.total_due
            print(f"    Total from shares: {total_shares:.2f} €")
        else:
            print("    No apartment shares found")
    print()
    
    # Check all transactions for September 2025
    print("=== ALL SEPTEMBER 2025 TRANSACTIONS ===")
    all_transactions = Transaction.objects.filter(
        date__year=2025,
        date__month=9
    ).order_by('apartment__number', 'date')
    
    print(f"Total transactions: {all_transactions.count()}")
    current_apt = None
    apt_total = Decimal('0')
    grand_total = Decimal('0')
    
    for trans in all_transactions:
        if current_apt != trans.apartment.number:
            if current_apt is not None:
                print(f"    Apartment {current_apt} subtotal: {apt_total:.2f} €")
            current_apt = trans.apartment.number
            apt_total = Decimal('0')
            print(f"  Apartment {trans.apartment.number}:")
        
        apt_total += trans.amount
        grand_total += trans.amount
        print(f"    {trans.date.strftime('%Y-%m-%d')} {trans.type}: {trans.amount:.2f} € (ref: {trans.reference_type}/{trans.reference_id})")
    
    if current_apt is not None:
        print(f"    Apartment {current_apt} subtotal: {apt_total:.2f} €")
    
    print(f"Grand total from transactions: {grand_total:.2f} €")
    print()
    
    # Check current apartment balances
    print("=== CURRENT APARTMENT BALANCES ===")
    apartments = Apartment.objects.all().order_by('number')
    total_stored_balances = Decimal('0')
    total_calculated_balances = Decimal('0')
    
    for apt in apartments:
        # Calculate balance from all transactions
        all_apt_transactions = Transaction.objects.filter(apartment=apt)
        calculated_balance = sum(t.amount for t in all_apt_transactions)
        
        stored_balance = apt.current_balance or Decimal('0')
        total_stored_balances += stored_balance
        total_calculated_balances += calculated_balance
        
        print(f"  Apartment {apt.number} ({apt.owner_name}):")
        print(f"    Stored balance: {stored_balance:.2f} €")
        print(f"    Calculated from transactions: {calculated_balance:.2f} €")
        
        if abs(stored_balance - calculated_balance) > Decimal('0.01'):
            print(f"    ⚠️  MISMATCH: {abs(stored_balance - calculated_balance):.2f} € difference")
        
        # Show what UI should display (negative balance as positive debt)
        ui_display = abs(stored_balance) if stored_balance < 0 else Decimal('0')
        print(f"    UI should show: {ui_display:.2f} € debt")
    
    print(f"\nTotal stored balances: {total_stored_balances:.2f} €")
    print(f"Total calculated balances: {total_calculated_balances:.2f} €")
    
    # Check for any caching or view-based calculations
    print()
    print("=== POTENTIAL CACHING ISSUES ===")
    print("The UI might be using:")
    print("1. Cached balance calculations")
    print("2. A different calculation method")
    print("3. Database views or materialized views")
    print("4. Frontend state that needs refreshing")
    
    # Show what UI values should be
    print()
    print("=== EXPECTED UI VALUES ===")
    print("Based on current database state, UI should show:")
    expected_total = Decimal('0')
    for apt in apartments:
        debt = abs(apt.current_balance) if apt.current_balance < 0 else Decimal('0')
        expected_total += debt
        print(f"  Apartment {apt.number}: {debt:.2f} €")
    
    print(f"Expected total debt: {expected_total:.2f} €")
    print(f"UI currently shows: 249.99 €")
    print(f"Difference: {abs(expected_total - Decimal('249.99')):.2f} €")