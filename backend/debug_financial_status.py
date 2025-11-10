import os
import sys
import django
from datetime import date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from apartments.models import Apartment
from buildings.models import Building

with schema_context('demo'):
    print("=" * 80)
    print("ΔΙΕΡΕΥΝΗΣΗ: Οικονομική Κατάσταση Dashboard")
    print("=" * 80)

    building = Building.objects.get(id=1)

    # Παίρνουμε τον τρέχοντα μήνα (Οκτώβριος 2025 βάσει των δεδομένων)
    current_month = date(2025, 10, 1)

    print(f"\n🏠 Κτίριο: {building.name}")
    print(f"📅 Τρέχων μήνας: {current_month.strftime('%B %Y')}")

    # Έλεγχος δαπανών Οκτωβρίου 2025
    print(f"\n{'='*80}")
    print("ΔΑΠΑΝΕΣ ΟΚΤΩΒΡΙΟΥ 2025")
    print(f"{'='*80}")

    oct_expenses = Expense.objects.filter(
        building=building,
        date__year=2025,
        date__month=10
    ).order_by('date')

    print(f"\nΒρέθηκαν {oct_expenses.count()} δαπάνες:")
    total_oct = Decimal('0')
    for exp in oct_expenses:
        print(f"   • {exp.date} - {exp.title} - €{exp.amount} ({exp.expense_type})")
        total_oct += exp.amount

    print(f"\n   📊 Σύνολο Δαπανών Οκτωβρίου: €{total_oct}")

    # Έλεγχος για διαμέρισμα 1
    print(f"\n{'='*80}")
    print("ΔΙΑΜΕΡΙΣΜΑ 1 - ΑΝΑΛΥΣΗ")
    print(f"{'='*80}")

    apartment = Apartment.objects.get(building=building, number='1')
    print(f"\n🏠 Διαμέρισμα: {apartment.number}")
    print(f"   Participation Mills: {apartment.participation_mills}")
    print(f"   Current Balance: €{apartment.current_balance}")

    # Transactions Οκτωβρίου
    print(f"\n📋 TRANSACTIONS ΟΚΤΩΒΡΙΟΥ 2025:")
    oct_trans = Transaction.objects.filter(
        apartment=apartment,
        date__year=2025,
        date__month=10
    ).order_by('date')

    total_obligations = Decimal('0')
    total_payments = Decimal('0')

    for trans in oct_trans:
        trans_type = "Χρέωση" if trans.type in ['expense_created', 'common_expense_charge'] else "Πληρωμή"
        print(f"   • {trans.date.strftime('%Y-%m-%d')} - {trans.type} - €{trans.amount} ({trans_type})")

        if trans.type in ['expense_created', 'common_expense_charge', 'expense_issued']:
            total_obligations += trans.amount
        elif trans.type in ['payment_received', 'common_expense_payment']:
            total_payments += trans.amount

    print(f"\n   💰 Υποχρεώσεις Οκτωβρίου: €{total_obligations}")
    print(f"   💵 Πληρωμές Οκτωβρίου: €{total_payments}")
    print(f"   📊 Balance: €{total_obligations - total_payments}")

    # Παλαιότερες οφειλές (πριν τον Οκτώβριο)
    print(f"\n📅 ΠΑΛΑΙΟΤΕΡΕΣ ΟΦΕΙΛΕΣ (πριν Οκτώβριο 2025):")

    old_trans = Transaction.objects.filter(
        apartment=apartment,
        date__lt=date(2025, 10, 1)
    ).order_by('date')

    old_obligations = Decimal('0')
    old_payments = Decimal('0')

    print(f"   Βρέθηκαν {old_trans.count()} παλαιότερες συναλλαγές")

    for trans in old_trans[-5:]:  # Τελευταίες 5
        trans_type = "Χρέωση" if trans.type in ['expense_created', 'common_expense_charge'] else "Πληρωμή"
        print(f"   • {trans.date.strftime('%Y-%m-%d')} - {trans.type} - €{trans.amount}")

        if trans.type in ['expense_created', 'common_expense_charge', 'expense_issued']:
            old_obligations += trans.amount
        elif trans.type in ['payment_received', 'common_expense_payment']:
            old_payments += trans.amount

    print(f"\n   💰 Παλαιότερες Υποχρεώσεις: €{old_obligations}")
    print(f"   💵 Παλαιότερες Πληρωμές: €{old_payments}")
    print(f"   📊 Παλαιό Υπόλοιπο: €{old_obligations - old_payments}")

    # ΣΥΝΟΛΟ
    print(f"\n{'='*80}")
    print("ΣΥΝΟΨΗ")
    print(f"{'='*80}")

    print(f"\n   Παλαιότερες οφειλές: €{old_obligations - old_payments}")
    print(f"   Υποχρεώσεις Οκτωβρίου: €{total_obligations}")
    print(f"   ΣΥΝΟΛΟ €{(old_obligations - old_payments) + total_obligations}")
    print(f"   Πληρωμές: €{total_payments}")
    print(f"   ΥΠΟΛΟΙΠΟ: €{(old_obligations - old_payments) + total_obligations - total_payments}")

    print(f"\n{'='*80}")
