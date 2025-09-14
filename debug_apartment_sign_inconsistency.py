import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from financial.models import Transaction
from apartments.models import Apartment

# All database operations within tenant context
with schema_context('demo'):
    print("=== Debugging Apartment Balance Sign Inconsistency ===")
    
    service = FinancialDashboardService(building_id=1)
    apartment_balances = service.get_apartment_balances(month='2025-09')
    
    print(f"\n🔍 Comparing apartments with inconsistent signs:")
    
    # Show apartments with different signs
    apartments_analysis = []
    for apt in apartment_balances[:4]:  # First 4 apartments
        current_balance = float(apt.get('current_balance', 0))
        previous_balance = float(apt.get('previous_balance', 0))
        net_obligation = float(apt.get('net_obligation', 0))
        status = apt.get('status', 'N/A')
        
        apartments_analysis.append({
            'number': apt['apartment_number'],
            'owner': apt['owner_name'],
            'current_balance': current_balance,
            'previous_balance': previous_balance,
            'net_obligation': net_obligation,
            'status': status
        })
        
        print(f"\n🏠 Apartment {apt['apartment_number']} ({apt['owner_name']}):")
        print(f"   current_balance: €{current_balance}")
        print(f"   previous_balance: €{previous_balance}")
        print(f"   net_obligation: €{net_obligation}")
        print(f"   status: {status}")
        print(f"   Expected: All should be positive (debt) with status 'Οφειλή'")
    
    print(f"\n🔧 Let's check the underlying data for these apartments...")
    
    # Check transactions for apartments 1 and 10 (the negative ones)
    for apt_num in ['1', '10']:
        print(f"\n📋 Transactions for Apartment {apt_num}:")
        apartment = Apartment.objects.get(building_id=1, number=apt_num)
        
        transactions = Transaction.objects.filter(
            apartment_number=apt_num,
            date__year=2025,
            date__month=8
        ).order_by('date')
        
        for trans in transactions:
            print(f"   {trans.date}: {trans.type} - €{trans.amount} (ref: {trans.reference_type}:{trans.reference_id})")
        
        # Check apartment current_balance field
        print(f"   Raw apartment.current_balance: €{apartment.current_balance}")
    
    print(f"\n🎯 PROBLEM ANALYSIS:")
    negative_apartments = [apt for apt in apartments_analysis if apt['current_balance'] < 0]
    positive_apartments = [apt for apt in apartments_analysis if apt['current_balance'] > 0]
    
    print(f"   Apartments with NEGATIVE balances: {[apt['number'] for apt in negative_apartments]}")
    print(f"   Apartments with POSITIVE balances: {[apt['number'] for apt in positive_apartments]}")
    
    if len(negative_apartments) > 0 and len(positive_apartments) > 0:
        print(f"   ❌ INCONSISTENCY: Some apartments have negative, some positive")
        print(f"   ❌ This suggests the balance calculation is not uniform")
        print(f"   🔧 Need to investigate why apartment balance calculations differ")
    
    print(f"\n📊 Expected behavior:")
    print(f"   - ALL apartments should have positive balances (€17-23)")
    print(f"   - ALL apartments should have status 'Οφειλή'")
    print(f"   - NO apartments should be 'Πιστωτικό' since they all have August debt")
    
    # Let's check if apartment.current_balance got updated differently
    print(f"\n💾 Checking apartment.current_balance field in database:")
    apartments = Apartment.objects.filter(building_id=1).order_by('number')[:4]
    for apartment in apartments:
        print(f"   Apartment {apartment.number}: current_balance = €{apartment.current_balance}")
        
    print(f"\n🔧 LIKELY CAUSE:")
    print(f"   The apartment.current_balance field was updated inconsistently")
    print(f"   Some apartments have negative current_balance, some positive")
    print(f"   This affects the get_apartment_balances calculation")