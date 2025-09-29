import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from datetime import datetime
from decimal import Decimal

with schema_context('demo'):
    from apartments.models import Apartment
    from financial.models import Expense, CommonExpensePeriod, ApartmentShare
    from buildings.models import Building
    
    print("=== INVESTIGATION: SOURCE OF 1030€ (343.33€ × 3) ===")
    print(f"Investigation Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Target amounts we're looking for
    target_1030 = Decimal('1030.00')
    target_343_33 = Decimal('343.33')
    tolerance = Decimal('0.01')
    
    print("🔍 Searching for 1030€ (which ÷ 3 = 343.33€)")
    print()
    
    # Check both buildings
    buildings = Building.objects.all()
    
    for building in buildings:
        print(f"🏢 BUILDING: {building.name} (ID: {building.id})")
        print()
        
        # 1. Check all Expenses for 1030€
        print("📊 EXPENSES (looking for 1030€):")
        expenses_1030 = Expense.objects.filter(building=building)
        found_1030 = False
        
        for expense in expenses_1030:
            if abs(expense.amount - target_1030) <= tolerance:
                found_1030 = True
                print(f"   ✅ FOUND 1030€: Expense ID {expense.id}")
                print(f"      Title: {expense.title}")
                print(f"      Amount: {expense.amount}€")
                print(f"      Date: {expense.date}")
                print(f"      Category: {expense.get_category_display()}")
                print(f"      Type: {expense.get_expense_type_display()}")
                print(f"      Distribution: {expense.get_distribution_type_display()}")
                print(f"      ➡️  1030€ ÷ 3 = {expense.amount / 3}€")
                print()
        
        if not found_1030:
            print("   ❌ No 1030€ expenses found")
            print()
        
        # 2. Check for sums that equal 1030€
        print("🧮 EXPENSE COMBINATIONS TOTALING 1030€:")
        all_expenses = list(expenses_1030)
        
        # Check if any combination of expenses equals 1030€
        from itertools import combinations
        
        for r in range(1, min(6, len(all_expenses) + 1)):  # Check combinations up to 5 expenses
            for combo in combinations(all_expenses, r):
                total = sum(exp.amount for exp in combo)
                if abs(total - target_1030) <= tolerance:
                    print(f"   ✅ COMBINATION FOUND (total: {total}€):")
                    for exp in combo:
                        print(f"      + {exp.title}: {exp.amount}€ ({exp.date})")
                    print(f"      ➡️  {total}€ ÷ 3 = {total / 3}€")
                    print()
        
        # 3. Check for monthly totals
        print("📅 MONTHLY EXPENSE TOTALS:")
        from django.db.models import Sum
        
        # Group by year-month
        months_with_expenses = expenses_1030.values('date__year', 'date__month').distinct()
        
        for month_data in months_with_expenses:
            year = month_data['date__year']
            month = month_data['date__month']
            
            monthly_total = expenses_1030.filter(
                date__year=year,
                date__month=month
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            if abs(monthly_total - target_1030) <= tolerance:
                print(f"   ✅ MONTHLY TOTAL: {year}-{month:02d} = {monthly_total}€")
                print(f"      ➡️  {monthly_total}€ ÷ 3 = {monthly_total / 3}€")
                
                # Show breakdown
                month_expenses = expenses_1030.filter(date__year=year, date__month=month)
                for exp in month_expenses:
                    print(f"         + {exp.title}: {exp.amount}€")
                print()
        
        # 4. Check ApartmentShare totals for patterns
        print("🏠 APARTMENT SHARE ANALYSIS:")
        periods = CommonExpensePeriod.objects.filter(building=building)
        
        for period in periods:
            shares = ApartmentShare.objects.filter(period=period)
            total_period = sum(share.total_amount for share in shares)
            
            # Check if total period amount relates to 1030 or 343.33
            if abs(total_period - target_1030) <= tolerance:
                print(f"   ✅ PERIOD TOTAL = 1030€: {period.period_name}")
                print(f"      Total: {total_period}€")
                print(f"      ➡️  {total_period}€ ÷ 3 = {total_period / 3}€")
                print()
            elif abs(total_period - target_343_33) <= tolerance:
                print(f"   ✅ PERIOD TOTAL = 343.33€: {period.period_name}")
                print(f"      Total: {total_period}€")
                print(f"      ➡️  {total_period}€ × 3 = {total_period * 3}€")
                print()
            
            # Check individual apartment shares for 343.33
            for share in shares:
                if abs(share.total_amount - target_343_33) <= tolerance:
                    print("   ✅ APARTMENT SHARE = 343.33€:")
                    print(f"      Apartment: {share.apartment.number}")
                    print(f"      Period: {period.period_name}")
                    print(f"      Amount: {share.total_amount}€")
                    print(f"      Breakdown: {share.breakdown}")
                    print()
        
        print("=" * 60)
        print()
    
    # 5. Check for specific calculation patterns
    print("🔧 CALCULATION PATTERN ANALYSIS:")
    
    # Common building-related calculations that might result in 1030€
    for building in buildings:
        apartments_count = Apartment.objects.filter(building=building).count()
        mgmt_fee = building.management_fee_per_apartment or Decimal('0')
        
        print(f"Building {building.name}:")
        print(f"   Apartments: {apartments_count}")
        print(f"   Management fee per apartment: {mgmt_fee}€")
        
        # Check various multipliers
        multipliers = [10, 20, 30, 50, 100, 103, 206, 515, 1030]
        for mult in multipliers:
            result = mgmt_fee * mult
            if abs(result - target_1030) <= tolerance:
                print(f"   🎯 PATTERN: {mgmt_fee}€ × {mult} = {result}€")
                print(f"      ➡️  {result}€ ÷ 3 = {result / 3}€")
        
        # Check apartment count relationships
        for mult in [10, 20, 30, 50, 100]:
            result = apartments_count * mult
            if abs(result - target_1030) <= tolerance:
                print(f"   🎯 PATTERN: {apartments_count} apartments × {mult} = {result}€")
                print(f"      ➡️  {result}€ ÷ 3 = {result / 3}€")
        
        print()
    
    print("=== INVESTIGATION COMPLETE ===")
