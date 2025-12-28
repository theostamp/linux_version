#!/usr/bin/env python3
"""
Έλεγχος δαπανών που εμφανίζονται στο expense_breakdown για συγκεκριμένο μήνα.
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
from datetime import date

def check_expense_breakdown():
    """Ελέγχει ποιες δαπάνες υπάρχουν για συγκεκριμένο μήνα"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΕΛΕΓΧΟΣ EXPENSE BREAKDOWN ΓΙΑ ΦΥΛΛΟ ΚΟΙΝΟΧΡΗΣΤΩΝ")
        print("="*80 + "\n")
        
        # Επιλογή building
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο!\n")
            return
        
        print(f"🏢 Κτίριο: {building.name} (ID: {building.id})\n")
        
        # Ελέγχουμε για τον τρέχοντα μήνα (Οκτώβριος 2025)
        target_month = "2025-10"
        year, month = 2025, 10
        
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        
        print(f"📅 Μήνας: {target_month}")
        print(f"   Από: {start_date}")
        print(f"   Έως: {end_date}\n")
        
        # Όλες οι δαπάνες του μήνα
        all_expenses = Expense.objects.filter(
            building=building,
            date__gte=start_date,
            date__lt=end_date
        ).order_by('category', 'date')
        
        print(f"📊 Συνολικές δαπάνες του μήνα: {all_expenses.count()}\n")
        
        if all_expenses.count() == 0:
            print("❌ Δεν υπάρχουν δαπάνες για αυτόν τον μήνα!\n")
            return
        
        # Ομαδοποίηση ανά κατηγορία
        from collections import defaultdict
        categories = defaultdict(lambda: {'count': 0, 'total': 0, 'expenses': []})
        
        for exp in all_expenses:
            categories[exp.category]['count'] += 1
            categories[exp.category]['total'] += float(exp.amount)
            categories[exp.category]['expenses'].append(exp)
        
        # Εμφάνιση ανά κατηγορία
        print("="*80)
        print("ΔΑΠΑΝΕΣ ΑΝΑ ΚΑΤΗΓΟΡΙΑ:")
        print("="*80)
        
        for category, data in sorted(categories.items()):
            category_display = dict(Expense.EXPENSE_CATEGORIES).get(category, category)
            payer = Expense.get_default_payer_for_category(category)
            payer_symbol = "Ⓔ" if payer == 'resident' else "Ⓓ" if payer == 'owner' else "⚖"
            
            print(f"\n{payer_symbol} {category_display} ({category})")
            print(f"   Πλήθος: {data['count']} | Σύνολο: €{data['total']:.2f}")
            print(f"   Payer: {payer}")
            
            # Λεπτομέρειες
            for exp in data['expenses']:
                print(f"      • ID:{exp.id} | {exp.date} | €{exp.amount} | {exp.title}")
        
        # Δαπάνες που εξαιρούνται από το breakdown
        print("\n\n" + "="*80)
        print("ΔΑΠΑΝΕΣ ΠΟΥ ΕΞΑΙΡΟΥΝΤΑΙ (management_fees, reserve_fund):")
        print("="*80)
        
        excluded = all_expenses.filter(category__in=['management_fees', 'reserve_fund'])
        if excluded.count() > 0:
            for exp in excluded:
                print(f"   • {exp.get_category_display()} | €{exp.amount} | {exp.title}")
        else:
            print("   (Καμία)")
        
        # Δαπάνες που ΘΑ εμφανιστούν στο breakdown
        print("\n\n" + "="*80)
        print("ΔΑΠΑΝΕΣ ΓΙΑ EXPENSE BREAKDOWN (εκτός management_fees, reserve_fund):")
        print("="*80)
        
        breakdown_expenses = all_expenses.exclude(category__in=['management_fees', 'reserve_fund'])
        
        if breakdown_expenses.count() == 0:
            print("   ❌ ΚΑΜΙΑ ΔΑΠΑΝΗ ΓΙΑ BREAKDOWN!")
            print("   Όλες οι δαπάνες είναι management_fees ή reserve_fund\n")
        else:
            print(f"   ✅ {breakdown_expenses.count()} δαπάνες\n")
            
            # Ομαδοποίηση για το breakdown
            breakdown_categories = defaultdict(float)
            for exp in breakdown_expenses:
                breakdown_categories[exp.category] += float(exp.amount)
            
            print("   Ανά κατηγορία:")
            for category, total in sorted(breakdown_categories.items(), key=lambda x: -x[1]):
                category_display = dict(Expense.EXPENSE_CATEGORIES).get(category, category)
                payer = Expense.get_default_payer_for_category(category)
                payer_symbol = "Ⓔ" if payer == 'resident' else "Ⓓ" if payer == 'owner' else "⚖"
                print(f"   {payer_symbol} {category_display}: €{total:.2f}")
        
        print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    check_expense_breakdown()

