#!/usr/bin/env python3
"""
Script για έλεγχο δημιουργίας συναλλαγών
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
from datetime import date

def debug_transaction_creation():
    """Έλεγχος δημιουργίας συναλλαγών"""
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ ΔΗΜΙΟΥΡΓΙΑΣ ΣΥΝΑΛΛΑΓΩΝ")
        print("=" * 60)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Έλεγχος διαμερισμάτων
        apartments = Apartment.objects.filter(building=building)
        print(f"📊 ΔΙΑΜΕΡΙΣΜΑΤΑ: {apartments.count()}")
        
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        print(f"📊 ΣΥΝΟΛΙΚΑ ΧΙΛΙΟΣΤΑ: {total_mills}")
        
        for apartment in apartments:
            print(f"   • {apartment.number}: {apartment.participation_mills} χιλιοστά")
        print()
        
        # Δημιουργία test δαπάνης
        print("📝 ΔΗΜΙΟΥΡΓΙΑ TEST ΔΑΠΑΝΗΣ:")
        try:
            expense = Expense.objects.create(
                building=building,
                title='Test Δαπάνη για Έλεγχο',
                amount=Decimal('100.00'),
                date=date(2025, 7, 20),
                category='cleaning',
                distribution_type='by_participation_mills',
                notes='Test δαπάνη για έλεγχο συναλλαγών'
            )
            print(f"   ✅ Δημιουργήθηκε δαπάνη ID: {expense.id}")
            print(f"   📊 Allocation type: {expense.distribution_type}")
            print(f"   📊 Amount: {expense.amount}€")
            
            # Έλεγχος συναλλαγών
            transactions = Transaction.objects.filter(
                reference_id=str(expense.id),
                reference_type='expense'
            )
            print(f"   📊 Συναλλαγές που δημιουργήθηκαν: {transactions.count()}")
            
            if transactions.count() == 0:
                print("   ⚠️ ΔΕΝ ΔΗΜΙΟΥΡΓΗΘΗΚΑΝ ΣΥΝΑΛΛΑΓΕΣ!")
                print("   🔍 Έλεγχος γιατί:")
                
                # Έλεγχος αν η μέθοδος κλήθηκε
                print(f"   • Allocation type: {expense.distribution_type}")
                print(f"   • Is specific_apartments: {expense.distribution_type == 'specific_apartments'}")
                
                # Χειροκίνητη δημιουργία συναλλαγών
                print("   🔧 ΧΕΙΡΟΚΙΝΗΤΗ ΔΗΜΙΟΥΡΓΙΑ ΣΥΝΑΛΛΑΓΩΝ:")
                transactions_created = 0
                
                for apartment in apartments:
                    apartment_mills = apartment.participation_mills or 0
                    if apartment_mills > 0:
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
                            description=f"Δαπάνη: {expense.title}",
                            date=expense.date,
                            reference_id=str(expense.id),
                            reference_type='expense',
                            balance_before=current_balance,
                            balance_after=new_balance
                        )
                        
                        # Ενημέρωση του υπολοίπου του διαμερίσματος
                        apartment.current_balance = new_balance
                        apartment.save()
                        
                        transactions_created += 1
                        print(f"     ✅ {apartment.number}: {share_amount:.2f}€")
                
                print(f"   📊 Δημιουργήθηκαν {transactions_created} συναλλαγές")
            else:
                print("   ✅ Δημιουργήθηκαν συναλλαγές αυτόματα")
                for transaction in transactions:
                    print(f"     • {transaction.apartment.number}: {transaction.amount}€")
            
            # Διαγραφή test δαπάνης
            expense.delete()
            print("   🗑️ Test expense deleted")
            
        except Exception as e:
            print(f"   ❌ Σφάλμα: {e}")
            import traceback
            traceback.print_exc()
        
        print("\n" + "=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΕΛΕΓΧΟΣ")

if __name__ == "__main__":
    debug_transaction_creation()
