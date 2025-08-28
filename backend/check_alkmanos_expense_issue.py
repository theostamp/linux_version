#!/usr/bin/env python3
"""
Script to investigate why expenses from 18/5/2025 in Alkmanos 22 building 
are not being transferred as debt to subsequent months.
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
from obligations.models import Obligation
from django.db.models import Sum, Q
from django.utils import timezone

def check_alkmanos_expense_issue():
    """Check the expense issue in Alkmanos 22 building"""
    
    with schema_context('demo'):
        print("🔍 ΕΡΕΥΝΑ ΔΑΠΑΝΗΣ ΑΛΚΜΑΝΟΣ 22 - 18/5/2025")
        print("=" * 60)
        
        # 1. Βρες το κτίριο Αλκμάνος 22
        try:
            building = Building.objects.get(address__icontains='Αλκμάνος 22')
            print(f"✅ Βρέθηκε κτίριο: {building.name} (ID: {building.id})")
            print(f"   Διεύθυνση: {building.address}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο Αλκμάνος 22")
            return
        
        # 2. Εύρεση δαπανών στις 18/5/2025
        target_date = date(2025, 5, 18)
        expenses = Expense.objects.filter(
            building=building,
            date=target_date
        ).select_related('building', 'supplier')
        
        print(f"\n📅 ΔΑΠΑΝΕΣ ΣΤΙΣ 18/5/2025:")
        print("-" * 40)
        
        if not expenses.exists():
            print("❌ Δεν βρέθηκαν δαπανές στις 18/5/2025")
        else:
            for expense in expenses:
                print(f"💰 Δαπάνη ID: {expense.id}")
                print(f"   Ποσό: €{expense.amount}")
                print(f"   Κατηγορία: {expense.get_category_display()}")
                print(f"   Τίτλος: {expense.title}")
                print(f"   Ημερομηνία: {expense.date}")
                print(f"   Δημιουργήθηκε: {expense.created_at}")
                print()
        
        # 3. Εύρεση συναλλαγών που προέρχονται από αυτές τις δαπανές
        print("💳 ΣΥΝΑΛΛΑΓΕΣ ΑΠΟ ΔΑΠΑΝΕΣ 18/5/2025:")
        print("-" * 40)
        
        transactions_from_expenses = Transaction.objects.filter(
            building=building,
            date__date=target_date,
            type__in=['expense_created', 'expense_issued']
        ).select_related('apartment')
        
        if not transactions_from_expenses.exists():
            print("❌ Δεν βρέθηκαν συναλλαγές από δαπανές 18/5/2025")
        else:
            total_transactions = Decimal('0')
            for transaction in transactions_from_expenses:
                print(f"💳 Συναλλαγή ID: {transaction.id}")
                print(f"   Διαμέρισμα: {transaction.apartment.number if transaction.apartment else 'Κοινό'}")
                print(f"   Ποσό: €{transaction.amount}")
                print(f"   Τύπος: {transaction.get_type_display()}")
                print(f"   Ημερομηνία: {transaction.date}")
                print(f"   Περιγραφή: {transaction.description}")
                total_transactions += transaction.amount
                print()
            
            print(f"📊 ΣΥΝΟΛΙΚΕΣ ΣΥΝΑΛΛΑΓΕΣ: €{total_transactions}")
        
        # 4. Εύρεση πληρωμών μετά τις 18/5/2025
        print("💸 ΠΛΗΡΩΜΕΣ ΜΕΤΑ ΤΙΣ 18/5/2025:")
        print("-" * 40)
        
        payments_after_date = Payment.objects.filter(
            apartment__building=building,
            date__gte=target_date
        ).select_related('apartment').order_by('date')
        
        if not payments_after_date.exists():
            print("❌ Δεν βρέθηκαν πληρωμές μετά τις 18/5/2025")
        else:
            total_payments = Decimal('0')
            for payment in payments_after_date:
                print(f"💸 Πληρωμή ID: {payment.id}")
                print(f"   Διαμέρισμα: {payment.apartment.number}")
                print(f"   Ποσό: €{payment.amount}")
                print(f"   Τύπος: {payment.get_payment_type_display()}")
                print(f"   Ημερομηνία: {payment.date}")
                print(f"   Μέθοδος: {payment.get_method_display()}")
                total_payments += payment.amount
                print()
            
            print(f"📊 ΣΥΝΟΛΙΚΕΣ ΠΛΗΡΩΜΕΣ: €{total_payments}")
        
        # 5. Έλεγχος υπολοίπων διαμερισμάτων
        print("🏠 ΥΠΟΛΟΙΠΑ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        print("-" * 40)
        
        apartments = Apartment.objects.filter(building=building).order_by('number')
        
        for apartment in apartments:
            # Υπολογισμός υπολοίπου από συναλλαγές
            transactions_sum = Transaction.objects.filter(
                apartment=apartment
            ).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')
            
            # Υπολογισμός συνολικών πληρωμών
            payments_sum = Payment.objects.filter(
                apartment=apartment
            ).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')
            
            balance = payments_sum - transactions_sum
            
            print(f"🏠 {apartment.number}:")
            print(f"   Χρεώσεις (συναλλαγές): €{transactions_sum}")
            print(f"   Πληρωμές: €{payments_sum}")
            print(f"   Υπόλοιπο: €{balance}")
            print()
        
        # 6. Έλεγχος για μεταφορά χρεώσεων στους επόμενους μήνες
        print("🔄 ΕΛΕΓΧΟΣ ΜΕΤΑΦΟΡΑΣ ΧΡΕΩΣΕΩΝ:")
        print("-" * 40)
        
        # Έλεγχος αν υπάρχουν συναλλαγές μετά τις 18/5/2025
        later_transactions = Transaction.objects.filter(
            building=building,
            date__gt=target_date
        ).select_related('apartment').order_by('date')
        
        if not later_transactions.exists():
            print("❌ Δεν βρέθηκαν συναλλαγές μετά τις 18/5/2025")
        else:
            print("✅ Βρέθηκαν συναλλαγές μετά τις 18/5/2025:")
            for transaction in later_transactions[:10]:  # Πρώτες 10
                apartment_num = transaction.apartment.number if transaction.apartment else 'Κοινό'
                print(f"   💳 {apartment_num}: €{transaction.amount} ({transaction.date.strftime('%d/%m/%Y')}) - {transaction.get_type_display()}")
            
            if later_transactions.count() > 10:
                print(f"   ... και άλλες {later_transactions.count() - 10} συναλλαγές")
        
        # 7. Έλεγχος για προηγούμενο υπόλοιπο
        print("\n📊 ΕΛΕΓΧΟΣ ΠΡΟΗΓΟΥΜΕΝΟΥ ΥΠΟΛΟΙΠΟΥ:")
        print("-" * 40)
        
        # Υπολογισμός υπολοίπου πριν τις 18/5/2025
        previous_transactions = Transaction.objects.filter(
            building=building,
            date__lt=target_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        previous_payments = Payment.objects.filter(
            apartment__building=building,
            date__lt=target_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        previous_balance = previous_payments - previous_transactions
        
        print(f"💰 Υπόλοιπο πριν 18/5/2025: €{previous_balance}")
        print(f"   Συνολικές πληρωμές: €{previous_payments}")
        print(f"   Συνολικές χρεώσεις: €{previous_transactions}")
        
        # 8. Συνοπτική ανάλυση
        print("\n📈 ΣΥΝΟΠΤΙΚΗ ΑΝΑΛΥΣΗ:")
        print("-" * 40)
        
        total_building_transactions = Transaction.objects.filter(
            building=building
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        total_building_payments = Payment.objects.filter(
            apartment__building=building
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        total_building_balance = total_building_payments - total_building_transactions
        
        print(f"🏢 ΣΥΝΟΛΙΚΟ ΥΠΟΛΟΙΠΟ ΚΤΙΡΙΟΥ: €{total_building_balance}")
        print(f"   Συνολικές χρεώσεις: €{total_building_transactions}")
        print(f"   Συνολικές πληρωμές: €{total_building_payments}")
        
        if total_building_balance < 0:
            print("⚠️  Το κτίριο έχει αρνητικό υπόλοιπο - υπάρχουν μη εξοφλημένες χρεώσεις")
        else:
            print("✅ Το κτίριο έχει θετικό υπόλοιπο")
        
        # 9. Έλεγχος για obligations
        print("\n📋 ΕΛΕΓΧΟΣ ΟΦΕΙΛΩΝ:")
        print("-" * 40)
        
        obligations = Obligation.objects.filter(
            building=building,
            due_date__gte=target_date
        ).order_by('due_date')
        
        if not obligations.exists():
            print("❌ Δεν βρέθηκαν οφειλές μετά τις 18/5/2025")
        else:
            total_obligations = Decimal('0')
            for obligation in obligations:
                print(f"📋 Οφειλή ID: {obligation.id}")
                print(f"   Τίτλος: {obligation.title}")
                print(f"   Ποσό: €{obligation.amount}")
                print(f"   Ημερομηνία λήξης: {obligation.due_date}")
                print(f"   Κατάσταση: {'Εξοφλημένη' if obligation.is_paid else 'Μη εξοφλημένη'}")
                total_obligations += obligation.amount
                print()
            
            print(f"📊 ΣΥΝΟΛΙΚΕΣ ΟΦΕΙΛΕΣ: €{total_obligations}")

if __name__ == "__main__":
    check_alkmanos_expense_issue()
