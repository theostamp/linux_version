#!/usr/bin/env python3
"""
Financial Audit - Step 5: Έλεγχος Διπλών Χρεώσεων
================================================

Αυτό το script ελέγχει:
1. Διπλές χρεώσεις του ίδιου ποσού
2. Χρονική εμφάνιση αποθεματικού
3. Διπλές χρεώσεις δαπάνης διαχείρισης
4. Σωστή χρονική εμφάνιση όλων των δαπανών
"""

import os
import sys
import django
from decimal import Decimal
from collections import defaultdict

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Apartment, Expense, Payment, Transaction, Building
from financial.services import CommonExpenseCalculator

def format_currency(amount):
    """Μορφοποίηση ποσού σε ευρώ"""
    return f"{float(amount):.2f}€"

def check_duplicate_charges():
    """Έλεγχος διπλών χρεώσεων"""
    print("🔍 FINANCIAL AUDIT - STEP 5: ΕΛΕΓΧΟΣ ΔΙΠΛΩΝ ΧΡΕΩΣΕΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        # Λήψη κτιρίου
        building = Building.objects.get(id=1)
        print(f"🏢 Έλεγχος κτιρίου: {building.address}")
        
        # Λήψη διαμερισμάτων
        apartments = Apartment.objects.filter(building=building).order_by('number')
        print(f"🏠 Έλεγχος {apartments.count()} διαμερισμάτων")
        print()
        
        # Έλεγχος διπλών δαπανών
        print("💸 ΕΛΕΓΧΟΣ ΔΙΠΛΩΝ ΔΑΠΑΝΩΝ")
        print("-" * 50)
        
        # Λήψη όλων των δαπανών
        all_expenses = Expense.objects.filter(building=building).order_by('date')
        
        if all_expenses.exists():
            print(f"📊 Συνολικές δαπάνες: {all_expenses.count()}")
            
            # Έλεγχος για διπλές δαπάνες με ίδιο τίτλο και ποσό
            expense_groups = defaultdict(list)
            for expense in all_expenses:
                key = (expense.title, expense.amount, expense.date)
                expense_groups[key].append(expense)
            
            duplicates_found = False
            for (title, amount, date), expenses in expense_groups.items():
                if len(expenses) > 1:
                    duplicates_found = True
                    print(f"   ⚠️  ΔΙΠΛΗ ΔΑΠΑΝΗ: {title} - {format_currency(amount)} - {date}")
                    print(f"      Εμφανίσεις: {len(expenses)}")
                    for i, exp in enumerate(expenses, 1):
                        print(f"         {i}. ID: {exp.id}, Δημιουργήθηκε: {exp.created_at}")
            
            if not duplicates_found:
                print("   ✅ Δεν βρέθηκαν διπλές δαπάνες")
        else:
            print("   ℹ️  Δεν υπάρχουν καταχωρημένες δαπάνες")
        
        print()
        
        # Έλεγχος διπλών εισπράξεων
        print("💰 ΕΛΕΓΧΟΣ ΔΙΠΛΩΝ ΕΙΣΠΡΑΞΕΩΝ")
        print("-" * 50)
        
        # Λήψη όλων των εισπράξεων
        all_payments = Payment.objects.filter(apartment__building=building).order_by('date')
        
        if all_payments.exists():
            print(f"📊 Συνολικές εισπράξεις: {all_payments.count()}")
            
            # Έλεγχος για διπλές εισπράξεις με ίδιο ποσό και ημερομηνία
            payment_groups = defaultdict(list)
            for payment in all_payments:
                key = (payment.apartment.number, payment.amount, payment.date)
                payment_groups[key].append(payment)
            
            duplicates_found = False
            for (apartment, amount, date), payments in payment_groups.items():
                if len(payments) > 1:
                    duplicates_found = True
                    print(f"   ⚠️  ΔΙΠΛΗ ΕΙΣΠΡΑΞΗ: {apartment} - {format_currency(amount)} - {date}")
                    print(f"      Εμφανίσεις: {len(payments)}")
                    for i, pay in enumerate(payments, 1):
                        print(f"         {i}. ID: {pay.id}, Μέθοδος: {pay.get_method_display()}")
            
            if not duplicates_found:
                print("   ✅ Δεν βρέθηκαν διπλές εισπράξεις")
        else:
            print("   ℹ️  Δεν υπάρχουν καταχωρημένες εισπράξεις")
        
        print()
        
        # Έλεγχος χρονικής εμφάνισης αποθεματικού
        print("🏦 ΕΛΕΓΧΟΣ ΧΡΟΝΙΚΗΣ ΕΜΦΑΝΙΣΗΣ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("-" * 60)
        
        # Λήψη όλων των εισπράξεων αποθεματικού
        reserve_payments = Payment.objects.filter(
            apartment__building=building,
            payment_type='reserve_fund'
        ).order_by('date')
        
        if reserve_payments.exists():
            print(f"📊 Εισπράξεις αποθεματικού: {reserve_payments.count()}")
            
            # Ομαδοποίηση ανά μήνα
            reserve_by_month = defaultdict(list)
            for payment in reserve_payments:
                month_key = (payment.date.year, payment.date.month)
                reserve_by_month[month_key].append(payment)
            
            print("   📅 Εμφάνιση ανά μήνα:")
            for (year, month), payments in sorted(reserve_by_month.items()):
                total_amount = sum(pay.reserve_fund_amount for pay in payments)
                print(f"      {month}/{year}: {len(payments)} εγγραφές, Σύνολο: {format_currency(total_amount)}")
                
                # Έλεγχος για διπλές εγγραφές τον ίδιο μήνα
                if len(payments) > 1:
                    print(f"         ⚠️  ΠΡΟΣΟΧΗ: {len(payments)} εγγραφές τον ίδιο μήνα!")
                    for i, pay in enumerate(payments, 1):
                        print(f"            {i}. {pay.apartment.number}: {format_currency(pay.reserve_fund_amount)}")
        else:
            print("   ℹ️  Δεν υπάρχουν εισπράξεις αποθεματικού")
        
        print()
        
        # Έλεγχος χρονικής εμφάνισης δαπάνης διαχείρισης
        print("🏢 ΕΛΕΓΧΟΣ ΧΡΟΝΙΚΗΣ ΕΜΦΑΝΙΣΗΣ ΔΑΠΑΝΗΣ ΔΙΑΧΕΙΡΙΣΗΣ")
        print("-" * 70)
        
        # Λήψη όλων των δαπανών διαχείρισης
        management_expenses = Expense.objects.filter(
            building=building,
            expense_type='management_fee'
        ).order_by('date')
        
        if management_expenses.exists():
            print(f"📊 Δαπάνες διαχείρισης: {management_expenses.count()}")
            
            # Ομαδοποίηση ανά μήνα
            management_by_month = defaultdict(list)
            for expense in management_expenses:
                month_key = (expense.date.year, expense.date.month)
                management_by_month[month_key].append(expense)
            
            print("   📅 Εμφάνιση ανά μήνα:")
            for (year, month), expenses in sorted(management_by_month.items()):
                total_amount = sum(exp.amount for exp in expenses)
                print(f"      {month}/{year}: {len(expenses)} εγγραφές, Σύνολο: {format_currency(total_amount)}")
                
                # Έλεγχος για διπλές εγγραφές τον ίδιο μήνα
                if len(expenses) > 1:
                    print(f"         ⚠️  ΠΡΟΣΟΧΗ: {len(expenses)} εγγραφές τον ίδιο μήνα!")
                    for i, exp in enumerate(expenses, 1):
                        print(f"            {i}. {exp.title}: {format_currency(exp.amount)}")
        else:
            print("   ℹ️  Δεν υπάρχουν δαπάνες διαχείρισης")
        
        print()
        
        # Έλεγχος συνολικής συνέπειας
        print("🔍 ΕΛΕΓΧΟΣ ΣΥΝΟΛΙΚΗΣ ΣΥΝΕΠΕΙΑΣ")
        print("-" * 50)
        
        # Έλεγχος αν υπάρχουν εγγραφές σε μη αναμενόμενους μήνες
        print("   📅 Έλεγχος εγγραφών σε μη αναμενόμενους μήνες:")
        
        # Λήψη όλων των μηνών με εγγραφές
        all_months_with_data = set()
        
        # Μήνες με δαπάνες
        expense_months = set(Expense.objects.filter(
            building=building
        ).values_list('date__year', 'date__month'))
        all_months_with_data.update(expense_months)
        
        # Μήνες με εισπράξεις
        payment_months = set(Payment.objects.filter(
            apartment__building=building
        ).values_list('date__year', 'date__month'))
        all_months_with_data.update(payment_months)
        
        if all_months_with_data:
            print(f"   📊 Μήνες με δεδομένα: {len(all_months_with_data)}")
            for year, month in sorted(all_months_with_data):
                print(f"      {month}/{year}")
        else:
            print("   ℹ️  Δεν υπάρχουν δεδομένα σε κανένα μήνα")
        
        print()
        print("✅ Ο έλεγχος διπλών χρεώσεων ολοκληρώθηκε!")

if __name__ == "__main__":
    check_duplicate_charges()
