import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from buildings.models import Building
from apartments.models import Apartment
from datetime import date
from decimal import Decimal
import calendar

with schema_context('demo'):
    print('\n' + '='*70)
    print('ΕΠΑΛΗΘΕΥΣΗ: Χρεώσεις Διαμερισμάτων για Management Fees')
    print('='*70)

    building = Building.objects.get(id=1)

    # Ορισμός test management fee
    if not building.management_fee_per_apartment:
        building.management_fee_per_apartment = Decimal('10.00')
        building.save()

    apartments = Apartment.objects.filter(building=building).order_by('number')
    apartments_count = apartments.count()
    total_fee = building.management_fee_per_apartment * apartments_count

    print(f'\n📊 Αναμενόμενα:')
    print(f'   Management Fee: {building.management_fee_per_apartment}€/διαμέρισμα')
    print(f'   Διαμερίσματα: {apartments_count}')
    print(f'   Σύνολο: {total_fee}€')
    print(f'   Distribution: equal_share')
    print(f'   Αναμενόμενη χρέωση ανά διαμέρισμα: {total_fee / apartments_count}€')

    # Test για Νοέμβριο 2025
    year, month = 2025, 11

    # Διαγραφή υπάρχουσας δαπάνης αν υπάρχει
    existing_fee = Expense.objects.filter(
        building=building,
        expense_type='management_fee',
        date__year=year,
        date__month=month
    ).first()

    if existing_fee:
        existing_fee.delete()

    # Καταγραφή υπολοίπων πριν
    balances_before = {}
    for apt in apartments:
        balances_before[apt.number] = apt.current_balance

    print(f'\n💰 Υπόλοιπα Πριν:')
    for apt_num, balance in balances_before.items():
        print(f'   {apt_num}: {balance}€')

    # Δημιουργία management fee
    last_day = calendar.monthrange(year, month)[1]
    expense_date = date(year, month, last_day)

    expense = Expense.objects.create(
        building=building,
        title=f'TEST: Διαχειριστικά Έξοδα Νοεμβρίου 2025',
        amount=total_fee,
        date=expense_date,
        due_date=expense_date,
        category='management_fees',
        expense_type='management_fee',
        distribution_type='equal_share',
        notes=f'Test για επαλήθευση χρεώσεων'
    )

    print(f'\n✅ Δημιουργήθηκε Expense ID: {expense.id}')
    print(f'   Ποσό: {expense.amount}€')
    print(f'   Distribution: {expense.distribution_type}')

    # Refresh apartments από DB
    apartments = Apartment.objects.filter(building=building).order_by('number')

    # Καταγραφή υπολοίπων μετά
    balances_after = {}
    for apt in apartments:
        balances_after[apt.number] = apt.current_balance

    print(f'\n💰 Υπόλοιπα Μετά:')
    for apt_num, balance in balances_after.items():
        print(f'   {apt_num}: {balance}€')

    # Υπολογισμός διαφορών (χρεώσεων)
    print(f'\n📊 ΠΡΑΓΜΑΤΙΚΕΣ ΧΡΕΩΣΕΙΣ:')
    print(f'{"─"*70}')
    print(f'{"Διαμέρισμα":<15} {"Πριν":>12} {"Μετά":>12} {"Χρέωση":>12} {"Expected":>12}')
    print(f'{"─"*70}')

    total_charged = Decimal('0')
    all_correct = True
    expected_charge = total_fee / apartments_count

    for apt_num in sorted(balances_before.keys()):
        before = balances_before[apt_num]
        after = balances_after[apt_num]
        actual_charge = after - before
        total_charged += actual_charge

        status = '✅' if actual_charge == expected_charge else '❌'
        print(f'{apt_num:<15} {before:>12.2f}€ {after:>12.2f}€ {actual_charge:>12.2f}€ {expected_charge:>12.2f}€ {status}')

        if actual_charge != expected_charge:
            all_correct = False

    print(f'{"─"*70}')
    print(f'{"ΣΥΝΟΛΟ":<15} {"":>12} {"":>12} {total_charged:>12.2f}€ {total_fee:>12.2f}€')
    print(f'{"─"*70}')

    # Έλεγχος Transactions
    print(f'\n🔍 Έλεγχος Transactions:')
    transactions = Transaction.objects.filter(
        building=building,
        reference_id=str(expense.id),
        reference_type='expense'
    ).order_by('apartment__number')

    print(f'   Βρέθηκαν {transactions.count()} transactions')

    if transactions.count() > 0:
        print(f'\n   Ανάλυση Transactions:')
        for trans in transactions:
            print(f'   • {trans.apartment.number}: {trans.amount}€ (type: {trans.type})')

    # Τελική επαλήθευση
    print(f'\n{"="*70}')
    if all_correct and total_charged == total_fee:
        print(f'✅ SUCCESS: Όλες οι χρεώσεις είναι σωστές!')
        print(f'   Κάθε διαμέρισμα χρεώθηκε: {expected_charge}€')
        print(f'   Σύνολο χρεώσεων: {total_charged}€')
    else:
        print(f'❌ FAIL: Υπάρχουν λάθος χρεώσεις!')
        if total_charged != total_fee:
            print(f'   Διαφορά: {total_charged - total_fee}€')
    print(f'{"="*70}')

    # Cleanup
    print(f'\n🧹 Καθαρισμός...')
    expense.delete()
    print(f'   Test ολοκληρώθηκε\n')
