#!/usr/bin/env python3
"""
Debug: Ελέγχος διπλασιασμού στο Σεπτέμβριο 2025
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from buildings.models import Building
from apartments.models import Apartment
from decimal import Decimal

def debug_september_doubling():
    """Ελέγχει γιατί γίνεται διπλασιασμός στο Σεπτέμβριο"""
    
    print("🔍 DEBUG: ΔΙΠΛΑΣΙΑΣΜΟΣ ΣΤΟΝ ΣΕΠΤΕΜΒΡΙΟ 2025")
    print("=" * 60)
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο
        try:
            building = Building.objects.get(id=1)
            print(f"🏢 Κτίριο: {building.name}")
            print(f"💰 Management Fee per Apartment: €{building.management_fee_per_apartment}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο με ID=1")
            return
        
        # Ελέγχουμε τα διαμερίσματα
        apartments = Apartment.objects.filter(building=building)
        apartments_count = apartments.count()
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments_count}")
        
        # Ελέγχουμε το Σεπτέμβριο expense
        print(f"\n📊 ΣΕΠΤΕΜΒΡΙΟΣ 2025 EXPENSE:")
        sept_expense = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=2025,
            date__month=9
        ).first()
        
        if sept_expense:
            print(f"  - ID: {sept_expense.id}")
            print(f"  - Title: {sept_expense.title}")
            print(f"  - Amount: €{sept_expense.amount}")
            print(f"  - Category: {sept_expense.category}")
            print(f"  - Expense Type: {sept_expense.expense_type}")
            print(f"  - Distribution Type: {sept_expense.distribution_type}")
            print(f"  - Date: {sept_expense.date}")
        else:
            print("  ❌ Δεν βρέθηκε expense για Σεπτέμβριο")
            return
        
        # Ελέγχουμε τα transactions που δημιουργήθηκαν από το expense
        print(f"\n📊 TRANSACTIONS ΑΠΟ ΣΕΠΤΕΜΒΡΙΟ EXPENSE:")
        sept_transactions = Transaction.objects.filter(
            building=building,
            reference_type='expense',
            reference_id=str(sept_expense.id)
        )
        
        print(f"Αριθμός transactions: {sept_transactions.count()}")
        total_transactions_amount = sum(trans.amount for trans in sept_transactions)
        print(f"Συνολικό ποσό transactions: €{total_transactions_amount}")
        
        for transaction in sept_transactions:
            print(f"  - Apt {transaction.apartment_number}: €{transaction.amount} ({transaction.type})")
        
        # Ελέγχουμε αν υπάρχουν άλλα transactions για Σεπτέμβριο
        print(f"\n📊 ΟΛΑ ΤΑ TRANSACTIONS ΣΕΠΤΕΜΒΡΙΟΥ 2025:")
        all_sept_transactions = Transaction.objects.filter(
            building=building,
            date__year=2025,
            date__month=9
        )
        
        transaction_types = {}
        for transaction in all_sept_transactions:
            trans_type = transaction.type
            if trans_type not in transaction_types:
                transaction_types[trans_type] = []
            transaction_types[trans_type].append(transaction)
        
        for trans_type, transactions in transaction_types.items():
            total_amount = sum(trans.amount for trans in transactions)
            print(f"  - {trans_type}: {len(transactions)} transactions, €{total_amount:.2f}")
            for trans in transactions[:3]:  # Εμφανίζουμε τα πρώτα 3
                print(f"    Apt {trans.apartment_number}: €{trans.amount}")
            if len(transactions) > 3:
                print(f"    ... και {len(transactions) - 3} ακόμα")
        
        # Ελέγχουμε αν το σύστημα προσθέτει επιπλέον management fees
        print(f"\n🔍 ΕΛΕΓΧΟΣ ΔΙΠΛΟΥ ΜΕΤΡΗΜΑΤΟΣ:")
        print(f"Expense Amount: €{sept_expense.amount}")
        print(f"Management Fee per Apartment: €{building.management_fee_per_apartment}")
        print(f"Expected per Apartment: €{sept_expense.amount / apartments_count:.2f}")
        
        # Ελέγχουμε αν κάθε διαμέρισμα πληρώνει το σωστό ποσό
        print(f"\n📊 ΕΛΕΓΧΟΣ ΠΟΣΟΥ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
        for apartment in apartments:
            apt_transactions = Transaction.objects.filter(
                building=building,
                apartment=apartment,
                date__year=2025,
                date__month=9
            )
            apt_total = sum(trans.amount for trans in apt_transactions)
            print(f"  - Apt {apartment.number}: €{apt_total:.2f} ({len(apt_transactions)} transactions)")
        
        # Υπολογίζουμε το συνολικό ποσό που πληρώνουν όλα τα διαμερίσματα
        total_apartment_payments = 0
        for apartment in apartments:
            apt_transactions = Transaction.objects.filter(
                building=building,
                apartment=apartment,
                date__year=2025,
                date__month=9
            )
            apt_total = sum(trans.amount for trans in apt_transactions)
            total_apartment_payments += apt_total
        
        print(f"\n🎯 ΣΥΝΟΨΗ:")
        print(f"Expense Amount: €{sept_expense.amount}")
        print(f"Total Apartment Payments: €{total_apartment_payments:.2f}")
        print(f"Expected (10 apt × €1.00): €{apartments_count * building.management_fee_per_apartment:.2f}")
        
        if total_apartment_payments > sept_expense.amount:
            print(f"⚠️ ΔΙΠΛΟ ΜΕΤΡΗΜΑ: Τα διαμερίσματα πληρώνουν €{total_apartment_payments:.2f} αντί για €{sept_expense.amount:.2f}")
            print(f"Επιπλέον ποσό: €{total_apartment_payments - sept_expense.amount:.2f}")
        else:
            print(f"✅ ΣΩΣΤΟ: Τα διαμερίσματα πληρώνουν €{total_apartment_payments:.2f} = €{sept_expense.amount:.2f}")

if __name__ == "__main__":
    debug_september_doubling()
