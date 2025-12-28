import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building
from apartments.models import Apartment
from datetime import date
from decimal import Decimal

with schema_context('demo'):
    print("=== TESTING EXPENSE SIGNAL FUNCTIONALITY ===\n")
    
    # Get the building
    building = Building.objects.get(id=1)
    print(f"✅ Building: {building.name}")
    
    # Check current apartment balances
    print("\n📊 Current apartment balances BEFORE new expense:")
    apartments = Apartment.objects.filter(building=building).order_by('number')
    total_before = Decimal('0.00')
    for apt in apartments:
        balance = apt.current_balance or Decimal('0.00')
        total_before += balance
        print(f"   Apt {apt.number}: {balance}€")
    print(f"   Total: {total_before}€")
    
    # Create a new test expense (this should trigger the signal)
    print("\n🔥 Creating new test expense...")
    test_expense = Expense.objects.create(
        building=building,
        title="TEST - Καθαρισμός Κοινοχρήστων",
        amount=Decimal('200.00'),
        date=date.today(),
        category='cleaning',
        distribution_type='by_participation_mills'
    )
    
    print(f"✅ Created expense: {test_expense.title} - {test_expense.amount}€")
    print(f"   ID: {test_expense.id}")
    print(f"   Distribution: {test_expense.distribution_type}")
    
    # Check apartment balances AFTER expense creation
    print("\n📊 Apartment balances AFTER new expense:")
    apartments = Apartment.objects.filter(building=building).order_by('number')
    total_after = Decimal('0.00')
    for apt in apartments:
        balance = apt.current_balance or Decimal('0.00')
        total_after += balance
        print(f"   Apt {apt.number}: {balance}€")
    print(f"   Total: {total_after}€")
    
    # Calculate expected increase
    expected_increase = test_expense.amount
    actual_increase = total_after - total_before
    
    print(f"\n📈 Balance Change Analysis:")
    print(f"   Expected increase: {expected_increase}€")
    print(f"   Actual increase: {actual_increase}€")
    print(f"   Difference: {actual_increase - expected_increase}€")
    
    if actual_increase == expected_increase:
        print("   ✅ SIGNAL WORKED CORRECTLY!")
    else:
        print("   ❌ SIGNAL FAILED - Manual intervention needed")
    
    # Clean up - delete the test expense
    print(f"\n🗑️  Cleaning up test expense...")
    test_expense.delete()
    print("   ✅ Test expense deleted")