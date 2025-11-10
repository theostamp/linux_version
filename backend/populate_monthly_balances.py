import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import MonthlyBalance, Expense, Payment
from buildings.models import Building
from django.db.models import Sum
from decimal import Decimal

# All database operations within tenant context
with schema_context('demo'):
    print("=== Populating Monthly Balances ===")
    
    building = Building.objects.get(id=1)
    
    print(f"\n📋 Creating Monthly Balance Records for {building.name}")
    
    # August 2025
    print(f"\n1. August 2025:")
    
    august_expenses = Expense.objects.filter(
        building=building,
        date__year=2025,
        date__month=8
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    august_payments = Payment.objects.filter(
        apartment__building=building,
        date__year=2025,
        date__month=8
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    august_balance, created = MonthlyBalance.objects.get_or_create(
        building=building,
        year=2025,
        month=8,
        defaults={
            'total_expenses': august_expenses,
            'total_payments': august_payments,
            'previous_obligations': Decimal('0.00'),  # First month
            'reserve_fund_amount': Decimal('0.00'),
            'management_fees': Decimal('0.00'),
            'carry_forward': Decimal('0.00'),
        }
    )
    
    if created:
        print(f"   ✅ Created August 2025 record")
    else:
        print(f"   📋 Updated August 2025 record")
        august_balance.total_expenses = august_expenses
        august_balance.total_payments = august_payments
        august_balance.save()
    
    # Close August (this will calculate carry_forward)
    august_net = august_balance.net_result
    august_carry = -august_net if august_net < 0 else Decimal('0.00')
    
    print(f"   - Total expenses: €{august_expenses}")
    print(f"   - Total payments: €{august_payments}")
    print(f"   - Net result: €{august_net}")
    print(f"   - Carry forward: €{august_carry}")
    
    if not august_balance.is_closed:
        august_balance.close_month()
        print(f"   ✅ August closed with carry forward: €{august_balance.carry_forward}")
    
    # September 2025
    print(f"\n2. September 2025:")
    
    september_expenses = Expense.objects.filter(
        building=building,
        date__year=2025,
        date__month=9
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    september_payments = Payment.objects.filter(
        apartment__building=building,
        date__year=2025,
        date__month=9
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    september_balance, created = MonthlyBalance.objects.get_or_create(
        building=building,
        year=2025,
        month=9,
        defaults={
            'total_expenses': september_expenses,
            'total_payments': september_payments,
            'previous_obligations': august_balance.carry_forward,  # FROM AUGUST!
            'reserve_fund_amount': Decimal('0.00'),
            'management_fees': Decimal('0.00'),
            'carry_forward': Decimal('0.00'),
        }
    )
    
    if created:
        print(f"   ✅ Created September 2025 record")
    else:
        print(f"   📋 Updated September 2025 record")
        september_balance.total_expenses = september_expenses
        september_balance.total_payments = september_payments
        september_balance.previous_obligations = august_balance.carry_forward
        september_balance.save()
    
    print(f"   - Current month expenses: €{september_expenses}")
    print(f"   - Previous obligations (from August): €{september_balance.previous_obligations}")
    print(f"   - Total obligations: €{september_balance.total_obligations}")
    print(f"   - Total payments: €{september_payments}")
    print(f"   - Net result: €{september_balance.net_result}")
    
    print(f"\n3. Summary:")
    print(f"   📊 August 2025:")
    print(f"      - Expenses: €{august_balance.total_expenses}")
    print(f"      - Payments: €{august_balance.total_payments}")
    print(f"      - Carry forward: €{august_balance.carry_forward}")
    
    print(f"   📊 September 2025:")
    print(f"      - Current expenses: €{september_balance.total_expenses}")
    print(f"      - Previous obligations: €{september_balance.previous_obligations}")
    print(f"      - Total obligations: €{september_balance.total_obligations}")
    print(f"      - Payments: €{september_balance.total_payments}")
    print(f"      - Net result: €{september_balance.net_result}")
    
    print(f"\n✅ PERFECT!")
    print(f"   - August debt of €{august_balance.carry_forward} carries to September")
    print(f"   - September shows €{september_balance.previous_obligations} previous obligations")
    print(f"   - All stored in database, no calculations needed!")
    
    # Test the display
    if september_balance.previous_obligations > 0:
        print(f"\n🎯 Frontend will now show:")
        print(f"   'Παλιότερες οφειλές: €{september_balance.previous_obligations}'")
    else:
        print(f"\n❌ Something went wrong - no previous obligations")