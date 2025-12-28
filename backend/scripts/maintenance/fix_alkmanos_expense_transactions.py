#!/usr/bin/env python3
"""
Script to fix the missing transactions for the expense on 18/5/2025 in Alkmanos 22 building.
"""

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
from financial.models import Building, Apartment, Expense, Transaction, Payment
from django.db.models import Sum
from django.utils import timezone

def fix_alkmanos_expense_transactions():
    """Fix missing transactions for the expense on 18/5/2025"""
    
    with schema_context('demo'):
        print("🔧 ΔΙΟΡΘΩΣΗ ΣΥΝΑΛΛΑΓΩΝ ΔΑΠΑΝΗΣ ΑΛΚΜΑΝΟΣ 22 - 18/5/2025")
        print("=" * 60)
        
        # 1. Βρες το κτίριο Αλκμάνος 22
        try:
            building = Building.objects.get(address__icontains='Αλκμάνος 22')
            print(f"✅ Βρέθηκε κτίριο: {building.name} (ID: {building.id})")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο Αλκμάνος 22")
            return
        
        # 2. Βρες τη δαπάνη στις 18/5/2025
        target_date = date(2025, 5, 18)
        expenses = Expense.objects.filter(
            building=building,
            date=target_date
        )
        
        if not expenses.exists():
            print("❌ Δεν βρέθηκαν δαπανές στις 18/5/2025")
            return
        
        expense = expenses.first()
        print(f"💰 Βρέθηκε δαπάνη: {expense.title} - €{expense.amount}")
        
        # 3. Έλεγχος αν υπάρχουν ήδη συναλλαγές για αυτή τη δαπάνη
        existing_transactions = Transaction.objects.filter(
            building=building,
            date__date=target_date,
            type__in=['expense_created', 'expense_issued'],
            description__icontains=expense.title
        )
        
        if existing_transactions.exists():
            print("⚠️  Υπάρχουν ήδη συναλλαγές για αυτή τη δαπάνη:")
            for transaction in existing_transactions:
                print(f"   💳 Συναλλαγή ID: {transaction.id} - €{transaction.amount}")
            return
        
        # 4. Βρες όλα τα διαμερίσματα του κτιρίου
        apartments = Apartment.objects.filter(building=building).order_by('number')
        print(f"🏠 Βρέθηκαν {apartments.count()} διαμερίσματα")
        
        # 5. Υπολογισμός κατανομής δαπάνης
        total_apartments = apartments.count()
        if total_apartments == 0:
            print("❌ Δεν βρέθηκαν διαμερίσματα")
            return
        
        # Απλή κατανομή ισόποσα (μπορεί να αλλάξει ανάλογα με τη λογική του συστήματος)
        amount_per_apartment = expense.amount / total_apartments
        
        print(f"📊 Κατανομή: €{amount_per_apartment} ανά διαμέρισμα")
        
        # 6. Δημιουργία συναλλαγών για κάθε διαμέρισμα
        created_transactions = []
        
        for apartment in apartments:
            # Δημιουργία συναλλαγής χρέωσης
            transaction = Transaction.objects.create(
                building=building,
                apartment=apartment,
                date=timezone.make_aware(datetime.combine(target_date, datetime.min.time())),
                type='expense_created',
                status='completed',
                description=f"Χρέωση δαπάνης: {expense.title}",
                amount=amount_per_apartment,
                balance_before=Decimal('0'),  # Θα υπολογιστεί αργότερα
                balance_after=Decimal('0'),   # Θα υπολογιστεί αργότερα
                reference_id=str(expense.id),
                reference_type='expense',
                created_by='System - Expense Fix'
            )
            created_transactions.append(transaction)
            print(f"✅ Δημιουργήθηκε συναλλαγή για {apartment.number}: €{amount_per_apartment}")
        
        # 7. Υπολογισμός και ενημέρωση υπολοίπων
        print("\n📊 ΕΝΗΜΕΡΩΣΗ ΥΠΟΛΟΙΠΩΝ:")
        print("-" * 40)
        
        for apartment in apartments:
            # Υπολογισμός τρέχοντος υπολοίπου
            apartment_transactions = Transaction.objects.filter(
                apartment=apartment
            ).order_by('date', 'created_at')
            
            current_balance = Decimal('0')
            
            for transaction in apartment_transactions:
                # Ενημέρωση υπολοίπων
                transaction.balance_before = current_balance
                
                if transaction.type in ['expense_created', 'expense_issued', 'common_expense_charge', 'interest_charge', 'penalty_charge']:
                    # Χρέωση - μειώνει το υπόλοιπο
                    current_balance -= transaction.amount
                else:
                    # Πληρωμή - αυξάνει το υπόλοιπο
                    current_balance += transaction.amount
                
                transaction.balance_after = current_balance
                transaction.save()
            
            print(f"🏠 {apartment.number}: Τελικό υπόλοιπο €{current_balance}")
        
        # 8. Έλεγχος αποτελεσμάτων
        print("\n📈 ΑΠΟΤΕΛΕΣΜΑΤΑ:")
        print("-" * 40)
        
        total_charges = sum(t.amount for t in created_transactions)
        total_payments = Payment.objects.filter(
            apartment__building=building
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        final_balance = total_payments - total_charges
        
        print(f"💰 Συνολικές χρεώσεις: €{total_charges}")
        print(f"💰 Συνολικές πληρωμές: €{total_payments}")
        print(f"💰 Τελικό υπόλοιπο κτιρίου: €{final_balance}")
        
        if final_balance < 0:
            print("⚠️  Το κτίριο έχει αρνητικό υπόλοιπο - υπάρχουν μη εξοφλημένες χρεώσεις")
        else:
            print("✅ Το κτίριο έχει θετικό υπόλοιπο")
        
        print(f"\n✅ Δημιουργήθηκαν {len(created_transactions)} συναλλαγές")
        print("🎯 Η δαπάνη τώρα θα εμφανίζεται ως χρέος στους επόμενους μήνες!")

if __name__ == "__main__":
    fix_alkmanos_expense_transactions()
