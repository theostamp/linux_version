#!/usr/bin/env python3
"""
Script to check for payments with previous obligations for August 2025
Ελέγχει για πληρωμές με παλιές οφειλές τον Αύγουστο 2025
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense, Transaction
from django.db.models import Q

def check_august_2025_payments():
    """Check for payments with previous obligations for August 2025"""
    
    print("🔍 Ελέγχος για πληρωμές με παλιές οφειλές τον Αύγουστο 2025...")
    print("=" * 60)
    
    with schema_context('demo'):
        # Check for payments made in August 2025
        august_2025_payments = Payment.objects.filter(
            date__year=2025,
            date__month=8
        ).order_by('date')
        
        print(f"💰 Πληρωμές που έγιναν τον Αύγουστο 2025: {august_2025_payments.count()}")
        
        if august_2025_payments.exists():
            print("\n📋 Λεπτομέρειες πληρωμών Αυγούστου 2025:")
            total_previous_obligations = 0
            
            for payment in august_2025_payments:
                apartment_number = payment.apartment.number
                amount = payment.amount or 0
                previous_obligations = payment.previous_obligations_amount or 0
                payment_type = payment.get_payment_type_display()
                method = payment.get_method_display()
                
                total_previous_obligations += previous_obligations
                
                print(f"  • Διαμέρισμα {apartment_number}:")
                print(f"    Ποσό πληρωμής: {amount}€")
                print(f"    Παλιές οφειλές: {previous_obligations}€")
                print(f"    Τύπος πληρωμής: {payment_type}")
                print(f"    Τρόπος πληρωμής: {method}")
                print(f"    Ημ/νία: {payment.date}")
                print()
            
            print(f"📊 Συνολικές παλιές οφειλές από πληρωμές Αυγούστου: {total_previous_obligations}€")
        else:
            print("❌ Δεν βρέθηκαν πληρωμές τον Αύγουστο 2025")
        
        # Check for payments created in August 2025
        august_2025_created_payments = Payment.objects.filter(
            created_at__year=2025,
            created_at__month=8
        ).order_by('created_at')
        
        print(f"\n📝 Πληρωμές που δημιουργήθηκαν τον Αύγουστο 2025: {august_2025_created_payments.count()}")
        
        if august_2025_created_payments.exists():
            print("\n📋 Πληρωμές που δημιουργήθηκαν τον Αύγουστο:")
            for payment in august_2025_created_payments[:5]:  # Show first 5
                apartment_number = payment.apartment.number
                amount = payment.amount or 0
                previous_obligations = payment.previous_obligations_amount or 0
                date = payment.date
                created_at = payment.created_at
                
                print(f"  • Διαμέρισμα {apartment_number}:")
                print(f"    Ποσό: {amount}€")
                print(f"    Παλιές οφειλές: {previous_obligations}€")
                print(f"    Ημ/νία πληρωμής: {date}")
                print(f"    Δημιουργήθηκε: {created_at}")
                print()
        
        # Check for any payments with previous obligations > 0
        payments_with_previous_obligations = Payment.objects.filter(
            previous_obligations_amount__gt=0
        ).order_by('-previous_obligations_amount')
        
        print(f"\n💰 Πληρωμές με παλιές οφειλές > 0: {payments_with_previous_obligations.count()}")
        
        if payments_with_previous_obligations.exists():
            print("\n📋 Πληρωμές με παλιές οφειλές:")
            total_previous_obligations = 0
            
            for payment in payments_with_previous_obligations[:10]:  # Show first 10
                apartment_number = payment.apartment.number
                previous_obligations = payment.previous_obligations_amount or 0
                amount = payment.amount or 0
                date = payment.date
                payment_type = payment.get_payment_type_display()
                
                total_previous_obligations += previous_obligations
                
                print(f"  • Διαμέρισμα {apartment_number}:")
                print(f"    Παλιές οφειλές: {previous_obligations}€")
                print(f"    Ποσό πληρωμής: {amount}€")
                print(f"    Τύπος: {payment_type}")
                print(f"    Ημ/νία: {date}")
                print()
            
            print(f"📊 Συνολικές παλιές οφειλές από όλες τις πληρωμές: {total_previous_obligations}€")
        
        # Check for expenses in August 2025
        august_2025_expenses = Expense.objects.filter(
            Q(date__year=2025, date__month=8) |
            Q(created_at__year=2025, created_at__month=8)
        ).order_by('date')
        
        print(f"\n💸 Δαπάνες τον Αύγουστο 2025: {august_2025_expenses.count()}")
        
        if august_2025_expenses.exists():
            print("\n📋 Δαπάνες Αυγούστου 2025:")
            total_expenses = 0
            
            for expense in august_2025_expenses:
                title = expense.title
                amount = expense.amount or 0
                date = expense.date
                category = expense.get_category_display()
                
                total_expenses += amount
                
                print(f"  • {title}:")
                print(f"    Ποσό: {amount}€")
                print(f"    Κατηγορία: {category}")
                print(f"    Ημ/νία: {date}")
                print()
            
            print(f"📊 Συνολικές δαπάνες Αυγούστου: {total_expenses}€")
        
        # Check for transactions in August 2025
        august_2025_transactions = Transaction.objects.filter(
            Q(date__year=2025, date__month=8) |
            Q(created_at__year=2025, created_at__month=8)
        ).order_by('date')
        
        print(f"\n💳 Συναλλαγές τον Αύγουστο 2025: {august_2025_transactions.count()}")
        
        if august_2025_transactions.exists():
            print("\n📋 Συναλλαγές Αυγούστου 2025:")
            for transaction in august_2025_transactions[:5]:  # Show first 5
                apartment_number = transaction.apartment.number
                amount = transaction.amount or 0
                transaction_type = transaction.type
                description = transaction.description
                date = transaction.date
                balance_before = transaction.balance_before or 0
                balance_after = transaction.balance_after or 0
                
                print(f"  • Διαμέρισμα {apartment_number}:")
                print(f"    Ποσό: {amount}€")
                print(f"    Τύπος: {transaction_type}")
                print(f"    Περιγραφή: {description}")
                print(f"    Υπόλοιπο πριν: {balance_before}€")
                print(f"    Υπόλοιπο μετά: {balance_after}€")
                print(f"    Ημ/νία: {date}")
                print()

if __name__ == '__main__':
    try:
        check_august_2025_payments()
        print("\n✅ Έλεγχος ολοκληρώθηκε επιτυχώς!")
    except Exception as e:
        print(f"\n❌ Σφάλμα κατά τον έλεγχο: {str(e)}")
        import traceback
        traceback.print_exc()
