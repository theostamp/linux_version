#!/usr/bin/env python3
"""
Script to investigate why apartment balances are not being updated correctly
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime
from django.db.models import Sum

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense, Transaction
from apartments.models import Apartment

def investigate_balance_issue():
    """Investigate why apartment balances are not being updated correctly"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔍 ΕΡΕΥΝΑ ΠΡΟΒΛΗΜΑΤΟΣ ΥΠΟΛΟΙΠΩΝ - ΑΛΚΜΑΝΟΣ 22")
        print("=" * 80)
        print(f"🏢 Κτίριο: Αλκμάνος 22, Αθήνα 115 28 (ID: {building_id})")
        print(f"📅 Ημερομηνία ερεύνας: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        print()
        
        # 1. Έλεγχος συναλλαγών
        print("📊 1. ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ")
        print("-" * 50)
        
        transactions = Transaction.objects.filter(
            apartment__building_id=building_id
        ).order_by('-created_at')
        
        print(f"💰 Συνολικές συναλλαγές: {transactions.count()}")
        
        if transactions.exists():
            print("\n📋 Λεπτομέρειες συναλλαγών:")
            for trans in transactions[:10]:  # Πρώτες 10
                print(f"   • ID: {trans.id} | Ποσό: {trans.amount:,.2f}€ | Ημ/νία: {trans.created_at}")
        else:
            print("   ✅ Δεν υπάρχουν συναλλαγές")
        
        print()
        
        # 2. Έλεγχος πληρωμών
        print("📊 2. ΕΛΕΓΧΟΣ ΠΛΗΡΩΜΩΝ")
        print("-" * 50)
        
        payments = Payment.objects.filter(
            apartment__building_id=building_id
        ).order_by('-date')
        
        print(f"💰 Συνολικές πληρωμές: {payments.count()}")
        
        if payments.exists():
            print("\n📋 Λεπτομέρειες πληρωμών:")
            for payment in payments[:10]:  # Πρώτες 10
                print(f"   • ID: {payment.id} | Διαμέρισμα: {payment.apartment.number} | Ποσό: {payment.amount:,.2f}€ | Ημ/νία: {payment.date}")
        else:
            print("   ✅ Δεν υπάρχουν πληρωμές")
        
        print()
        
        # 3. Έλεγχος δαπανών
        print("📊 3. ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ")
        print("-" * 50)
        
        expenses = Expense.objects.filter(
            building_id=building_id
        ).order_by('-date')
        
        print(f"💰 Συνολικές δαπάνες: {expenses.count()}")
        
        if expenses.exists():
            print("\n📋 Λεπτομέρειες δαπανών:")
            for expense in expenses[:10]:  # Πρώτες 10
                print(f"   • ID: {expense.id} | Τίτλος: {expense.title} | Ποσό: {expense.amount:,.2f}€ | Ημ/νία: {expense.date}")
        else:
            print("   ✅ Δεν υπάρχουν δαπάνες")
        
        print()
        
        # 4. Ανάλυση υπολοίπων διαμερισμάτων
        print("📊 4. ΑΝΑΛΥΣΗ ΥΠΟΛΟΙΠΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("-" * 50)
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        for apartment in apartments:
            print(f"🏠 Διαμέρισμα {apartment.number} ({apartment.owner_name}):")
            print(f"   • Τρέχον υπόλοιπο στη βάση: {apartment.current_balance:,.2f}€")
            
            # Υπολογισμός πραγματικού υπολοίπου από συναλλαγές
            apt_transactions = transactions.filter(apartment=apartment)
            calculated_balance = apt_transactions.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            print(f"   • Υπολογισμένο υπόλοιπο από συναλλαγές: {calculated_balance:,.2f}€")
            
            # Έλεγχος διαφοράς
            if abs(apartment.current_balance - calculated_balance) > Decimal('0.01'):
                print(f"   ⚠️ ΔΙΑΦΟΡΑ: {apartment.current_balance - calculated_balance:,.2f}€")
            else:
                print("   ✅ ΣΥΝΕΠΕΣ")
            
            print()
        
        # 5. Έλεγχος για orphaned records
        print("📊 5. ΕΛΕΓΧΟΣ ORPHANED RECORDS")
        print("-" * 50)
        
        # Έλεγχος για συναλλαγές χωρίς σύνδεση με διαμέρισμα
        orphaned_transactions = Transaction.objects.filter(
            apartment__isnull=True
        ).count()
        
        print(f"🔗 Συναλλαγές χωρίς διαμέρισμα: {orphaned_transactions}")
        
        # Έλεγχος για πληρωμές χωρίς σύνδεση με διαμέρισμα
        orphaned_payments = Payment.objects.filter(
            apartment__isnull=True
        ).count()
        
        print(f"🔗 Πληρωμές χωρίς διαμέρισμα: {orphaned_payments}")
        
        print()
        
        # 6. Προτάσεις επιλύσεως
        print("📊 6. ΠΡΟΤΑΣΕΙΣ ΕΠΙΛΥΣΕΩΣ")
        print("-" * 50)
        
        if transactions.count() == 0 and payments.count() == 0 and expenses.count() == 0:
            print("🔧 Επιλογή 1: Μηδενισμός όλων των υπολοίπων")
            print("   - Εκτέλεση UPDATE για όλα τα διαμερίσματα")
            print("   - current_balance = 0.00")
            print()
            
            print("🔧 Επιλογή 2: Δημιουργία ρεαλιστικών δεδομένων")
            print("   - Προσθήκη δαπανών και πληρωμών")
            print("   - Αυτόματη ενημέρωση υπολοίπων")
            print()
            
            print("🔧 Επιλογή 3: Έλεγχος για κρυφά δεδομένα")
            print("   - Έλεγχος άλλων πινάκων")
            print("   - Έλεγχος για soft deletes")
        else:
            print("🔧 Επιλογή 1: Επαναυπολογισμός υπολοίπων")
            print("   - Υπολογισμός από συναλλαγές")
            print("   - Ενημέρωση διαμερισμάτων")
            print()
            
            print("🔧 Επιλογή 2: Καθαρισμός orphaned records")
            print("   - Διαγραφή συναλλαγών χωρίς διαμέρισμα")
            print("   - Επαναυπολογισμός")
        
        print()
        print("=" * 80)
        print("🏁 ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΕΡΕΥΝΑ")

if __name__ == "__main__":
    investigate_balance_issue()
