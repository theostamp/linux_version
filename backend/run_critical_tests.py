#!/usr/bin/env python3
"""
🔥 ΚΡΙΣΙΜΑ TESTS - Τρέχουν πριν το deployment

Αυτό το script ελέγχει τα πιο critical features:
1. Carry Forward (μεταφορά οφειλών)
2. Previous Obligations (παλαιότερες οφειλές)
3. Apartment Balance Calculations

🚨 ΑΝ FAIL → ΔΕΝ ΚΑΝΟΥΜΕ DEPLOY!
"""
import os
import sys
import django
from decimal import Decimal
from datetime import date

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Payment, MonthlyBalance
from buildings.models import Building
from apartments.models import Apartment


def test_carry_forward_cumulative():
    """
    ✅ TEST 1: Carry Forward αθροιστικό
    
    Scenario:
    - Οκτώβριος: Δαπάνες €80, Πληρωμές €16 → Carry: €64
    - Νοέμβριος: Δαπάνες €80, Πληρωμές €0, Prev: €64 → Carry: €144
    - Δεκέμβριος: Δαπάνες €80, Πληρωμές €0, Prev: €144 → Carry: €224
    """
    print("\n" + "="*80)
    print("TEST 1: Carry Forward Cumulative Logic")
    print("="*80)
    
    with schema_context('demo'):
        building = Building.objects.filter(name='Αλκμάνος 22').first()
        
        if not building:
            print("❌ FAIL: Building 'Αλκμάνος 22' not found")
            return False
        
        # Check October
        mb_oct = MonthlyBalance.objects.filter(
            building=building, year=2025, month=10
        ).first()
        
        if not mb_oct:
            print("❌ FAIL: MonthlyBalance for October 2025 not found")
            return False
        
        # Check November
        mb_nov = MonthlyBalance.objects.filter(
            building=building, year=2025, month=11
        ).first()
        
        if not mb_nov:
            print("❌ FAIL: MonthlyBalance for November 2025 not found")
            return False
        
        # Check December
        mb_dec = MonthlyBalance.objects.filter(
            building=building, year=2025, month=12
        ).first()
        
        if not mb_dec:
            print("❌ FAIL: MonthlyBalance for December 2025 not found")
            return False
        
        # Verify values
        expected_oct = Decimal('64.00')
        expected_nov = Decimal('144.00')
        expected_dec = Decimal('224.00')
        
        print(f"\n📊 Results:")
        print(f"   October carry_forward: €{mb_oct.carry_forward}")
        print(f"   Expected: €{expected_oct}")
        if mb_oct.carry_forward == expected_oct:
            print(f"   ✅ PASS")
        else:
            print(f"   ❌ FAIL")
            return False
        
        print(f"\n   November carry_forward: €{mb_nov.carry_forward}")
        print(f"   Expected: €{expected_nov}")
        if mb_nov.carry_forward == expected_nov:
            print(f"   ✅ PASS")
        else:
            print(f"   ❌ FAIL")
            return False
        
        print(f"\n   December carry_forward: €{mb_dec.carry_forward}")
        print(f"   Expected: €{expected_dec}")
        if mb_dec.carry_forward == expected_dec:
            print(f"   ✅ PASS")
        else:
            print(f"   ❌ FAIL")
            return False
        
        print(f"\n✅ TEST 1 PASSED!\n")
        return True


