#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε τη διόρθωση του reserve fund timeline
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import AdvancedCommonExpenseCalculator
from financial.models import Expense
from buildings.models import Building

def test_reserve_fund_timeline_fix():
    """Δοκιμή διόρθωσης reserve fund timeline"""
    
    with schema_context('demo'):
        print("🔧 ΔΟΚΙΜΗ ΔΙΟΡΘΩΣΗΣ RESERVE FUND TIMELINE")
        print("=" * 60)
        
        building = Building.objects.get(id=1)
        
        print(f"\n📅 ΑΠΟΘΕΜΑΤΙΚΟ TIMELINE:")
        print(f"   • Έναρξη: {building.reserve_fund_start_date}")
        print(f"   • Διάρκεια: {building.reserve_fund_duration_months} μήνες")
        print(f"   • Στόχος: €{building.reserve_fund_goal}")
        
        # Διαγραφή υπαρχουσών δαπανών αποθεματικού για καθαρή δοκιμή
        print(f"\n🗑️ ΔΙΑΓΡΑΦΗ ΥΠΑΡΧΟΥΣΩΝ ΔΑΠΑΝΩΝ:")
        old_expenses = Expense.objects.filter(
            building=building,
            expense_type='reserve_fund'
        )
        print(f"   • Διαγράφονται {old_expenses.count()} υπάρχουσες δαπάνες")
        old_expenses.delete()
        
        # Δοκιμή για Σεπτέμβριο 2025 (δεν ανήκει στο timeline)
        print(f"\n🧪 ΔΟΚΙΜΗ ΓΙΑ ΣΕΠΤΕΜΒΡΙΟ 2025 (δεν ανήκει στο timeline):")
        calculator_sep = AdvancedCommonExpenseCalculator(building_id=1)
        calculator_sep.month = '2025-09'  # Set month after initialization
        shares_sep = calculator_sep.calculate_advanced_shares()
        
        # Έλεγχος αν δημιουργήθηκαν δαπάνες
        expenses_sep = Expense.objects.filter(
            building=building,
            expense_type='reserve_fund',
            date__year=2025,
            date__month=9
        )
        print(f"   • Δαπάνες για Σεπτέμβριο 2025: {expenses_sep.count()}")
        
        # Δοκιμή για Μάρτιο 2025 (ανήκει στο timeline)
        print(f"\n🧪 ΔΟΚΙΜΗ ΓΙΑ ΜΑΡΤΙΟ 2025 (ανήκει στο timeline):")
        calculator_mar = AdvancedCommonExpenseCalculator(building_id=1)
        calculator_mar.month = '2025-03'  # Set month after initialization
        shares_mar = calculator_mar.calculate_advanced_shares()
        
        # Έλεγχος αν δημιουργήθηκαν δαπάνες
        expenses_mar = Expense.objects.filter(
            building=building,
            expense_type='reserve_fund',
            date__year=2025,
            date__month=3
        )
        print(f"   • Δαπάνες για Μάρτιο 2025: {expenses_mar.count()}")
        
        # Δοκιμή για Απρίλιο 2025 (ανήκει στο timeline)
        print(f"\n🧪 ΔΟΚΙΜΗ ΓΙΑ ΑΠΡΙΛΙΟ 2025 (ανήκει στο timeline):")
        calculator_apr = AdvancedCommonExpenseCalculator(building_id=1)
        calculator_apr.month = '2025-04'  # Set month after initialization
        shares_apr = calculator_apr.calculate_advanced_shares()
        
        # Έλεγχος αν δημιουργήθηκαν δαπάνες
        expenses_apr = Expense.objects.filter(
            building=building,
            expense_type='reserve_fund',
            date__year=2025,
            date__month=4
        )
        print(f"   • Δαπάνες για Απρίλιο 2025: {expenses_apr.count()}")
        
        # Συνολικές δαπάνες αποθεματικού
        print(f"\n📊 ΣΥΝΟΛΙΚΕΣ ΔΑΠΑΝΕΣ ΑΠΟΘΕΜΑΤΙΚΟΥ:")
        all_reserve_expenses = Expense.objects.filter(
            building=building,
            expense_type='reserve_fund'
        ).order_by('date')
        
        if all_reserve_expenses.exists():
            for exp in all_reserve_expenses:
                print(f"   • {exp.title}: €{exp.amount} ({exp.date.strftime('%B %Y')})")
        else:
            print("   • Δεν υπάρχουν δαπάνες αποθεματικού")
        
        print(f"\n🎯 ΑΠΟΤΕΛΕΣΜΑ:")
        if expenses_sep.count() == 0 and expenses_mar.count() > 0 and expenses_apr.count() > 0:
            print("   ✅ Η διόρθωση λειτουργεί σωστά!")
            print("   ✅ Δαπάνες δημιουργούνται μόνο για μήνες που ανήκουν στο timeline")
            print("   ✅ Δαπάνες ΔΕΝ δημιουργούνται για μήνες εκτός timeline")
        else:
            print("   ❌ Η διόρθωση δεν λειτουργεί σωστά")
            print(f"   • Σεπτέμβριος: {expenses_sep.count()} δαπάνες (πρέπει να είναι 0)")
            print(f"   • Μάρτιος: {expenses_mar.count()} δαπάνες (πρέπει να είναι > 0)")
            print(f"   • Απρίλιος: {expenses_apr.count()} δαπάνες (πρέπει να είναι > 0)")

if __name__ == "__main__":
    test_reserve_fund_timeline_fix()
