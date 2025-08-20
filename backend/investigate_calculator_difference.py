#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Διερεύνηση διαφοράς μεταξύ Basic και Advanced Calculator
για την πολυκατοικία Αλκμάνος 22
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

def investigate_difference():
    """Διερεύνηση διαφοράς μεταξύ calculators"""
    print("🔍 ΔΙΕΡΕΥΝΗΣΗ ΔΙΑΦΟΡΑΣ ΜΕΤΑΞΥ CALCULATORS")
    print("=" * 50)
    
    building_id = 4
    
    with schema_context('demo'):
        try:
            # Πληροφορίες κτιρίου
            building = Building.objects.get(id=building_id)
            apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
            
            print(f"🏢 Κτίριο: {building.name}")
            print(f"🏠 Διαμερίσματα: {apartments.count()}")
            print(f"💶 Διαχειριστικά ανά διαμέρισμα: {building.management_fee_per_apartment}€")
            print(f"💰 Εισφορά αποθεματικού ανά διαμέρισμα: {building.reserve_contribution_per_apartment}€")
            print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal}€")
            print(f"⏱️ Διάρκεια αποθεματικού: {building.reserve_fund_duration_months} μήνες")
            
            print(f"\n📊 BASIC CALCULATOR ANALYSIS")
            print("-" * 30)
            
            # Basic Calculator
            basic_calculator = CommonExpenseCalculator(building_id)
            basic_result = basic_calculator.calculate_shares()
            
            basic_total = Decimal('0')
            print(f"📋 Αναλυτικά αποτελέσματα Basic Calculator:")
            
            for apt_id, share_data in basic_result.items():
                apartment = apartments.get(id=apt_id)
                total_amount = share_data.get('total_amount', 0)
                basic_total += Decimal(str(total_amount))
                
                print(f"  🏠 Διαμέρισμα {apartment.number}: {total_amount}€")
                
                # Ανάλυση breakdown
                breakdown = share_data.get('breakdown', [])
                for item in breakdown:
                    print(f"    - {item.get('expense_title', 'N/A')}: {item.get('apartment_share', 0)}€")
            
            print(f"\n💰 BASIC TOTAL: {basic_total}€")
            
            print(f"\n📊 ADVANCED CALCULATOR ANALYSIS")
            print("-" * 30)
            
            # Advanced Calculator
            advanced_calculator = AdvancedCommonExpenseCalculator(building_id)
            advanced_result = advanced_calculator.calculate_advanced_shares()
            
            shares = advanced_result.get('shares', {})
            advanced_total = Decimal('0')
            
            print(f"📋 Αναλυτικά αποτελέσματα Advanced Calculator:")
            
            for apt_id, share_data in shares.items():
                apartment = apartments.get(id=int(apt_id))
                total_amount = share_data.get('total_amount', 0)
                advanced_total += Decimal(str(total_amount))
                
                print(f"  🏠 Διαμέρισμα {apartment.number}: {total_amount}€")
                
                # Ανάλυση breakdown
                breakdown = share_data.get('breakdown', {})
                for category, amount in breakdown.items():
                    if amount > 0:
                        print(f"    - {category}: {amount}€")
            
            print(f"\n💰 ADVANCED TOTAL: {advanced_total}€")
            
            # Ανάλυση διαφοράς
            difference = abs(basic_total - advanced_total)
            print(f"\n🔍 ΑΝΑΛΥΣΗ ΔΙΑΦΟΡΑΣ")
            print("-" * 30)
            print(f"Basic Calculator: {basic_total}€")
            print(f"Advanced Calculator: {advanced_total}€")
            print(f"Διαφορά: {difference}€")
            
            # Λεπτομερής σύγκριση
            print(f"\n📊 ΛΕΠΤΟΜΕΡΗΣ ΣΥΓΚΡΙΣΗ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ")
            print("-" * 40)
            
            for apt_id in basic_result.keys():
                apartment = apartments.get(id=apt_id)
                basic_amount = Decimal(str(basic_result[apt_id].get('total_amount', 0)))
                advanced_amount = Decimal(str(shares.get(str(apt_id), {}).get('total_amount', 0)))
                apt_diff = abs(basic_amount - advanced_amount)
                
                print(f"🏠 Διαμέρισμα {apartment.number}:")
                print(f"  Basic: {basic_amount}€")
                print(f"  Advanced: {advanced_amount}€")
                print(f"  Διαφορά: {apt_diff}€")
            
            # Ανάλυση πηγής διαφοράς
            print(f"\n🔍 ΑΝΑΛΥΣΗ ΠΗΓΗΣ ΔΙΑΦΟΡΑΣ")
            print("-" * 30)
            
            # Έλεγχος αν υπάρχουν δαπάνες
            expenses = Expense.objects.filter(building_id=building_id, is_issued=False)
            print(f"💰 Εκκρεμείς δαπάνες: {expenses.count()}")
            
            if expenses.count() == 0:
                print("⚠️ Δεν υπάρχουν δαπάνες - η διαφορά προέρχεται από:")
                print("  - Διαχειριστικά τέλη")
                print("  - Αποθεματικό ταμείο")
                print("  - Διαφορετικούς αλγορίθμους υπολογισμού")
                
                # Υπολογισμός αναμενόμενων διαχειριστικών
                expected_management = building.management_fee_per_apartment * apartments.count()
                print(f"  📊 Αναμενόμενα διαχειριστικά: {expected_management}€")
                
                # Υπολογισμός αναμενόμενου αποθεματικού
                expected_reserve = building.reserve_contribution_per_apartment * apartments.count()
                print(f"  📊 Αναμενόμενο αποθεματικό: {expected_reserve}€")
                
                total_expected = expected_management + expected_reserve
                print(f"  📊 Συνολικό αναμενόμενο: {total_expected}€")
                
                # Συσχέτιση με αποτελέσματα
                if abs(basic_total - expected_management) < 1:
                    print("  ✅ Basic Calculator υπολογίζει μόνο διαχειριστικά")
                
                if abs(advanced_total - total_expected) < 1:
                    print("  ✅ Advanced Calculator υπολογίζει διαχειριστικά + αποθεματικό")
                    
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    investigate_difference()
