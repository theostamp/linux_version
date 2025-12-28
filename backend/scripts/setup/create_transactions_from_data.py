#!/usr/bin/env python3
"""
Script to create transactions from existing payments and expenses
"""

import os
import sys
import django
from datetime import datetime, timezone

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense, Transaction
from buildings.models import Building
from apartments.models import Apartment

def create_transactions_from_data():
    """Create transactions from existing payments and expenses"""
    
    print("🔧 ΔΗΜΙΟΥΡΓΙΑ ΣΥΝΑΛΛΑΓΩΝ ΑΠΟ ΥΠΑΡΧΟΝΤΑ ΔΕΔΟΜΕΝΑ")
    print("=" * 60)
    
    with schema_context('demo'):
        # Get building (Αθηνών 12 - ID 1)
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Check existing transactions
        existing_transactions = Transaction.objects.filter(apartment__building=building).count()
        print(f"Υπάρχουσες συναλλαγές: {existing_transactions}")
        
        if existing_transactions > 0:
            print("✅ Υπάρχουν ήδη συναλλαγές!")
            return
        
        # Get all payments
        payments = Payment.objects.filter(apartment__building=building)
        print(f"Πληρωμές που θα μετατραπούν: {payments.count()}")
        
        # Get all expenses
        expenses = Expense.objects.filter(building=building)
        print(f"Δαπάνες που θα μετατραπούν: {expenses.count()}")
        
        transactions_created = 0
        
        # Create transactions from payments
        for payment in payments:
            try:
                # Create payment transaction with timezone-aware datetime
                payment_datetime = datetime.combine(payment.date, datetime.min.time(), tzinfo=timezone.utc)
                transaction = Transaction.objects.create(
                    apartment=payment.apartment,
                    building=payment.apartment.building,
                    date=payment_datetime,
                    amount=payment.amount,
                    type='payment_received',
                    description=f"Είσπραξη κοινοχρήστων - {payment.payment_type}",
                    balance_after=payment.amount  # Set initial balance
                )
                transactions_created += 1
                print(f"✅ Δημιουργήθηκε συναλλαγή πληρωμής: {payment.apartment.number} - {payment.amount}€")
            except Exception as e:
                print(f"❌ Σφάλμα στη δημιουργία συναλλαγής πληρωμής: {e}")
        
        # Create transactions from expenses
        for expense in expenses:
            try:
                # Get apartments for this building
                apartments = Apartment.objects.filter(building=building)
                
                # Calculate share per apartment (equal distribution for now)
                share_per_apartment = expense.amount / apartments.count()
                
                for apartment in apartments:
                    # Create expense transaction with timezone-aware datetime
                    expense_datetime = datetime.combine(expense.date, datetime.min.time(), tzinfo=timezone.utc)
                    transaction = Transaction.objects.create(
                        apartment=apartment,
                        building=apartment.building,
                        date=expense_datetime,
                        amount=-share_per_apartment,  # Negative amount for expenses
                        type='common_expense_charge',
                        description=f"Χρέωση κοινοχρήστων - {expense.title}",
                        balance_after=-share_per_apartment  # Set initial balance
                    )
                    transactions_created += 1
                    print(f"✅ Δημιουργήθηκε συναλλαγή δαπάνης: {apartment.number} - {share_per_apartment}€")
            except Exception as e:
                print(f"❌ Σφάλμα στη δημιουργία συναλλαγής δαπάνης: {e}")
        
        print()
        print(f"🎉 Δημιουργήθηκαν {transactions_created} συναλλαγές!")
        
        # Verify the transactions
        total_transactions = Transaction.objects.filter(apartment__building=building).count()
        print(f"Συνολικές συναλλαγές τώρα: {total_transactions}")
        
        # Show some sample transactions
        print("\n📋 ΔΕΙΓΜΑ ΣΥΝΑΛΛΑΓΩΝ:")
        recent_transactions = Transaction.objects.filter(apartment__building=building).order_by('-date')[:10]
        for transaction in recent_transactions:
            print(f"   {transaction.date}: {transaction.apartment.number} - {transaction.amount}€ ({transaction.type})")

if __name__ == "__main__":
    create_transactions_from_data()
