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
from apartments.models import Apartment
from datetime import date
from decimal import Decimal
import calendar

with schema_context('demo'):
    print('\n' + '='*70)
    print('TEST: Management Fees με Auto-create Signal')
    print('='*70)

    building = Building.objects.get(id=1)

    # Έλεγχος αν έχει οριστεί management fee
    if not building.management_fee_per_apartment:
        print('\n⚠️  Δεν έχει οριστεί management fee στο κτίριο')
        print('   Ορίζω test management fee: 10€/διαμέρισμα')
        building.management_fee_per_apartment = Decimal('10.00')
        building.save()

    print(f'\n📊 Στοιχεία Κτιρίου:')
    print(f'   Όνομα: {building.name}')
    print(f'   Management Fee: {building.management_fee_per_apartment}€/διαμέρισμα')

    apartments_count = Apartment.objects.filter(building=building).count()
    total_fee = building.management_fee_per_apartment * apartments_count
    print(f'   Διαμερίσματα: {apartments_count}')
    print(f'   Συνολικό Fee: {total_fee}€')

    # Test για Νοέμβριο 2025
    year, month = 2025, 11
    print(f'\n🔧 Δημιουργία Management Fee για {month}/{year}...')

    # Έλεγχος αν υπάρχει ήδη
    existing_fee = Expense.objects.filter(
        building=building,
        expense_type='management_fee',
        date__year=year,
        date__month=month
    ).first()

    if existing_fee:
        print(f'   ⚠️  Υπάρχει ήδη management fee για {month}/{year}')
        print(f'   Διαγραφή για test...')
        existing_fee.delete()

    # Έλεγχος πριν
    periods_before = CommonExpensePeriod.objects.filter(
        building=building,
        start_date__year=year,
        start_date__month=month
    ).count()
    print(f'\n📊 CommonExpensePeriods πριν: {periods_before}')

    # Δημιουργία management fee (όπως το command)
    last_day = calendar.monthrange(year, month)[1]
    expense_date = date(year, month, last_day)

    expense = Expense.objects.create(
        building=building,
        title=f'Διαχειριστικά Έξοδα Νοεμβρίου 2025',
        amount=total_fee,
        date=expense_date,
        due_date=expense_date,
        category='management_fees',
        expense_type='management_fee',
        distribution_type='equal_share',
        notes=f'Test management fee\nΠοσό ανά διαμέρισμα: {building.management_fee_per_apartment}€'
    )

    print(f'\n✅ Δημιουργήθηκε Expense:')
    print(f'   ID: {expense.id}')
    print(f'   Ποσό: {expense.amount}€')
    print(f'   Ημερομηνία: {expense.date}')
    print(f'   Distribution: {expense.distribution_type}')

    # Έλεγχος μετά
    periods_after = CommonExpensePeriod.objects.filter(
        building=building,
        start_date__year=year,
        start_date__month=month
    ).count()
    print(f'\n📊 CommonExpensePeriods μετά: {periods_after}')

    # Αναζήτηση του period
    period = CommonExpensePeriod.objects.filter(
        building=building,
        start_date=date(year, month, 1),
        end_date=date(year, month, 30)
    ).first()

    if period:
        print(f'\n✅ SUCCESS: Δημιουργήθηκε αυτόματα CommonExpensePeriod!')
        print(f'   ID: {period.id}')
        print(f'   Όνομα: {period.period_name}')
        print(f'   Περίοδος: {period.start_date} - {period.end_date}')

        # Υπολογισμός δαπανών περιόδου
        period_expenses = Expense.objects.filter(
            building=building,
            date__gte=period.start_date,
            date__lte=period.end_date
        )
        total = sum(exp.amount for exp in period_expenses)
        print(f'   Σύνολο Δαπανών: {total}€')

        print(f'\n✅ Το signal λειτουργεί σωστά με management fees!')
    else:
        print(f'\n❌ FAIL: ΔΕΝ δημιουργήθηκε CommonExpensePeriod')
        print(f'   Το signal δεν λειτούργησε!')

    # Cleanup
    print(f'\n🧹 Καθαρισμός...')
    expense.delete()
    if period:
        period.delete()

    print(f'\n' + '='*70)
    print('Test ολοκληρώθηκε')
    print('='*70 + '\n')
