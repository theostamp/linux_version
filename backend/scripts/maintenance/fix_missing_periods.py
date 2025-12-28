import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, CommonExpensePeriod
from buildings.models import Building
from datetime import date
import calendar

with schema_context('demo'):
    print('\n' + '='*70)
    print('ΔΙΟΡΘΩΣΗ: Δημιουργία Κοινοχρήστων για Υπάρχουσες Δαπάνες')
    print('='*70)

    building = Building.objects.get(id=1)

    # Εύρεση όλων των δαπανών που δεν έχουν κοινόχρηστα
    all_expenses = Expense.objects.filter(
        building=building,
        date__gte='2025-10-01'
    ).order_by('date')

    print(f'\n📊 Βρέθηκαν {all_expenses.count()} δαπάνες από 01/10/2025')

    # Ομαδοποίηση δαπανών ανά μήνα
    months_with_expenses = {}
    for expense in all_expenses:
        month_key = (expense.date.year, expense.date.month)
        if month_key not in months_with_expenses:
            months_with_expenses[month_key] = []
        months_with_expenses[month_key].append(expense)

    print(f'\n📅 Μήνες με δαπάνες: {len(months_with_expenses)}')

    # Δημιουργία περιόδων για κάθε μήνα
    month_names = {
        1: 'Ιανουαρίου', 2: 'Φεβρουαρίου', 3: 'Μαρτίου', 4: 'Απριλίου',
        5: 'Μαΐου', 6: 'Ιουνίου', 7: 'Ιουλίου', 8: 'Αυγούστου',
        9: 'Σεπτεμβρίου', 10: 'Οκτωβρίου', 11: 'Νοεμβρίου', 12: 'Δεκεμβρίου'
    }

    for (year, month), expenses in sorted(months_with_expenses.items()):
        print(f'\n{"─"*70}')
        print(f'📆 {month_names[month]} {year}')
        print(f'{"─"*70}')

        # Υπολογισμός ημερομηνιών περιόδου
        start_date = date(year, month, 1)
        last_day = calendar.monthrange(year, month)[1]
        end_date = date(year, month, last_day)

        period_name = f"Κοινόχρηστα {month_names[month]} {year}"

        # Έλεγχος αν υπάρχει ήδη περίοδος
        existing_period = CommonExpensePeriod.objects.filter(
            building=building,
            start_date__lte=end_date,
            end_date__gte=start_date
        ).first()

        if existing_period:
            print(f'   ℹ️  Υπάρχει ήδη περίοδος: {existing_period.period_name}')
        else:
            # Δημιουργία νέας περιόδου
            new_period = CommonExpensePeriod.objects.create(
                building=building,
                period_name=period_name,
                start_date=start_date,
                end_date=end_date
            )
            print(f'   ✅ Δημιουργήθηκε νέα περίοδος: {period_name}')
            print(f'      ID: {new_period.id}')

        # Εμφάνιση δαπανών του μήνα
        total_amount = sum(exp.amount for exp in expenses)
        print(f'\n   Δαπάνες του μήνα ({len(expenses)}):')
        for exp in expenses:
            print(f'      • {exp.date}: {exp.title} - {exp.amount}€')
        print(f'\n   💰 Σύνολο: {total_amount}€')

    print(f'\n' + '='*70)
    print('Διόρθωση ολοκληρώθηκε')
    print('='*70 + '\n')
