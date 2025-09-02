#!/usr/bin/env python3
"""
Script to check all transactions for August 2025 to see if there are previous obligations
Ελέγχει όλες τις συναλλαγές του Αυγούστου 2025 για παλιές οφειλές
"""

import os
import sys
import django
from datetime import datetime
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Expense, Payment
from django.db.models import Sum, Q, Count

def check_august_2025_transactions():
    """Check all transactions for August 2025 to see if there are previous obligations"""
    
    print("🔍 Έλεγχος όλων των συναλλαγών του Αυγούστου 2025...")
    print("=" * 60)
    
    with schema_context('demo'):
        # Get all transactions for August 2025
        august_2025_transactions = Transaction.objects.filter(
            Q(date__year=2025, date__month=8) |
            Q(created_at__year=2025, created_at__month=8)
        ).order_by('apartment__number', 'date')
        
        print(f"💳 Συνολικές συναλλαγές Αυγούστου 2025: {august_2025_transactions.count()}")
        
        if august_2025_transactions.exists():
            print("\n📋 Λεπτομέρειες όλων των συναλλαγών:")
            
            # Group by apartment
            apartments_data = {}
            total_previous_balance = 0
            
            for transaction in august_2025_transactions:
                apartment_number = transaction.apartment.number
                amount = transaction.amount or 0
                transaction_type = transaction.type
                description = transaction.description
                date = transaction.date
                balance_before = transaction.balance_before or 0
                balance_after = transaction.balance_after or 0
                
                if apartment_number not in apartments_data:
                    apartments_data[apartment_number] = {
                        'transactions': [],
                        'initial_balance': None,
                        'final_balance': None,
                        'total_expenses': 0,
                        'total_payments': 0
                    }
                
                apartments_data[apartment_number]['transactions'].append({
                    'amount': amount,
                    'type': transaction_type,
                    'description': description,
                    'date': date,
                    'balance_before': balance_before,
                    'balance_after': balance_after
                })
                
                # Track initial and final balance
                if apartments_data[apartment_number]['initial_balance'] is None:
                    apartments_data[apartment_number]['initial_balance'] = balance_before
                
                apartments_data[apartment_number]['final_balance'] = balance_after
                
                # Categorize transactions
                if transaction_type == 'expense_created':
                    apartments_data[apartment_number]['total_expenses'] += abs(amount)
                elif transaction_type == 'payment_received':
                    apartments_data[apartment_number]['total_payments'] += amount
            
            # Display results by apartment
            for apartment_number in sorted(apartments_data.keys()):
                data = apartments_data[apartment_number]
                initial_balance = data['initial_balance'] or 0
                final_balance = data['final_balance'] or 0
                total_expenses = data['total_expenses']
                total_payments = data['total_payments']
                
                print(f"\n🏠 Διαμέρισμα {apartment_number}:")
                print(f"  Αρχικό υπόλοιπο: {initial_balance}€")
                print(f"  Τελικό υπόλοιπο: {final_balance}€")
                print(f"  Συνολικές δαπάνες: {total_expenses}€")
                print(f"  Συνολικές πληρωμές: {total_payments}€")
                
                # Calculate previous obligations (if initial balance > 0, it means there were previous obligations)
                if initial_balance > 0:
                    print(f"  ⚠️  Παλιές οφειλές: {initial_balance}€")
                    total_previous_balance += initial_balance
                elif initial_balance < 0:
                    print(f"  ✅ Πιστωτικό υπόλοιπο: {abs(initial_balance)}€")
                
                print(f"  Συναλλαγές:")
                for tx in data['transactions']:
                    print(f"    • {tx['date'].strftime('%Y-%m-%d %H:%M')}: {tx['type']} - {tx['description']} ({tx['amount']}€)")
                    print(f"      Υπόλοιπο πριν: {tx['balance_before']}€ → Υπόλοιπο μετά: {tx['balance_after']}€")
            
            print(f"\n📊 ΣΥΝΟΛΑ:")
            print(f"  • Συνολικές παλιές οφειλές: {total_previous_balance}€")
            print(f"  • Συνολικές δαπάνες Αυγούστου: {sum(data['total_expenses'] for data in apartments_data.values())}€")
            print(f"  • Συνολικές πληρωμές Αυγούστου: {sum(data['total_payments'] for data in apartments_data.values())}€")
            
            # Check if there are any apartments with previous obligations
            apartments_with_previous_obligations = [
                apt_num for apt_num, data in apartments_data.items() 
                if data['initial_balance'] and data['initial_balance'] > 0
            ]
            
            if apartments_with_previous_obligations:
                print(f"\n⚠️  Διαμερίσματα με παλιές οφειλές: {', '.join(map(str, apartments_with_previous_obligations))}")
            else:
                print(f"\n✅ Δεν βρέθηκαν διαμερίσματα με παλιές οφειλές")
                
        else:
            print("❌ Δεν βρέθηκαν συναλλαγές τον Αύγουστο 2025")
        
        # Check for any expenses that might have previous obligations
        august_2025_expenses = Expense.objects.filter(
            Q(date__year=2025, date__month=8) |
            Q(created_at__year=2025, created_at__month=8)
        ).order_by('date')
        
        print(f"\n💸 Δαπάνες Αυγούστου 2025: {august_2025_expenses.count()}")
        
        if august_2025_expenses.exists():
            print("\n📋 Λεπτομέρειες δαπανών:")
            for expense in august_2025_expenses:
                title = expense.title
                amount = expense.amount or 0
                date = expense.date
                category = expense.get_category_display()
                description = expense.description or "Δεν υπάρχει περιγραφή"
                
                print(f"  • {title}:")
                print(f"    Ποσό: {amount}€")
                print(f"    Κατηγορία: {category}")
                print(f"    Ημ/νία: {date}")
                print(f"    Περιγραφή: {description}")
                print()

if __name__ == '__main__':
    try:
        check_august_2025_transactions()
        print("\n✅ Έλεγχος ολοκληρώθηκε επιτυχώς!")
    except Exception as e:
        print(f"\n❌ Σφάλμα κατά τον έλεγχο: {str(e)}")
        import traceback
        traceback.print_exc()
