#!/usr/bin/env python3
"""
Script για έλεγχο υπολογισμών και debugging της διαφοράς των 50€
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
from apartments.models import Apartment
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator
from decimal import Decimal

def test_calculations_debug():
    """Έλεγχος υπολογισμών και debugging"""
    
    print("🧮 ΕΛΕΓΧΟΣ ΥΠΟΛΟΓΙΣΜΩΝ ΚΑΙ DEBUGGING")
    print("=" * 60)
    
    with schema_context('demo'):
        try:
            # Get building by address
            building = Building.objects.get(address__icontains='Αλκμάνος 22, Αθήνα 115 28')
            building_id = building.id
            print(f"🏢 Κτίριο: {building.name}, {building.address} (ID: {building_id})")
            print()
            
            # Get all apartments
            apartments = Apartment.objects.filter(building=building).order_by('number')
            print(f"📋 ΕΛΕΓΧΟΣ {apartments.count()} ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
            print("-" * 60)
            
            total_participation = 0
            total_heating = 0
            total_elevator = 0
            
            for apt in apartments:
                participation_mills = apt.participation_mills or 0
                heating_mills = apt.heating_mills or 0
                elevator_mills = apt.elevator_mills or 0
                
                total_participation += participation_mills
                total_heating += heating_mills
                total_elevator += elevator_mills
                
                print(f"Διαμέρισμα {apt.number:2}: Συμμετοχή={participation_mills:3} | Θέρμανση={heating_mills:3} | Ανελκυστήρας={elevator_mills:3}")
            
            print("-" * 60)
            print(f"ΣΥΝΟΛΑ: Συμμετοχή={total_participation} | Θέρμανση={total_heating} | Ανελκυστήρας={total_elevator}")
            print()
            
            # Test CommonExpenseCalculator
            print("🧮 ΔΟΚΙΜΗ CommonExpenseCalculator:")
            print("-" * 40)
            
            calculator = CommonExpenseCalculator(building_id)
            shares = calculator.calculate_shares()
            
            total_calculated = 0
            for apt_id, share in shares.items():
                total_due = share.get('total_due', 0)
                total_calculated += total_due
                print(f"Διαμέρισμα {share.get('apartment_number', apt_id)}: {total_due:.2f}€")
            
            print(f"ΣΥΝΟΛΟ ΥΠΟΛΟΓΙΣΜΕΝΟ: {total_calculated:.2f}€")
            print()
            
            # Test AdvancedCommonExpenseCalculator
            print("🧮 ΔΟΚΙΜΗ AdvancedCommonExpenseCalculator:")
            print("-" * 40)
            
            advanced_calculator = AdvancedCommonExpenseCalculator(building_id)
            advanced_result = advanced_calculator.calculate_advanced_shares()
            advanced_shares = advanced_result.get('shares', {})
            
            total_advanced = 0
            for apt_id, share in advanced_shares.items():
                total_due = share.get('total_due', 0)
                total_advanced += total_due
                print(f"Διαμέρισμα {share.get('apartment_number', apt_id)}: {total_due:.2f}€")
            
            print(f"ΣΥΝΟΛΟ ADVANCED: {total_advanced:.2f}€")
            print()
            
            # Check for differences
            difference = abs(total_calculated - total_advanced)
            print(f"🔍 ΔΙΑΦΟΡΑ: {difference:.2f}€")
            
            if difference > 0.01:
                print("❌ Υπάρχει διαφορά στους υπολογισμούς!")
            else:
                print("✅ Οι υπολογισμοί είναι ίδιοι!")
            
            # Check individual apartment differences
            print("\n🔍 ΕΛΕΓΧΟΣ ΔΙΑΦΟΡΩΝ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
            print("-" * 50)
            
            for apt in apartments:
                basic_share = shares.get(apt.id, {})
                advanced_share = advanced_shares.get(apt.id, {})
                
                basic_total = basic_share.get('total_due', 0)
                advanced_total = advanced_share.get('total_due', 0)
                apt_difference = abs(basic_total - advanced_total)
                
                if apt_difference > 0.01:
                    print(f"Διαμέρισμα {apt.number}: {basic_total:.2f}€ vs {advanced_total:.2f}€ (Διαφορά: {apt_difference:.2f}€)")
            
            # Check expense breakdown
            print("\n💰 ΕΛΕΓΧΟΣ ANATOMY ΔΑΠΑΝΩΝ:")
            print("-" * 40)
            
            # Get expense breakdown from advanced calculator
            expense_breakdown = advanced_result.get('expense_totals', {})
            print(f"Γενικές δαπάνες: {expense_breakdown.get('common', 0):.2f}€")
            print(f"Δαπάνες ανελκυστήρα: {expense_breakdown.get('elevator', 0):.2f}€")
            print(f"Δαπάνες θέρμανσης: {expense_breakdown.get('heating', 0):.2f}€")
            print(f"Λοιπές δαπάνες: {expense_breakdown.get('other', 0):.2f}€")
            print(f"Δαπάνες συνιδιοκτησίας: {expense_breakdown.get('coownership', 0):.2f}€")
            
            total_expenses = sum(float(v) for v in expense_breakdown.values())
            print(f"ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ: {total_expenses:.2f}€")
            
            # Check if this matches the expected 1830€
            expected_total = 1830.00
            difference_from_expected = abs(total_expenses - expected_total)
            print(f"\n🔍 ΔΙΑΦΟΡΑ ΑΠΟ ΑΝΑΜΕΝΟΜΕΝΟ ({expected_total}€): {difference_from_expected:.2f}€")
            
            if difference_from_expected > 0.01:
                print("❌ Δεν ταιριάζει με το αναμενόμενο ποσό!")
            else:
                print("✅ Ταιριάζει με το αναμενόμενο ποσό!")
            
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο Αλκμάνος 22, Αθήνα 115 28")
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_calculations_debug()
