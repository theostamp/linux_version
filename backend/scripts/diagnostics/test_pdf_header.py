#!/usr/bin/env python3
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
from financial.models import Expense, CommonExpensePeriod
from financial.services import AdvancedCommonExpenseCalculator

def test_pdf_header_data():
    """Test that we have data for PDF generation with the new header format"""
    
    with schema_context('demo'):
        print("🏢 Testing PDF Header Data")
        print("=" * 50)
        
        # Check buildings
        buildings = Building.objects.all()
        print(f"📋 Available Buildings: {buildings.count()}")
        for building in buildings:
            print(f"   • {building.name} (ID: {building.id})")
        
        if not buildings.exists():
            print("❌ No buildings found!")
            return
        
        building = buildings.first()
        print(f"\n🏠 Testing with: {building.name}")
        
        # Check apartments
        apartments = Apartment.objects.filter(building=building)
        print(f"🚪 Apartments: {apartments.count()}")
        
        # Check expenses for August 2025
        august_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=8
        )
        print(f"💰 August 2025 Expenses: {august_expenses.count()}")
        
        for expense in august_expenses:
            print(f"   • {expense.title}: {expense.amount}€ ({expense.date})")
        
        # Test the calculator for August 2025
        print("\n🧮 Testing Calculator for August 2025")
        try:
            calculator = AdvancedCommonExpenseCalculator(
                building_id=building.id,
                period_start_date='2025-08-01',
                period_end_date='2025-08-31'
            )
            
            shares = calculator.calculate_advanced_shares()
            print(f"✅ Calculator works! Generated {len(shares)} apartment shares")
            
            # Test expense breakdown
            breakdown = calculator.calculate_expense_breakdown()
            print("📊 Expense Breakdown:")
            for category, amount in breakdown.items():
                if amount > 0:
                    print(f"   • {category}: {amount}€")
            
        except Exception as e:
            print(f"❌ Calculator error: {e}")
        
        # Check existing common expense periods
        periods = CommonExpensePeriod.objects.filter(building=building)
        print(f"\n📄 Existing Common Expense Periods: {periods.count()}")
        
        for period in periods.order_by('-created_at')[:3]:
            print(f"   • {period.name} - {period.created_at.strftime('%Y-%m-%d')}")

if __name__ == "__main__":
    test_pdf_header_data()
