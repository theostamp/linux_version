#!/usr/bin/env python3
"""
Script to check financial data for building ID 1 in February 2025
"""

import os
import sys
import django
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Payment
from apartments.models import Apartment

def check_financial_data():
    """Check financial data for building ID 1 in February 2025"""
    
    with schema_context('demo'):
        building_id = 1
        year = 2025
        month = 2
        
        # Create date range for February 2025
        start_date = date(year, month, 1)
        end_date = date(year, month + 1, 1)  # March 1, 2025
        
        print(f"🔍 Checking financial data for Building ID {building_id}")
        print(f"📅 Period: {start_date} to {end_date}")
        print()
        
        # Check expenses
        expenses = Expense.objects.filter(
            building_id=building_id,
            date__gte=start_date,
            date__lt=end_date
        )
        
        print(f"💰 Expenses found: {expenses.count()}")
        total_expenses = 0
        for expense in expenses:
            print(f"  - ID: {expense.id}, Title: {expense.title}, Amount: {expense.amount}, Date: {expense.date}")
            total_expenses += float(expense.amount)
        print(f"  Total expenses amount: {total_expenses}")
        print()
        
        # Check payments
        payments = Payment.objects.filter(
            apartment__building_id=building_id,
            date__gte=start_date,
            date__lt=end_date
        )
        
        print(f"💳 Payments found: {payments.count()}")
        total_payments = 0
        for payment in payments:
            print(f"  - ID: {payment.id}, Payer: {payment.payer_name}, Amount: {payment.amount}, Date: {payment.date}, Apartment: {payment.apartment.number if payment.apartment else 'N/A'}")
            total_payments += float(payment.amount)
        print(f"  Total payments amount: {total_payments}")
        print()
        
        # Check apartments in building
        apartments = Apartment.objects.filter(building_id=building_id)
        print(f"🏢 Apartments in building {building_id}: {apartments.count()}")
        for apt in apartments:
            print(f"  - ID: {apt.id}, Number: {apt.number}, Owner: {apt.owner_name}, Tenant: {apt.tenant_name}")
        print()
        
        # Summary
        balance = total_payments - total_expenses
        print(f"📊 Summary:")
        print(f"  Total Expenses: {total_expenses}")
        print(f"  Total Payments: {total_payments}")
        print(f"  Balance: {balance}")

if __name__ == "__main__":
    check_financial_data()
