#!/usr/bin/env python3
"""
Script για δημιουργία συναλλαγών για τις δαπάνες του Μάιου
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
from apartments.models import Apartment
from buildings.models import Building
from decimal import Decimal

def create_may_transactions():
    """Δημιουργεί συναλλαγές για τις δαπάνες του Μάιου"""
    
    with schema_context('demo'):
        print("🔧 ΔΗΜΙΟΥΡΓΙΑ ΣΥΝΑΛΛΑΓΩΝ ΜΑΙΟΥ 2025")
        print("=" * 60)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Βρες τις δαπάνες του Μάιου
        may_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=5
        )
        
        print(f"📋 ΔΑΠΑΝΕΣ ΜΑΙΟΥ 2025: {may_expenses.count()}")
        
        if may_expenses.count() == 0:
            print("❌ ΔΕΝ ΥΠΑΡΧΟΥΝ ΔΑΠΑΝΕΣ ΑΠΟ ΤΟΝ ΜΑΙΟ!")
            return
        
        # Έλεγχος αν υπάρχουν ήδη συναλλαγές
        existing_transactions = Transaction.objects.filter(
            apartment__building=building,
            date__year=2025,
            date__month=5
        )
        
        if existing_transactions.count() > 0:
            print(f"⚠️ ΥΠΑΡΧΟΥΝ ΗΔΗ {existing_transactions.count()} ΣΥΝΑΛΛΑΓΕΣ ΑΠΟ ΤΟΝ ΜΑΙΟ!")
            print("   Δεν θα δημιουργηθούν νέες συναλλαγές.")
            return
        
        # Δημιουργία συναλλαγών για κάθε δαπάνη
        total_transactions_created = 0
        
        for expense in may_expenses:
            print(f"📝 Δημιουργία συναλλαγών για: {expense.title} ({expense.amount}€)")
            
            # Βρες όλα τα διαμερίσματα
            apartments = Apartment.objects.filter(building=building)
            
            # Υπολογισμός μεριδίων βάσει χιλιοστών
            total_mills = sum(apt.participation_mills or 0 for apt in apartments)
            
            if total_mills == 0:
                print(f"   ⚠️ Δεν υπάρχουν χιλιοστά για το κτίριο!")
                continue
            
            transactions_created = 0
            
            for apartment in apartments:
                apartment_mills = apartment.participation_mills or 0
                if apartment_mills > 0:
                    # Υπολογισμός μεριδίου
                    share_amount = (expense.amount * apartment_mills) / total_mills
                    
                    # Δημιουργία συναλλαγής
                    Transaction.objects.create(
                        apartment=apartment,
                        building=building,
                        amount=share_amount,
                        transaction_type='expense_created',
                        description=f"Δαπάνη Μάιου: {expense.title}",
                        date=expense.date,
                        reference_expense=expense
                    )
                    
                    transactions_created += 1
                    print(f"     ✅ {apartment.number}: {share_amount:.2f}€ ({apartment_mills} χιλιοστά)")
            
            total_transactions_created += transactions_created
            print(f"   📊 Δημιουργήθηκαν {transactions_created} συναλλαγές")
            print()
        
        print("=" * 60)
        print(f"✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΔΗΜΙΟΥΡΓΙΑ")
        print(f"📊 ΣΥΝΟΛΙΚΕΣ ΣΥΝΑΛΛΑΓΕΣ: {total_transactions_created}")
        
        # Επιβεβαίωση
        final_transactions = Transaction.objects.filter(
            apartment__building=building,
            date__year=2025,
            date__month=5
        )
        print(f"🔍 ΕΠΙΒΕΒΑΙΩΣΗ: {final_transactions.count()} συναλλαγές στη βάση")

if __name__ == "__main__":
    create_may_transactions()
