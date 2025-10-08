#!/usr/bin/env python
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from financial.models import Expense
from buildings.models import Building
from datetime import date

print('\n🔍 Έλεγχος Δαπανών για Οκτώβριο 2025')
print('='*70)

# Ημερομηνίες Οκτωβρίου 2025
oct_start = date(2025, 10, 1)
oct_end = date(2025, 10, 31)

buildings = Building.objects.all()

for building in buildings:
    print(f'\n🏢 Building: {building.name} (ID: {building.id})')
    print('-'*70)
    
    # Βρες όλες τις δαπάνες του Οκτωβρίου
    expenses = Expense.objects.filter(
        building=building,
        date__gte=oct_start,
        date__lte=oct_end
    ).order_by('date')
    
    if expenses.exists():
        print(f'   Βρέθηκαν {expenses.count()} δαπάνες:\n')
        total = 0
        for exp in expenses:
            print(f'   • {exp.title}')
            print(f'     Ποσό: €{exp.amount}')
            print(f'     Ημερομηνία: {exp.date}')
            print(f'     Κατηγορία: {exp.category}')
            if 'Προκαταβολή' in exp.title or 'προκαταβολή' in exp.title.lower():
                print(f'     ⚠️ ΠΡΟΚΑΤΑΒΟΛΗ ΕΡΓΟΥ!')
            print()
            total += exp.amount
        print(f'   📊 Σύνολο δαπανών Οκτωβρίου: €{total}')
    else:
        print(f'   ⚠️ ΔΕΝ ΒΡΕΘΗΚΑΝ ΔΑΠΑΝΕΣ για τον Οκτώβριο 2025!')
        print(f'   Αυτός είναι ο λόγος που βλέπεις 0,00€')
    
    # Έλεγξε αν υπάρχουν δαπάνες σε άλλους μήνες
    print(f'\n   📅 Δαπάνες σε άλλους μήνες:')
    for month in range(1, 13):
        month_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=month
        )
        if month_expenses.exists():
            month_total = sum(e.amount for e in month_expenses)
            month_name = ['', 'Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'][month]
            print(f'      {month_name} 2025: €{month_total} ({month_expenses.count()} δαπάνες)')

print('\n' + '='*70)

