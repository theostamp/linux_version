#!/usr/bin/env python3

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def check_august_2025_expenses():
    """Check if common expenses are issued for August 2025"""
    
    with schema_context('demo'):
        from financial.models import Expense
        
        print("🔍 Έλεγχος Κοινόχρηστων Αυγούστου 2025")
        print("=" * 50)
        
        # Check for August 2025 charges (expenses that are recorded but not yet issued as common expenses)
        print("🔍 Έλεγχος για χρεώσεις Αυγούστου 2025 που περιμένουν έκδοση κοινοχρήστων")
        
        
        # Check all expenses for August 2025
        august_2025_expenses = Expense.objects.filter(
            date__month=8,
            date__year=2025
        ).select_related('building')
        
        print(f"💰 Δαπάνες Αυγούστου 2025: {august_2025_expenses.count()}")
        
        if august_2025_expenses.exists():
            total_august_expenses = 0
            for expense in august_2025_expenses:
                print(f"  - {expense.title}: {expense.amount}€")
                print(f"    Ημερομηνία: {expense.date}, Κατηγορία: {expense.get_category_display()}")
                print(f"    Κτίριο: {expense.building.address}, Προμηθευτής: {expense.supplier}")
                total_august_expenses += expense.amount
            print(f"  📊 Σύνολο δαπανών Αυγούστου: {total_august_expenses}€")
        else:
            print("  ❌ Δεν βρέθηκαν δαπάνες για Αύγουστο 2025")
        
        print()
        
        # Check payments made in August 2025
        from financial.models import Payment
        
        august_payments = Payment.objects.filter(
            date__month=8,
            date__year=2025
        ).select_related('apartment')
        
        print(f"💳 Πληρωμές Αυγούστου 2025: {august_payments.count()}")
        
        total_august_payments = 0
        for payment in august_payments:
            print(f"  - Διαμέρισμα {payment.apartment.number}: {payment.amount}€ ({payment.date})")
            total_august_payments += payment.amount
        
        if august_payments.exists():
            print(f"  📊 Σύνολο πληρωμών Αυγούστου: {total_august_payments}€")
        
        print()
        print("📋 ΣΥΜΠΕΡΑΣΜΑ:")
        print("=" * 30)
        
        if august_2025_expenses.exists():
            print(f"✅ Υπάρχουν δαπάνες Αυγούστου: {august_2025_expenses.count()} δαπάνες")
            print(f"💰 Σύνολο δαπανών: {sum(e.amount for e in august_2025_expenses)}€")
            print("📝 Αυτές οι δαπάνες περιμένουν να εκδοθούν ως κοινόχρηστα Σεπτεμβρίου")
        else:
            print("❌ Δεν υπάρχουν δαπάνες Αυγούστου")
            
        if august_payments.exists():
            print(f"💳 Σύνολο πληρωμών: {total_august_payments}€")
            print("📝 Οι πληρωμές Αυγούστου είναι προπληρωμές για κοινόχρηστα Σεπτεμβρίου")
        
        if august_2025_expenses.exists() and august_payments.exists():
            balance = total_august_payments - sum(e.amount for e in august_2025_expenses)
            print(f"⚖️ Προσωρινό υπόλοιπο: {balance}€")
            if balance > 0:
                print("✅ Πιστωτικό υπόλοιπο - οι πληρωμές ξεπερνούν τις δαπάνες")
            elif balance < 0:
                print("❌ Χρεωστικό υπόλοιπο - οι δαπάνες ξεπερνούν τις πληρωμές")
            else:
                print("⚖️ Ισοσκελισμένο - πληρωμές ίσες με δαπάνες")

if __name__ == "__main__":
    check_august_2025_expenses()
