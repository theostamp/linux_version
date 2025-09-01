#!/usr/bin/env python3
"""
Test script για να κατανοήσουμε πώς λειτουργούν τα κοινόχρηστα
"""

import os
import sys
import django
import json
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def test_common_expenses():
    """Test για να κατανοήσουμε πώς λειτουργούν τα κοινόχρηστα"""
    
    with schema_context('demo'):
        from financial.models import Expense
        from apartments.models import Apartment
        from buildings.models import Building
        from financial.services import CommonExpenseCalculator
        
        print("🔍 TEST COMMON EXPENSES")
        print("=" * 60)
        
        # Check existing expenses
        print("📊 Existing expenses:")
        expenses = Expense.objects.filter(building_id=1).order_by('date')
        print(f"Total expenses: {expenses.count()}")
        
        for expense in expenses:
            print(f"  - {expense.title}: {expense.date} (€{expense.amount})")
        
        # Check apartments
        print("\n🏠 Apartments:")
        apartments = Apartment.objects.filter(building_id=1)
        print(f"Total apartments: {apartments.count()}")
        
        for apt in apartments:
            print(f"  - {apt.number}: {apt.owner_name} ({apt.participation_mills} mills)")
        
        # Check building
        print("\n🏢 Building:")
        building = Building.objects.get(id=1)
        print(f"Name: {building.name}")
        print(f"Management fee per apartment: €{building.management_fee_per_apartment}")
        print(f"Reserve fund goal: €{building.reserve_fund_goal}")
        print(f"Reserve fund duration: {building.reserve_fund_duration_months} months")
        
        # Test CommonExpenseCalculator for September 2025
        print("\n🧮 Testing CommonExpenseCalculator for September 2025:")
        calculator = CommonExpenseCalculator(1, "2025-09")
        
        try:
            shares = calculator.calculate_shares(include_reserve_fund=True)
            print(f"✅ Calculator works for September 2025")
            print(f"Total shares calculated: {len(shares)}")
            
            # Show first apartment share
            if shares:
                first_share = list(shares.items())[0]
                print(f"First apartment share: {first_share}")
                
        except Exception as e:
            print(f"❌ Calculator error: {e}")
        
        # Check if we can create a common expense for September 2025
        print("\n📝 Testing common expense creation for September 2025:")
        
        # Check if there's already a common expense for September 2025
        september_expenses = Expense.objects.filter(
            building_id=1,
            date__year=2025,
            date__month=9
        )
        
        if september_expenses.exists():
            print("✅ Already have expenses for September 2025:")
            for exp in september_expenses:
                print(f"  - {exp.title}: €{exp.amount}")
        else:
            print("❌ No expenses for September 2025")
            print("💡 Need to create common expenses for September 2025")
            
            # Show what types of expenses we could create
            print("\n💡 Possible expense types for September 2025:")
            print("  - Διαχείριση (Management fee)")
            print("  - Συλλογή Απορριμμάτων (Garbage collection)")
            print("  - Ηλεκτρικά (Electricity)")
            print("  - Νερό (Water)")
            print("  - Καθαρισμός (Cleaning)")
            print("  - Αποθεματικό (Reserve fund)")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    test_common_expenses()
