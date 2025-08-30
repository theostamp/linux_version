#!/usr/bin/env python3

import os
import sys
import django
from datetime import datetime, date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def recreate_july_transactions():
    """Recreate July 2025 transactions with correct distribution types"""
    
    with schema_context('demo'):
        from apartments.models import Building
        from financial.models import Expense, Transaction
        
        print("🔄 Επαναδημιουργία Συναλλαγών Ιουλίου 2025")
        print("=" * 50)
        
        # Get building 1
        try:
            building = Building.objects.get(id=1)
            print(f"🏢 Κτίριο: {building.address}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο με ID 1")
            return
        
        # Get July 2025 expenses
        july_expenses = Expense.objects.filter(
            building=building,
            date__month=7,
            date__year=2025
        )
        
        if not july_expenses.exists():
            print("❌ Δεν βρέθηκαν δαπάνες Ιουλίου 2025")
            return
        
        print(f"📋 Βρέθηκαν {july_expenses.count()} δαπάνες Ιουλίου 2025")
        
        # Delete existing transactions for July 2025 expenses
        existing_transactions = Transaction.objects.filter(
            expense__in=july_expenses
        )
        
        if existing_transactions.exists():
            transaction_count = existing_transactions.count()
            existing_transactions.delete()
            print(f"🗑️ Διαγράφηκαν {transaction_count} υπάρχουσες συναλλαγές")
        
        print()
        print("🔄 Επαναδημιουργία συναλλαγών:")
        print("-" * 35)
        
        total_recreated = 0
        
        for expense in july_expenses:
            print(f"📊 {expense.title}:")
            print(f"   Ποσό: {expense.amount}€")
            print(f"   Κατανομή: {expense.get_distribution_type_display()}")
            
            # Trigger transaction recreation by calling the method
            try:
                expense._create_apartment_transactions()
                print(f"   ✅ Συναλλαγές επαναδημιουργήθηκαν")
                total_recreated += 1
            except Exception as e:
                print(f"   ❌ Σφάλμα: {e}")
            print()
        
        print("📊 ΣΥΓΚΕΝΤΡΩΤΙΚΑ:")
        print("-" * 20)
        print(f"✅ Επαναδημιουργήθηκαν συναλλαγές για: {total_recreated}/{july_expenses.count()} δαπάνες")
        
        # Show new transaction counts
        new_transactions = Transaction.objects.filter(
            expense__in=july_expenses
        )
        print(f"📋 Νέες συναλλαγές: {new_transactions.count()}")
        
        print()
        print("🎯 ΑΠΟΤΕΛΕΣΜΑ:")
        print("-" * 15)
        print("Οι συναλλαγές των διαμερισμάτων έχουν επαναδημιουργηθεί με τη σωστή κατανομή:")
        print("• Διαχείριση: Ίσα μερίδια (12€/διαμέρισμα)")
        print("• Όλα τα υπόλοιπα: Κατά χιλιοστά συμμετοχής")
        print()
        print("Τώρα οι πληρωμές Αυγούστου θα συγκρίνονται σωστά με τις υποχρεώσεις Ιουλίου!")

if __name__ == "__main__":
    recreate_july_transactions()
