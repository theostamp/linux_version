#!/usr/bin/env python3
"""
Script to investigate why September now shows 3,869.98€ instead of 650.00€
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.db.models import Sum, Q
from django_tenants.utils import schema_context

from apartments.models import Apartment
from financial.models import Payment, Expense, Transaction
from financial.services import FinancialDashboardService

def investigate_september_balance_change():
    """Investigate why September balance changed from 650€ to 3,869.98€"""
    
    with schema_context('demo'):
        print("=" * 80)
        print("🚨 ΕΡΕΥΝΑ ΑΛΛΑΓΗΣ ΥΠΟΛΟΙΠΟΥ ΣΕΠΤΕΜΒΡΙΟΥ")
        print("=" * 80)
        print("ΠΡΙΝ: 650,00 €")
        print("ΤΩΡΑ: 3.869,98 €")
        print("ΔΙΑΦΟΡΑ: +3.219,98 €")
        print("=" * 80)
        
        building_id = 1
        
        # 1. Check current September data
        print("\n📅 ΤΡΕΧΟΝΤΑ ΣΤΟΙΧΕΙΑ ΣΕΠΤΕΜΒΡΙΟΥ:")
        print("-" * 50)
        
        sept_service = FinancialDashboardService(building_id)
        sept_summary = sept_service.get_summary('2024-09')
        sept_apartments = sept_service.get_apartment_balances('2024-09')
        
        sept_total_previous = sum(abs(apt.get('previous_balance', 0)) for apt in sept_apartments)
        print(f"Συνολικές παλαιότερες οφειλές (Σεπτ): {sept_total_previous:.2f} €")
        print(f"Συνολικές οφειλές διαμερισμάτων: {sept_summary.get('total_apartment_obligations', 0):.2f} €")
        print(f"Συνολικές πληρωμές: {sept_summary.get('total_payments', 0):.2f} €")
        print(f"Τρέχον υπόλοιπο: {sept_summary.get('current_reserve', 0):.2f} €")
        
        # 2. Check all transactions up to September 30, 2024
        print("\n📊 ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΣΥΝΑΛΛΑΓΩΝ ΜΕΧΡΙ 30/09/2024:")
        print("-" * 50)
        
        end_date = datetime(2024, 9, 30, 23, 59, 59)
        
        all_transactions = Transaction.objects.filter(
            date__lte=end_date
        ).order_by('date', 'apartment_number')
        
        print(f"Συνολικός αριθμός συναλλαγών μέχρι 30/09/2024: {all_transactions.count()}")
        
        # Group by type
        transaction_types = {}
        total_amount = Decimal('0.00')
        
        for transaction in all_transactions:
            trans_type = transaction.type
            amount = transaction.amount
            
            if trans_type not in transaction_types:
                transaction_types[trans_type] = {'count': 0, 'total': Decimal('0.00')}
            
            transaction_types[trans_type]['count'] += 1
            transaction_types[trans_type]['total'] += amount
            total_amount += amount
        
        print(f"\nΣυνολικό ποσό όλων των συναλλαγών: {total_amount:.2f} €")
        print("\nΑνάλυση ανά τύπο συναλλαγής:")
        for trans_type, data in transaction_types.items():
            print(f"  {trans_type}: {data['count']} συναλλαγές, {data['total']:.2f} €")
        
        # 3. Check transactions by month
        print("\n📅 ΑΝΑΛΥΣΗ ΑΝΑ ΜΗΝΑ:")
        print("-" * 50)
        
        monthly_transactions = {}
        for transaction in all_transactions:
            month_key = f"{transaction.date.year}-{transaction.date.month:02d}"
            if month_key not in monthly_transactions:
                monthly_transactions[month_key] = {'count': 0, 'total': Decimal('0.00')}
            
            monthly_transactions[month_key]['count'] += 1
            monthly_transactions[month_key]['total'] += transaction.amount
        
        for month in sorted(monthly_transactions.keys()):
            data = monthly_transactions[month]
            print(f"  {month}: {data['count']} συναλλαγές, {data['total']:.2f} €")
        
        # 4. Check for recent transactions that might have been added
        print("\n🕐 ΕΛΕΓΧΟΣ ΠΡΟΣΦΑΤΩΝ ΣΥΝΑΛΛΑΓΩΝ:")
        print("-" * 50)
        
        recent_transactions = Transaction.objects.filter(
            date__gte=datetime(2024, 9, 1)
        ).order_by('-date')
        
        print(f"Συναλλαγές από 1/09/2024: {recent_transactions.count()}")
        
        if recent_transactions.exists():
            print("\nΠροσφατες συναλλαγές:")
            for transaction in recent_transactions[:20]:  # Show last 20
                print(f"  {transaction.date} | Διαμέρισμα {transaction.apartment_number} | {transaction.type} | {transaction.amount:.2f} €")
        
        # 5. Check apartment balances in detail
        print("\n🏠 ΑΝΑΛΥΣΗ ΥΠΟΛΟΙΠΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        print("-" * 50)
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        total_apartment_debt = Decimal('0.00')
        for apt in apartments:
            apt_data = next((a for a in sept_apartments if a['id'] == apt.id), None)
            if apt_data:
                previous_balance = abs(apt_data.get('previous_balance', 0))
                current_balance = apt_data.get('current_balance', 0)
                expense_share = apt_data.get('expense_share', 0)
                
                total_apartment_debt += previous_balance
                
                print(f"Διαμέρισμα {apt.number}:")
                print(f"  Παλαιότερες οφειλές: {previous_balance:.2f} €")
                print(f"  Τρέχον υπόλοιπο: {current_balance:.2f} €")
                print(f"  Μηνιαία οφειλή: {expense_share:.2f} €")
                print()
        
        print(f"Συνολικό χρέος διαμερισμάτων: {total_apartment_debt:.2f} €")
        
        # 6. Check if there are any duplicate transactions
        print("\n🔍 ΕΛΕΓΧΟΣ ΔΙΠΛΟΤΥΠΩΝ ΣΥΝΑΛΛΑΓΩΝ:")
        print("-" * 50)
        
        # Group transactions by date, apartment, type, and amount
        transaction_groups = {}
        for transaction in all_transactions:
            key = (transaction.date.date(), transaction.apartment_number, transaction.type, transaction.amount)
            if key not in transaction_groups:
                transaction_groups[key] = []
            transaction_groups[key].append(transaction)
        
        duplicates_found = False
        for key, transactions in transaction_groups.items():
            if len(transactions) > 1:
                duplicates_found = True
                print(f"Διπλότυπο: {key[0]} | Διαμέρισμα {key[1]} | {key[2]} | {key[3]:.2f} € ({len(transactions)} φορές)")
        
        if not duplicates_found:
            print("✅ Δεν βρέθηκαν διπλότυπες συναλλαγές")
        
        # 7. Summary
        print("\n" + "=" * 80)
        print("📋 ΣΥΜΠΕΡΑΣΜΑ:")
        print("=" * 80)
        
        if total_amount > Decimal('3000.00'):
            print("❌ ΠΡΟΒΛΗΜΑ: Υπάρχουν πολλές συναλλαγές που επηρεάζουν το υπόλοιπο")
            print(f"   Συνολικό ποσό συναλλαγών: {total_amount:.2f} €")
            print("   Πιθανή αιτία: Προσθήκη ιστορικών συναλλαγών ή διπλότυπων")
        else:
            print("✅ Το υπόλοιπο φαίνεται λογικό")
        
        print(f"\nΤρέχον υπόλοιπο Σεπτεμβρίου: {sept_total_previous:.2f} €")
        print(f"Αναμενόμενο υπόλοιπο: 650,00 €")
        print(f"Διαφορά: {sept_total_previous - Decimal('650.00'):.2f} €")

if __name__ == "__main__":
    investigate_september_balance_change()
