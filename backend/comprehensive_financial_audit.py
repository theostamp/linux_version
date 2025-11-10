#!/usr/bin/env python3
"""
Συστηματικός έλεγχος όλων των κατηγοριών οικονομικών ποσών
Επιβεβαιώνει ότι οι αλλαγές επηρεάζουν όλα τα ποσά σωστά
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

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment, Transaction
from financial.services import FinancialDashboardService
from django.db.models import Sum, Q

def comprehensive_financial_audit():
    """Συστηματικός έλεγχος όλων των κατηγοριών οικονομικών ποσών"""
    
    with schema_context('demo'):
        print("🔍 ΣΥΣΤΗΜΑΤΙΚΟΣ ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΚΑΤΗΓΟΡΙΩΝ ΠΟΣΩΝ")
        print("=" * 80)
        
        # Βρίσκουμε το κτίριο Αλκμάνος 22
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο Αλκμάνος")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print(f"💰 Πακέτο διαχείρισης ανά διαμέρισμα: €{building.management_fee_per_apartment}")
        print()
        
        # Ελέγχος διαμερισμάτων
        apartments = Apartment.objects.filter(building=building)
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments.count()}")
        
        # 1. ΕΛΕΓΧΟΣ MANAGEMENT FEES
        print("\n" + "="*50)
        print("1️⃣ ΕΛΕΓΧΟΣ MANAGEMENT FEES")
        print("="*50)
        
        management_transactions = Transaction.objects.filter(
            apartment__building=building,
            type='management_fee'
        )
        
        print(f"📊 Management Fee Transactions:")
        print(f"   - Συνολικός αριθμός: {management_transactions.count()}")
        
        if management_transactions.exists():
            total_management = management_transactions.aggregate(total=Sum('amount'))['total'] or 0
            print(f"   - Συνολικό ποσό: €{total_management}")
            print(f"   - Πρώτη transaction: {management_transactions.first().date}")
            print(f"   - Τελευταία transaction: {management_transactions.last().date}")
            
            # Έλεγχος ανά μήνα
            print(f"\n📅 Management Fees ανά μήνα:")
            for year in [2024, 2025]:
                for month in range(1, 13):
                    month_transactions = management_transactions.filter(
                        date__year=year,
                        date__month=month
                    )
                    if month_transactions.exists():
                        month_amount = month_transactions.aggregate(total=Sum('amount'))['total'] or 0
                        print(f"   - {year}-{month:02d}: {month_transactions.count()} transactions, €{month_amount}")
        
        # 2. ΕΛΕΓΧΟΣ COMMON EXPENSES
        print("\n" + "="*50)
        print("2️⃣ ΕΛΕΓΧΟΣ COMMON EXPENSES")
        print("="*50)
        
        expenses = Expense.objects.filter(building=building)
        print(f"📊 Common Expenses:")
        print(f"   - Συνολικός αριθμός: {expenses.count()}")
        
        if expenses.exists():
            total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0
            print(f"   - Συνολικό ποσό: €{total_expenses}")
            print(f"   - Πρώτη δαπάνη: {expenses.first().date}")
            print(f"   - Τελευταία δαπάνη: {expenses.last().date}")
            
            # Έλεγχος ανά κατηγορία
            print(f"\n📂 Expenses ανά κατηγορία:")
            categories = expenses.values('category').annotate(
                count=Sum('id'),
                total=Sum('amount')
            ).order_by('category')
            
            for cat in categories:
                print(f"   - {cat['category']}: {cat['count']} expenses, €{cat['total']}")
        
        # 3. ΕΛΕΓΧΟΣ PAYMENTS
        print("\n" + "="*50)
        print("3️⃣ ΕΛΕΓΧΟΣ PAYMENTS")
        print("="*50)
        
        payments = Payment.objects.filter(apartment__building=building)
        print(f"📊 Payments:")
        print(f"   - Συνολικός αριθμός: {payments.count()}")
        
        if payments.exists():
            total_payments = payments.aggregate(total=Sum('amount'))['total'] or 0
            print(f"   - Συνολικό ποσό: €{total_payments}")
            print(f"   - Πρώτη πληρωμή: {payments.first().date}")
            print(f"   - Τελευταία πληρωμή: {payments.last().date}")
            
            # Έλεγχος ανά τύπο
            print(f"\n💳 Payments ανά τύπο:")
            payment_types = payments.values('payment_type').annotate(
                count=Sum('id'),
                total=Sum('amount')
            ).order_by('payment_type')
            
            for pt in payment_types:
                print(f"   - {pt['payment_type']}: {pt['count']} payments, €{pt['total']}")
        
        # 4. ΕΛΕΓΧΟΣ TRANSACTIONS (ΣΥΝΟΛΙΚΟΣ)
        print("\n" + "="*50)
        print("4️⃣ ΕΛΕΓΧΟΣ TRANSACTIONS (ΣΥΝΟΛΙΚΟΣ)")
        print("="*50)
        
        all_transactions = Transaction.objects.filter(apartment__building=building)
        print(f"📊 Όλες οι Transactions:")
        print(f"   - Συνολικός αριθμός: {all_transactions.count()}")
        
        if all_transactions.exists():
            total_transactions = all_transactions.aggregate(total=Sum('amount'))['total'] or 0
            print(f"   - Συνολικό ποσό: €{total_transactions}")
            print(f"   - Πρώτη transaction: {all_transactions.first().date}")
            print(f"   - Τελευταία transaction: {all_transactions.last().date}")
            
            # Έλεγχος ανά τύπο
            print(f"\n🔄 Transactions ανά τύπο:")
            transaction_types = all_transactions.values('type').annotate(
                count=Sum('id'),
                total=Sum('amount')
            ).order_by('type')
            
            for tt in transaction_types:
                print(f"   - {tt['type']}: {tt['count']} transactions, €{tt['total']}")
        
        # 5. ΕΛΕΓΧΟΣ FINANCIAL DASHBOARD SERVICE
        print("\n" + "="*50)
        print("5️⃣ ΕΛΕΓΧΟΣ FINANCIAL DASHBOARD SERVICE")
        print("="*50)
        
        dashboard_service = FinancialDashboardService(building.id)
        
        # Έλεγχος για Σεπτέμβριο 2024
        current_month = "2024-09"
        print(f"📊 Financial Dashboard για {current_month}:")
        
        summary = dashboard_service.get_summary(current_month)
        print(f"   - Παλαιότερες οφειλές: €{summary.get('previous_obligations', 0)}")
        print(f"   - Τρέχον μήνας: €{summary.get('current_month_obligations', 0)}")
        print(f"   - Συνολικές υποχρεώσεις: €{summary.get('total_obligations', 0)}")
        print(f"   - Συνολικές πληρωμές: €{summary.get('total_payments', 0)}")
        print(f"   - Τρέχον υπόλοιπο: €{summary.get('current_balance', 0)}")
        
        # Έλεγχος διαμερισμάτων
        apartment_balances = dashboard_service.get_apartment_balances(current_month)
        print(f"\n🏠 Apartment Balances:")
        
        total_previous = 0
        total_current = 0
        
        for apt_data in apartment_balances:
            apt_id = apt_data['apartment_id']
            apartment = Apartment.objects.get(id=apt_id)
            
            previous_balance = abs(apt_data.get('previous_balance', 0))
            current_obligations = apt_data.get('current_obligations', 0)
            
            total_previous += previous_balance
            total_current += current_obligations
            
            print(f"   - {apartment.number}: Παλαιότερες: €{previous_balance}, Τρέχον: €{current_obligations}")
        
        print(f"\n📊 Σύνολα:")
        print(f"   - Συνολικές παλαιότερες οφειλές: €{total_previous}")
        print(f"   - Συνολικές τρέχουσες υποχρεώσεις: €{total_current}")
        print(f"   - Συνολικό μηνιαίο σύνολο: €{total_previous + total_current}")
        
        # 6. ΕΛΕΓΧΟΣ ΣΥΝΕΠΕΙΑΣ
        print("\n" + "="*50)
        print("6️⃣ ΕΛΕΓΧΟΣ ΣΥΝΕΠΕΙΑΣ")
        print("="*50)
        
        # Έλεγχος αν τα management fees εμφανίζονται και στις δαπάνες
        management_expenses = expenses.filter(category='management_fees')
        print(f"📊 Management Fees στις δαπάνες:")
        print(f"   - Αριθμός management_fees expenses: {management_expenses.count()}")
        
        if management_expenses.exists():
            total_management_expenses = management_expenses.aggregate(total=Sum('amount'))['total'] or 0
            print(f"   - Συνολικό ποσό management_fees expenses: €{total_management_expenses}")
        
        # Έλεγχος αν τα management fees εμφανίζονται και στις transactions
        management_transaction_types = all_transactions.filter(type='management_fee')
        print(f"\n📊 Management Fees στις transactions:")
        print(f"   - Αριθμός management_fee transactions: {management_transaction_types.count()}")
        
        if management_transaction_types.exists():
            total_management_transactions = management_transaction_types.aggregate(total=Sum('amount'))['total'] or 0
            print(f"   - Συνολικό ποσό management_fee transactions: €{total_management_transactions}")
        
        # Έλεγχος συνέπειας
        print(f"\n🔍 Έλεγχος Συνέπειας:")
        if management_expenses.exists() and management_transaction_types.exists():
            expenses_total = management_expenses.aggregate(total=Sum('amount'))['total'] or 0
            transactions_total = management_transaction_types.aggregate(total=Sum('amount'))['total'] or 0
            
            if abs(expenses_total - transactions_total) < 0.01:
                print(f"   ✅ Συνέπεια: Expenses (€{expenses_total}) = Transactions (€{transactions_total})")
            else:
                print(f"   ❌ Ασυνέπεια: Expenses (€{expenses_total}) ≠ Transactions (€{transactions_total})")
        else:
            print(f"   ⚠️ Δεν υπάρχουν management_fees expenses ή transactions")
        
        print("\n" + "=" * 80)
        print("✅ ΣΥΣΤΗΜΑΤΙΚΟΣ ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ")

if __name__ == "__main__":
    comprehensive_financial_audit()
