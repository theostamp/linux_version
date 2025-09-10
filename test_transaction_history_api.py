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
    print("=== TESTING TRANSACTION HISTORY API ===\n")
    
    # Test transaction history for apartment 1
    factory = RequestFactory()
    request = factory.get('/financial/dashboard/apartment_transaction_history/', {
        'building_id': '1',
        'apartment_id': '1',  # First apartment
        'months_back': '6'
    })
    
    # Create the viewset and call the method
    viewset = FinancialDashboardViewSet()
    viewset.request = request
    request.query_params = request.GET
    
    response = viewset.apartment_transaction_history(request)
    
    if response.status_code == 200:
        data = response.data
        
        print("🏠 Apartment Information:")
        apt_info = data['apartment']
        print(f"  Number: {apt_info['number']}")
        print(f"  Owner: {apt_info['owner_name']}")
        print(f"  Current Balance: {apt_info['current_balance']:.2f} €")
        print()
        
        print("📊 Summary:")
        summary = data['summary']
        print(f"  Total Charges: {summary['total_charges']:.2f} €")
        print(f"  Total Payments: {summary['total_payments']:.2f} €")
        print(f"  Net Amount: {summary['net_amount']:.2f} €")
        print(f"  Months with Activity: {summary['months_with_activity']}")
        print()
        
        print("📅 Monthly Breakdown:")
        for month in data['months']:
            if month['charges'] or month['payments']:  # Only show months with activity
                print(f"\n  {month['month_display']} ({month['month']}):")
                print(f"    Charges: {len(month['charges'])} items, Total: {month['total_charges']:.2f} €")
                print(f"    Payments: {len(month['payments'])} items, Total: {month['total_payments']:.2f} €")
                print(f"    Net: {month['net_amount']:.2f} €")
                
                # Show individual charges
                if month['charges']:
                    print("    📋 Charges:")
                    for charge in month['charges']:
                        print(f"      - {charge['description']}: {charge['amount']:.2f} € ({charge['date'][:10]})")
                
                # Show individual payments
                if month['payments']:
                    print("    💰 Payments:")
                    for payment in month['payments']:
                        print(f"      - {payment['description']}: {payment['amount']:.2f} € ({payment['date'][:10]})")
        
        # Check if September 2025 has both expenses
        september_data = next((m for m in data['months'] if m['month'] == '2025-09'), None)
        if september_data:
            print(f"\n🎯 SEPTEMBER 2025 VERIFICATION:")
            print(f"  Expected charges: 2 (75€ + 100€ expenses)")
            print(f"  Actual charges: {len(september_data['charges'])}")
            print(f"  Expected total: ~16.63 €")
            print(f"  Actual total: {september_data['total_charges']:.2f} €")
            
            if len(september_data['charges']) == 2 and abs(september_data['total_charges'] - 16.63) < 1.0:
                print("  ✅ SUCCESS: September data looks correct!")
            else:
                print("  ❌ ISSUE: September data doesn't match expectations")
        else:
            print("\n❌ No September 2025 data found!")
        
    else:
        print(f"❌ API Error: {response.status_code}")
        print(f"Response: {response.data}")
    
    print("\n" + "="*60)
    
    # Test another apartment for comparison
    print("\n=== TESTING APARTMENT 8 (highest debt) ===")
    
    request2 = factory.get('/financial/dashboard/apartment_transaction_history/', {
        'building_id': '1',
        'apartment_id': '8',  # Apartment 8
        'months_back': '3'  # Just last 3 months
    })
    
    viewset2 = FinancialDashboardViewSet()
    viewset2.request = request2
    request2.query_params = request2.GET
    
    response2 = viewset2.apartment_transaction_history(request2)
    
    if response2.status_code == 200:
        data2 = response2.data
        apt_info2 = data2['apartment']
        
        print(f"🏠 Apartment {apt_info2['number']} ({apt_info2['owner_name']}):")
        print(f"  Current Balance: {apt_info2['current_balance']:.2f} €")
        print(f"  Summary - Charges: {data2['summary']['total_charges']:.2f} €")
        
        # Show September specifically
        sept_data2 = next((m for m in data2['months'] if m['month'] == '2025-09'), None)
        if sept_data2:
            print(f"  September charges: {len(sept_data2['charges'])}, Total: {sept_data2['total_charges']:.2f} €")
        else:
            print("  No September data")
    else:
        print(f"❌ API Error for apartment 8: {response2.status_code}")