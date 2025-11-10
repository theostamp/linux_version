#!/usr/bin/env python3
"""
Script για δημιουργία Transaction records για εισπράξεις και δαπάνες
"""

import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.models import Payment, Expense, Transaction
from buildings.models import Building

def fix_transactions():
    """Δημιουργία Transaction records για εισπράξεις και δαπάνες"""
    print("🔧 ΔΗΜΙΟΥΡΓΙΑ TRANSACTION RECORDS")
    print("=" * 50)
    
    # Get demo client
    try:
        client = Client.objects.get(schema_name='demo')
        print(f"📋 Tenant: {client.name} (Schema: {client.schema_name})")
    except Client.DoesNotExist:
        print("❌ Demo tenant δεν βρέθηκε")
        return
    
    # Fix in demo tenant
    with tenant_context(client):
        building = Building.objects.first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        
        # Check existing transactions
        existing_transactions = Transaction.objects.count()
        print(f"📊 Υπάρχοντα transactions: {existing_transactions}")
        
        # Create transactions for payments
        all_payments = Payment.objects.filter(apartment__building=building)
        existing_payment_transactions = Transaction.objects.filter(
            type__in=['common_expense_payment', 'expense_payment']
        )
        
        payments_without_transactions = []
        for payment in all_payments:
            # Check if transaction already exists for this payment
            existing = existing_payment_transactions.filter(
                apartment=payment.apartment,
                amount=payment.amount,
                date__date=payment.date
            ).first()
            
            if not existing:
                payments_without_transactions.append(payment)
        
        print(f"\n💳 Εισπράξεις χωρίς transaction: {len(payments_without_transactions)}")
        
        payment_transactions_created = 0
        for payment in payments_without_transactions:
            transaction = Transaction.objects.create(
                building=building,
                date=payment.date,
                type='common_expense_payment',
                status='completed',
                description=f"Είσπραξη Κοινοχρήστων - {payment.apartment.number}",
                apartment=payment.apartment,
                apartment_number=payment.apartment.number,
                amount=payment.amount,
                balance_before=building.current_reserve - payment.amount,
                balance_after=building.current_reserve,
                reference_id=str(payment.id),
                reference_type='payment',
                notes=f"Αυτόματη δημιουργία για είσπραξη {payment.id}"
            )
            payment_transactions_created += 1
            print(f"  ✅ Δημιουργήθηκε transaction για είσπραξη {payment.id}: {payment.amount}€")
        
        # Create transactions for expenses
        all_expenses = Expense.objects.filter(building=building)
        existing_expense_transactions = Transaction.objects.filter(type='expense_created')
        
        expenses_without_transactions = []
        for expense in all_expenses:
            # Check if transaction already exists for this expense
            existing = existing_expense_transactions.filter(
                reference_id=str(expense.id)
            ).first()
            
            if not existing:
                expenses_without_transactions.append(expense)
        
        print(f"\n💸 Δαπάνες χωρίς transaction: {len(expenses_without_transactions)}")
        
        expense_transactions_created = 0
        for expense in expenses_without_transactions:
            transaction = Transaction.objects.create(
                building=building,
                date=expense.date,
                type='expense_created',
                status='completed',
                description=f"Δαπάνη: {expense.title}",
                amount=-expense.amount,  # Negative for expenses
                balance_before=building.current_reserve + expense.amount,
                balance_after=building.current_reserve,
                reference_id=str(expense.id),
                reference_type='expense',
                notes=f"Αυτόματη δημιουργία για δαπάνη {expense.id}"
            )
            expense_transactions_created += 1
            print(f"  ✅ Δημιουργήθηκε transaction για δαπάνη {expense.id}: -{expense.amount}€")
        
        # Summary
        total_created = payment_transactions_created + expense_transactions_created
        print("\n📊 ΣΥΝΟΠΤΙΚΗ:")
        print(f"  - Transactions για εισπράξεις: {payment_transactions_created}")
        print(f"  - Transactions για δαπάνες: {expense_transactions_created}")
        print(f"  - Συνολικά δημιουργημένα: {total_created}")
        
        # Verify
        total_transactions = Transaction.objects.count()
        print(f"  - Συνολικά transactions στη βάση: {total_transactions}")
        
        if total_created > 0:
            print("✅ Δημιουργία transactions επιτυχής!")
        else:
            print("ℹ️  Όλα τα transactions υπήρχαν ήδη!")

if __name__ == "__main__":
    fix_transactions() 