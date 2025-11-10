#!/usr/bin/env python3
"""
Test script για να δούμε αν δημιουργούνται δαπάνες αποθεματικού
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building

def test_reserve_fund_expenses():
    """Έλεγχος αν υπάρχουν δαπάνες αποθεματικού"""
    
    with schema_context('demo'):
        print("🔍 Έλεγχος Δαπανών Αποθεματικού")
        print("=" * 50)
        
        # 1. Έλεγχος όλων των δαπανών αποθεματικού
        reserve_expenses = Expense.objects.filter(
            category='reserve_fund'
        ).order_by('-date')
        
        print(f"📊 Σύνολο δαπανών αποθεματικού: {reserve_expenses.count()}")
        
        if reserve_expenses.exists():
            print("\n💰 Δαπάνες Αποθεματικού:")
            for expense in reserve_expenses:
                print(f"   • {expense.title} - €{expense.amount} ({expense.date})")
        else:
            print("\n❌ Δεν βρέθηκαν δαπάνες αποθεματικού!")
        
        # 2. Έλεγχος ρυθμίσεων κτιρίου
        building = Building.objects.get(id=1)
        print(f"\n🏢 Ρυθμίσεις Κτιρίου:")
        print(f"   • Στόχος αποθεματικού: €{building.reserve_fund_goal or 0}")
        print(f"   • Διάρκεια: {building.reserve_fund_duration_months or 0} μήνες")
        print(f"   • Ημερομηνία έναρξης: {building.reserve_fund_start_date or 'Δεν ορίστηκε'}")
        print(f"   • Ημερομηνία ολοκλήρωσης: {building.reserve_fund_target_date or 'Δεν ορίστηκε'}")
        print(f"   • Προτεραιότητα: {building.reserve_fund_priority}")
        
        # 3. Έλεγχος όλων των δαπανών για Σεπτέμβριο 2025
        september_expenses = Expense.objects.filter(
            date__year=2025,
            date__month=9
        ).order_by('category')
        
        print(f"\n📅 Δαπάνες Σεπτεμβρίου 2025: {september_expenses.count()}")
        for expense in september_expenses:
            print(f"   • {expense.category}: {expense.title} - €{expense.amount}")
        
        # 4. Συμπέρασμα
        print(f"\n🎯 Συμπέρασμα:")
        if reserve_expenses.exists():
            print("   ✅ Υπάρχουν δαπάνες αποθεματικού στη βάση")
        else:
            print("   ❌ Δεν υπάρχουν δαπάνες αποθεματικού στη βάση")
            print("   💡 Το αποθεματικό υπολογίζεται μόνο στα shares, όχι ως ξεχωριστή δαπάνη")

if __name__ == "__main__":
    test_reserve_fund_expenses()
