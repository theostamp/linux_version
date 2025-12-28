#!/usr/bin/env python
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import CommonExpensePeriod, Expense, Transaction
from financial.services import AdvancedCommonExpenseCalculator
from apartments.models import Apartment
from buildings.models import Building
from datetime import datetime, date
from decimal import Decimal
import calendar
from django.db import models

with schema_context('demo'):
    print("\n" + "="*70)
    print("ΔΗΜΙΟΥΡΓΙΑ ΚΟΙΝΟΧΡΗΣΤΩΝ ΜΕ ΔΑΠΑΝΗ ΕΡΓΟΥ")
    print("="*70)

    # Βασικές παράμετροι
    building = Building.objects.get(id=1)
    current_date = datetime.now()
    year = current_date.year
    month = current_date.month

    # Υπολογισμός ημερομηνιών περιόδου
    start_date = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    end_date = date(year, month, last_day)

    period_name = f"Κοινόχρηστα {month:02d}/{year}"

    print(f"\n📋 Στοιχεία Κοινοχρήστων:")
    print(f"   Κτίριο: {building.name}")
    print(f"   Περίοδος: {period_name}")
    print(f"   Από: {start_date} Έως: {end_date}")

    # Έλεγχος αν υπάρχουν ήδη κοινόχρηστα για την περίοδο
    existing_period = CommonExpensePeriod.objects.filter(
        building=building,
        start_date=start_date,
        end_date=end_date
    ).first()

    if existing_period:
        print(f"\n⚠️ Υπάρχουν ήδη κοινόχρηστα για την περίοδο: ID {existing_period.id}")
        print("   Θα διαγραφούν και θα δημιουργηθούν εκ νέου...")
        existing_period.delete()

    # Δημιουργία νέας περιόδου κοινοχρήστων
    print(f"\n🔧 Δημιουργία περιόδου κοινοχρήστων...")

    period = CommonExpensePeriod.objects.create(
        building=building,
        period_name=period_name,
        start_date=start_date,
        end_date=end_date
    )

    print(f"✅ Δημιουργήθηκε περίοδος ID: {period.id}")

    # Συλλογή δαπανών για τον μήνα
    print(f"\n📊 Συλλογή δαπανών...")

    # Βρες τη δαπάνη του έργου
    project_expense = Expense.objects.filter(title__contains='Στεγανοποίηση Ταράτσας').first()

    # Άλλες τρέχουσες δαπάνες (παράδειγμα)
    regular_expenses = [
        {
            'title': 'Καθαριότητα',
            'amount': Decimal('300.00'),
            'category': 'cleaning',
            'distribution_type': 'by_participation_mills'
        },
        {
            'title': 'Φωτισμός κοινοχρήστων',
            'amount': Decimal('150.00'),
            'category': 'utilities',
            'distribution_type': 'by_participation_mills'
        },
        {
            'title': 'Συντήρηση ανελκυστήρα',
            'amount': Decimal('200.00'),
            'category': 'elevator',
            'distribution_type': 'by_participation_mills'  # Κανονικά θα ήταν by_elevator_mills
        }
    ]

    expenses_to_distribute = []

    # Προσθήκη τακτικών δαπανών
    for exp_data in regular_expenses:
        exp = Expense.objects.create(
            building=building,
            title=exp_data['title'],
            amount=exp_data['amount'],
            category=exp_data['category'],
            date=start_date,
            due_date=end_date,
            distribution_type=exp_data['distribution_type'],
            notes=f"Κοινόχρηστα περιόδου {period_name}"
        )
        expenses_to_distribute.append(exp)
        print(f"   • {exp.title}: €{exp.amount}")

    # Προσθήκη της δαπάνης του έργου
    if project_expense:
        expenses_to_distribute.append(project_expense)
        print(f"   • {project_expense.title}: €{project_expense.amount} (ΕΡΓΟ)")

    total_amount = sum(exp.amount for exp in expenses_to_distribute)
    print(f"\n   Σύνολο δαπανών: €{total_amount:,.2f}")

    # Χρήση του AdvancedCommonExpenseCalculator για τον υπολογισμό
    print(f"\n🧮 Υπολογισμός κατανομής...")

    calculator = AdvancedCommonExpenseCalculator()

    # Προετοιμασία δεδομένων για τον calculator
    calculation_data = {
        'building_id': building.id,
        'period_start': start_date.isoformat(),
        'period_end': end_date.isoformat(),
        'expenses': [
            {
                'id': exp.id,
                'title': exp.title,
                'amount': str(exp.amount),
                'category': exp.category,
                'distribution_type': exp.distribution_type,
                'date': exp.date.isoformat()
            }
            for exp in expenses_to_distribute
        ]
    }

    # Εκτέλεση υπολογισμού
    result = calculator.calculate_common_expenses(calculation_data)

    if result['success']:
        print(f"✅ Υπολογισμός επιτυχής!")

        # Δημιουργία transactions για κάθε διαμέρισμα
        print(f"\n💳 Δημιουργία χρεώσεων...")

        apartments = Apartment.objects.filter(building=building).order_by('number')
        transactions_created = []

        for apt in apartments:
            # Βρες το share για το διαμέρισμα από το result
            apt_share = next(
                (share for share in result['apartment_shares']
                 if share['apartment_id'] == apt.id),
                None
            )

            if apt_share:
                # Δημιουργία transaction για κάθε δαπάνη
                for exp_share in apt_share['expense_shares']:
                    expense_id = exp_share['expense_id']
                    expense = next(e for e in expenses_to_distribute if e.id == expense_id)

                    trans = Transaction.objects.create(
                        building=building,
                        apartment=apt,
                        apartment_number=apt.number,
                        type='debit',
                        amount=Decimal(str(exp_share['amount'])),
                        description=f"Κοινόχρηστα {period_name} - {expense.title}",
                        date=start_date,
                        reference_type='expense',
                        reference_id=str(expense.id)
                    )
                    transactions_created.append(trans)

                print(f"   • {apt.number}: €{apt_share['total_amount']:.2f}")

        print(f"\n✅ Δημιουργήθηκαν {len(transactions_created)} χρεώσεις")

        # Έλεγχος συνόλων
        total_charged = sum(t.amount for t in transactions_created)
        print(f"\n📊 Σύνοψη:")
        print(f"   Σύνολο δαπανών: €{total_amount:,.2f}")
        print(f"   Σύνολο χρεώσεων: €{total_charged:,.2f}")

        if abs(total_charged - total_amount) < Decimal('0.01'):
            print(f"   ✅ Η κατανομή είναι ακριβής!")
        else:
            print(f"   ⚠️ Διαφορά: €{abs(total_charged - total_amount):.2f}")

        # Ενημέρωση υπολοίπων
        print(f"\n🔄 Ενημέρωση υπολοίπων διαμερισμάτων...")

        for apt in apartments:
            # Υπολογισμός νέου υπολοίπου
            apt_transactions = Transaction.objects.filter(
                apartment=apt,
                date__lte=end_date
            )

            debits = apt_transactions.filter(type='debit').aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0')

            credits = apt_transactions.filter(type='credit').aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0')

            new_balance = debits - credits

            # Ενημέρωση του υπολοίπου
            apt.current_balance = new_balance
            apt.save(update_fields=['current_balance'])

            print(f"   • {apt.number}: Νέο υπόλοιπο €{new_balance:.2f}")

    else:
        print(f"❌ Σφάλμα στον υπολογισμό: {result.get('error', 'Άγνωστο σφάλμα')}")

    print("\n" + "="*70)
    print("ΟΛΟΚΛΗΡΩΣΗ ΔΗΜΙΟΥΡΓΙΑΣ ΚΟΙΝΟΧΡΗΣΤΩΝ")
    print("="*70)