#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Τελική δοκιμή calculators με τα διορθωμένα δεδομένα
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator

def test_calculators_final():
    """Τελική δοκιμή calculators"""
    print("🧮 ΤΕΛΙΚΗ ΔΟΚΙΜΗ CALCULATORS")
    print("=" * 50)
    
    building_id = 4
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(id=building_id)
            apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
            expenses = Expense.objects.filter(building_id=building_id, is_issued=False)
            
            print(f"🏢 Κτίριο: {building.name}")
            print(f"🏠 Διαμερίσματα: {apartments.count()}")
            print(f"💰 Εκκρεμείς δαπάνες: {expenses.count()}")
            print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal}€")
            print(f"⏱️ Διάρκεια αποθεματικού: {building.reserve_fund_duration_months} μήνες")
            
            # Επαλήθευση χιλιοστών
            total_participation = sum(apt.participation_mills or 0 for apt in apartments)
            total_heating = sum(apt.heating_mills or 0 for apt in apartments)
            total_elevator = sum(apt.elevator_mills or 0 for apt in apartments)
            
            print(f"\n📊 Χιλιοστά:")
            print(f"  Συμμετοχής: {total_participation} {'✅' if total_participation == 1000 else '❌'}")
            print(f"  Θέρμανσης: {total_heating} {'✅' if total_heating == 1000 else '❌'}")
            print(f"  Ανελκυστήρα: {total_elevator} {'✅' if total_elevator == 1000 else '❌'}")
            
            # Επισκόπηση δαπανών
            print(f"\n💰 Δαπάνες:")
            total_expenses_amount = Decimal('0')
            for expense in expenses:
                print(f"  {expense.title}: {expense.amount}€ ({expense.get_distribution_type_display()})")
                total_expenses_amount += expense.amount
            print(f"  Σύνολο: {total_expenses_amount}€")
            
            print(f"\n🧮 ΔΟΚΙΜΗ BASIC CALCULATOR")
            print("-" * 30)
            
            # Basic Calculator
            basic_calculator = CommonExpenseCalculator(building_id)
            basic_result = basic_calculator.calculate_shares()
            
            basic_total = Decimal('0')
            print(f"📋 Αποτελέσματα:")
            for apt_id, share_data in basic_result.items():
                apartment = apartments.get(id=apt_id)
                total_amount = Decimal(str(share_data.get('total_amount', 0)))
                basic_total += total_amount
                print(f"  🏠 Διαμέρισμα {apartment.number}: {total_amount:.2f}€")
            
            print(f"💰 Συνολικό ποσό (Basic): {basic_total:.2f}€")
            
            print(f"\n🧮 ΔΟΚΙΜΗ ADVANCED CALCULATOR")
            print("-" * 30)
            
            # Advanced Calculator
            advanced_calculator = AdvancedCommonExpenseCalculator(building_id)
            advanced_result = advanced_calculator.calculate_advanced_shares()
            
            shares = advanced_result.get('shares', {})
            advanced_total = Decimal('0')
            
            print(f"📋 Αποτελέσματα:")
            for apt_id, share_data in shares.items():
                apartment = apartments.get(id=int(apt_id))
                total_amount = Decimal(str(share_data.get('total_amount', 0)))
                advanced_total += total_amount
                
                print(f"  🏠 Διαμέρισμα {apartment.number}: {total_amount:.2f}€")
                
                # Ανάλυση breakdown
                breakdown = share_data.get('breakdown', {})
                if breakdown:
                    for category, amount in breakdown.items():
                        if float(amount) > 0:
                            print(f"    - {category}: {amount}€")
            
            print(f"💰 Συνολικό ποσό (Advanced): {advanced_total:.2f}€")
            
            # Σύγκριση
            print(f"\n📊 ΣΥΓΚΡΙΣΗ ΑΠΟΤΕΛΕΣΜΑΤΩΝ")
            print("-" * 30)
            difference = abs(basic_total - advanced_total)
            print(f"Basic Calculator: {basic_total:.2f}€")
            print(f"Advanced Calculator: {advanced_total:.2f}€")
            print(f"Διαφορά: {difference:.2f}€")
            
            # Ανάλυση αναμενόμενων ποσών
            expected_management = building.management_fee_per_apartment * apartments.count()
            expected_reserve = building.reserve_contribution_per_apartment * apartments.count()
            expected_total_fixed = expected_management + expected_reserve
            
            print(f"\n🔍 ΑΝΑΛΥΤΙΚΗ ΑΝΑΜΕΝΟΜΕΝΑ ΠΟΣΑ")
            print("-" * 30)
            print(f"Διαχειριστικά: {expected_management:.2f}€")
            print(f"Αποθεματικό: {expected_reserve:.2f}€")
            print(f"Δαπάνες: {total_expenses_amount:.2f}€")
            print(f"Σύνολο αναμενόμενο: {expected_total_fixed + total_expenses_amount:.2f}€")
            
            # Έλεγχος ορθότητας
            print(f"\n✅ ΕΛΕΓΧΟΣ ΟΡΘΟΤΗΤΑΣ")
            print("-" * 30)
            
            advanced_expected = expected_total_fixed + total_expenses_amount
            if abs(advanced_total - advanced_expected) < 1:
                print("✅ Advanced Calculator: Σωστό αποτέλεσμα!")
            else:
                print(f"❌ Advanced Calculator: Διαφορά {abs(advanced_total - advanced_expected):.2f}€")
            
            basic_expected = expected_management + total_expenses_amount
            if abs(basic_total - basic_expected) < 1:
                print("✅ Basic Calculator: Σωστό αποτέλεσμα!")
            else:
                print(f"❌ Basic Calculator: Διαφορά {abs(basic_total - basic_expected):.2f}€")
            
            print(f"\n🎉 ΔΟΚΙΜΗ CALCULATORS ΟΛΟΚΛΗΡΩΘΗΚΕ!")
            
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_calculators_final()
