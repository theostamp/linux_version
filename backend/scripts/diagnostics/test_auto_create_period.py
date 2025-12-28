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
from decimal import Decimal

with schema_context('demo'):
    print('\n' + '='*70)
    print('TEST: Αυτόματη Δημιουργία CommonExpensePeriod')
    print('='*70)

    building = Building.objects.get(id=1)

    # Πριν το test - πόσα κοινόχρηστα υπάρχουν
    before_count = CommonExpensePeriod.objects.filter(building=building).count()
    print(f'\n📊 Κοινόχρηστα πριν το test: {before_count}')

    # Δημιουργία test δαπάνης για Νοέμβριο 2025
    print(f'\n🔧 Δημιουργία test δαπάνης για Νοέμβριο 2025...')

    test_expense = Expense.objects.create(
        building=building,
        title='TEST: Καθαριότητα Νοεμβρίου',
        amount=Decimal('250.00'),
        date=date(2025, 11, 15),
        category='cleaning',
        expense_type='regular',
        distribution_type='by_participation_mills',
        notes='Test expense για έλεγχο auto-creation signal'
    )

    print(f'✅ Δημιουργήθηκε δαπάνη ID: {test_expense.id}')

    # Μετά το test - έλεγχος αν δημιουργήθηκε CommonExpensePeriod
    after_count = CommonExpensePeriod.objects.filter(building=building).count()
    print(f'\n📊 Κοινόχρηστα μετά το test: {after_count}')

    # Έλεγχος για Νοέμβριο 2025
    november_period = CommonExpensePeriod.objects.filter(
        building=building,
        start_date=date(2025, 11, 1),
        end_date=date(2025, 11, 30)
    ).first()

    if november_period:
        print(f'\n✅ SUCCESS: Δημιουργήθηκε αυτόματα περίοδος!')
        print(f'   ID: {november_period.id}')
        print(f'   Όνομα: {november_period.period_name}')
        print(f'   Περίοδος: {november_period.start_date} έως {november_period.end_date}')
    else:
        print(f'\n❌ FAIL: ΔΕΝ δημιουργήθηκε περίοδος για Νοέμβριο 2025')

    # Καθαρισμός - διαγραφή test δεδομένων
    print(f'\n🧹 Καθαρισμός test δεδομένων...')
    test_expense.delete()
    if november_period:
        november_period.delete()
        print(f'✅ Διαγράφηκε test περίοδος')

    print(f'\n' + '='*70)
    print('Test ολοκληρώθηκε')
    print('='*70 + '\n')
