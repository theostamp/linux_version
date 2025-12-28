import os
import sys
import django
import json

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.test import RequestFactory
from financial.views import FinancialDashboardViewSet

# All database operations within tenant context
with schema_context('demo'):
    print("=== TESTING NEW API LOGIC FOR SEPTEMBER 2025 ===\n")
    
    # Test with September 2025 filter
    factory = RequestFactory()
    request = factory.get('/financial/dashboard/apartment_balances/', {
        'building_id': '1',
        'month': '2025-09'
    })
    
    # Create the viewset and call the method
    viewset = FinancialDashboardViewSet()
    viewset.request = request
    request.query_params = request.GET
    
    response = viewset.apartment_balances(request)
    
    if response.status_code == 200:
        data = response.data
        
        print("🎯 API Response for SEPTEMBER 2025:")
        print(f"Total apartments: {len(data['apartments'])}")
        print(f"Summary total obligations: {data['summary']['total_obligations']:.2f} €")
        print(f"Summary total payments: {data['summary']['total_payments']:.2f} €")
        print(f"Summary total net obligations: {data['summary']['total_net_obligations']:.2f} €")
        print()
        
        expected_total = 75.00  # Only September expense
        actual_total = data['summary']['total_net_obligations']
        
        if abs(actual_total - expected_total) < 1.0:
            print(f"✅ SUCCESS: Total net obligations {actual_total:.2f} € matches expected {expected_total:.2f} €")
        else:
            print(f"❌ FAILED: Total net obligations {actual_total:.2f} € != expected {expected_total:.2f} €")
        
        print("\nIndividual apartment debts:")
        for apt in data['apartments'][:3]:  # Show first 3 apartments
            print(f"  Apartment {apt['apartment_number']}: {apt['net_obligation']:.2f} €")
        print(f"  ...")
        
        # Check if we have the right number of expenses
        first_apt = data['apartments'][0]
        print(f"\nFirst apartment expense breakdown ({len(first_apt['expense_breakdown'])} items):")
        for expense in first_apt['expense_breakdown']:
            print(f"  - {expense['expense_title']}: {expense['share_amount']:.2f} € ({expense['month']})")
        
    else:
        print(f"❌ API Error: {response.status_code}")
        print(f"Response: {response.data}")
    
    print("\n" + "="*60)
    
    # Test without month filter (should show all expenses)
    print("\n=== TESTING API WITHOUT MONTH FILTER (ALL EXPENSES) ===\n")
    
    request2 = factory.get('/financial/dashboard/apartment_balances/', {
        'building_id': '1'
    })
    
    viewset2 = FinancialDashboardViewSet()
    viewset2.request = request2
    request2.query_params = request2.GET
    
    response2 = viewset2.apartment_balances(request2)
    
    if response2.status_code == 200:
        data2 = response2.data
        
        print("🎯 API Response for ALL MONTHS:")
        print(f"Total apartments: {len(data2['apartments'])}")
        print(f"Summary total obligations: {data2['summary']['total_obligations']:.2f} €")
        print(f"Summary total payments: {data2['summary']['total_payments']:.2f} €")
        print(f"Summary total net obligations: {data2['summary']['total_net_obligations']:.2f} €")
        
        expected_all_total = 249.99  # All expenses
        actual_all_total = data2['summary']['total_net_obligations']
        
        if abs(actual_all_total - expected_all_total) < 1.0:
            print(f"✅ SUCCESS: Total net obligations {actual_all_total:.2f} € matches expected {expected_all_total:.2f} €")
        else:
            print(f"❌ FAILED: Total net obligations {actual_all_total:.2f} € != expected {expected_all_total:.2f} €")
        
        print("\nFirst apartment expense breakdown (all months):")
        first_apt_all = data2['apartments'][0]
        for expense in first_apt_all['expense_breakdown']:
            print(f"  - {expense['expense_title']}: {expense['share_amount']:.2f} € ({expense['month']})")
        
    else:
        print(f"❌ API Error: {response2.status_code}")
        print(f"Response: {response2.data}")