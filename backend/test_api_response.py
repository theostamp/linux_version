import os
import sys
import django
import json
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.test import RequestFactory
from financial.views import FinancialDashboardViewSet
from financial.models import Transaction, Expense
from apartments.models import Apartment

# All database operations within tenant context
with schema_context('demo'):
    print("=== TESTING API RESPONSE ===\n")
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.get('/financial/dashboard/apartment_balances/', {
        'building_id': '1',
        'month': '2025-09'
    })
    
    # Create the viewset and call the method
    viewset = FinancialDashboardViewSet()
    viewset.request = request
    
    # Mock the query_params
    request.query_params = request.GET
    
    response = viewset.apartment_balances(request)
    
    if response.status_code == 200:
        data = response.data
        
        print("API Response Summary:")
        print(f"Total apartments: {len(data['apartments'])}")
        print(f"Summary total obligations: {data['summary']['total_obligations']:.2f} €")
        print(f"Summary total payments: {data['summary']['total_payments']:.2f} €")
        print(f"Summary total net obligations: {data['summary']['total_net_obligations']:.2f} €")
        print()
        
        print("Individual apartments:")
        for apt in data['apartments']:
            print(f"Apartment {apt['apartment_number']} ({apt['owner_name']}):")
            print(f"  Total obligations: {apt['total_obligations']:.2f} €")
            print(f"  Total payments: {apt['total_payments']:.2f} €")
            print(f"  Net obligation: {apt['net_obligation']:.2f} €")
            print(f"  Previous balance: {apt['previous_balance']:.2f} €")
            print(f"  Expense share: {apt['expense_share']:.2f} €")
            print(f"  Current balance (DB): {apt['current_balance']:.2f} €")
            print(f"  Status: {apt['status']}")
            print()
        
        print("=== VERIFICATION ===")
        
        # Compare with transaction-based calculation
        print("Comparing API calculations with Transaction-based calculations:")
        
        for apt in data['apartments']:
            apt_id = apt['apartment_id']
            apartment = Apartment.objects.get(id=apt_id)
            
            # Get all transactions for this apartment
            all_transactions = Transaction.objects.filter(apartment=apartment)
            balance_from_transactions = sum(t.amount for t in all_transactions)
            
            print(f"Apartment {apt['apartment_number']}:")
            print(f"  API current_balance: {apt['current_balance']:.2f} €")
            print(f"  DB current_balance: {apartment.current_balance:.2f} €")
            print(f"  Transactions sum: {balance_from_transactions:.2f} €")
            print(f"  API net_obligation: {apt['net_obligation']:.2f} €")
            
            # The debt shown in UI should be the absolute value of current_balance if negative
            expected_ui_debt = abs(apartment.current_balance) if apartment.current_balance < 0 else 0
            print(f"  Expected UI debt: {expected_ui_debt:.2f} €")
            
            if abs(apt['net_obligation'] - expected_ui_debt) > 0.01:
                print(f"  ⚠️  MISMATCH: API shows {apt['net_obligation']:.2f} €, should be {expected_ui_debt:.2f} €")
            else:
                print(f"  ✓ MATCH: API and expected values align")
            print()
            
    else:
        print(f"API Error: {response.status_code}")
        print(f"Response data: {response.data}")
    
    # Let's also check the raw expense calculations
    print("=== RAW EXPENSE CALCULATIONS ===")
    expenses = Expense.objects.filter(building_id=1, date__year=2025, date__month=9)
    apartments = Apartment.objects.filter(building_id=1).order_by('number')
    total_mills = sum(apt.participation_mills or 0 for apt in apartments)
    
    print(f"September expenses: {expenses.count()}")
    for expense in expenses:
        print(f"  {expense.title}: {expense.amount:.2f} € ({expense.distribution_type})")
        
        print("  Expected distribution:")
        expected_total = Decimal('0')
        for apt in apartments:
            if expense.distribution_type == 'by_participation_mills':
                mills = apt.participation_mills or 0
                if total_mills > 0:
                    share = expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))
                    expected_total += share
                    print(f"    Apt {apt.number}: {share:.2f} € ({mills} mills)")
        
        print(f"  Expected total: {expected_total:.2f} €")
        print(f"  Original amount: {expense.amount:.2f} €")
        print(f"  Difference: {abs(expected_total - expense.amount):.2f} €")