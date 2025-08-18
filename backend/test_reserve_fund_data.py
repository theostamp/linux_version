#!/usr/bin/env python3
"""
Script για έλεγχο δεδομένων αποθεματικού στη βάση
"""

import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.services import FinancialDashboardService

def test_reserve_fund_data():
    """Έλεγχος δεδομένων αποθεματικού στη βάση"""
    
    print("💰 ΕΛΕΓΧΟΣ ΔΕΔΟΜΕΝΩΝ ΑΠΟΘΕΜΑΤΙΚΟΥ")
    print("=" * 50)
    
    with schema_context('demo'):
        try:
            # Get building by address
            building = Building.objects.get(address__icontains='Αλκμάνος 22, Αθήνα 115 28')
            building_id = building.id
            print(f"🏢 Κτίριο: {building.name}, {building.address} (ID: {building_id})")
            print()
            
            # Check building reserve fund settings
            print("📋 Ρυθμίσεις Αποθεματικού στο Building Model:")
            print("-" * 50)
            print(f"   reserve_fund_goal: {building.reserve_fund_goal}")
            print(f"   reserve_fund_duration_months: {building.reserve_fund_duration_months}")
            print(f"   reserve_contribution_per_apartment: {building.reserve_contribution_per_apartment}")
            print(f"   current_reserve: {building.current_reserve}")
            print()
            
            # Test FinancialDashboardService
            print("🧮 Δοκιμή FinancialDashboardService:")
            print("-" * 50)
            service = FinancialDashboardService(building_id)
            summary = service.get_summary()
            
            print("📊 API Response:")
            print(f"   reserve_fund_goal: {summary.get('reserve_fund_goal', 0)}")
            print(f"   reserve_fund_duration_months: {summary.get('reserve_fund_duration_months', 0)}")
            print(f"   reserve_fund_monthly_target: {summary.get('reserve_fund_monthly_target', 0)}")
            print(f"   current_reserve: {summary.get('current_reserve', 0)}")
            print(f"   total_balance: {summary.get('total_balance', 0)}")
            print(f"   current_obligations: {summary.get('current_obligations', 0)}")
            print()
            
            # Check if data is missing
            if not building.reserve_fund_goal or building.reserve_fund_goal == 0:
                print("❌ Δεν έχει οριστεί στόχος αποθεματικού στη βάση!")
                print("💡 Λύση: Ενημέρωση του building model")
            else:
                print("✅ Τα δεδομένα αποθεματικού υπάρχουν στη βάση!")
            
            # Check if monthly target is calculated correctly
            if building.reserve_fund_goal and building.reserve_fund_duration_months:
                expected_monthly = building.reserve_fund_goal / building.reserve_fund_duration_months
                actual_monthly = summary.get('reserve_fund_monthly_target', 0)
                print(f"📊 Υπολογισμός μηνιαίας εισφοράς:")
                print(f"   Αναμενόμενη: {expected_monthly}€")
                print(f"   Πραγματική: {actual_monthly}€")
                print(f"   Σωστή: {'✅' if abs(expected_monthly - actual_monthly) < 0.01 else '❌'}")
            
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο Αλκμάνος 22, Αθήνα 115 28")
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_reserve_fund_data()
