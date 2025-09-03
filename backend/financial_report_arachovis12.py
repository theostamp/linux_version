#!/usr/bin/env python3
"""
Financial Report Generator for Αραχώβης 12
Αναλυτική ανάλυση των 334,85 € και γενική οικονομική κατάσταση
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime
from collections import defaultdict

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import (
    Expense, Payment, CommonExpensePeriod, 
    ApartmentShare, Transaction
)
from django.db.models import Sum

def print_header(title):
    """Print formatted header"""
    print("\n" + "="*80)
    print(f"📊 {title}")
    print("="*80)

def print_section(title):
    """Print formatted section"""
    print(f"\n🔍 {title}")
    print("-" * 60)

def format_currency(amount):
    """Format amount as currency"""
    if amount is None:
        return "0,00 €"
    return f"{float(amount):,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")

def analyze_building_finances():
    """Comprehensive financial analysis for Αραχώβης 12"""
    
    with schema_context('demo'):
        # Find Αραχώβης 12 building
        building = Building.objects.filter(
            name__icontains='Αραχώβης',
            address__icontains='12'
        ).first()
        
        if not building:
            print("❌ Δεν βρέθηκε το κτίριο Αραχώβης 12")
            return
        
        print_header(f"ΑΝΑΛΥΤΙΚΗ ΟΙΚΟΝΟΜΙΚΗ ΑΝΑΛΥΣΗ - {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print(f"🏢 Αριθμός Διαμερισμάτων: {building.apartments.count()}")
        print(f"📅 Ημερομηνία Ανάλυσης: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        
        # 1. ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ
        analyze_expenses(building)
        
        # 2. ΑΝΑΛΥΣΗ ΕΙΣΠΡΑΞΕΩΝ
        analyze_payments(building)
        
        # 3. ΑΝΑΛΥΣΗ ΚΟΙΝΟΧΡΗΣΤΩΝ
        analyze_common_expenses(building)
        
        # 4. ΑΝΑΛΥΣΗ ΑΠΟΘΕΜΑΤΙΚΟΥ
        analyze_reserve_fund(building)
        
        # 5. ΥΠΟΛΟΓΙΣΜΟΣ ΤΩΝ 334,85 €
        trace_334_85_amount(building)
        
        # 6. ΣΥΝΟΛΙΚΗ ΚΑΤΑΣΤΑΣΗ
        calculate_total_balance(building)

def analyze_expenses(building):
    """Analyze building expenses"""
    print_section("ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΚΤΙΡΙΟΥ")
    
    # Get all expenses for the building
    expenses = Expense.objects.filter(building=building)
    
    if not expenses.exists():
        print("ℹ️  Δεν βρέθηκαν καταχωρημένες δαπάνες")
        return
    
    total_expenses = Decimal('0.00')
    expense_categories = defaultdict(Decimal)
    
    print(f"{'Κατηγορία':<25} {'Ποσό':<15} {'Ημερομηνία':<15} {'Περιγραφή'}")
    print("-" * 80)
    
    for expense in expenses:
        amount = expense.amount or Decimal('0.00')
        total_expenses += amount
        category = expense.category or 'Μη κατηγοριοποιημένη'
        expense_categories[category] += amount
        
        print(f"{category:<25} {format_currency(amount):<15} "
              f"{expense.date.strftime('%d/%m/%Y'):<15} {expense.description[:30]}")
    
    print("-" * 80)
    print(f"{'ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ':<25} {format_currency(total_expenses):<15}")
    
    # Category breakdown
    print_section("ΚΑΤΑΝΟΜΗ ΔΑΠΑΝΩΝ ΑΝΑ ΚΑΤΗΓΟΡΙΑ")
    for category, amount in expense_categories.items():
        percentage = (amount / total_expenses * 100) if total_expenses > 0 else 0
        print(f"{category:<25} {format_currency(amount):<15} ({percentage:.1f}%)")

def analyze_payments(building):
    """Analyze payments and collections"""
    print_section("ΑΝΑΛΥΣΗ ΕΙΣΠΡΑΞΕΩΝ ΚΑΙ ΠΛΗΡΩΜΩΝ")
    
    # Get all apartments in the building
    apartments = Apartment.objects.filter(building=building)
    
    total_collected = Decimal('0.00')
    total_pending = Decimal('0.00')
    pending_payments = []
    
    print(f"{'Διαμέρισμα':<15} {'Ιδιοκτήτης':<25} {'Εισπραχθέν':<15} {'Εκκρεμεί':<15} {'Κατάσταση'}")
    print("-" * 85)
    
    for apartment in apartments:
        # Get payments for this apartment
        payments = Payment.objects.filter(apartment=apartment)
        
        collected = payments.filter(is_confirmed=True).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        pending = payments.filter(is_confirmed=False).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        total_collected += collected
        total_pending += pending
        
        if pending > 0:
            pending_payments.extend(payments.filter(is_confirmed=False))
        
        owner_name = apartment.owner.full_name if apartment.owner else 'Μη ορισμένος'
        status = "✅ Εξοφλημένο" if pending == 0 else "⚠️  Εκκρεμεί"
        
        print(f"{apartment.number:<15} {owner_name:<25} "
              f"{format_currency(collected):<15} {format_currency(pending):<15} {status}")
    
    print("-" * 85)
    print(f"{'ΣΥΝΟΛΟ ΕΙΣΠΡΑΧΘΕΝΤΩΝ':<40} {format_currency(total_collected):<15}")
    print(f"{'ΣΥΝΟΛΟ ΕΚΚΡΕΜΩΝ':<40} {format_currency(total_pending):<15}")
    
    # Show pending payment details
    if pending_payments:
        print_section("ΛΕΠΤΟΜΕΡΕΙΕΣ ΕΚΚΡΕΜΩΝ ΠΛΗΡΩΜΩΝ")
        for payment in pending_payments:
            print(f"💰 {payment.apartment.number} - {payment.amount}€ - {payment.date.strftime('%d/%m/%Y')}")

def analyze_common_expenses(building):
    """Analyze common expenses calculation"""
    print_section("ΑΝΑΛΥΣΗ ΚΟΙΝΟΧΡΗΣΤΩΝ")
    
    # Get common expense periods for the building
    common_expense_periods = CommonExpensePeriod.objects.filter(building=building)
    
    if not common_expense_periods.exists():
        print("ℹ️  Δεν βρέθηκαν καταχωρημένα κοινοχρήστων")
        return
    
    total_common_expense = Decimal('0.00')
    
    print(f"{'Περίοδος':<15} {'Ποσό':<15} {'Τύπος':<20} {'Κατάσταση'}")
    print("-" * 70)
    
    for cep in common_expense_periods:
        amount = cep.total_amount or Decimal('0.00')
        total_common_expense += amount
        status = "✅ Εκδοθέν"  # All expenses are automatically issued
        
        print(f"{cep.period.strftime('%m/%Y'):<15} "
              f"{format_currency(amount):<15} "
              f"{cep.allocation_type:<20} {status}")
    
    print("-" * 70)
    print(f"{'ΣΥΝΟΛΟ ΚΟΙΝΟΧΡΗΣΤΩΝ':<30} {format_currency(total_common_expense):<15}")
    
    # Analyze shares
    print_section("ΚΑΤΑΝΟΜΗ ΚΟΙΝΟΧΡΗΣΤΩΝ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ")
    apartments = Apartment.objects.filter(building=building)
    
    for apartment in apartments:
        shares = ApartmentShare.objects.filter(
            apartment=apartment,
            common_expense_period__building=building
        )
        
        total_share = shares.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        if total_share > 0:
            print(f"🏠 {apartment.number}: {format_currency(total_share)}")

def analyze_reserve_fund(building):
    """Analyze reserve fund status"""
    print_section("ΑΝΑΛΥΣΗ ΑΠΟΘΕΜΑΤΙΚΟΥ ΤΑΜΕΙΟΥ")
    
    # Check if there are any reserve fund related transactions
    reserve_transactions = Transaction.objects.filter(
        apartment__building=building,
        transaction_type='reserve_fund'
    )
    
    if not reserve_transactions.exists():
        print("ℹ️  Δεν βρέθηκαν συναλλαγές αποθεματικού ταμείου")
        return
    
    total_reserve = reserve_transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    print(f"💰 Συνολικό αποθεματικό: {format_currency(total_reserve)}")
    
    for transaction in reserve_transactions:
        print(f"   - {transaction.date.strftime('%d/%m/%Y')}: {format_currency(transaction.amount)}")

def trace_334_85_amount(building):
    """Trace the specific 334,85 € amount"""
    print_section("🔍 ΕΝΤΟΠΙΣΜΟΣ ΤΩΝ 334,85 €")
    
    target_amount = Decimal('334.85')
    
    # Check expenses
    expenses = Expense.objects.filter(building=building, amount=target_amount)
    if expenses.exists():
        print("💰 Βρέθηκε στις δαπάνες:")
        for expense in expenses:
            print(f"   - {expense.category}: {expense.description}")
    
    # Check payments
    payments = Payment.objects.filter(apartment__building=building, amount=target_amount)
    if payments.exists():
        print("💳 Βρέθηκε στις πληρωμές:")
        for payment in payments:
            print(f"   - Διαμέρισμα {payment.apartment.number}: {payment.description}")
    
    # Check common expense periods
    common_expense_periods = CommonExpensePeriod.objects.filter(building=building, total_amount=target_amount)
    if common_expense_periods.exists():
        print("🏢 Βρέθηκε στα κοινοχρήστων:")
        for cep in common_expense_periods:
            print(f"   - Περίοδος {cep.period.strftime('%m/%Y')}: {cep.allocation_type}")
    
    # Check if it's a sum of multiple items
    print_section("🔢 ΕΝΤΟΠΙΣΜΟΣ ΩΣ ΑΘΡΟΙΣΜΑ")
    
    # Check expenses that sum to 334.85
    expenses_sum = Expense.objects.filter(building=building).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0.00')
    
    if abs(expenses_sum - target_amount) < Decimal('0.01'):
        print(f"✅ Το ποσό {format_currency(target_amount)} είναι το σύνολο των δαπανών")
        return
    
    # Check payments sum
    payments_sum = Payment.objects.filter(
        apartment__building=building,
        is_confirmed=True
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    if abs(payments_sum - target_amount) < Decimal('0.01'):
        print(f"✅ Το ποσό {format_currency(target_amount)} είναι το σύνολο των εισπράξεων")
        return
    
    # Check common expense shares
    shares_sum = ApartmentShare.objects.filter(
        apartment__building=building
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    if abs(shares_sum - target_amount) < Decimal('0.01'):
        print(f"✅ Το ποσό {format_currency(target_amount)} είναι το σύνολο των μεριδίων κοινοχρήστων")
        return
    
    print(f"❓ Το ποσό {format_currency(target_amount)} δεν βρέθηκε ως ακριβές άθροισμα")
    print(f"   Δαπάνες: {format_currency(expenses_sum)}")
    print(f"   Εισπράξεις: {format_currency(payments_sum)}")
    print(f"   Κοινοχρήστων: {format_currency(shares_sum)}")

def calculate_total_balance(building):
    """Calculate total building balance"""
    print_section("ΣΥΝΟΛΙΚΗ ΟΙΚΟΝΟΜΙΚΗ ΚΑΤΑΣΤΑΣΗ")
    
    # Total expenses
    total_expenses = Expense.objects.filter(building=building).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0.00')
    
    # Total collections
    total_collections = Payment.objects.filter(
        apartment__building=building,
        is_confirmed=True
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Total pending
    total_pending = Payment.objects.filter(
        apartment__building=building,
        is_confirmed=False
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Calculate balance
    balance = total_collections - total_expenses
    
    print(f"💰 Συνολικές Δαπάνες: {format_currency(total_expenses)}")
    print(f"💳 Συνολικές Εισπράξεις: {format_currency(total_collections)}")
    print(f"⏳ Εκκρεμείς Πληρωμές: {format_currency(total_pending)}")
    print(f"📊 Υπόλοιπο: {format_currency(balance)}")
    
    if balance >= 0:
        print("✅ Το κτίριο έχει θετικό υπόλοιπο")
    else:
        print("⚠️  Το κτίριο έχει αρνητικό υπόλοιπο")
    
    # Coverage analysis
    if total_expenses > 0:
        coverage_percentage = (total_collections / total_expenses) * 100
        print(f"📈 Ποσοστό κάλυψης: {coverage_percentage:.1f}%")
        
        if coverage_percentage >= 100:
            print("✅ Πλήρης κάλυψη δαπανών")
        elif coverage_percentage >= 80:
            print("⚠️  Καλή κάλυψη, αλλά χρειάζεται προσοχή")
        else:
            print("❌ Χαμηλή κάλυψη δαπανών")

if __name__ == "__main__":
    try:
        analyze_building_finances()
        print_header("ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΑΝΑΛΥΣΗ")
        print("📋 Η αναλυτική οικονομική ανάλυση ολοκληρώθηκε επιτυχώς!")
    except Exception as e:
        print(f"❌ Σφάλμα κατά την ανάλυση: {str(e)}")
        import traceback
        traceback.print_exc()
