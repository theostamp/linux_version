import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, CommonExpensePeriod, Transaction, Apartment
from decimal import Decimal

with schema_context('demo'):
    months = [
        ('2024-10-01', '2024-10-31', 'Οκτώβριος 2024'),
        ('2024-11-01', '2024-11-30', 'Νοέμβριος 2024'),
        ('2024-12-01', '2024-12-31', 'Δεκέμβριος 2024'),
        ('2025-01-01', '2025-01-31', 'Ιανουάριος 2025'),
    ]

    for start_date, end_date, month_name in months:
        print(f'\n{"="*70}')
        print(f'{month_name}')
        print(f'{"="*70}')

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
                print(f'  • {exp.date}: {exp.category} - {exp.amount}€')
                print(f'    └─ Μέθοδος: {exp.distribution_method}')
                total_expenses += exp.amount
            print(f'\n  💰 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ: {total_expenses}€')
        else:
            print('  ⚠️  Δεν υπάρχουν δαπάνες')

        # Κοινόχρηστα
        common_expenses = CommonExpensePeriod.objects.filter(
            building_id=1,
            start_date__lte=end_date,
            end_date__gte=start_date
        ).order_by('start_date')

        print(f'\n📊 ΚΟΙΝΟΧΡΗΣΤΑ: {common_expenses.count()}')

        for ce in common_expenses:
            print(f'\n  Περίοδος: {ce.start_date} έως {ce.end_date}')
            print(f'  • ID: {ce.id}')
            print(f'  • Όνομα: {ce.period_name}')
            print(f'  • Σύνολο: {ce.total_amount}€')
            print(f'  • Ταμείο Αποθεματικού: {ce.reserve_fund_contribution}€')

            # Έλεγχος transactions
            transactions = Transaction.objects.filter(
                common_expense_period=ce
            )
            print(f'  • Transactions: {transactions.count()}')

            # Ανάλυση ανά διαμέρισμα
            apartments = Apartment.objects.filter(building_id=1).order_by('apartment_number')

            total_charged = Decimal('0')
            charges_found = False

            for apt in apartments:
                apt_transactions = transactions.filter(
                    apartment=apt,
                    transaction_type='common_expense_charge'
                )
                apt_total = sum(t.amount for t in apt_transactions)

                if apt_total != 0:
                    if not charges_found:
                        print(f'\n  📍 Χρεώσεις ανά Διαμέρισμα:')
                        charges_found = True
                    print(f'    {apt.apartment_number}: {apt_total}€')
                    total_charged += apt_total

            if charges_found:
                print(f'\n  💳 ΣΥΝΟΛΟ ΧΡΕΩΣΕΩΝ: {total_charged}€')
                diff = ce.total_amount - total_charged
                if abs(diff) > Decimal('0.01'):
                    print(f'  ⚠️  ΔΙΑΦΟΡΑ: {diff}€')
                else:
                    print(f'  ✅ Οι χρεώσεις ταιριάζουν με το σύνολο')

        if common_expenses.count() == 0:
            print('  ⚠️  Δεν υπάρχουν κοινόχρηστα')

    print(f'\n{"="*70}')
    print('Έλεγχος ολοκληρώθηκε')
    print(f'{"="*70}\n')
