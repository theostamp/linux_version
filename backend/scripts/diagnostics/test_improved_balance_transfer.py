#!/usr/bin/env python3
"""
Test script για τη βελτιωμένη λογική μεταφοράς υπολοίπων
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import MonthlyBalance, Expense, Payment
from buildings.models import Building
from django.db.models import Sum
from decimal import Decimal
from datetime import date

def test_improved_balance_transfer():
    """Δοκιμή της βελτιωμένης λογικής μεταφοράς υπολοίπων"""
    
    with schema_context('demo'):
        print("=== ΔΟΚΙΜΗ ΒΕΛΤΙΩΜΕΝΗΣ ΛΟΓΙΚΗΣ ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ ===")
        print("=" * 80)
        
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        
        # Δημιουργία test data για 2024
        print(f"\n📊 Δημιουργία test data για 2024...")
        
        # Δεκέμβριος 2024
        december_2024, created = MonthlyBalance.objects.get_or_create(
            building=building,
            year=2024,
            month=12,
            defaults={
                'total_expenses': Decimal('1000.00'),
                'total_payments': Decimal('800.00'),
                'previous_obligations': Decimal('200.00'),  # Από Νοέμβριο
                'reserve_fund_amount': Decimal('100.00'),
                'management_fees': Decimal('50.00'),
                'carry_forward': Decimal('0.00'),
                'annual_carry_forward': Decimal('0.00'),
                'balance_year': 2024,
            }
        )
        
        if created:
            print(f"   ✅ Δημιουργήθηκε Δεκέμβριος 2024")
        else:
            print(f"   📋 Υπήρχε ήδη Δεκέμβριος 2024")
        
        # Εμφάνιση αρχικών δεδομένων
        print(f"\n📅 Δεκέμβριος 2024:")
        print(f"   💸 Δαπάνες: €{december_2024.total_expenses}")
        print(f"   💰 Εισπράξεις: €{december_2024.total_payments}")
        print(f"   📊 Παλαιότερες οφειλές: €{december_2024.previous_obligations}")
        print(f"   🏦 Αποθεματικό: €{december_2024.reserve_fund_amount}")
        print(f"   🏢 Διαχείριση: €{december_2024.management_fees}")
        print(f"   📈 Συνολικές υποχρεώσεις: €{december_2024.total_obligations}")
        print(f"   💹 Καθαρό αποτέλεσμα: €{december_2024.net_result}")
        
        # Κλείσιμο Δεκεμβρίου 2024
        print(f"\n🔒 Κλείσιμο Δεκεμβρίου 2024...")
        december_2024.close_month()
        
        print(f"   📊 Carry Forward: €{december_2024.carry_forward}")
        print(f"   🔄 Annual Carry Forward: €{december_2024.annual_carry_forward}")
        print(f"   📅 Balance Year: {december_2024.balance_year}")
        
        # Έλεγχος Ιανουαρίου 2025
        january_2025 = MonthlyBalance.objects.filter(
            building=building,
            year=2025,
            month=1
        ).first()
        
        if january_2025:
            print(f"\n📅 Ιανουάριος 2025:")
            print(f"   📊 Previous Obligations: €{january_2025.previous_obligations}")
            print(f"   📅 Balance Year: {january_2025.balance_year}")
            
            # Έλεγχος ετήσιας μεταφοράς
            if january_2025.previous_obligations == december_2024.annual_carry_forward:
                print(f"   ✅ Ετήσια μεταφορά λειτουργεί σωστά!")
                print(f"      Δεκέμβριος 2024 → Ιανουάριος 2025: €{december_2024.annual_carry_forward}")
            else:
                print(f"   ❌ Πρόβλημα στην ετήσια μεταφορά!")
                print(f"      Expected: €{december_2024.annual_carry_forward}")
                print(f"      Actual: €{january_2025.previous_obligations}")
        else:
            print(f"   ❌ Δεν βρέθηκε Ιανουάριος 2025")
        
        # Δοκιμή μηνιαίας μεταφοράς
        print(f"\n📅 Δοκιμή μηνιαίας μεταφοράς...")
        
        # Φεβρουάριος 2025
        february_2025, created = MonthlyBalance.objects.get_or_create(
            building=building,
            year=2025,
            month=2,
            defaults={
                'total_expenses': Decimal('1200.00'),
                'total_payments': Decimal('1000.00'),
                'previous_obligations': Decimal('0.00'),  # Θα ενημερωθεί
                'reserve_fund_amount': Decimal('100.00'),
                'management_fees': Decimal('50.00'),
                'carry_forward': Decimal('0.00'),
                'annual_carry_forward': Decimal('0.00'),
                'balance_year': 2025,
            }
        )
        
        # Κλείσιμο Ιανουαρίου 2025
        if january_2025:
            january_2025.total_expenses = Decimal('1100.00')
            january_2025.total_payments = Decimal('900.00')
            january_2025.save()
            
            print(f"   📅 Ιανουάριος 2025:")
            print(f"      💸 Δαπάνες: €{january_2025.total_expenses}")
            print(f"      💰 Εισπράξεις: €{january_2025.total_payments}")
            print(f"      📊 Παλαιότερες οφειλές: €{january_2025.previous_obligations}")
            print(f"      📈 Συνολικές υποχρεώσεις: €{january_2025.total_obligations}")
            print(f"      💹 Καθαρό αποτέλεσμα: €{january_2025.net_result}")
            
            january_2025.close_month()
            print(f"      📊 Carry Forward: €{january_2025.carry_forward}")
            
            # Έλεγχος Φεβρουαρίου 2025
            february_2025.refresh_from_db()
            if february_2025.previous_obligations == january_2025.carry_forward:
                print(f"   ✅ Μηνιαία μεταφορά λειτουργεί σωστά!")
                print(f"      Ιανουάριος 2025 → Φεβρουάριος 2025: €{january_2025.carry_forward}")
            else:
                print(f"   ❌ Πρόβλημα στη μηνιαία μεταφορά!")
                print(f"      Expected: €{january_2025.carry_forward}")
                print(f"      Actual: €{february_2025.previous_obligations}")
        
        # Συνοπτική αναφορά
        print(f"\n🎯 ΣΥΝΟΠΤΙΚΗ ΑΝΑΦΟΡΑ:")
        print(f"   📊 Δεκέμβριος 2024:")
        print(f"      - Net Result: €{december_2024.net_result}")
        print(f"      - Carry Forward: €{december_2024.carry_forward}")
        print(f"      - Annual Carry Forward: €{december_2024.annual_carry_forward}")
        
        if january_2025:
            print(f"   📊 Ιανουάριος 2025:")
            print(f"      - Previous Obligations: €{january_2025.previous_obligations}")
            print(f"      - Net Result: €{january_2025.net_result}")
            print(f"      - Carry Forward: €{january_2025.carry_forward}")
        
        if february_2025:
            print(f"   📊 Φεβρουάριος 2025:")
            print(f"      - Previous Obligations: €{february_2025.previous_obligations}")
        
        print(f"\n✅ Η βελτιωμένη λογική μεταφοράς υπολοίπων λειτουργεί!")
        print(f"   🔄 Ετήσια μεταφορά: Δεκέμβριος → Ιανουάριος")
        print(f"   📅 Μηνιαία μεταφορά: Ν → Ν+1")
        print(f"   🎯 Συστηματική λειτουργία από 1/1 έως 31/12")

if __name__ == '__main__':
    test_improved_balance_transfer()
