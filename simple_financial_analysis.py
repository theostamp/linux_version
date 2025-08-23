#!/usr/bin/env python3
"""
Simple Financial Analysis for Αραχώβης 12
Focus on key financial data to understand the 334,85 € amount
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.db.models import Sum, Q

def print_header(title, symbol="="):
    """Print formatted header"""
    print(f"\n{symbol * 50}")
    print(f" {title} ")
    print(f"{symbol * 50}")

def format_currency(amount):
    """Format amount as EUR currency"""
    if amount is None:
        return "0,00 €"
    return f"{amount:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")

def simple_analysis():
    """Simple analysis focusing on understanding 334,85 €"""
    
    with schema_context('demo'):
        print_header("🏢 ΑΠΛΗ ΟΙΚΟΝΟΜΙΚΗ ΑΝΑΛΥΣΗ - ΑΡΑΧΩΒΗΣ 12")
        print(f"📅 Ανάλυση: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        
        try:
            # Import models after Django setup
            from financial.models import Expense, Payment, Transaction
            from apartments.models import Apartment
            
            print("\n✅ Models imported successfully")
            
            # Find apartments for Αραχώβης 12 
            # Let's search by address pattern
            apartments = Apartment.objects.filter(
                building__address__icontains="Αραχώβης"
            )
            
            print(f"🏠 Διαμερίσματα Αραχώβης: {apartments.count()}")
            
            if apartments.count() == 0:
                # Check all buildings to understand the data structure
                print("\n🔍 ΔΙΕΡΕΥΝΗΣΗ ΔΙΑΘΕΣΙΜΩΝ ΚΤΙΡΙΩΝ:")
                try:
                    from buildings.models import Building
                    buildings = Building.objects.all()
                    print(f"Συνολικά κτίρια: {buildings.count()}")
                    for building in buildings:
                        print(f"   • {building.name}: {building.address}")
                except Exception as e:
                    print(f"Σφάλμα κτιρίων: {e}")
                
                # Try finding by apartment building reference
                all_apartments = Apartment.objects.all()
                print(f"\n🏠 Συνολικά διαμερίσματα: {all_apartments.count()}")
                
                # Show some examples
                for apt in all_apartments[:10]:
                    print(f"   • Διαμ. {apt.apartment_number}: {apt.building}")
                    
                return
            
            building = apartments.first().building
            print(f"✅ Κτίριο: {building.name}")
            print(f"📍 Διεύθυνση: {building.address}")
            
            # 1. EXPENSES ANALYSIS
            print_header("💸 ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ")
            
            # February 2025 expenses
            feb_2025 = date(2025, 2, 1)
            expenses = Expense.objects.filter(
                building=building,
                date__year=feb_2025.year,
                date__month=feb_2025.month
            )
            
            total_expenses = Decimal('0')
            print(f"📅 Δαπάνες Φεβρουαρίου 2025: {expenses.count()}")
            
            for expense in expenses:
                print(f"   • {expense.description}: {format_currency(expense.amount)}")
                print(f"     📅 {expense.date} | Κατηγορία: {expense.category}")
                total_expenses += expense.amount
            
            print(f"\n💰 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ: {format_currency(total_expenses)}")
            
            # All expenses (no is_paid field in this model)
            all_expenses = Expense.objects.filter(building=building)
            
            all_expenses_total = sum(exp.amount for exp in all_expenses) or Decimal('0')
            print(f"📊 Συνολικές δαπάνες κτιρίου: {all_expenses.count()} ({format_currency(all_expenses_total)})")
            
            # 2. PAYMENTS ANALYSIS
            print_header("💰 ΑΝΑΛΥΣΗ ΠΛΗΡΩΜΩΝ")
            
            payments = Payment.objects.filter(
                apartment__building=building,
                date__year=feb_2025.year,
                date__month=feb_2025.month
            )
            
            confirmed_payments = payments.filter(is_confirmed=True)
            pending_payments = payments.filter(is_confirmed=False)
            
            confirmed_total = sum(p.amount for p in confirmed_payments) or Decimal('0')
            pending_total = sum(p.amount for p in pending_payments) or Decimal('0')
            
            print(f"✅ Επιβεβαιωμένες πληρωμές: {confirmed_payments.count()} ({format_currency(confirmed_total)})")
            print(f"⏳ Εκκρεμείς πληρωμές: {pending_payments.count()} ({format_currency(pending_total)})")
            
            print(f"\n🔍 ΛΕΠΤΟΜΕΡΕΙΕΣ ΕΚΚΡΕΜΩΝ ΠΛΗΡΩΜΩΝ:")
            for payment in pending_payments:
                print(f"   • Διαμ. {payment.apartment.apartment_number}: {format_currency(payment.amount)}")
                print(f"     📅 {payment.date} | {payment.description}")
            
            # 3. BALANCE CALCULATION
            print_header("⚖️ ΥΠΟΛΟΓΙΣΜΟΣ ΥΠΟΛΟΙΠΩΝ")
            
            for apt in apartments:
                # Get transactions for this apartment
                transactions = Transaction.objects.filter(apartment=apt)
                balance = transactions.aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
                
                print(f"🏠 Διαμ. {apt.apartment_number}:")
                print(f"   👤 {apt.owner_name}")
                print(f"   💰 Υπόλοιπο: {format_currency(balance)}")
                
                if balance > Decimal('0.01'):
                    print(f"   ✅ Πιστωτικό υπόλοιπο")
                elif balance < Decimal('-0.01'):
                    print(f"   ⚠️ Χρεωστικό υπόλοιπο")
                else:
                    print(f"   ⚖️ Μηδενικό υπόλοιπο")
            
            # 4. ANALYSIS OF 334,85 €
            print_header("🔍 ΑΝΑΛΥΣΗ 334,85 €")
            
            print("🎯 ΠΙΘΑΝΕΣ ΠΗΓΕΣ ΤΟΥ ΠΟΣΟΥ:")
            print(f"   1. Δαπάνες Φεβρουαρίου: {format_currency(total_expenses)}")
            print(f"   2. Συνολικές δαπάνες: {format_currency(all_expenses_total)}")
            print(f"   3. Εκκρεμείς πληρωμές: {format_currency(pending_total)}")
            
            # Calculate monthly obligation per apartment
            if apartments.count() > 0:
                monthly_per_apt = Decimal('334.85') / apartments.count()
                print(f"   4. Μηνιαία υποχρέωση/διαμέρισμα: {format_currency(monthly_per_apt)}")
            
            # Check if it matches any combination
            target = Decimal('334.85')
            print(f"\n🧮 ΣΥΓΚΡΙΣΗ ΜΕ ΣΤΟΧΟ (334,85 €):")
            
            if abs(total_expenses - target) < Decimal('1'):
                print(f"✅ Ταιριάζει με δαπάνες μήνα!")
            elif abs(all_expenses_total - target) < Decimal('1'):
                print(f"✅ Ταιριάζει με συνολικές δαπάνες!")
            elif abs(pending_total - target) < Decimal('1'):
                print(f"✅ Ταιριάζει με εκκρεμείς πληρωμές!")
            else:
                print(f"🔍 Δεν ταιριάζει ακριβώς με κανένα από τα παραπάνω")
                print(f"   Πιθανότατα συνδυασμός ή άλλος υπολογισμός")
            
            # 5. SUMMARY
            print_header("📋 ΣΥΝΟΨΗ")
            print(f"🏢 Κτίριο: {building.name}")
            print(f"🏠 Διαμερίσματα: {apartments.count()}")
            print(f"💸 Δαπάνες Φεβρουαρίου: {format_currency(total_expenses)}")
            print(f"💰 Επιβεβαιωμένες πληρωμές: {format_currency(confirmed_total)}")
            print(f"⏳ Εκκρεμείς πληρωμές: {pending_payments.count()} ({format_currency(pending_total)})")
            print(f"🎯 Στόχος ανάλυσης: 334,85 €")
            
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    simple_analysis()
