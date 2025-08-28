#!/usr/bin/env python3
"""
Script για έλεγχο συναλλαγών από τον Μάιο
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Expense
from apartments.models import Apartment
from buildings.models import Building
from datetime import datetime
from django.utils import timezone

def debug_may_transactions():
    """Έλεγχος συναλλαγών από τον Μάιο"""
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ ΜΑΙΟΥ 2025")
        print("=" * 60)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Έλεγχος συναλλαγών από τον Μάιο
        may_start = timezone.make_aware(datetime(2025, 5, 1, 0, 0, 0))
        may_end = timezone.make_aware(datetime(2025, 6, 1, 0, 0, 0))
        
        transactions = Transaction.objects.filter(
            apartment__building=building,
            date__gte=may_start,
            date__lt=may_end
        ).order_by('apartment__number', 'date')
        
        print(f"📊 ΣΥΝΑΛΛΑΓΕΣ ΜΑΙΟΥ 2025: {transactions.count()}")
        print()
        
        if transactions.count() == 0:
            print("❌ ΔΕΝ ΥΠΑΡΧΟΥΝ ΣΥΝΑΛΛΑΓΕΣ ΑΠΟ ΤΟΝ ΜΑΙΟ!")
            print("   Αυτό εξηγεί γιατί previous_obligations = 0€")
            print()
            
            # Έλεγχος αν υπάρχουν δαπάνες από τον Μάιο
            expenses = Expense.objects.filter(
                building=building,
                date__year=2025,
                date__month=5
            )
            
            print(f"📋 ΔΑΠΑΝΕΣ ΜΑΙΟΥ 2025: {expenses.count()}")
            for expense in expenses:
                print(f"   • {expense.title}: {expense.amount}€ ({expense.date})")
            
            print()
            print("💡 ΛΥΣΗ: Πρέπει να δημιουργηθούν συναλλαγές για τις δαπάνες του Μάιου")
        else:
            print("✅ ΥΠΑΡΧΟΥΝ ΣΥΝΑΛΛΑΓΕΣ ΑΠΟ ΤΟΝ ΜΑΙΟ:")
            for transaction in transactions:
                print(f"   • {transaction.apartment.number}: {transaction.amount}€ ({transaction.transaction_type}) - {transaction.date}")
        
        print("\n" + "=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΕΛΕΓΧΟΣ")

if __name__ == "__main__":
    debug_may_transactions()
