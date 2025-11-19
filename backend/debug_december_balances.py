#!/usr/bin/env python
"""
Debug Script - Ελέγχει γιατί οι οφειλές εξαφανίζονται τον Δεκέμβριο
"""

import os
import django
import sys

sys.path.insert(0, '/home/theo/project/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from decimal import Decimal
from datetime import date
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment, MonthlyBalance
from financial.balance_service import BalanceCalculationService
from financial.services import FinancialDashboardService

print("\n" + "="*80)
print("DEBUG: ΕΞΑΦΑΝΙΣΗ ΟΦΕΙΛΩΝ ΔΕΚΕΜΒΡΙΟΥ")
print("="*80)

# Βρες το πρώτο building
building = Building.objects.first()
if not building:
    print("❌ Δεν βρέθηκε building!")
    sys.exit(1)

print(f"\n🏢 Building: {building.name} (ID: {building.id})")
print(f"   Financial System Start Date: {building.financial_system_start_date}")

# Βρες το πρώτο διαμέρισμα (Α1)
apartment = building.apartments.first()
if not apartment:
    print("❌ Δεν βρέθηκε διαμέρισμα!")
    sys.exit(1)

print(f"\n🏠 Apartment: {apartment.number}")
print(f"   Owner: {apartment.owner_name}")
print(f"   Participation Mills: {apartment.participation_mills}")

# Έλεγχος δαπανών Νοεμβρίου
print("\n" + "-"*80)
print("ΔΑΠΑΝΕΣ ΝΟΕΜΒΡΙΟΥ 2025:")
print("-"*80)

nov_expenses = Expense.objects.filter(
    building=building,
    date__gte=date(2025, 11, 1),
    date__lt=date(2025, 12, 1)
)

print(f"Σύνολο δαπανών: {nov_expenses.count()}")
for exp in nov_expenses:
    print(f"  - {exp.date}: {exp.title} - €{exp.amount} ({exp.category})")

# Έλεγχος πληρωμών Νοεμβρίου
print("\n" + "-"*80)
print("ΠΛΗΡΩΜΕΣ ΝΟΕΜΒΡΙΟΥ 2025:")
print("-"*80)

nov_payments = Payment.objects.filter(
    apartment=apartment,
    date__gte=date(2025, 11, 1),
    date__lt=date(2025, 12, 1)
)

print(f"Σύνολο πληρωμών: {nov_payments.count()}")
for pay in nov_payments:
    print(f"  - {pay.date}: €{pay.amount}")

# Υπολογισμός historical balance για Δεκέμβριο (μέχρι 2025-12-01)
print("\n" + "-"*80)
print("ΥΠΟΛΟΓΙΣΜΟΣ PREVIOUS BALANCE (μέχρι 2025-12-01):")
print("-"*80)

try:
    previous_balance = BalanceCalculationService.calculate_historical_balance(
        apartment,
        date(2025, 12, 1),
        include_management_fees=True,
        include_reserve_fund=True
    )
    print(f"✅ Previous Balance (από BalanceCalculationService): €{previous_balance:.2f}")
except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback
    traceback.print_exc()

# Έλεγχος MonthlyBalance records
print("\n" + "-"*80)
print("MONTHLY BALANCE RECORDS:")
print("-"*80)

monthly_balances = MonthlyBalance.objects.filter(
    building=building
).order_by('year', 'month')

if monthly_balances.exists():
    for mb in monthly_balances:
        print(f"\n📅 {mb.year}-{mb.month:02d}:")
        print(f"   Total Expenses: €{mb.total_expenses}")
        print(f"   Total Payments: €{mb.total_payments}")
        print(f"   Previous Obligations: €{mb.previous_obligations}")
        print(f"   Carry Forward: €{mb.carry_forward}")
        print(f"   Is Closed: {mb.is_closed}")
else:
    print("❌ ΔΕΝ ΥΠΑΡΧΟΥΝ MonthlyBalance records!")
    print("   Αυτό μπορεί να εξηγεί γιατί δεν εμφανίζονται οι οφειλές!")

# Κλήση του FinancialDashboardService για Δεκέμβριο
print("\n" + "-"*80)
print("API RESPONSE ΓΙΑ ΔΕΚΕΜΒΡΙΟ (FinancialDashboardService):")
print("-"*80)

fd_service = FinancialDashboardService(building_id=building.id)
apartment_balances = fd_service.get_apartment_balances(month="2025-12")

a1_balance = next((apt for apt in apartment_balances if apt['number'] == apartment.number), None)

if a1_balance:
    print(f"\n🏠 {apartment.number} - Δεκέμβριος 2025:")
    print(f"   Previous Balance: €{a1_balance['previous_balance']:.2f}")
    print(f"   Resident Expenses: €{a1_balance['resident_expenses']:.2f}")
    print(f"   Owner Expenses: €{a1_balance['owner_expenses']:.2f}")
    print(f"   Net Obligation: €{a1_balance['net_obligation']:.2f}")
    print(f"   Status: {a1_balance['status']}")
else:
    print(f"❌ Δεν βρέθηκε balance για {apartment.number}!")

# ΣΥΜΠΕΡΑΣΜΑ
print("\n" + "="*80)
print("ΔΙΑΓΝΩΣΗ:")
print("="*80)

if not building.financial_system_start_date:
    print("❌ ΠΡΟΒΛΗΜΑ: Το Building ΔΕΝ έχει financial_system_start_date!")
    print("   ΛΥΣΗ: Όρισε financial_system_start_date στο Building!")
    print(f"   Εντολή: Building.objects.get(id={building.id}).update(financial_system_start_date=date(2025, 11, 1))")

if not monthly_balances.filter(year=2025, month=12).exists():
    print("\n❌ ΠΡΟΒΛΗΜΑ: Δεν υπάρχει MonthlyBalance για Δεκέμβριο 2025!")
    print("   ΛΥΣΗ: Κλείσε τον Νοέμβριο για να δημιουργηθεί ο Δεκέμβριος!")
    print("   Εντολή: MonthlyBalanceService(building).close_month_and_create_next(2025, 11)")

if previous_balance == 0 and nov_expenses.exists() and not nov_payments.exists():
    print("\n⚠️  ΠΡΟΒΛΗΜΑ: Υπάρχουν δαπάνες Νοεμβρίου αλλά το previous_balance είναι 0!")
    print("   Πιθανή αιτία: Το financial_system_start_date δεν είναι ορισμένο ή είναι μετά τον Νοέμβριο!")

if previous_balance > 0:
    print("\n✅ Το previous_balance υπολογίζεται σωστά!")
    print("   Το πρόβλημα μπορεί να είναι στο frontend ή στο πώς εμφανίζεται!")

print("\n" + "="*80 + "\n")

