#!/usr/bin/env python3
"""
Test script για τη συνεχή μεταφορά ποσών χωρίς ετήσια απομόνωση
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import MonthlyBalance, Expense, Payment
from buildings.models import Building

def test_continuous_transfer():
    """Δοκιμάζει τη συνεχή μεταφορά ποσών χωρίς ετήσια απομόνωση"""
    
    print("🔄 ΔΟΚΙΜΗ ΣΥΝΕΧΟΥΣ ΜΕΤΑΦΟΡΑΣ ΠΟΣΩΝ")
    print("=" * 50)
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📅 Ημερομηνία Έναρξης: {building.financial_system_start_date}")
        
        # Δημιουργούμε test data για Δεκέμβριο 2025
        december_2025, created = MonthlyBalance.objects.get_or_create(
            building=building,
            year=2025,
            month=12,
            defaults={
                'total_expenses': Decimal('100.00'),
                'total_payments': Decimal('80.00'),
                'previous_obligations': Decimal('50.00'),
                'carry_forward': Decimal('0.00'),
                'reserve_fund_amount': Decimal('20.00'),
                'management_fees': Decimal('10.00'),
                'annual_carry_forward': Decimal('0.00'),
                'balance_year': 2025,
                'main_balance_carry_forward': Decimal('0.00'),
                'reserve_balance_carry_forward': Decimal('0.00'),
                'management_balance_carry_forward': Decimal('0.00'),
                'is_closed': False
            }
        )
        
        if not created:
            # Ενημερώνουμε τα δεδομένα
            december_2025.total_expenses = Decimal('100.00')
            december_2025.total_payments = Decimal('80.00')
            december_2025.previous_obligations = Decimal('50.00')
            december_2025.reserve_fund_amount = Decimal('20.00')
            december_2025.management_fees = Decimal('10.00')
            december_2025.is_closed = False
            december_2025.save()
        
        print(f"\n📊 Δεκέμβριος 2025:")
        print(f"   💰 Συνολικές Δαπάνες: €{december_2025.total_expenses}")
        print(f"   💳 Συνολικές Εισπράξεις: €{december_2025.total_payments}")
        print(f"   📈 Παλαιότερες Οφειλές: €{december_2025.previous_obligations}")
        print(f"   🏦 Αποθεματικό: €{december_2025.reserve_fund_amount}")
        print(f"   🏢 Διαχείριση: €{december_2025.management_fees}")
        
        # Υπολογίζουμε το αναμενόμενο carry_forward
        total_obligations = december_2025.total_obligations
        net_result = december_2025.total_payments - total_obligations
        expected_carry_forward = -net_result if net_result < 0 else Decimal('0.00')
        
        print(f"\n🧮 ΥΠΟΛΟΓΙΣΜΟΙ:")
        print(f"   📊 Συνολικές Υποχρεώσεις: €{total_obligations}")
        print(f"   📈 Καθαρό Αποτέλεσμα: €{net_result}")
        print(f"   💰 Αναμενόμενο Carry Forward: €{expected_carry_forward}")
        
        # Κλείνουμε τον Δεκέμβριο 2025
        print(f"\n🔒 ΚΛΕΙΣΙΜΟ ΔΕΚΕΜΒΡΙΟΥ 2025:")
        december_2025.close_month()
        
        # Ελέγχουμε το Ιανουάριο 2026
        january_2026 = MonthlyBalance.objects.filter(
            building=building,
            year=2026,
            month=1
        ).first()
        
        if january_2026:
            print(f"\n✅ ΙΑΝΟΥΑΡΙΟΣ 2026 ΔΗΜΙΟΥΡΓΗΘΗΚΕ:")
            print(f"   📈 Παλαιότερες Οφειλές: €{january_2026.previous_obligations}")
            print(f"   💰 Carry Forward από Δεκέμβριο: €{december_2025.carry_forward}")
            
            # Ελέγχουμε αν η μεταφορά είναι σωστή
            if january_2026.previous_obligations == december_2025.carry_forward:
                print(f"   ✅ Συνεχής μεταφορά επιτυχής!")
                print(f"   🔄 Δεκέμβριος 2025 → Ιανουάριος 2026: €{december_2025.carry_forward}")
            else:
                print(f"   ❌ Σφάλμα στη μεταφορά!")
                print(f"   🔍 Expected: €{december_2025.carry_forward}")
                print(f"   🔍 Actual: €{january_2026.previous_obligations}")
        else:
            print(f"\n❌ ΙΑΝΟΥΑΡΙΟΣ 2026 ΔΕΝ ΔΗΜΙΟΥΡΓΗΘΗΚΕ!")
        
        # Ελέγχουμε αν υπάρχει ετήσια απομόνωση
        print(f"\n🔍 ΕΛΕΓΧΟΣ ΕΤΗΣΙΑΣ ΑΠΟΜΟΝΩΣΗΣ:")
        print(f"   📅 Annual Carry Forward: €{december_2025.annual_carry_forward}")
        print(f"   📅 Balance Year: {december_2025.balance_year}")
        
        if december_2025.annual_carry_forward == Decimal('0.00'):
            print(f"   ✅ Ετήσια απομόνωση καταργήθηκε!")
        else:
            print(f"   ⚠️ Ετήσια απομόνωση ακόμα ενεργή!")
        
        print(f"\n🎯 ΑΠΟΤΕΛΕΣΜΑ:")
        print(f"   🔄 Συνεχής μεταφορά: {'✅' if january_2026 and january_2026.previous_obligations == december_2025.carry_forward else '❌'}")
        print(f"   🚫 Ετήσια απομόνωση: {'✅' if december_2025.annual_carry_forward == Decimal('0.00') else '❌'}")

if __name__ == "__main__":
    test_continuous_transfer()
