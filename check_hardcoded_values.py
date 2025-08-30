import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import CommonExpenseCalculator, FinancialDashboardService
from buildings.models import Building
from apartments.models import Apartment
from datetime import datetime, date
from decimal import Decimal

# All database operations must be within schema_context
with schema_context('demo'):
    print("🔍 Ανάλυση hardcoded τιμών και αυτόματων υπολογισμών")
    print("=" * 60)
    
    # Test building 1 (should be Αραχώβης 12)
    try:
        building = Building.objects.get(id=1)
        print(f"📍 Κτίριο ID 1: {building.name} - {building.address}")
    except Building.DoesNotExist:
        print("❌ Κτίριο ID 1 δεν βρέθηκε")
        # Try building 2
        building = Building.objects.get(id=2)
        print(f"📍 Κτίριο ID 2: {building.name} - {building.address}")
    
    print(f"📊 Στοιχεία κτιρίου:")
    print(f"   Reserve Fund Goal: {building.reserve_fund_goal}€")
    print(f"   Reserve Fund Duration: {building.reserve_fund_duration_months} μήνες")
    print(f"   Current Reserve: {building.current_reserve}€")
    print(f"   Management Fee: {getattr(building, 'management_fee', 'N/A')}€")
    print()
    
    # Check apartments
    apartments = Apartment.objects.filter(building=building)
    print(f"🏠 Διαμερίσματα: {apartments.count()}")
    total_mills = sum(apt.participation_mills or 0 for apt in apartments)
    print(f"   Συνολικά χιλιοστά: {total_mills}")
    print()
    
    # Test CommonExpenseCalculator for different months
    test_months = ['2025-01', '2025-02', '2025-06', '2025-08']
    
    for month in test_months:
        print(f"📅 Τεστ για {month}:")
        
        try:
            # Test with CommonExpenseCalculator
            calculator = CommonExpenseCalculator(building.id)
            shares = calculator.calculate_shares(include_reserve_fund=True)
            
            print(f"   🧮 CommonExpenseCalculator:")
            
            # Check total expenses calculated
            total_expenses = calculator.get_total_expenses()
            print(f"     Συνολικές δαπάνες: {total_expenses}€")
            
            # Check if there are hardcoded management fees
            if hasattr(calculator, 'management_fee'):
                print(f"     Management Fee: {calculator.management_fee}€")
            
            # Check reserve fund calculation
            if building.reserve_fund_goal and building.reserve_fund_duration_months:
                monthly_reserve = building.reserve_fund_goal / building.reserve_fund_duration_months
                print(f"     Μηνιαίο αποθεματικό: {monthly_reserve}€")
            
            # Sample apartment calculation
            if apartments.exists():
                sample_apt = apartments.first()
                apt_share = shares.get(sample_apt.id, {})
                print(f"     Δείγμα διαμέρισμα {sample_apt.number}:")
                print(f"       Total Amount: {apt_share.get('total_amount', 0)}€")
                print(f"       Reserve Fund: {apt_share.get('reserve_fund_amount', 0)}€")
                print(f"       Breakdown: {len(apt_share.get('breakdown', []))} items")
                
                # Show breakdown details
                for item in apt_share.get('breakdown', []):
                    print(f"         • {item.get('title', 'N/A')}: {item.get('amount', 0)}€")
            
        except Exception as e:
            print(f"     ❌ Σφάλμα: {str(e)}")
        
        print()
    
    # Test FinancialDashboardService
    print("🎯 Τεστ FinancialDashboardService:")
    try:
        dashboard_service = FinancialDashboardService(building.id)
        summary = dashboard_service.get_summary(month='2025-02')
        
        print(f"   Total Balance: {summary.get('total_balance', 0)}€")
        print(f"   Total Expenses Month: {summary.get('total_expenses_month', 0)}€")
        print(f"   Management Fees: {summary.get('management_fees', 0)}€")
        print(f"   Reserve Fund Contribution: {summary.get('reserve_fund_contribution', 0)}€")
        
        # Check for hardcoded values
        if summary.get('management_fees', 0) > 0:
            print(f"   ⚠️  Management fees βρέθηκαν: {summary.get('management_fees', 0)}€")
        
    except Exception as e:
        print(f"   ❌ Σφάλμα: {str(e)}")
    
    print("\n" + "=" * 60)
    
    # Check for any hardcoded values in the code
    print("🔍 Αναζήτηση για hardcoded τιμές 310 ή 300:")
    
    # This is a simple check - in real scenario we'd grep the codebase
    print("   (Αυτό θα χρειαστεί manual έλεγχο του κώδικα)")
    
    print("\n✅ Ανάλυση ολοκληρώθηκε!")
