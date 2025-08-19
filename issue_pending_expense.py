#!/usr/bin/env python3
"""
Script to issue the pending DEH expense
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from buildings.models import Building
from apartments.models import Apartment
from financial.services import CommonExpenseCalculator
from decimal import Decimal

def issue_pending_expense():
    """Issue the pending DEH expense"""
    
    with schema_context('demo'):
        building_id = 4  # Αλκμάνος 22, Αθήνα 115 28
        building = Building.objects.get(id=building_id)
        
        print(f"🏢 Building: {building.name}")
        print()
        
        # 1. Βρείτε την ανέκδοτη δαπάνη
        print("📊 1. ΕΥΡΕΣΗ ΑΝΕΚΔΟΤΗΣ ΔΑΠΑΝΗΣ")
        print("-" * 50)
        
        pending_expense = Expense.objects.filter(
            building_id=building_id,
            is_issued=False
        ).first()
        
        if not pending_expense:
            print("✅ Δεν υπάρχουν ανέκδοτες δαπάνες")
            return
        
        print(f"📋 Βρέθηκε ανέκδοτη δαπάνη:")
        print(f"   • Τίτλος: {pending_expense.title}")
        print(f"   • Ποσό: {pending_expense.amount:,.2f}€")
        print(f"   • Ημερομηνία: {pending_expense.date}")
        print(f"   • Κατηγορία: {pending_expense.category}")
        print()
        
        # 2. Υπολογισμός μεριδίων μόνο για τη συγκεκριμένη δαπάνη
        print("📊 2. ΥΠΟΛΟΓΙΣΜΟΣ ΜΕΡΙΔΙΩΝ")
        print("-" * 50)
        
        # Χειροκίνητος υπολογισμός μεριδίων για τη ΔΕΗ
        apartments = Apartment.objects.filter(building=building)
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        
        total_distributed = Decimal('0.00')
        apartment_shares = {}
        
        for apartment in apartments:
            mills = apartment.participation_mills or 0
            if total_mills > 0:
                share_amount = (pending_expense.amount * mills) / total_mills
            else:
                share_amount = pending_expense.amount / len(apartments)
            
            apartment_shares[apartment.id] = share_amount
            total_distributed += share_amount
            
            print(f"   Διαμέρισμα {apartment.number}: {share_amount:,.2f}€ ({mills} χιλιοστά)")
        
        print(f"\n💰 Συνολικό διανεμημένο ποσό: {total_distributed:,.2f}€")
        print(f"💰 Ποσό δαπάνης: {pending_expense.amount:,.2f}€")
        
        if abs(total_distributed - pending_expense.amount) > Decimal('0.01'):
            print("❌ Διαφορά στη διανομή!")
            return
        else:
            print("✅ Η διανομή είναι σωστή")
        print()
        
        # 3. Έκδοση δαπάνης
        print("📊 3. ΕΚΔΟΣΗ ΔΑΠΑΝΗΣ")
        print("-" * 50)
        
        try:
            # Ενημέρωση δαπάνης
            pending_expense.is_issued = True
            pending_expense.save()
            
            print("✅ Η δαπάνη εκδόθηκε επιτυχώς")
            print()
            
            # 4. Δημιουργία transactions
            print("📊 4. ΔΗΜΙΟΥΡΓΙΑ TRANSACTIONS")
            print("-" * 50)
            
            transactions_created = 0
            
            for apartment_id, share_amount in apartment_shares.items():
                apartment = Apartment.objects.get(id=apartment_id)
                
                # Δημιουργία transaction για τη χρέωση
                transaction = Transaction.objects.create(
                    building=building,
                    apartment=apartment,
                    amount=-share_amount,  # Αρνητικό για χρέωση
                    transaction_type='expense_charge',
                    description=f"Χρέωση {pending_expense.title}",
                    reference_number=f"EXP-{pending_expense.id}",
                    date=pending_expense.date
                )
                
                # Ενημέρωση υπόλοιπου διαμερίσματος
                apartment.current_balance = (apartment.current_balance or Decimal('0.00')) - share_amount
                apartment.save()
                
                transactions_created += 1
                print(f"   ✅ Διαμέρισμα {apartment.number}: -{share_amount:,.2f}€")
            
            print(f"\n📋 Συνολικά δημιουργήθηκαν {transactions_created} transactions")
            print()
            
            # 5. Επιβεβαίωση
            print("📊 5. ΕΠΙΒΕΒΑΙΩΣΗ")
            print("-" * 50)
            
            # Έλεγχος αν η δαπάνη είναι τώρα εκδομένη
            pending_expense.refresh_from_db()
            if pending_expense.is_issued:
                print("✅ Η δαπάνη είναι τώρα εκδομένη")
            else:
                print("❌ Η δαπάνη δεν εκδόθηκε")
            
            # Έλεγχος αν υπάρχουν ακόμα ανέκδοτες δαπάνες
            remaining_pending = Expense.objects.filter(
                building_id=building_id,
                is_issued=False
            ).count()
            
            print(f"📋 Εναπομείναντες ανέκδοτες δαπάνες: {remaining_pending}")
            
            if remaining_pending == 0:
                print("🎉 Όλες οι δαπάνες είναι τώρα εκδομένες!")
            
        except Exception as e:
            print(f"❌ Σφάλμα κατά την έκδοση: {str(e)}")

if __name__ == "__main__":
    issue_pending_expense()
