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
    from financial.models import Expense, Transaction, CommonExpensePeriod, ApartmentShare
    from buildings.models import Building
    
    print("=== INVESTIGATION: SOURCE OF 343.33€ AMOUNT ===")
    print(f"Investigation Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Target amount we're looking for
    target_amount = Decimal('343.33')
    tolerance = Decimal('0.01')  # Allow for small rounding differences
    
    print(f"🔍 Searching for amount: {target_amount}€ (±{tolerance}€)")
    print()
    
    # Check both buildings
    buildings = Building.objects.all()
    
    for building in buildings:
        print(f"🏢 BUILDING: {building.name} (ID: {building.id})")
        print(f"   Address: {building.address}")
        print()
        
        # 1. Check all Expenses for this amount
        print("📊 EXPENSES:")
        expenses = Expense.objects.filter(building=building)
        found_expenses = []
        
        for expense in expenses:
            if abs(expense.amount - target_amount) <= tolerance:
                found_expenses.append(expense)
                print(f"   ✅ FOUND: Expense ID {expense.id}")
                print(f"      Title: {expense.title}")
                print(f"      Amount: {expense.amount}€")
                print(f"      Date: {expense.date}")
                print(f"      Category: {expense.get_category_display()}")
                print(f"      Type: {expense.get_expense_type_display()}")
                print(f"      Distribution: {expense.get_distribution_type_display()}")
                print()
        
        if not found_expenses:
            print("   ❌ No expenses found with this amount")
            print()
        
        # 2. Check ApartmentShare totals
        print("🏠 APARTMENT SHARES:")
        apartment_shares = ApartmentShare.objects.filter(apartment__building=building)
        found_shares = []
        
        for share in apartment_shares:
            if abs(share.total_amount - target_amount) <= tolerance:
                found_shares.append(share)
                print(f"   ✅ FOUND: ApartmentShare for {share.apartment.number}")
                print(f"      Period: {share.period.period_name}")
                print(f"      Total Amount: {share.total_amount}€")
                print(f"      Breakdown: {share.breakdown}")
                print()
        
        if not found_shares:
            print("   ❌ No apartment shares found with this amount")
            print()
        
        # 3. Check Transaction amounts
        print("💰 TRANSACTIONS:")
        transactions = Transaction.objects.filter(apartment__building=building)
        found_transactions = []
        
        for transaction in transactions:
            if abs(abs(transaction.amount) - target_amount) <= tolerance:
                found_transactions.append(transaction)
                print(f"   ✅ FOUND: Transaction for Apartment {transaction.apartment.number}")
                print(f"      Amount: {transaction.amount}€")
                print(f"      Type: {transaction.type}")
                print(f"      Date: {transaction.date}")
                print(f"      Description: {transaction.description}")
                print()
        
        if not found_transactions:
            print("   ❌ No transactions found with this amount")
            print()
        
        # 4. Check for calculated totals in CommonExpensePeriods
        print("📅 COMMON EXPENSE PERIODS - CALCULATED TOTALS:")
        periods = CommonExpensePeriod.objects.filter(building=building)
        
        for period in periods:
            shares = ApartmentShare.objects.filter(period=period)
            total_period_amount = sum(share.total_amount for share in shares)
            
            if abs(total_period_amount - target_amount) <= tolerance:
                print("   ✅ FOUND: Period total matches")
                print(f"      Period: {period.period_name}")
                print(f"      Total Amount: {total_period_amount}€")
                print(f"      Number of apartments: {shares.count()}")
                print(f"      Active: {period.is_active}")
                print()
        
        # 5. Check for partial calculations (like 343.33 / 10 apartments = 34.33 each)
        print("🧮 MATHEMATICAL RELATIONSHIPS:")
        apartments_count = Apartment.objects.filter(building=building).count()
        
        if apartments_count > 0:
            per_apartment = target_amount / apartments_count
            print(f"   If {target_amount}€ divided by {apartments_count} apartments = {per_apartment:.2f}€ per apartment")
            
            # Check if any expenses match this per-apartment amount
            for expense in expenses:
                if abs(expense.amount - per_apartment) <= tolerance:
                    print(f"   🔗 RELATED: Expense '{expense.title}' ({expense.amount}€) × {apartments_count} = {expense.amount * apartments_count}€")
            
            # Check if 343.33 is a multiple of management fees
            mgmt_fee = building.management_fee_per_apartment or Decimal('0')
            if mgmt_fee > 0:
                multiple = target_amount / mgmt_fee
                print(f"   Management fee: {mgmt_fee}€ × {multiple:.2f} = {mgmt_fee * multiple}€")
        
        print("=" * 60)
        print()
    
    # 6. Check for hardcoded values or calculations
    print("🔧 CHECKING FOR CALCULATION PATTERNS:")
    
    # Common patterns that might result in 343.33
    patterns = [
        (Decimal('1030'), Decimal('3')),  # 1030/3 = 343.33
        (Decimal('343.33'), Decimal('1')),  # Direct value
        (Decimal('686.66'), Decimal('2')),  # 686.66/2 = 343.33
        (Decimal('1373.32'), Decimal('4')),  # 1373.32/4 = 343.33
    ]
    
    for numerator, denominator in patterns:
        result = numerator / denominator
        if abs(result - target_amount) <= tolerance:
            print(f"   📐 PATTERN: {numerator}€ ÷ {denominator} = {result}€")
            
            # Check if numerator exists in expenses
            for building in buildings:
                expenses = Expense.objects.filter(building=building, amount=numerator)
                if expenses.exists():
                    for expense in expenses:
                        print(f"      🔗 Found source expense: {expense.title} ({expense.amount}€) in {building.name}")
    
    print()
    print("=== INVESTIGATION COMPLETE ===")
