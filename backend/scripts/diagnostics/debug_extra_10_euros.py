#!/usr/bin/env python3
"""
Debug: Από πού προέρχεται το επιπλέον €10.00 στο μηνιαίο σύνολο
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment
from buildings.models import Building
from apartments.models import Apartment
from decimal import Decimal
from datetime import date

def debug_extra_10_euros():
    """Ελέγχει από πού προέρχεται το επιπλέον €10.00"""
    
    print("🔍 DEBUG: ΑΠΟ ΠΟΥ ΠΡΟΕΡΧΕΤΑΙ ΤΟ ΕΠΙΠΛΕΟΝ €10.00")
    print("=" * 60)
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο
        try:
            building = Building.objects.get(id=1)
            print(f"🏢 Κτίριο: {building.name}")
            print(f"📅 Financial System Start Date: {building.financial_system_start_date}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο με ID=1")
            return
        
        # Ελέγχουμε τα management fees expenses για Σεπτέμβριο 2025
        print(f"\n📊 MANAGEMENT FEES EXPENSES ΣΕΠΤΕΜΒΡΙΟΥ 2025:")
        sept_expenses = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=2025,
            date__month=9
        )
        
        for expense in sept_expenses:
            print(f"  - {expense.date.strftime('%Y-%m-%d')}: €{expense.amount:.2f} (ID: {expense.id})")
            print(f"    Title: {expense.title}")
            print(f"    Category: {expense.category}")
            print(f"    Expense Type: {expense.expense_type}")
        
        sept_total = sum(exp.amount for exp in sept_expenses)
        print(f"Συνολικό Σεπτέμβριος: €{sept_total:.2f}")
        
        # Ελέγχουμε τα management fees expenses για Μάρτιο-Αύγουστο 2025
        print(f"\n📊 MANAGEMENT FEES EXPENSES ΜΑΡΤΙΟΥ-ΑΥΓΟΥΣΤΟΥ 2025:")
        previous_expenses = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=2025,
            date__month__gte=3,
            date__month__lt=9
        )
        
        for expense in previous_expenses:
            print(f"  - {expense.date.strftime('%Y-%m-%d')}: €{expense.amount:.2f} (ID: {expense.id})")
        
        previous_total = sum(exp.amount for exp in previous_expenses)
        print(f"Συνολικό Μάρτιος-Αύγουστος: €{previous_total:.2f}")
        
        # Ελέγχουμε αν υπάρχουν άλλα expenses για Σεπτέμβριο 2025
        print(f"\n📊 ΟΛΑ ΤΑ EXPENSES ΣΕΠΤΕΜΒΡΙΟΥ 2025:")
        all_sept_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=9
        )
        
        for expense in all_sept_expenses:
            print(f"  - {expense.date.strftime('%Y-%m-%d')} {expense.category}: €{expense.amount:.2f} (ID: {expense.id})")
            print(f"    Title: {expense.title}")
            print(f"    Expense Type: {expense.expense_type}")
        
        all_sept_total = sum(exp.amount for exp in all_sept_expenses)
        print(f"Συνολικό όλων των expenses Σεπτεμβρίου: €{all_sept_total:.2f}")
        
        # Ελέγχουμε αν υπάρχουν άλλα expenses για Μάρτιο-Αύγουστο 2025
        print(f"\n📊 ΟΛΑ ΤΑ EXPENSES ΜΑΡΤΙΟΥ-ΑΥΓΟΥΣΤΟΥ 2025:")
        all_previous_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month__gte=3,
            date__month__lt=9
        )
        
        expense_categories = {}
        for expense in all_previous_expenses:
            category = expense.category
            if category not in expense_categories:
                expense_categories[category] = []
            expense_categories[category].append(expense)
        
        for category, expenses in expense_categories.items():
            total_amount = sum(exp.amount for exp in expenses)
            print(f"  - {category}: {len(expenses)} expenses, €{total_amount:.2f}")
            for expense in expenses:
                print(f"    {expense.date.strftime('%Y-%m-%d')}: €{expense.amount:.2f} (ID: {expense.id})")
        
        all_previous_total = sum(exp.amount for exp in all_previous_expenses)
        print(f"Συνολικό όλων των expenses Μαρτίου-Αυγούστου: €{all_previous_total:.2f}")
        
        # Ελέγχουμε τα transactions
        print(f"\n📊 TRANSACTIONS ΣΕΠΤΕΜΒΡΙΟΥ 2025:")
        sept_transactions = Transaction.objects.filter(
            building=building,
            date__year=2025,
            date__month=9
        )
        
        transaction_types = {}
        for transaction in sept_transactions:
            trans_type = transaction.type
            if trans_type not in transaction_types:
                transaction_types[trans_type] = []
            transaction_types[trans_type].append(transaction)
        
        for trans_type, transactions in transaction_types.items():
            total_amount = sum(trans.amount for trans in transactions)
            print(f"  - {trans_type}: {len(transactions)} transactions, €{total_amount:.2f}")
        
        # Ελέγχουμε τα transactions Μαρτίου-Αυγούστου
        print(f"\n📊 TRANSACTIONS ΜΑΡΤΙΟΥ-ΑΥΓΟΥΣΤΟΥ 2025:")
        previous_transactions = Transaction.objects.filter(
            building=building,
            date__year=2025,
            date__month__gte=3,
            date__month__lt=9
        )
        
        prev_transaction_types = {}
        for transaction in previous_transactions:
            trans_type = transaction.type
            if trans_type not in prev_transaction_types:
                prev_transaction_types[trans_type] = []
            prev_transaction_types[trans_type].append(transaction)
        
        for trans_type, transactions in prev_transaction_types.items():
            total_amount = sum(trans.amount for trans in transactions)
            print(f"  - {trans_type}: {len(transactions)} transactions, €{total_amount:.2f}")
        
        # Ελέγχουμε τα payments
        print(f"\n📊 PAYMENTS ΣΕΠΤΕΜΒΡΙΟΥ 2025:")
        sept_payments = Payment.objects.filter(
            apartment__building=building,
            date__year=2025,
            date__month=9
        )
        
        sept_payments_total = sum(payment.amount for payment in sept_payments)
        print(f"Συνολικό payments Σεπτεμβρίου: €{sept_payments_total:.2f}")
        
        # Ελέγχουμε τα payments Μαρτίου-Αυγούστου
        print(f"\n📊 PAYMENTS ΜΑΡΤΙΟΥ-ΑΥΓΟΥΣΤΟΥ 2025:")
        previous_payments = Payment.objects.filter(
            apartment__building=building,
            date__year=2025,
            date__month__gte=3,
            date__month__lt=9
        )
        
        previous_payments_total = sum(payment.amount for payment in previous_payments)
        print(f"Συνολικό payments Μαρτίου-Αυγούστου: €{previous_payments_total:.2f}")
        
        # Συνοψίζουμε τα αποτελέσματα
        print(f"\n🎯 ΣΥΝΟΨΗ:")
        print(f"Management Fees Σεπτεμβρίου: €{sept_total:.2f}")
        print(f"Management Fees Μαρτίου-Αυγούστου: €{previous_total:.2f}")
        print(f"Όλα τα expenses Σεπτεμβρίου: €{all_sept_total:.2f}")
        print(f"Όλα τα expenses Μαρτίου-Αυγούστου: €{all_previous_total:.2f}")
        
        # Υπολογίζουμε τη διαφορά
        extra_sept = all_sept_total - sept_total
        extra_previous = all_previous_total - previous_total
        
        print(f"\n🔍 ΔΙΑΦΟΡΕΣ:")
        print(f"Επιπλέον expenses Σεπτεμβρίου: €{extra_sept:.2f}")
        print(f"Επιπλέον expenses Μαρτίου-Αυγούστου: €{extra_previous:.2f}")
        
        if extra_sept > 0 or extra_previous > 0:
            print(f"\n⚠️ ΒΡΕΘΗΚΑΝ ΕΠΙΠΛΕΟΝ EXPENSES!")
            print(f"Αυτό εξηγεί τη διαφορά στο μηνιαίο σύνολο")
        else:
            print(f"\n✅ ΔΕΝ ΥΠΑΡΧΟΥΝ ΕΠΙΠΛΕΟΝ EXPENSES")
            print(f"Η διαφορά προέρχεται από αλλού")

if __name__ == "__main__":
    debug_extra_10_euros()
