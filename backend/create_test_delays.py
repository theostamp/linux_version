#!/usr/bin/env python3
"""
Script για δημιουργία test data με καθυστερήσεις πληρωμών
"""

import os
import sys
import django
from datetime import datetime, date, timedelta
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
from financial.models import Payment, Transaction, Expense
from buildings.models import Building


def create_test_delays():
    """Δημιουργία test data με καθυστερήσεις"""
    
    with schema_context('demo'):
        print("🧪 Δημιουργία test data με καθυστερήσεις πληρωμών")
        print("=" * 60)
        
        building = Building.objects.get(id=2)  # Αλκμάνος 22
        apartments = Apartment.objects.filter(building=building)
        
        # Δημιουργία test expense
        test_expense = Expense.objects.create(
            building=building,
            title="Test Κοινοχρήστων - Ιανουάριος 2024",
            amount=Decimal('500.00'),
            date=date(2024, 1, 15),
            category='cleaning',
            distribution_type='by_participation_mills',
            notes="Test expense για έλεγχο καθυστερήσεων"
        )
        
        print(f"✅ Δημιουργήθηκε test expense: {test_expense.title} - {test_expense.amount}€")
        
        # Δημιουργία χρεώσεων για κάθε διαμέρισμα
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        
        for i, apartment in enumerate(apartments):
            # Υπολογισμός μεριδίου βάσει χιλιοστών
            mills = apartment.participation_mills or 0
            if total_mills > 0:
                share_amount = test_expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))
            else:
                share_amount = test_expense.amount / Decimal(str(apartments.count()))
            
            # Υπολογισμός τρέχοντος υπολοίπου πριν τη χρέωση
            current_balance = apartment.current_balance or Decimal('0.00')
            balance_after = current_balance + share_amount
            
            # Δημιουργία χρέωσης
            charge = Transaction.objects.create(
                building=building,
                apartment=apartment,
                type='common_expense_charge',
                amount=share_amount,
                date=datetime(2024, 1, 15, 12, 0, 0),
                description=f"Κοινόχρηστα Ιανουαρίου 2024 - {apartment.number}",
                reference_type='expense',
                reference_id=test_expense.id,
                balance_before=current_balance,
                balance_after=balance_after
            )
            
            print(f"💰 Χρέωση διαμερίσματος {apartment.number}: {share_amount:,.2f}€")
            
            # Δημιουργία πληρωμών με διαφορετικές καθυστερήσεις
            if i < 3:  # Πρώτα 3 διαμερίσματα - πληρώνουν άμεσα
                payment_date = date(2024, 1, 20)
                payment_amount = share_amount
                print(f"   ✅ Πληρωμή: {payment_date.strftime('%d/%m/%Y')} - {payment_amount:,.2f}€")
                
            elif i < 6:  # Επόμενα 3 διαμερίσματα - καθυστέρηση 20 ημερών
                payment_date = date(2024, 2, 4)  # 20 ημέρες μετά
                payment_amount = share_amount
                print(f"   ⚠️  Πληρωμή με καθυστέρηση: {payment_date.strftime('%d/%m/%Y')} - {payment_amount:,.2f}€")
                
            elif i < 8:  # Επόμενα 2 διαμερίσματα - καθυστέρηση 50 ημερών
                payment_date = date(2024, 3, 6)  # 50 ημέρες μετά
                payment_amount = share_amount
                print(f"   🔴 Πληρωμή με μεγάλη καθυστέρηση: {payment_date.strftime('%d/%m/%Y')} - {payment_amount:,.2f}€")
                
            else:  # Τελευταία 2 διαμερίσματα - δεν έχουν πληρώσει ακόμα
                payment_date = None
                payment_amount = Decimal('0.00')
                print(f"   ❌ Δεν έχει πληρώσει ακόμα")
            
            # Δημιουργία πληρωμής αν υπάρχει
            if payment_date:
                payment = Payment.objects.create(
                    apartment=apartment,
                    amount=payment_amount,
                    date=payment_date,
                    method='bank_transfer',
                    payment_type='common_expense',
                    payer_type='owner',
                    payer_name=apartment.owner_name or 'Άγνωστος',
                    reference_number=f"TEST-{apartment.number}-{payment_date.strftime('%Y%m%d')}",
                    previous_obligations_amount=Decimal('0.00')
                )
                
                # Υπολογισμός υπολοίπου πριν την πληρωμή
                balance_before_payment = apartment.current_balance or Decimal('0.00')
                balance_after_payment = balance_before_payment - payment_amount
                
                # Δημιουργία transaction για την πληρωμή
                payment_transaction = Transaction.objects.create(
                    building=building,
                    apartment=apartment,
                    type='common_expense_payment',
                    amount=payment_amount,
                    date=datetime.combine(payment_date, datetime.min.time()),
                    description=f"Πληρωμή κοινοχρήστων Ιανουαρίου - {apartment.number}",
                    reference_type='payment',
                    reference_id=payment.id,
                    balance_before=balance_before_payment,
                    balance_after=balance_after_payment
                )
        
        print()
        print("✅ Test data δημιουργήθηκε επιτυχώς!")
        print()
        print("📊 Περίληψη:")
        print("   - 3 διαμερίσματα: Πληρωμή άμεσα (Ενεργό)")
        print("   - 3 διαμερίσματα: Καθυστέρηση 20 ημερών (Οφειλή)")
        print("   - 2 διαμερίσματα: Καθυστέρηση 50 ημερών (Κρίσιμο)")
        print("   - 2 διαμερίσματα: Δεν έχουν πληρώσει (Κρίσιμο)")


if __name__ == "__main__":
    create_test_delays()
