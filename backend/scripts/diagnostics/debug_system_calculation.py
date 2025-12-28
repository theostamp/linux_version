#!/usr/bin/env python3
"""
Debug: Πώς υπολογίζει το σύστημα το μηνιαίο σύνολο
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import CommonExpenseCalculator
from buildings.models import Building
from apartments.models import Apartment
from decimal import Decimal

def debug_system_calculation():
    """Ελέγχει πώς υπολογίζει το σύστημα το μηνιαίο σύνολο"""
    
    print("🔍 DEBUG: ΠΩΣ ΥΠΟΛΟΓΙΖΕΙ ΤΟ ΣΥΣΤΗΜΑ ΤΟ ΜΗΝΙΑΙΟ ΣΥΝΟΛΟ")
    print("=" * 60)
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο
        try:
            building = Building.objects.get(id=1)
            print(f"🏢 Κτίριο: {building.name}")
            print(f"📅 Financial System Start Date: {building.financial_system_start_date}")
            print(f"💰 Management Fee per Apartment: €{building.management_fee_per_apartment}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο με ID=1")
            return
        
        # Ελέγχουμε τα διαμερίσματα
        apartments = Apartment.objects.filter(building=building)
        apartments_count = apartments.count()
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments_count}")
        
        # Υπολογίζουμε το συνολικό μηνιαίο ποσό management fees
        monthly_management_total = building.management_fee_per_apartment * apartments_count
        print(f"💰 Μηνιαίο συνολικό management fees: €{monthly_management_total}")
        
        # Ελέγχουμε αν υπάρχει reserve fund
        print(f"\n📊 RESERVE FUND ΣΤΟΙΧΕΙΑ:")
        print(f"Reserve Fund Goal: €{building.reserve_fund_goal or 0}")
        print(f"Reserve Fund Duration: {building.reserve_fund_duration_months or 0} μήνες")
        print(f"Reserve Fund Start Date: {building.reserve_fund_start_date}")
        print(f"Reserve Fund Target Date: {building.reserve_fund_target_date}")
        
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_reserve_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"Μηνιαίος στόχος αποθεματικού: €{monthly_reserve_target:.2f}")
        else:
            monthly_reserve_target = Decimal('0.00')
            print(f"Μηνιαίος στόχος αποθεματικού: €0.00")
        
        # Ελέγχουμε τον υπολογισμό για Σεπτέμβριο 2025
        print(f"\n🧮 ΥΠΟΛΟΓΙΣΜΟΣ ΣΕΠΤΕΜΒΡΙΟΥ 2025:")
        
        try:
            calculator = CommonExpenseCalculator(building.id, "2025-09")
            
            # Ελέγχουμε τις διαθέσιμες μεθόδους
            print(f"🔍 Διαθέσιμες μέθοδοι: {[method for method in dir(calculator) if not method.startswith('_')]}")
            
            # Παίρνουμε τα δεδομένα από το calculate_shares
            shares_data = calculator.calculate_shares()
            
            print(f"📊 Στοιχεία από calculate_shares:")
            for key, value in shares_data.items():
                print(f"  - {key}: {value}")
            
            # Ελέγχουμε αν υπάρχει μέθοδος get_summary
            if hasattr(calculator, 'get_summary'):
                print(f"\n📊 Στοιχεία από get_summary:")
                summary = calculator.get_summary("2025-09")
                for key, value in summary.items():
                    if key != 'apartment_balances':  # Αυτό είναι πολύ μεγάλο
                        print(f"  - {key}: {value}")
            
            # Ελέγχουμε αν υπάρχει μέθοδος get_apartment_balances
            if hasattr(calculator, 'get_apartment_balances'):
                print(f"\n📊 Στοιχεία από get_apartment_balances:")
                apartment_balances = calculator.get_apartment_balances("2025-09")
                
                total_previous = sum(apt.get('previous_balance', 0) for apt in apartment_balances)
                total_current = sum(apt.get('expense_share', 0) for apt in apartment_balances)
                total_net = sum(apt.get('net_obligation', 0) for apt in apartment_balances)
                
                print(f"  - Total Previous Balance: €{total_previous:.2f}")
                print(f"  - Total Current Expense Share: €{total_current:.2f}")
                print(f"  - Total Net Obligation: €{total_net:.2f}")
                
                # Εμφανίζουμε τα πρώτα 3 διαμερίσματα
                for i, apt_balance in enumerate(apartment_balances[:3]):
                    apt_num = apt_balance.get('apartment_number', 'N/A')
                    previous = apt_balance.get('previous_balance', 0)
                    current = apt_balance.get('expense_share', 0)
                    net = apt_balance.get('net_obligation', 0)
                    print(f"  - Apt {apt_num}: Previous €{previous:.2f} + Current €{current:.2f} = Net €{net:.2f}")
                
                if len(apartment_balances) > 3:
                    print(f"  ... και {len(apartment_balances) - 3} ακόμα διαμερίσματα")
            
        except Exception as e:
            print(f"❌ Σφάλμα στον υπολογισμό: {e}")
            import traceback
            traceback.print_exc()
        
        # Ελέγχουμε αν το σύστημα προσθέτει reserve fund
        print(f"\n🔍 ΕΛΕΓΧΟΣ RESERVE FUND:")
        print(f"Management Fees: €{monthly_management_total}")
        print(f"Reserve Fund Target: €{monthly_reserve_target}")
        print(f"Συνολικό: €{monthly_management_total + monthly_reserve_target}")
        
        # Ελέγχουμε αν υπάρχουν άλλες κατηγορίες expenses
        print(f"\n📊 ΟΛΕΣ ΟΙ ΚΑΤΗΓΟΡΙΕΣ EXPENSES ΣΤΟ ΣΥΣΤΗΜΑ:")
        from financial.models import Expense
        all_categories = Expense.objects.filter(building=building).values_list('category', flat=True).distinct()
        for category in all_categories:
            count = Expense.objects.filter(building=building, category=category).count()
            total = sum(exp.amount for exp in Expense.objects.filter(building=building, category=category))
            print(f"  - {category}: {count} expenses, €{total:.2f}")

if __name__ == "__main__":
    debug_system_calculation()
