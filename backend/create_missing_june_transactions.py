#!/usr/bin/env python3
"""
Script για δημιουργία λειπόμενων συναλλαγών του Ιουνίου
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
from datetime import datetime
from django.utils import timezone

def create_missing_june_transactions():
    """Δημιουργεί τις λειπόμενες συναλλαγές του Ιουνίου"""
    
    with schema_context('demo'):
        print("🔧 ΔΗΜΙΟΥΡΓΙΑ ΛΕΙΠΟΜΕΝΩΝ ΣΥΝΑΛΛΑΓΩΝ ΙΟΥΝΙΟΥ 2025")
        print("=" * 60)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Βρες τις δαπάνες του Ιουνίου
        june_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=6
        )
        
        print(f"📋 ΔΑΠΑΝΕΣ ΙΟΥΝΙΟΥ 2025: {june_expenses.count()}")
        
        if june_expenses.count() == 0:
            print("❌ ΔΕΝ ΥΠΑΡΧΟΥΝ ΔΑΠΑΝΕΣ ΑΠΟ ΤΟΝ ΙΟΥΝΙΟ!")
            return
        
        # Έλεγχος συναλλαγών ανά διαμέρισμα
        apartments = Apartment.objects.filter(building=building).order_by('number')
        
        for expense in june_expenses:
            print(f"📝 Έλεγχος δαπάνης: {expense.title} ({expense.amount}€)")
            
            # Υπολογισμός μεριδίων βάσει χιλιοστών
            total_mills = sum(apt.participation_mills or 0 for apt in apartments)
            
            if total_mills == 0:
                print("   ⚠️ Δεν υπάρχουν χιλιοστά για το κτίριο!")
                continue
            
            transactions_created = 0
            
            for apartment in apartments:
                # Έλεγχος αν υπάρχει ήδη συναλλαγή για αυτό το διαμέρισμα
                existing_transaction = Transaction.objects.filter(
                    apartment=apartment,
                    reference_id=str(expense.id),
                    reference_type='expense'
                ).first()
                
                if existing_transaction:
                    print(f"   ✅ {apartment.number}: Υπάρχει ήδη συναλλαγή {existing_transaction.amount}€")
                    continue
                
                apartment_mills = apartment.participation_mills or 0
                if apartment_mills > 0:
                    # Υπολογισμός μεριδίου
                    share_amount = (expense.amount * apartment_mills) / total_mills
                    
                    # Υπολογισμός υπολοίπων
                    current_balance = apartment.current_balance or Decimal('0.00')
                    new_balance = current_balance - share_amount
                    
                    # Δημιουργία συναλλαγής
                    transaction = Transaction.objects.create(
                        apartment=apartment,
                        building=building,
                        amount=share_amount,
                        type='expense_created',
                        description=f"Δαπάνη Ιουνίου: {expense.title}",
                        date=timezone.make_aware(datetime.combine(expense.date, datetime.min.time())),
                        reference_id=str(expense.id),
                        reference_type='expense',
                        balance_before=current_balance,
                        balance_after=new_balance
                    )
                    
                    # Ενημέρωση του υπολοίπου του διαμερίσματος
                    apartment.current_balance = new_balance
                    apartment.save()
                    
                    transactions_created += 1
                    print(f"     ✅ {apartment.number}: Δημιουργήθηκε συναλλαγή {share_amount:.2f}€")
            
            print(f"   📊 Δημιουργήθηκαν {transactions_created} νέες συναλλαγές")
            print()
        
        print("=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΔΗΜΙΟΥΡΓΙΑ")
        
        # Επιβεβαίωση
        total_transactions = Transaction.objects.filter(
            apartment__building=building,
            date__year=2025,
            date__month=6
        ).count()
        print(f"🔍 ΕΠΙΒΕΒΑΙΩΣΗ: {total_transactions} συναλλαγές στη βάση")

if __name__ == "__main__":
    create_missing_june_transactions()
