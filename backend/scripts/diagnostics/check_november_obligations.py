#!/usr/bin/env python3
"""
Έλεγχος previous_obligations για Νοέμβριο 2025.
Θα πρέπει να περιλαμβάνει τις δαπάνες Οκτωβρίου (ΔΕΗ, Απορρίμματα, Management, Reserve).
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from financial.models import Expense, MonthlyBalance
from buildings.models import Building
from datetime import date

def check_november_obligations():
    """Ελέγχει τις παλαιότερες οφειλές για Νοέμβριο"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΕΛΕΓΧΟΣ ΠΑΛΑΙΟΤΕΡΩΝ ΟΦΕΙΛΩΝ - ΝΟΕΜΒΡΙΟΣ 2025")
        print("="*80 + "\n")
        
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        print(f"🏢 Κτίριο: {building.name} (ID: {building.id})\n")
        
        # === ΟΚΤΩΒΡΙΟΣ 2025 ===
        print("=" * 80)
        print("ΟΚΤΩΒΡΙΟΣ 2025 (Δαπάνες που θα μεταφερθούν)")
        print("=" * 80)
        
        oct_expenses = Expense.objects.filter(
            building=building,
            date__gte=date(2025, 10, 1),
            date__lt=date(2025, 11, 1)
        ).order_by('category')
        
        oct_total = 0
        for exp in oct_expenses:
            payer = Expense.get_default_payer_for_category(exp.category)
            symbol = "Ⓔ" if payer == 'resident' else "Ⓓ"
            print(f"  {symbol} {exp.get_category_display()}: €{exp.amount}")
            oct_total += float(exp.amount)
        
        print(f"\n  💰 ΣΥΝΟΛΟ Οκτωβρίου: €{oct_total}")
        
        # === ΝΟΕΜΒΡΙΟΣ 2025 ===
        print("\n" + "=" * 80)
        print("ΝΟΕΜΒΡΙΟΣ 2025 (Τρέχουσες Δαπάνες)")
        print("=" * 80)
        
        nov_expenses = Expense.objects.filter(
            building=building,
            date__gte=date(2025, 11, 1),
            date__lt=date(2025, 12, 1)
        ).order_by('category')
        
        nov_total = 0
        for exp in nov_expenses:
            payer = Expense.get_default_payer_for_category(exp.category)
            symbol = "Ⓔ" if payer == 'resident' else "Ⓓ"
            print(f"  {symbol} {exp.get_category_display()}: €{exp.amount}")
            nov_total += float(exp.amount)
        
        print(f"\n  💰 ΣΥΝΟΛΟ Νοεμβρίου: €{nov_total}")
        
        # === API RESPONSE ===
        print("\n" + "=" * 80)
        print("API RESPONSE - FinancialDashboardService")
        print("=" * 80)
        
        service = FinancialDashboardService(building.id)
        summary = service.get_summary(month='2025-11')
        
        print(f"\n📊 Οκτώβριος:")
        print(f"   total_expenses_month: €{summary.get('total_expenses_month', 0)}")
        
        print(f"\n📊 Νοέμβριος:")
        print(f"   previous_obligations: €{summary.get('previous_obligations', 0)}")
        print(f"   current_month_expenses: €{summary.get('current_month_expenses', 0)}")
        print(f"   current_obligations: €{summary.get('current_obligations', 0)}")
        
        # === ΑΝΑΛΥΣΗ ===
        print("\n" + "=" * 80)
        print("ΑΝΑΛΥΣΗ")
        print("=" * 80)
        
        expected_previous = oct_total
        actual_previous = summary.get('previous_obligations', 0)
        
        print(f"\n✅ Αναμενόμενες Παλαιότερες Οφειλές (Δαπάνες Οκτωβρίου): €{expected_previous}")
        print(f"📊 Πραγματικές Παλαιότερες Οφειλές (από API): €{actual_previous}")
        
        if abs(expected_previous - actual_previous) < 0.01:
            print(f"\n✅ ΣΩΣΤΟ! Οι παλαιότερες οφειλές περιλαμβάνουν ΟΛΑ τα έξοδα Οκτωβρίου!")
        else:
            print(f"\n❌ ΛΑΘΟΣ! Διαφορά: €{expected_previous - actual_previous}")
            print(f"   Λείπουν δαπάνες από τις παλαιότερες οφειλές!")
        
        # === MONTHLYBALANCE CHECK ===
        print("\n" + "=" * 80)
        print("MONTHLYBALANCE CHECK")
        print("=" * 80)
        
        oct_balance = MonthlyBalance.objects.filter(
            building=building,
            year=2025,
            month=10
        ).first()
        
        if oct_balance:
            print(f"\n📊 MonthlyBalance Οκτωβρίου:")
            print(f"   carry_forward: €{oct_balance.carry_forward}")
            print(f"   total_expenses: €{oct_balance.total_expenses}")
            print(f"   total_payments: €{oct_balance.total_payments}")
            print(f"   is_closed: {oct_balance.is_closed}")
        else:
            print("\n❌ Δεν υπάρχει MonthlyBalance για Οκτώβριο 2025")
        
        print("\n" + "=" * 80 + "\n")

if __name__ == '__main__':
    check_november_obligations()

