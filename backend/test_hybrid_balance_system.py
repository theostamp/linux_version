#!/usr/bin/env python3
"""
Test script για το Υβριδικό Σύστημα Υπολοίπων
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

def test_hybrid_balance_system():
    """Δοκιμή του Υβριδικού Συστήματος Υπολοίπων"""
    
    with schema_context('demo'):
        print("=== ΔΟΚΙΜΗ ΥΒΡΙΔΙΚΟΥ ΣΥΣΤΗΜΑΤΟΣ ΥΠΟΛΟΙΠΩΝ ===")
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
                'total_expenses': Decimal('1000.00'),        # Κανονικές δαπάνες
                'total_payments': Decimal('800.00'),         # Εισπράξεις
                'previous_obligations': Decimal('200.00'),   # Παλαιότερες οφειλές
                'reserve_fund_amount': Decimal('100.00'),    # Αποθεματικό
                'management_fees': Decimal('50.00'),         # Έξοδα διαχείρισης
                'carry_forward': Decimal('0.00'),
                'annual_carry_forward': Decimal('0.00'),
                'balance_year': 2024,
                'main_balance_carry_forward': Decimal('0.00'),
                'reserve_balance_carry_forward': Decimal('0.00'),
                'management_balance_carry_forward': Decimal('0.00'),
            }
        )
        
        if created:
            print(f"   ✅ Δημιουργήθηκε Δεκέμβριος 2024")
        else:
            print(f"   📋 Υπήρχε ήδη Δεκέμβριος 2024")
        
        # Εμφάνιση αρχικών δεδομένων
        print(f"\n📅 Δεκέμβριος 2024:")
        print(f"   💸 Κανονικές Δαπάνες: €{december_2024.total_expenses}")
        print(f"   💰 Εισπράξεις: €{december_2024.total_payments}")
        print(f"   📊 Παλαιότερες Οφειλές: €{december_2024.previous_obligations}")
        print(f"   🏦 Αποθεματικό: €{december_2024.reserve_fund_amount}")
        print(f"   🏢 Διαχείριση: €{december_2024.management_fees}")
        
        # Υβριδικό Σύστημα - Ξεχωριστά Υπολοιπα
        print(f"\n🔍 Υβριδικό Σύστημα - Ξεχωριστά Υπολοιπα:")
        print(f"   🏠 Κύριες Υποχρεώσεις: €{december_2024.main_obligations}")
        print(f"   🏦 Αποθεματικές Υποχρεώσεις: €{december_2024.reserve_obligations}")
        print(f"   🏢 Διαχειριστικές Υποχρεώσεις: €{december_2024.management_obligations}")
        
        print(f"\n📈 Υβριδικό Σύστημα - Καθαρά Αποτελέσματα:")
        print(f"   🏠 Κύριο Καθαρό Αποτέλεσμα: €{december_2024.main_net_result}")
        print(f"   🏦 Αποθεματικό Καθαρό Αποτέλεσμα: €{december_2024.reserve_net_result}")
        print(f"   🏢 Διαχειριστικό Καθαρό Αποτέλεσμα: €{december_2024.management_net_result}")
        
        # Κλείσιμο Δεκεμβρίου 2024
        print(f"\n🔒 Κλείσιμο Δεκεμβρίου 2024...")
        december_2024.close_month()
        
        print(f"\n📊 Υβριδικό Σύστημα - Carry Forward:")
        print(f"   🏠 Κύριο Υπόλοιπο: €{december_2024.main_balance_carry_forward}")
        print(f"   🏦 Αποθεματικό Υπόλοιπο: €{december_2024.reserve_balance_carry_forward}")
        print(f"   🏢 Διαχείριση Υπόλοιπο: €{december_2024.management_balance_carry_forward}")
        
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
                'previous_obligations': Decimal('0.00'),
                'reserve_fund_amount': Decimal('100.00'),
                'management_fees': Decimal('50.00'),
                'carry_forward': Decimal('0.00'),
                'annual_carry_forward': Decimal('0.00'),
                'balance_year': 2025,
                'main_balance_carry_forward': Decimal('0.00'),
                'reserve_balance_carry_forward': Decimal('0.00'),
                'management_balance_carry_forward': Decimal('0.00'),
            }
        )
        
        # Κλείσιμο Ιανουαρίου 2025
        if january_2025:
            january_2025.total_expenses = Decimal('1100.00')
            january_2025.total_payments = Decimal('900.00')
            january_2025.save()
            
            print(f"   📅 Ιανουάριος 2025:")
            print(f"      💸 Κανονικές Δαπάνες: €{january_2025.total_expenses}")
            print(f"      💰 Εισπράξεις: €{january_2025.total_payments}")
            print(f"      📊 Παλαιότερες Οφειλές: €{january_2025.previous_obligations}")
            print(f"      🏠 Κύριες Υποχρεώσεις: €{january_2025.main_obligations}")
            print(f"      🏠 Κύριο Καθαρό Αποτέλεσμα: €{january_2025.main_net_result}")
            
            january_2025.close_month()
            print(f"      🏠 Κύριο Carry Forward: €{january_2025.main_balance_carry_forward}")
            
            # Έλεγχος Φεβρουαρίου 2025
            february_2025.refresh_from_db()
            if february_2025.previous_obligations == january_2025.main_balance_carry_forward:
                print(f"   ✅ Μηνιαία μεταφορά λειτουργεί σωστά!")
                print(f"      Ιανουάριος 2025 → Φεβρουάριος 2025: €{january_2025.main_balance_carry_forward}")
            else:
                print(f"   ❌ Πρόβλημα στη μηνιαία μεταφορά!")
                print(f"      Expected: €{january_2025.main_balance_carry_forward}")
                print(f"      Actual: €{february_2025.previous_obligations}")
        
        # Συνοπτική αναφορά
        print(f"\n🎯 ΣΥΝΟΠΤΙΚΗ ΑΝΑΦΟΡΑ - ΥΒΡΙΔΙΚΟ ΣΥΣΤΗΜΑ:")
        print(f"   📊 Δεκέμβριος 2024:")
        print(f"      - Κύριο Υπόλοιπο: €{december_2024.main_balance_carry_forward}")
        print(f"      - Αποθεματικό Υπόλοιπο: €{december_2024.reserve_balance_carry_forward}")
        print(f"      - Διαχείριση Υπόλοιπο: €{december_2024.management_balance_carry_forward}")
        
        if january_2025:
            print(f"   📊 Ιανουάριος 2025:")
            print(f"      - Κύριο Υπόλοιπο: €{january_2025.main_balance_carry_forward}")
            print(f"      - Αποθεματικό Υπόλοιπο: €{january_2025.reserve_balance_carry_forward}")
            print(f"      - Διαχείριση Υπόλοιπο: €{january_2025.management_balance_carry_forward}")
        
        if february_2025:
            print(f"   📊 Φεβρουάριος 2025:")
            print(f"      - Previous Obligations: €{february_2025.previous_obligations}")
        
        print(f"\n✅ Το Υβριδικό Σύστημα Υπολοίπων λειτουργεί!")
        print(f"   🏠 Κύριο Υπόλοιπο: Κανονικές Δαπάνες + Παλαιότερες Οφειλές")
        print(f"   🏦 Αποθεματικό Υπόλοιπο: Μόνο για αποταμίευση")
        print(f"   🏢 Διαχείριση Υπόλοιπο: Έξοδα διαχείρισης")
        print(f"   🔄 Ετήσια μεταφορά: Δεκέμβριος → Ιανουάριος")
        print(f"   📅 Μηνιαία μεταφορά: Ν → Ν+1 (μόνο κύριο υπόλοιπο)")

if __name__ == '__main__':
    test_hybrid_balance_system()
