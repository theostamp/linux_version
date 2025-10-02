#!/usr/bin/env python
"""
Debug script για να δούμε τι συμβαίνει με το _calculate_historical_balance
"""
import os
import sys
import django
from decimal import Decimal
from datetime import date

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment
from financial.services import FinancialDashboardService
from apartments.models import Apartment
from buildings.models import Building
from django.db.models import Sum

def debug_historical_balance():
    """Debug για να δούμε γιατί το previous_balance είναι 0"""

    with schema_context('demo'):
        print("\n" + "="*80)
        print("DEBUG: _calculate_historical_balance")
        print("="*80 + "\n")

        # Βρίσκουμε το building
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε το κτίριο")
            return

        print(f"🏢 Κτίριο: {building.name}")
        print(f"   Financial System Start Date: {building.financial_system_start_date}\n")

        # Παίρνουμε το πρώτο διαμέρισμα
        apartment = Apartment.objects.filter(building=building).first()
        if not apartment:
            print("❌ Δεν βρέθηκε διαμέρισμα")
            return

        print(f"📍 Διαμέρισμα: {apartment.number}\n")

        # Test για Νοέμβριο 2025
        test_month = '2025-11'
        year, mon = map(int, test_month.split('-'))
        month_start = date(year, mon, 1)

        print(f"📅 Υπολογισμός για μήνα: {test_month}")
        print(f"   month_start = {month_start}\n")

        # Simulating _calculate_historical_balance logic
        print("="*80)
        print("ΒΗΜΑ 1: Υπολογισμός πληρωμών")
        print("="*80 + "\n")

        total_payments = Payment.objects.filter(
            apartment=apartment,
            date__lt=month_start
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        print(f"   Πληρωμές πριν από {month_start}: €{total_payments}\n")

        # ΒΗΜΑ 2: Βρίσκουμε expenses πριν από τον μήνα
        print("="*80)
        print("ΒΗΜΑ 2: Βρίσκουμε δαπάνες πριν από τον μήνα")
        print("="*80 + "\n")

        year_start = building.financial_system_start_date

        if year_start is None:
            print("   ⚠️  financial_system_start_date είναι None!")
            print("   Το σύστημα θα επιστρέψει previous_balance = 0.00")
            return

        print(f"   year_start = {year_start}")

        expenses_before_month = Expense.objects.filter(
            building_id=apartment.building_id,
            date__gte=year_start,
            date__lt=month_start
        )

        print(f"   Δαπάνες πριν από {month_start}: {expenses_before_month.count()}\n")

        for exp in expenses_before_month:
            print(f"      • {exp.title}")
            print(f"        ID: {exp.id} | Date: {exp.date} | Amount: €{exp.amount}")

        expense_ids = list(expenses_before_month.values_list('id', flat=True))

        # ΒΗΜΑ 3: Φιλτράρουμε management fees
        print("\n" + "="*80)
        print("ΒΗΜΑ 3: Φιλτράρουμε management fees")
        print("="*80 + "\n")

        management_expense_ids = list(Expense.objects.filter(
            id__in=expense_ids,
            category='management_fees'
        ).values_list('id', flat=True))

        non_management_expense_ids = [exp_id for exp_id in expense_ids
                                    if exp_id not in management_expense_ids]

        print(f"   Management expense IDs: {management_expense_ids}")
        print(f"   Non-management expense IDs: {non_management_expense_ids}\n")

        # ΒΗΜΑ 4: Ψάχνουμε transactions
        print("="*80)
        print("ΒΗΜΑ 4: Ψάχνουμε transactions για non-management expenses")
        print("="*80 + "\n")

        if non_management_expense_ids:
            # Convert to strings
            expense_id_strings = [str(exp_id) for exp_id in non_management_expense_ids]

            print(f"   Searching for transactions with:")
            print(f"      apartment = {apartment.id}")
            print(f"      reference_type = 'expense'")
            print(f"      reference_id in {expense_id_strings}")
            print(f"      type in ['common_expense_charge', 'expense_created', 'expense_issued', ...]")

            transactions = Transaction.objects.filter(
                apartment=apartment,
                reference_type='expense',
                reference_id__in=expense_id_strings,
                type__in=['common_expense_charge', 'expense_created', 'expense_issued',
                         'interest_charge', 'penalty_charge']
            )

            print(f"\n   Βρέθηκαν {transactions.count()} transactions:")

            for trans in transactions:
                print(f"      • Type: {trans.type} | Amount: €{trans.amount}")
                print(f"        Ref ID: {trans.reference_id} | Date: {trans.date}")

            total_charges = transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            print(f"\n   Total charges: €{total_charges}")
        else:
            total_charges = Decimal('0.00')
            print(f"   No non-management expenses found. Total charges: €{total_charges}")

        # ΒΗΜΑ 5: Υπολογισμός management fees
        print("\n" + "="*80)
        print("ΒΗΜΑ 5: Υπολογισμός management fees")
        print("="*80 + "\n")

        management_expenses = Expense.objects.filter(
            building_id=apartment.building_id,
            category='management_fees',
            date__gte=year_start,
            date__lt=month_start
        )

        print(f"   Management expenses: {management_expenses.count()}")

        management_fees_share = Decimal('0.00')
        if management_expenses.exists():
            apartment_count = Apartment.objects.filter(building_id=apartment.building_id).count()

            for expense in management_expenses:
                apartment_share = expense.amount / apartment_count
                management_fees_share += apartment_share
                print(f"      • {expense.title}: €{expense.amount} / {apartment_count} = €{apartment_share}")

        print(f"\n   Total management fees share: €{management_fees_share}")

        total_charges += management_fees_share

        # ΤΕΛΙΚΟΣ ΥΠΟΛΟΓΙΣΜΟΣ
        print("\n" + "="*80)
        print("ΤΕΛΙΚΟΣ ΥΠΟΛΟΓΙΣΜΟΣ")
        print("="*80 + "\n")

        previous_balance = total_charges - total_payments

        print(f"   Total Charges: €{total_charges}")
        print(f"   Total Payments: €{total_payments}")
        print(f"   Previous Balance: €{previous_balance}")

        # Σύγκριση με service
        service = FinancialDashboardService(building.id)
        apartment_balances = service.get_apartment_balances(test_month)
        apt_data = next((b for b in apartment_balances if b['id'] == apartment.id), None)

        if apt_data:
            print(f"\n   Service επιστρέφει: €{apt_data.get('previous_balance', 0):.2f}")

        print("\n" + "="*80)

if __name__ == '__main__':
    debug_historical_balance()
