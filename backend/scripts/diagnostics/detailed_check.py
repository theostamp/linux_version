import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, CommonExpensePeriod, Transaction
from decimal import Decimal

with schema_context('demo'):
    print('\n' + '='*70)
    print('ΑΝΑΛΥΤΙΚΟΣ ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΚΑΙ ΚΟΙΝΟΧΡΗΣΤΩΝ')
    print('='*70)

    # Όλες οι δαπάνες 2025
    all_expenses = Expense.objects.filter(
        building_id=1,
        date__year=2025
    ).order_by('date')

    print(f'\n📋 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ 2025: {all_expenses.count()}')
    print(f'Σύνολο ποσό: {sum(e.amount for e in all_expenses)}€\n')

    for exp in all_expenses:
        print(f'{exp.date} | {exp.category:30} | {exp.amount:>10}€ | {exp.distribution_type}')

    # Όλα τα κοινόχρηστα 2025
    all_periods = CommonExpensePeriod.objects.filter(
        building_id=1,
        start_date__year=2025
    ).order_by('start_date')

    print(f'\n\n📊 ΣΥΝΟΛΟ ΚΟΙΝΟΧΡΗΣΤΩΝ 2025: {all_periods.count()}')
    print(f'Σύνολο ποσό: {sum(p.total_amount for p in all_periods)}€\n')

    for period in all_periods:
        print(f'{period.start_date} - {period.end_date} | {period.period_name:20} | {period.total_amount:>10}€')

        # Transactions για αυτή την περίοδο
        trans = Transaction.objects.filter(common_expense_period=period)
        print(f'  └─ Transactions: {trans.count()}')

    # Ανάλυση ανά μήνα
    print('\n\n' + '='*70)
    print('ΑΝΑΛΥΣΗ ΑΝΑ ΜΗΝΑ')
    print('='*70)

    months = [
        (10, 'Οκτώβριος'),
        (11, 'Νοέμβριος'),
        (12, 'Δεκέμβριος'),
    ]

    for month_num, month_name in months:
        print(f'\n{month_name} 2025:')

        # Δαπάνες
        month_expenses = all_expenses.filter(date__month=month_num)
        month_total = sum(e.amount for e in month_expenses)
        print(f'  Δαπάνες: {month_expenses.count()} (Σύνολο: {month_total}€)')

        # Κοινόχρηστα που καλύπτουν αυτόν τον μήνα
        month_periods = all_periods.filter(
            start_date__month__lte=month_num,
            end_date__month__gte=month_num
        )
        print(f'  Κοινόχρηστα: {month_periods.count()}')

        if month_total > 0 and month_periods.count() == 0:
            print(f'  ⚠️  ΠΡΟΒΛΗΜΑ: Υπάρχουν δαπάνες αλλά ΔΕΝ υπάρχουν κοινόχρηστα!')

    # Ιανουάριος 2026
    print(f'\nΙανουάριος 2026:')
    jan_expenses = Expense.objects.filter(
        building_id=1,
        date__year=2026,
        date__month=1
    )
    jan_total = sum(e.amount for e in jan_expenses)
    print(f'  Δαπάνες: {jan_expenses.count()} (Σύνολο: {jan_total}€)')

    jan_periods = CommonExpensePeriod.objects.filter(
        building_id=1,
        start_date__year=2026,
        start_date__month=1
    )
    print(f'  Κοινόχρηστα: {jan_periods.count()}')

    if jan_total > 0 and jan_periods.count() == 0:
        print(f'  ⚠️  ΠΡΟΒΛΗΜΑ: Υπάρχουν δαπάνες αλλά ΔΕΝ υπάρχουν κοινόχρηστα!')

    print('\n' + '='*70 + '\n')
