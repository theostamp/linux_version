#!/usr/bin/env python3
"""
🔍 Script για έλεγχο όλων των δαπανών
"""

import os
import sys
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense

def check_all_expenses():
    """Έλεγχος όλων των δαπανών"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΔΑΠΑΝΩΝ")
    print("=" * 70)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Έλεγχος όλων των δαπανών (όλων των ετών)
        all_expenses = Expense.objects.filter(
            building=building
        ).order_by('date')
        
        print(f"💸 Σύνολο δαπανών (όλα τα έτη): {all_expenses.count()}")
        print()
        
        if all_expenses.exists():
            print("📋 ΟΛΕΣ ΟΙ ΔΑΠΑΝΕΣ:")
            print("-" * 70)
            
            total_amount = 0
            for expense in all_expenses:
                category = expense.category or 'no_category'
                print(f"📅 {expense.date.strftime('%Y-%m-%d')} | {category:20} | {expense.title:30} | €{expense.amount:,.2f}")
                total_amount += expense.amount
            
            print("-" * 70)
            print(f"💰 ΣΥΝΟΛΟ: €{total_amount:,.2f}")
        else:
            print("❌ Δεν υπάρχουν δαπάνες")
        
        print()
        
        # Έλεγχος δαπανών ανά έτος
        print("📅 ΔΑΠΑΝΕΣ ΑΝΑ ΕΤΟΣ:")
        print("-" * 50)
        
        years = set(expense.date.year for expense in all_expenses)
        for year in sorted(years):
            year_expenses = Expense.objects.filter(
                building=building,
                date__year=year
            )
            
            total_year = sum(expense.amount for expense in year_expenses)
            print(f"📅 {year}: {year_expenses.count()} δαπάνες, €{total_year:,.2f}")
            
            # Εμφάνιση δαπανών για κάθε μήνα του έτους
            for month in range(1, 13):
                month_expenses = year_expenses.filter(date__month=month)
                if month_expenses.exists():
                    month_name = datetime(year, month, 1).strftime('%B')
                    total_month = sum(expense.amount for expense in month_expenses)
                    print(f"   {month_name:>10}: {month_expenses.count()} δαπάνες, €{total_month:,.2f}")
                    
                    # Εμφάνιση λεπτομερειών για Οκτώβριο και Νοέμβριο 2024
                    if year == 2024 and month in [10, 11]:
                        for expense in month_expenses:
                            category = expense.category or 'no_category'
                            print(f"              - {category}: {expense.title} | €{expense.amount:,.2f}")
        
        print()
        
        # Έλεγχος κατηγοριών
        print("📂 ΚΑΤΗΓΟΡΙΕΣ ΔΑΠΑΝΩΝ:")
        print("-" * 50)
        
        categories = {}
        for expense in all_expenses:
            category = expense.category or 'no_category'
            if category not in categories:
                categories[category] = {'count': 0, 'total': 0}
            categories[category]['count'] += 1
            categories[category]['total'] += expense.amount
        
        for category, data in categories.items():
            print(f"📂 {category:20}: {data['count']:3} δαπάνες, €{data['total']:,.2f}")
        
        print("\n" + "=" * 70)
        print("✅ Ο έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    check_all_expenses()