def test_previous_obligations_transfer():
    """
    ✅ TEST 2: Previous Obligations Transfer
    
    Ελέγχει ότι οι οφειλές από προηγούμενους μήνες μεταφέρονται σωστά
    """
    print("\n" + "="*80)
    print("TEST 2: Previous Obligations Transfer")
    print("="*80)
    
    with schema_context('demo'):
        from financial.services import FinancialDashboardService
        
        service = FinancialDashboardService(1)  # Building ID = 1
        
        # Check November previous obligations
        nov_summary = service.get_summary(month='2025-11')
        nov_previous = Decimal(str(nov_summary.get('previous_obligations', 0)))  # Convert to Decimal
        expected_nov_previous = Decimal('64.00')
        
        print(f"\n📊 November Results:")
        print(f"   Previous Obligations: €{nov_previous}")
        print(f"   Expected: €{expected_nov_previous}")
        
        if abs(nov_previous - expected_nov_previous) < Decimal('0.01'):
            print(f"   ✅ PASS")
        else:
            print(f"   ❌ FAIL")
            return False
        
        # Check December previous obligations
        dec_summary = service.get_summary(month='2025-12')
        dec_previous = Decimal(str(dec_summary.get('previous_obligations', 0)))  # Convert to Decimal
        expected_dec_previous = Decimal('144.00')
        
        print(f"\n📊 December Results:")
        print(f"   Previous Obligations: €{dec_previous}")
        print(f"   Expected: €{expected_dec_previous}")
        
        if abs(dec_previous - expected_dec_previous) < Decimal('0.01'):
            print(f"   ✅ PASS")
        else:
            print(f"   ❌ FAIL")
            return False
        
        print(f"\n✅ TEST 2 PASSED!\n")
        return True


def test_apartment_balance_sum():
    """
    ✅ TEST 3: Apartment Balances Sum = Total
    
    Ελέγχει ότι το άθροισμα των οφειλών όλων των διαμερισμάτων
    ισούται με το συνολικό carry_forward
    """
    print("\n" + "="*80)
    print("TEST 3: Apartment Balances Sum")
    print("="*80)
    
    with schema_context('demo'):
        from financial.services import FinancialDashboardService
        
        service = FinancialDashboardService(1)
        
        # Check December
        dec_summary = service.get_summary(month='2025-12')
        dec_balances = service.get_apartment_balances(month='2025-12')
        
        total_from_apartments = Decimal(str(sum(
            apt.get('net_obligation', 0) 
            for apt in dec_balances
        )))
        
        # current_obligations already includes previous + current month
        expected_total = Decimal('224.00')  # €144.00 (previous) + €80.00 (current) = €224.00
        
        print(f"\n📊 Results:")
        print(f"   Sum of Apartment Balances: €{total_from_apartments:.2f}")
        print(f"   Expected Total (current_obligations): €{expected_total:.2f}")
        
        if abs(total_from_apartments - expected_total) < Decimal('0.01'):
            print(f"   ✅ PASS")
            print(f"\n✅ TEST 3 PASSED!\n")
            return True
        else:
            print(f"   ❌ FAIL - Διαφορά: €{abs(total_from_apartments - expected_total):.2f}")
            return False


def run_all_tests():
    """Τρέχει όλα τα κρίσιμα tests"""
    print("\n" + "🔥"*40)
    print("ΚΡΙΣΙΜΑ FINANCIAL TESTS - PRE-DEPLOYMENT CHECK")
    print("🔥"*40)
    
    tests = [
        test_carry_forward_cumulative,
        test_previous_obligations_transfer,
        test_apartment_balance_sum
    ]
    
    results = []
    
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"\n❌ EXCEPTION in {test.__name__}: {e}")
            results.append(False)
    
    # Final Summary
    print("\n" + "="*80)
    print("ΤΕΛΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ")
    print("="*80)
    
    passed = sum(results)
    total = len(results)
    
    print(f"\n   Tests Passed: {passed}/{total}")
    
    if all(results):
        print(f"\n   ✅ ✅ ✅ ΟΛΑ ΤΑ TESTS ΠΕΡΑΣΑΝ! SAFE TO DEPLOY! ✅ ✅ ✅")
        return 0
    else:
        print(f"\n   ❌ ❌ ❌ ΚΑΠΟΙΑ TESTS FAILED! ΔΕΝ ΚΑΝΟΥΜΕ DEPLOY! ❌ ❌ ❌")
        return 1


if __name__ == '__main__':
    exit_code = run_all_tests()
    sys.exit(exit_code)

