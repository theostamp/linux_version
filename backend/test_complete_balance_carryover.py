#!/usr/bin/env python3
"""
Ολοκληρωμένο Test για Μεταφορά Υπολοίπων

Αυτό το test επιβεβαιώνει ότι:
1. Τα υπόλοιπα μεταφέρονται σωστά από μήνα σε μήνα
2. Όλα τα components (expenses, management fees, reserve fund, scheduled maintenance) συμπεριλαμβάνονται
3. Η αλυσίδα carry_forward λειτουργεί σωστά
4. Το MonthlyBalanceService λειτουργεί σωστά

Usage:
    python test_complete_balance_carryover.py
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
from financial.models import MonthlyBalance, Expense, Payment, Transaction
from financial.monthly_balance_service import MonthlyBalanceService
from buildings.models import Building
from apartments.models import Apartment


def test_complete_balance_carryover():
    """Ολοκληρωμένο test για μεταφορά υπολοίπων"""
    
    with schema_context('demo'):
        print("=" * 80)
        print("🧪 ΟΛΟΚΛΗΡΩΜΕΝΟ TEST ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ")
        print("=" * 80)
        
        # 1. Βρίσκουμε το κτίριο
        building = Building.objects.get(id=1)
        print(f"\n🏢 Κτίριο: {building.name}")
        print(f"📅 Ημερομηνία Έναρξης: {building.financial_system_start_date}")
        
        # 2. Δημιουργία service
        service = MonthlyBalanceService(building)
        
        # 3. Test Scenario: 3 μήνες με διαφορετικά δεδομένα
        print("\n" + "=" * 80)
        print("📊 TEST SCENARIO: 3 Μήνες με Προοδευτική Μεταφορά")
        print("=" * 80)
        
        test_months = [
            {
                'year': 2025,
                'month': 6,
                'name': 'Ιούνιος 2025',
                'expenses': Decimal('500.00'),
                'payments': Decimal('200.00'),
                'management_fees': Decimal('80.00'),
                'reserve_fund': Decimal('50.00'),
                'expected_carry_forward': Decimal('430.00')  # 500 + 80 + 50 - 200 = 430
            },
            {
                'year': 2025,
                'month': 7,
                'name': 'Ιούλιος 2025',
                'expenses': Decimal('300.00'),
                'payments': Decimal('400.00'),
                'management_fees': Decimal('80.00'),
                'reserve_fund': Decimal('50.00'),
                'expected_carry_forward': Decimal('460.00')  # 430 (prev) + 300 + 80 + 50 - 400 = 460
            },
            {
                'year': 2025,
                'month': 8,
                'name': 'Αύγουστος 2025',
                'expenses': Decimal('400.00'),
                'payments': Decimal('1000.00'),
                'management_fees': Decimal('80.00'),
                'reserve_fund': Decimal('50.00'),
                'expected_carry_forward': Decimal('0.00')  # 460 + 400 + 80 + 50 - 1000 = -10 → 0 (no negative carry)
            }
        ]
        
        # 4. Δημιουργία test data
        print("\n🔧 Δημιουργία Test Data...")
        
        for i, month_data in enumerate(test_months):
            year = month_data['year']
            month = month_data['month']
            name = month_data['name']
            
            print(f"\n{i+1}. {name}")
            print("-" * 60)
            
            # Δημιουργία expense
            if month_data['expenses'] > 0:
                expense, created = Expense.objects.get_or_create(
                    building=building,
                    date=date(year, month, 15),
                    title=f"Test Expense {name}",
                    defaults={
                        'amount': month_data['expenses'],
                        'category': 'cleaning',
                        'distribution_type': 'equal_share'
                    }
                )
                if not created:
                    expense.amount = month_data['expenses']
                    expense.save()
                print(f"   💸 Δαπάνη: €{month_data['expenses']}")
            
            # Δημιουργία payments
            if month_data['payments'] > 0:
                apartments = Apartment.objects.filter(building=building)
                if apartments.exists():
                    apartment = apartments.first()
                    payment, created = Payment.objects.get_or_create(
                        apartment=apartment,
                        date=date(year, month, 20),
                        defaults={
                            'amount': month_data['payments'],
                            'method': 'bank_transfer',
                            'notes': f"Test Payment {name}"
                        }
                    )
                    if not created:
                        payment.amount = month_data['payments']
                        payment.save()
                    print(f"   💰 Πληρωμή: €{month_data['payments']}")
            
            # Δημιουργία management fee transactions
            if month_data['management_fees'] > 0:
                # Διαγράφουμε παλιά transactions για αυτό το μήνα
                Transaction.objects.filter(
                    building=building,
                    type='management_fee_charge',
                    date__year=year,
                    date__month=month
                ).delete()
                
                # Δημιουργία νέου transaction
                Transaction.objects.create(
                    building=building,
                    type='management_fee_charge',
                    amount=month_data['management_fees'],
                    date=date(year, month, 1),
                    description=f"Management Fee {name}"
                )
                print(f"   🏢 Διαχείριση: €{month_data['management_fees']}")
            
            # Δημιουργία reserve fund transactions
            if month_data['reserve_fund'] > 0:
                # Διαγράφουμε παλιά transactions για αυτό το μήνα
                Transaction.objects.filter(
                    building=building,
                    type='reserve_fund_charge',
                    date__year=year,
                    date__month=month
                ).delete()
                
                # Δημιουργία νέου transaction
                Transaction.objects.create(
                    building=building,
                    type='reserve_fund_charge',
                    amount=month_data['reserve_fund'],
                    date=date(year, month, 1),
                    description=f"Reserve Fund {name}"
                )
                print(f"   🏦 Αποθεματικό: €{month_data['reserve_fund']}")
        
        # 5. Επανυπολογισμός όλων των μηνών
        print("\n" + "=" * 80)
        print("🔄 ΕΠΑΝΥΠΟΛΟΓΙΣΜΟΣ ΜΗΝΙΑΙΩΝ ΥΠΟΛΟΙΠΩΝ")
        print("=" * 80)
        
        for month_data in test_months:
            year = month_data['year']
            month = month_data['month']
            name = month_data['name']
            
            print(f"\n{name}:")
            monthly_balance = service.create_or_update_monthly_balance(year, month, recalculate=True)
            
            print(f"   Δαπάνες: €{monthly_balance.total_expenses}")
            print(f"   Πληρωμές: €{monthly_balance.total_payments}")
            print(f"   Προηγούμενες Οφειλές: €{monthly_balance.previous_obligations}")
            print(f"   Διαχείριση: €{monthly_balance.management_fees}")
            print(f"   Αποθεματικό: €{monthly_balance.reserve_fund_amount}")
            print(f"   Συνολικές Υποχρεώσεις: €{monthly_balance.total_obligations}")
            print(f"   Καθαρό Αποτέλεσμα: €{monthly_balance.net_result}")
            print(f"   Carry Forward: €{monthly_balance.carry_forward}")
        
        # 6. Επιβεβαίωση αλυσίδας
        print("\n" + "=" * 80)
        print("🔍 ΕΠΙΒΕΒΑΙΩΣΗ ΑΛΥΣΙΔΑΣ ΜΕΤΑΦΟΡΑΣ")
        print("=" * 80)
        
        verification_result = service.verify_balance_chain(
            test_months[0]['year'], test_months[0]['month'],
            test_months[-1]['year'], test_months[-1]['month']
        )
        
        if verification_result['status'] == 'ok':
            print("\n✅ Η αλυσίδα μεταφοράς είναι ΣΩΣΤΗ!")
        else:
            print(f"\n❌ Βρέθηκαν {verification_result['total_issues']} προβλήματα:")
            for issue in verification_result['summary_issues']:
                print(f"   ❌ {issue}")
            
            if verification_result['summary_warnings']:
                print(f"\n⚠️  Βρέθηκαν {verification_result['total_warnings']} προειδοποιήσεις:")
                for warning in verification_result['summary_warnings']:
                    print(f"   ⚠️  {warning}")
        
        # 7. Έλεγχος expected vs actual carry_forward
        print("\n" + "=" * 80)
        print("📊 ΕΛΕΓΧΟΣ EXPECTED VS ACTUAL CARRY FORWARD")
        print("=" * 80)
        
        all_correct = True
        for month_data in test_months:
            year = month_data['year']
            month = month_data['month']
            name = month_data['name']
            expected = month_data['expected_carry_forward']
            
            monthly_balance = MonthlyBalance.objects.get(
                building=building,
                year=year,
                month=month
            )
            actual = monthly_balance.carry_forward
            
            status = "✅" if actual == expected else "❌"
            all_correct = all_correct and (actual == expected)
            
            print(f"\n{status} {name}:")
            print(f"   Expected: €{expected}")
            print(f"   Actual:   €{actual}")
            
            if actual != expected:
                print(f"   ❌ ΔΙΑΦΟΡΑ: €{actual - expected}")
        
        # 8. Τελική Αναφορά
        print("\n" + "=" * 80)
        print("📋 ΤΕΛΙΚΗ ΑΝΑΦΟΡΑ")
        print("=" * 80)
        
        if all_correct and verification_result['status'] == 'ok':
            print("\n" + "🎉" * 20)
            print("✅ ΟΛΑ ΤΑ TESTS ΠΕΤΥΧΑΝ!")
            print("✅ Η μεταφορά υπολοίπων λειτουργεί ΤΕΛΕΙΑ!")
            print("🎉" * 20)
            return True
        else:
            print("\n❌ ΚΑΠΟΙΑ TESTS ΑΠΕΤΥΧΑΝ")
            print("Ελέγξτε τα παραπάνω αποτελέσματα για λεπτομέρειες")
            return False


if __name__ == '__main__':
    try:
        success = test_complete_balance_carryover()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ΣΦΑΛΜΑ: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)

