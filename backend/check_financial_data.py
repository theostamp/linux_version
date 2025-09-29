#!/usr/bin/env python3
"""
Script to check current financial data and understand why modal shows virtual values
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Payment, Transaction
from apartments.models import Apartment
from buildings.models import Building

def check_financial_data():
    print("🔍 Checking Financial Data for Demo Building")
    print("=" * 50)
    
    with schema_context('demo'):
        # Check building
        building = Building.objects.first()
        if not building:
            print("❌ No building found in demo schema")
            return
        print(f"🏢 Building: {building.name} (ID: {building.id})")
        
        # Check apartments
        apartments = Apartment.objects.filter(building=building)
        print(f"🏠 Apartments: {apartments.count()}")
        
        # Check expenses
        expenses = Expense.objects.filter(building=building)
        print(f"💰 Expenses: {expenses.count()}")
        
        if expenses.exists():
            print("\n📊 Recent Expenses:")
            for exp in expenses.order_by('-created_at')[:5]:
                print(f"  - {exp.title}: {exp.amount}€ ({exp.date})")
        
        # Check payments
        payments = Payment.objects.all()
        print(f"💳 Payments: {payments.count()}")
        
        if payments.exists():
            print("\n💳 Recent Payments:")
            for pay in payments.order_by('-created_at')[:5]:
                print(f"  - {pay.payer_name}: {pay.amount}€ ({pay.date})")
        
        # Check transactions
        transactions = Transaction.objects.filter(building=building)
        print(f"🔄 Transactions: {transactions.count()}")
        
        if transactions.exists():
            print("\n🔄 Recent Transactions:")
            for trans in transactions.order_by('-created_at')[:5]:
                # Try different date field names
                date_field = getattr(trans, 'date', None) or getattr(trans, 'created_at', None) or 'N/A'
                print(f"  - {trans.description}: {trans.amount}€ ({date_field})")
        
        # Check apartment balances
        print(f"\n🏠 Apartment Balances:")
        for apt in apartments:
            print(f"  - {apt.number}: {apt.current_balance}€")
        
        # Check if there are any financial data at all
        total_expenses = sum(exp.amount for exp in expenses)
        total_payments = sum(pay.amount for pay in payments)
        total_transactions = sum(trans.amount for trans in transactions)
        
        print(f"\n📈 Financial Summary:")
        print(f"  Total Expenses: {total_expenses}€")
        print(f"  Total Payments: {total_payments}€")
        print(f"  Total Transactions: {total_transactions}€")
        print(f"  Net Balance: {total_payments - total_expenses}€")
        
        if total_expenses == 0 and total_payments == 0 and total_transactions == 0:
            print("\n⚠️  WARNING: No financial data found!")
            print("This explains why the modal shows virtual/test values.")
            print("The system is creating mock transactions because there's no real data.")
        else:
            print("\n✅ Financial data exists!")
            print("The modal should show real data, not virtual values.")
            print("The issue might be in the API endpoints or data processing.")

if __name__ == "__main__":
    check_financial_data()