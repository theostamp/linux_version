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

# All database operations within tenant context
with schema_context('demo'):
    print("🔍 Testing expenses API logic...")
    
    # Check if there are any expenses in the database
    all_expenses = Expense.objects.all()
    print(f"📊 Total expenses in database: {all_expenses.count()}")
    
    if all_expenses.exists():
        print("📋 Sample expenses:")
        for expense in all_expenses[:5]:
            print(f"  - ID: {expense.id}, Building: {expense.building_id}, Title: {expense.title}, Category: {expense.category}, Amount: {expense.amount}, Date: {expense.date}")
    
    # Test the filtering logic manually
    building_1_expenses = Expense.objects.filter(building_id=1)
    print(f"\n🏢 Building 1 expenses: {building_1_expenses.count()}")
    
    heating_expenses = Expense.objects.filter(category='heating')
    print(f"🔥 Heating expenses: {heating_expenses.count()}")
    
    # Test combined filter
    building_1_heating = Expense.objects.filter(building_id=1, category='heating')
    print(f"🔥🏢 Building 1 heating expenses: {building_1_heating.count()}")
    
    if building_1_heating.exists():
        print("📋 Building 1 heating expenses:")
        for expense in building_1_heating:
            print(f"  - ID: {expense.id}, Title: {expense.title}, Amount: {expense.amount}, Date: {expense.date}")
    
    # Test date filtering
    from datetime import date
    september_expenses = Expense.objects.filter(
        building_id=1,
        category='heating',
        date__gte=date(2025, 9, 1),
        date__lte=date(2025, 9, 30)
    )
    print(f"\n📅 September 2025 heating expenses for building 1: {september_expenses.count()}")
    
    if september_expenses.exists():
        print("📋 September heating expenses:")
        for expense in september_expenses:
            print(f"  - ID: {expense.id}, Title: {expense.title}, Amount: {expense.amount}, Date: {expense.date}")
    
    # Check expense categories available
    categories = Expense.objects.values_list('category', flat=True).distinct()
    print(f"\n📂 Available categories: {list(categories)}")
    
    # Check if building exists
    try:
        building = Building.objects.get(id=1)
        print(f"\n🏢 Building 1 exists: {building.name}")
    except Building.DoesNotExist:
        print("\n❌ Building 1 does not exist!")