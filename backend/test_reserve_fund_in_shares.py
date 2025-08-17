#!/usr/bin/env python3
"""
🧪 Test Reserve Fund in Shares

Αυτό το script ελέγχει το νέο σύστημα που εμφανίζει το αποθεματικό
στο φύλλο κοινοχρήστων ανάλογα με τα χιλιοστά.
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from financial.services import CommonExpenseCalculator
from apartments.models import Apartment

def test_reserve_fund_in_shares():
    """Ελέγχει το σύστημα αποθεματικού στο φύλλο κοινοχρήστων"""
    
    print("🧪 TEST RESERVE FUND IN SHARES")
    print("=" * 50)
    
    try:
        # Get demo tenant
        client = Client.objects.get(schema_name='demo')
        print(f"🏢 Tenant: {client.name}")
        
        # Check in tenant context
        with tenant_context(client):
            buildings = Building.objects.all()
            print(f"📊 Βρέθηκαν {buildings.count()} κτίρια")
            
            for building in buildings:
                print(f"\n🏢 Κτίριο: {building.name}")
                print(f"   ID: {building.id}")
                
                # Check reserve fund settings
                print(f"\n🎯 Ρυθμίσεις Αποθεματικού:")
                print(f"   - Στόχος: {building.reserve_fund_goal or 0}€")
                print(f"   - Διάρκεια: {building.reserve_fund_duration_months or 0} μήνες")
                print(f"   - Ημερομηνία έναρξης: {building.reserve_fund_start_date or 'Δεν έχει οριστεί'}")
                print(f"   - Εισφορά ανά διαμέρισμα: {building.reserve_contribution_per_apartment or 0}€")
                
                # Calculate monthly target
                monthly_target = 0
                if building.reserve_fund_goal and building.reserve_fund_duration_months:
                    monthly_target = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
                print(f"   - Μηνιαίος στόχος: {monthly_target:.2f}€")
                
                # Test calculator with reserve fund
                print(f"\n🧮 Υπολογισμός με Αποθεματικό:")
                calculator = CommonExpenseCalculator(building.id)
                shares_with_reserve = calculator.calculate_shares(include_reserve_fund=True)
                
                total_reserve_fund = sum(
                    share.get('reserve_fund_amount', 0) for share in shares_with_reserve.values()
                )
                
                print(f"   - Συνολικό αποθεματικό στο φύλλο: {total_reserve_fund:.2f}€")
                
                # Show breakdown for each apartment
                print(f"\n📋 Ανάλυση ανά Διαμέρισμα:")
                for apartment_id, share in shares_with_reserve.items():
                    apartment = Apartment.objects.get(id=apartment_id)
                    reserve_amount = share.get('reserve_fund_amount', 0)
                    total_amount = share.get('total_amount', 0)
                    total_due = share.get('total_due', 0)
                    
                    print(f"   - {apartment.number} ({apartment.owner_name}):")
                    print(f"     * Χιλιοστά: {apartment.participation_mills or 0}")
                    print(f"     * Κοινόχρηστα: {total_amount:.2f}€")
                    print(f"     * Αποθεματικό: {reserve_amount:.2f}€")
                    print(f"     * Συνολικό οφειλόμενο: {total_due:.2f}€")
                    
                    # Show breakdown
                    if share.get('breakdown'):
                        print(f"     * Ανάλυση:")
                        for item in share['breakdown']:
                            if item.get('distribution_type') == 'reserve_fund':
                                print(f"       - {item['expense_title']}: {item['apartment_share']:.2f}€")
                            else:
                                print(f"       - {item['expense_title']}: {item['apartment_share']:.2f}€")
                
                # Test calculator without reserve fund
                print(f"\n🧮 Υπολογισμός ΧΩΡΙΣ Αποθεματικό:")
                shares_without_reserve = calculator.calculate_shares(include_reserve_fund=False)
                
                total_without_reserve = sum(
                    share.get('reserve_fund_amount', 0) for share in shares_without_reserve.values()
                )
                
                print(f"   - Συνολικό αποθεματικό στο φύλλο: {total_without_reserve:.2f}€")
                
                # Compare results
                print(f"\n📊 Σύγκριση Αποτελεσμάτων:")
                print(f"   - Με αποθεματικό: {total_reserve_fund:.2f}€")
                print(f"   - Χωρίς αποθεματικό: {total_without_reserve:.2f}€")
                print(f"   - Διαφορά: {total_reserve_fund - total_without_reserve:.2f}€")
                
                print(f"\n{'='*50}")
        
        print(f"\n🎉 Το test ολοκληρώθηκε!")
        
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε το demo tenant!")
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Starting Reserve Fund in Shares Test...")
    test_reserve_fund_in_shares()
    print("\n✅ Test completed!")
