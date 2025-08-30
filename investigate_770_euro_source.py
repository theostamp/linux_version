import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment
from apartments.models import Apartment
from buildings.models import Building
from decimal import Decimal
from datetime import date
from django.db.models import Sum

def investigate_770_euro_source():
    """Ερευνά από πού προέρχονται τα 770€ στις προηγούμενες οφειλές Ιουλίου"""
    
    with schema_context('demo'):
        print("🔍 ΕΡΕΥΝΑ ΠΗΓΗΣ 770€ ΣΤΙΣ ΠΡΟΗΓΟΥΜΕΝΕΣ ΟΦΕΙΛΕΣ")
        print("=" * 60)
        
        # Get Araxovis building
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        
        print("\n1️⃣ ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΔΑΠΑΝΩΝ:")
        print("-" * 50)
        
        # Check all expenses for this building
        all_expenses = Expense.objects.filter(building_id=1).order_by('date')
        print(f"📊 Συνολικές δαπάνες: {all_expenses.count()}")
        
        total_expenses_amount = Decimal('0.00')
        for expense in all_expenses:
            total_expenses_amount += expense.amount
            print(f"   💰 {expense.date}: {expense.title} - {expense.amount}€")
        
        print(f"   📈 Συνολικό ποσό δαπανών: {total_expenses_amount}€")
        
        print("\n2️⃣ ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΣΥΝΑΛΛΑΓΩΝ:")
        print("-" * 50)
        
        # Check all transactions for this building
        all_transactions = Transaction.objects.filter(building_id=1).order_by('date')
        print(f"📊 Συνολικές συναλλαγές: {all_transactions.count()}")
        
        charge_transactions = all_transactions.filter(
            type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                     'interest_charge', 'penalty_charge']
        )
        
        total_charges = Decimal('0.00')
        for transaction in charge_transactions:
            total_charges += abs(transaction.amount)
            print(f"   📋 {transaction.date}: {transaction.description} - {transaction.amount}€")
        
        print(f"   📈 Συνολικές χρεώσεις: {total_charges}€")
        
        print("\n3️⃣ ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΠΛΗΡΩΜΩΝ:")
        print("-" * 50)
        
        # Check all payments for this building
        all_payments = Payment.objects.filter(apartment__building_id=1).order_by('date')
        print(f"📊 Συνολικές πληρωμές: {all_payments.count()}")
        
        total_payments = Decimal('0.00')
        for payment in all_payments:
            total_payments += payment.amount
            print(f"   💳 {payment.date}: Διαμέρισμα {payment.apartment.number} - {payment.amount}€")
        
        print(f"   📈 Συνολικές πληρωμές: {total_payments}€")
        
        print("\n4️⃣ ΥΠΟΛΟΓΙΣΜΟΣ ΥΠΟΛΟΙΠΩΝ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
        print("-" * 50)
        
        apartments = Apartment.objects.filter(building_id=1).order_by('number')
        total_negative_balances = Decimal('0.00')
        
        for apartment in apartments:
            # Current balance from apartment model
            current_balance = apartment.current_balance or Decimal('0.00')
            
            # Calculate from transactions
            apartment_charges = Transaction.objects.filter(
                apartment=apartment,
                type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                         'interest_charge', 'penalty_charge']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            apartment_payments = Payment.objects.filter(
                apartment=apartment
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            calculated_balance = apartment_payments - abs(apartment_charges)
            
            if current_balance < 0:
                total_negative_balances += abs(current_balance)
            
            print(f"   🏠 Διαμέρισμα {apartment.number}:")
            print(f"      💰 Current balance: {current_balance}€")
            print(f"      🧮 Calculated balance: {calculated_balance}€")
            print(f"      📊 Χρεώσεις: {apartment_charges}€")
            print(f"      💳 Πληρωμές: {apartment_payments}€")
        
        print(f"\n   📈 Συνολικές αρνητικές οφειλές: {total_negative_balances}€")
        
        print("\n5️⃣ ΕΛΕΓΧΟΣ ΠΑΛΑΙΟΤΕΡΩΝ ΜΗΝΩΝ:")
        print("-" * 50)
        
        # Check for expenses in different months
        from datetime import datetime
        from collections import defaultdict
        
        expenses_by_month = defaultdict(list)
        for expense in all_expenses:
            month_key = expense.date.strftime('%Y-%m')
            expenses_by_month[month_key].append(expense)
        
        print("📅 Δαπάνες ανά μήνα:")
        for month, expenses in sorted(expenses_by_month.items()):
            month_total = sum(exp.amount for exp in expenses)
            print(f"   📆 {month}: {len(expenses)} δαπάνες, σύνολο {month_total}€")
            for exp in expenses:
                print(f"      💰 {exp.date}: {exp.title} - {exp.amount}€")
        
        print("\n6️⃣ ΣΥΜΠΕΡΑΣΜΑΤΑ:")
        print("-" * 50)
        
        print(f"   🔍 Συνολικές δαπάνες στη βάση: {total_expenses_amount}€")
        print(f"   🔍 Συνολικές χρεώσεις συναλλαγών: {total_charges}€")
        print(f"   🔍 Συνολικές πληρωμές: {total_payments}€")
        print(f"   🔍 Συνολικές αρνητικές οφειλές διαμερισμάτων: {total_negative_balances}€")
        
        # Check if 770€ matches any of these totals
        target_amount = Decimal('770.80')
        print(f"\n   🎯 Αναζήτηση για {target_amount}€:")
        
        if abs(total_negative_balances - target_amount) < Decimal('1.00'):
            print(f"   ✅ Βρέθηκε: Συνολικές αρνητικές οφειλές ≈ {target_amount}€")
        
        if abs(total_charges - target_amount) < Decimal('1.00'):
            print(f"   ✅ Βρέθηκε: Συνολικές χρεώσεις ≈ {target_amount}€")

if __name__ == "__main__":
    investigate_770_euro_source()
