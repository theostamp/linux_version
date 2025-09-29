#!/usr/bin/env python3
import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

# All database operations within tenant context
with schema_context('demo'):
    from buildings.models import Building
    from apartments.models import Apartment
    from maintenance.models import ScheduledMaintenance, PaymentSchedule
    from financial.models import Expense, Transaction
    from financial.services import FinancialDashboardService
    
    print("🔍 INVESTIGATING SERVICE COST ISSUE")
    print("=" * 50)
    
    # Get building
    building = Building.objects.first()
    print(f"🏢 Building: {building.name}")
    print(f"   Management Fee Per Apartment: €{building.management_fee_per_apartment}")
    
    # Get scheduled maintenance projects
    scheduled_projects = ScheduledMaintenance.objects.filter(building=building)
    print(f"\n📋 SCHEDULED MAINTENANCE PROJECTS: {scheduled_projects.count()}")
    
    for project in scheduled_projects:
        print(f"\n   📊 Project: {project.title}")
        print(f"      Status: {project.status}")
        print(f"      Estimated Cost: €{project.estimated_cost}")
        
        # Check payment schedule
        try:
            payment_schedule = project.payment_schedule
            print(f"      Payment Schedule:")
            print(f"         Type: {payment_schedule.payment_type}")
            print(f"         Total Amount: €{payment_schedule.total_amount}")
            print(f"         Installment Count: {payment_schedule.installment_count}")
            print(f"         Advance Percentage: {payment_schedule.advance_percentage}%")
            
            # Calculate installment amount
            if payment_schedule.installment_count and payment_schedule.installment_count > 0:
                advance_amount = Decimal('0')
                if payment_schedule.advance_percentage:
                    advance_amount = (payment_schedule.total_amount * Decimal(payment_schedule.advance_percentage)) / Decimal('100')
                
                remaining = payment_schedule.total_amount - advance_amount
                monthly_installment = remaining / payment_schedule.installment_count
                
                print(f"         Advance Amount: €{advance_amount}")
                print(f"         Remaining Amount: €{remaining}")
                print(f"         Monthly Installment: €{monthly_installment}")
                
        except Exception as e:
            print(f"      Payment Schedule: NOT FOUND ({e})")
    
    # Get recent expenses related to maintenance
    maintenance_expenses = Expense.objects.filter(
        building=building,
        title__icontains='συντήρηση'
    ).order_by('-date')[:10]
    
    print(f"\n💰 RECENT MAINTENANCE EXPENSES: {maintenance_expenses.count()}")
    for expense in maintenance_expenses:
        print(f"   📅 {expense.date} - {expense.title}: €{expense.amount}")
    
    # Check apartment balances to see what amounts are showing
    print(f"\n🏠 APARTMENT BALANCES:")
    try:
        dashboard_service = FinancialDashboardService(building.id)
        balances_data = dashboard_service.get_apartment_balances()
        
        for apartment in balances_data[:3]:  # Show first 3
            print(f"   Apartment {apartment['apartment_number']}:")
            print(f"      Expense Share: €{apartment['expense_share']}")
            print(f"      Net Obligation: €{apartment['net_obligation']}")
            print(f"      Previous Balance: €{apartment['previous_balance']}")
            
            # Show expense breakdown
            if apartment.get('expense_breakdown'):
                print(f"      Expense Breakdown:")
                for expense_item in apartment['expense_breakdown'][:3]:  # Show first 3
                    print(f"         - {expense_item['expense_title']}: €{expense_item['share_amount']}")
    except Exception as e:
        print(f"   Error getting apartment balances: {e}")
    
    print(f"\n✅ Investigation complete")