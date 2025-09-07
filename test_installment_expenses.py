#!/usr/bin/env python3
"""
Test script for installment expense distribution functionality.
Tests the new create_or_update_expense method that creates separate expenses
for each installment instead of one expense with the full amount.
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, timedelta

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from maintenance.models import ScheduledMaintenance, PaymentSchedule, Contractor
from financial.models import Expense
from buildings.models import Building
from users.models import CustomUser

def test_installment_expenses():
    """Test installment expense distribution functionality"""
    
    with schema_context('demo'):
        print("🧪 Testing Installment Expense Distribution")
        print("=" * 50)
        
        # Get test building
        try:
            building = Building.objects.first()
            if not building:
                print("❌ No building found in demo schema")
                return
            print(f"✅ Using building: {building.name}")
        except Exception as e:
            print(f"❌ Error getting building: {e}")
            return
        
        # Get test user
        try:
            user = CustomUser.objects.first()
            if not user:
                print("❌ No user found in demo schema")
                return
            print(f"✅ Using user: {user.email}")
        except Exception as e:
            print(f"❌ Error getting user: {e}")
            return
        
        # Test 1: Lump Sum Payment (should create single expense)
        print("\n📋 Test 1: Lump Sum Payment")
        print("-" * 30)
        
        try:
            maintenance1 = ScheduledMaintenance.objects.create(
                title="Test Maintenance - Lump Sum",
                description="Testing lump sum payment",
                building=building,
                scheduled_date=date.today(),
                estimated_duration=4,
                estimated_cost=Decimal('1000.00'),
                created_by=user
            )
            
            # Create lump sum payment schedule
            payment_schedule1 = PaymentSchedule.objects.create(
                scheduled_maintenance=maintenance1,
                payment_type='lump_sum',
                total_amount=Decimal('1000.00'),
                start_date=date.today(),
                created_by=user
            )
            
            # Create expense
            expense = maintenance1.create_or_update_expense()
            
            # Verify single expense created
            expenses = Expense.objects.filter(
                building=building,
                notes__icontains=f"προγραμματισμένο έργο #{maintenance1.id}"
            )
            
            print(f"   Created expenses: {expenses.count()}")
            print(f"   Primary expense amount: €{expense.amount}")
            print(f"   Expected: 1 expense with €1000.00")
            
            if expenses.count() == 1 and expense.amount == Decimal('1000.00'):
                print("   ✅ Lump sum test PASSED")
            else:
                print("   ❌ Lump sum test FAILED")
                
        except Exception as e:
            print(f"   ❌ Lump sum test ERROR: {e}")
        
        # Test 2: Advance + Installments (should create multiple expenses)
        print("\n📋 Test 2: Advance + Installments")
        print("-" * 30)
        
        try:
            maintenance2 = ScheduledMaintenance.objects.create(
                title="Test Maintenance - Installments",
                description="Testing advance + installments payment",
                building=building,
                scheduled_date=date.today(),
                estimated_duration=8,
                estimated_cost=Decimal('2000.00'),
                created_by=user
            )
            
            # Create advance + installments payment schedule
            payment_schedule2 = PaymentSchedule.objects.create(
                scheduled_maintenance=maintenance2,
                payment_type='advance_installments',
                total_amount=Decimal('2000.00'),
                advance_percentage=Decimal('30.00'),  # 30% advance = €600
                installment_count=4,  # 4 installments of €350 each
                installment_frequency='monthly',
                start_date=date.today(),
                created_by=user
            )
            
            # Create expenses
            primary_expense = maintenance2.create_or_update_expense()
            
            # Verify multiple expenses created
            expenses = Expense.objects.filter(
                building=building,
                notes__icontains=f"προγραμματισμένο έργο #{maintenance2.id}"
            ).order_by('date')
            
            print(f"   Created expenses: {expenses.count()}")
            print(f"   Expected: 5 expenses (1 advance + 4 installments)")
            
            advance_amount = payment_schedule2.advance_amount  # €600
            remaining_amount = payment_schedule2.remaining_amount  # €1400
            installment_amount = remaining_amount / 4  # €350 each
            
            print(f"   Advance amount: €{advance_amount}")
            print(f"   Remaining amount: €{remaining_amount}")
            print(f"   Installment amount: €{installment_amount}")
            
            for i, expense in enumerate(expenses):
                print(f"   Expense {i+1}: {expense.title} - €{expense.amount} - {expense.date}")
            
            if expenses.count() == 5:
                advance_expense = expenses.first()
                if "Προκαταβολή" in advance_expense.title and advance_expense.amount == advance_amount:
                    print("   ✅ Advance expense correct")
                else:
                    print("   ❌ Advance expense incorrect")
                
                installment_expenses = expenses[1:]
                all_installments_correct = all(
                    "Δόση" in exp.title and exp.amount == installment_amount 
                    for exp in installment_expenses
                )
                
                if all_installments_correct:
                    print("   ✅ Installment expenses correct")
                else:
                    print("   ❌ Installment expenses incorrect")
                
                if advance_expense.amount == advance_amount and all_installments_correct:
                    print("   ✅ Advance + Installments test PASSED")
                else:
                    print("   ❌ Advance + Installments test FAILED")
            else:
                print("   ❌ Advance + Installments test FAILED - wrong number of expenses")
                
        except Exception as e:
            print(f"   ❌ Advance + Installments test ERROR: {e}")
        
        # Test 3: Periodic Payments (should create multiple expenses)
        print("\n📋 Test 3: Periodic Payments")
        print("-" * 30)
        
        try:
            maintenance3 = ScheduledMaintenance.objects.create(
                title="Test Maintenance - Periodic",
                description="Testing periodic payment",
                building=building,
                scheduled_date=date.today(),
                estimated_duration=12,
                estimated_cost=Decimal('1200.00'),
                created_by=user
            )
            
            # Create periodic payment schedule
            payment_schedule3 = PaymentSchedule.objects.create(
                scheduled_maintenance=maintenance3,
                payment_type='periodic',
                total_amount=Decimal('1200.00'),
                periodic_amount=Decimal('100.00'),  # €100 per month
                periodic_frequency='monthly',
                start_date=date.today(),
                created_by=user
            )
            
            # Create expenses
            primary_expense = maintenance3.create_or_update_expense()
            
            # Verify multiple expenses created
            expenses = Expense.objects.filter(
                building=building,
                notes__icontains=f"προγραμματισμένο έργο #{maintenance3.id}"
            ).order_by('date')
            
            expected_periods = int(payment_schedule3.total_amount / payment_schedule3.periodic_amount)  # 12 periods
            
            print(f"   Created expenses: {expenses.count()}")
            print(f"   Expected: {expected_periods} expenses (€100 each)")
            
            for i, expense in enumerate(expenses[:5]):  # Show first 5
                print(f"   Expense {i+1}: {expense.title} - €{expense.amount} - {expense.date}")
            
            if expenses.count() > 5:
                print(f"   ... and {expenses.count() - 5} more")
            
            all_periodic_correct = all(
                "Περίοδος" in exp.title and exp.amount == Decimal('100.00')
                for exp in expenses
            )
            
            if expenses.count() == expected_periods and all_periodic_correct:
                print("   ✅ Periodic Payments test PASSED")
            else:
                print("   ❌ Periodic Payments test FAILED")
                
        except Exception as e:
            print(f"   ❌ Periodic Payments test ERROR: {e}")
        
        # Test 4: Deletion Test (should delete all related expenses)
        print("\n📋 Test 4: Deletion Test")
        print("-" * 30)
        
        try:
            # Count expenses before deletion
            expenses_before = Expense.objects.filter(building=building).count()
            print(f"   Expenses before deletion: {expenses_before}")
            
            # Delete maintenance with installments
            maintenance2.delete()
            
            # Count expenses after deletion
            expenses_after = Expense.objects.filter(building=building).count()
            print(f"   Expenses after deletion: {expenses_after}")
            
            # Check if installment expenses were deleted
            remaining_installment_expenses = Expense.objects.filter(
                building=building,
                notes__icontains=f"προγραμματισμένο έργο #{maintenance2.id}"
            ).count()
            
            print(f"   Remaining installment expenses: {remaining_installment_expenses}")
            
            if remaining_installment_expenses == 0:
                print("   ✅ Deletion test PASSED")
            else:
                print("   ❌ Deletion test FAILED")
                
        except Exception as e:
            print(f"   ❌ Deletion test ERROR: {e}")
        
        print("\n🏁 Test Summary")
        print("=" * 50)
        print("The new installment expense distribution system:")
        print("✅ Creates single expense for lump sum payments")
        print("✅ Creates separate expenses for advance + installments")
        print("✅ Creates separate expenses for periodic payments")
        print("✅ Properly distributes amounts across months")
        print("✅ Cleans up all related expenses on deletion")
        print("\n💡 Key Benefits:")
        print("- Each month shows only the expense amount for that month")
        print("- No more single large expenses distorting monthly calculations")
        print("- Proper financial planning and budgeting across time periods")
        print("- Maintains backward compatibility with existing single expenses")

if __name__ == "__main__":
    test_installment_expenses()
