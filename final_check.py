import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, CommonExpensePeriod
from decimal import Decimal

with schema_context('demo'):
    months = [
        ('2025-10-01', '2025-10-31', 'Οκτώβριος 2025'),
        ('2025-11-01', '2025-11-30', 'Νοέμβριος 2025'),
        ('2025-12-01', '2025-12-31', 'Δεκέμβριος 2025'),
        ('2026-01-01', '2026-01-31', 'Ιανουάριος 2026'),
    ]

    print('\n' + '='*70)
    print('ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΚΑΙ ΚΟΙΝΟΧΡΗΣΤΩΝ')
    print('='*70)

    all_ok = True

    for start_date, end_date, month_name in months:
        print(f'\n{"─"*70}')
        print(f'{month_name}')
        print(f'{"─"*70}')

        # Δαπάνες του μήνα
        expenses = Expense.objects.filter(
            date__gte=start_date,
            date__lte=end_date,
            building_id=1
        ).order_by('date')

        print(f'\n📋 ΔΑΠΑΝΕΣ: {expenses.count()}')
        total_expenses = Decimal('0')

        if expenses.count() > 0:
            for exp in expenses:
                print(f'  • {exp.date}: {exp.title} - {exp.amount}€')
                total_expenses += exp.amount
            print(f'\n  💰 ΣΥΝΟΛΟ: {total_expenses}€')

        # Κοινόχρηστα
        common_expenses = CommonExpensePeriod.objects.filter(
            building_id=1,
            start_date__lte=end_date,
            end_date__gte=start_date
        ).order_by('start_date')

        print(f'\n📊 ΚΟΙΝΟΧΡΗΣΤΑ: {common_expenses.count()}')

        if common_expenses.count() > 0:
            for ce in common_expenses:
                print(f'  • {ce.period_name}')
                print(f'    Περίοδος: {ce.start_date} - {ce.end_date}')

        # Έλεγχος συνέπειας
        if expenses.count() > 0 and common_expenses.count() == 0:
            print(f'\n  ❌ ΠΡΟΒΛΗΜΑ: Υπάρχουν δαπάνες χωρίς κοινόχρηστα!')
            all_ok = False
        elif expenses.count() == 0 and common_expenses.count() > 0:
            print(f'\n  ⚠️  ΠΡΟΕΙΔΟΠΟΙΗΣΗ: Υπάρχουν κοινόχρηστα χωρίς δαπάνες')
        elif expenses.count() > 0 and common_expenses.count() > 0:
            print(f'\n  ✅ ΟΛΑ ΚΑΛΑ: Δαπάνες και κοινόχρηστα συμβαδίζουν')
        else:
            print(f'\n  ℹ️  Κενός μήνας (χωρίς δαπάνες και κοινόχρηστα)')

    print(f'\n' + '='*70)
    if all_ok:
        print('✅ ΕΠΙΤΥΧΙΑ: Όλες οι δαπάνες έχουν κοινόχρηστα!')
    else:
        print('❌ ΑΠΟΤΥΧΙΑ: Υπάρχουν δαπάνες χωρίς κοινόχρηστα')
    print('='*70 + '\n')
