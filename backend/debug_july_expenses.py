import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense

def debug_july_expenses():
    """Debug July 2025 expenses for Alkmanos building"""
    
    with schema_context('demo'):
        building_id = 1  # Αλκμάνος 22
        building = Building.objects.get(id=building_id)
        
        print("🔍 JULY 2025 EXPENSES DEBUG")
        print("=" * 50)
        print(f"Building: {building.name}")
        
        # Check all expenses for this building
        all_expenses = Expense.objects.filter(building_id=building_id).order_by('date')
        
        print(f"\n📊 ALL EXPENSES FOR BUILDING {building_id}:")
        for expense in all_expenses:
            print(f"   ID: {expense.id} | Date: {expense.date} | Amount: €{expense.amount:,.2f} | Category: {expense.category}")
        
        # Check expenses for July 2025
        july_expenses = Expense.objects.filter(
            building_id=building_id,
            date__year=2025,
            date__month=7
        )
        
        print("\n📋 JULY 2025 EXPENSES:")
        total_july = 0
        for expense in july_expenses:
            print(f"   ID: {expense.id} | Date: {expense.date} | Amount: €{expense.amount:,.2f} | Category: {expense.category}")
            total_july += expense.amount
        
        print(f"   TOTAL JULY EXPENSES: €{total_july:,.2f}")
        
        # Check expenses for June 2025
        june_expenses = Expense.objects.filter(
            building_id=building_id,
            date__year=2025,
            date__month=6
        )
        
        print("\n📋 JUNE 2025 EXPENSES:")
        total_june = 0
        for expense in june_expenses:
            print(f"   ID: {expense.id} | Date: {expense.date} | Amount: €{expense.amount:,.2f} | Category: {expense.category}")
            total_june += expense.amount
        
        print(f"   TOTAL JUNE EXPENSES: €{total_june:,.2f}")
        
        # Check management fees
        management_fee_per_apartment = building.management_fee_per_apartment or 1.0
        apartments_count = Apartment.objects.filter(building_id=building_id).count()
        total_management_fees = management_fee_per_apartment * apartments_count
        
        print("\n💼 MANAGEMENT FEES:")
        print(f"   Fee per apartment: €{management_fee_per_apartment:,.2f}")
        print(f"   Number of apartments: {apartments_count}")
        print(f"   Total management fees: €{total_management_fees:,.2f}")
        
        # Expected July total
        expected_july_total = total_july + total_management_fees
        print("\n🎯 EXPECTED JULY TOTAL:")
        print(f"   July expenses: €{total_july:,.2f}")
        print(f"   Management fees: €{total_management_fees:,.2f}")
        print(f"   EXPECTED TOTAL: €{expected_july_total:,.2f}")
        
        # Analysis
        print("\n🔍 ANALYSIS:")
        if total_july == 0:
            print("   ✅ July has no expenses (correct)")
            print(f"   ✅ Expected total should be €{total_management_fees:,.2f} (management only)")
        else:
            print(f"   ❌ July has €{total_july:,.2f} in expenses")
            
        if total_june > 0:
            print(f"   📝 June has €{total_june:,.2f} in expenses")
            if total_june == 300:
                print("   ⚠️  June ΔΕΗ expense might be incorrectly showing in July sheet")

if __name__ == "__main__":
    debug_july_expenses()
