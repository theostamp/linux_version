#!/usr/bin/env python3
"""
Test script to verify decimal precision fix for apartment 4 specifically
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Apartment
from buildings.models import Building
from decimal import Decimal

def test_apartment_4_decimal_fix():
    """Test that apartment 4 expense calculations now return properly rounded values"""
    
    with schema_context('demo'):
        print("🧪 TESTING APARTMENT 4 DECIMAL PRECISION FIX")
        print("=" * 60)
        
        # Get building and apartment 4
        building = Building.objects.get(id=1)
        apartment_4 = Apartment.objects.filter(building_id=building.id, number='4').first()
        
        if not apartment_4:
            print("❌ Δεν βρέθηκε το διαμέρισμα 4")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"🏠 Διαμέρισμα 4: {apartment_4.owner_name}")
        print(f"📊 Χιλιοστά: {apartment_4.participation_mills}")
        print()
        
        # Get all apartments for total mills calculation
        apartments = Apartment.objects.filter(building_id=building.id)
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        apartments_count = apartments.count()
        
        print(f"📊 Συνολικά χιλιοστά: {total_mills}")
        print(f"🏠 Συνολικά διαμερίσματα: {apartments_count}")
        print()
        
        # Test with actual expenses
        expenses = Expense.objects.filter(building_id=building.id)
        
        print("📋 ΔΟΚΙΜΗ ΜΕ ΠΡΑΓΜΑΤΙΚΕΣ ΔΑΠΑΝΕΣ:")
        print("-" * 50)
        
        total_share = 0.0
        
        for expense in expenses:
            share_amount = 0.0
            
            if expense.distribution_type == 'by_participation_mills':
                mills = apartment_4.participation_mills or 0
                if total_mills > 0:
                    share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                else:
                    share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
            
            elif expense.distribution_type == 'equal_share':
                share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
            
            elif expense.distribution_type in ['by_meters', 'specific_apartments']:
                mills = apartment_4.participation_mills or 0
                if total_mills > 0:
                    share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                else:
                    share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
            
            total_share += share_amount
            
            print(f"📄 {expense.title}: {expense.amount}€ → {share_amount}€")
        
        print(f"\n💰 ΣΥΝΟΛΙΚΟ ΜΕΡΙΔΙΟ: {total_share}€")
        
        # Test the specific calculation that was causing the issue
        test_amount = 273.00  # This was causing 37.666666666666664
        test_mills = apartment_4.participation_mills or 0
        
        old_calculation = float(Decimal(str(test_amount)) * (Decimal(str(test_mills)) / Decimal(str(total_mills))))
        new_calculation = round(float(Decimal(str(test_amount)) * (Decimal(str(test_mills)) / Decimal(str(total_mills)))), 2)
        
        print(f"\n🧮 ΔΟΚΙΜΗ ΣΥΓΚΕΚΡΙΜΕΝΗΣ ΔΑΠΑΝΗΣ:")
        print(f"💰 Ποσό: {test_amount}€")
        print(f"📊 Χιλιοστά: {test_mills}/{total_mills}")
        print(f"❌ Παλιός υπολογισμός: {old_calculation}")
        print(f"✅ Νέος υπολογισμός: {new_calculation}")
        
        if old_calculation != new_calculation:
            print(f"🔄 Διαφορά: {old_calculation - new_calculation}")
        
        print("\n✅ Δοκιμή ολοκληρώθηκε!")

if __name__ == '__main__':
    test_apartment_4_decimal_fix()
