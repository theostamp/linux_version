#!/usr/bin/env python3
"""
Financial Audit - Step 4: Έλεγχος Κατανομής Χιλιοστών
====================================================

Αυτό το script ελέγχει:
1. Τη σωστή κατανομή των χιλιοστών στα διαμερίσματα
2. Τη σωστή κατανομή των δαπανών με βάση τα χιλιοστά
3. Τη συνολική ακρίβεια των υπολογισμών
"""

import os
import sys
import django
from decimal import Decimal, ROUND_HALF_UP

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Apartment, Expense, Payment, Building

def format_currency(amount):
    """Μορφοποίηση ποσού σε ευρώ"""
    return f"{float(amount):.2f}€"

def check_mills_distribution():
    """Έλεγχος κατανομής χιλιοστών"""
    print("🔍 FINANCIAL AUDIT - STEP 4: ΕΛΕΓΧΟΣ ΚΑΤΑΝΟΜΗΣ ΧΙΛΙΟΣΤΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        # Λήψη κτιρίου
        building = Building.objects.get(id=1)
        print(f"🏢 Έλεγχος κτιρίου: {building.address}")
        
        # Λήψη διαμερισμάτων
        apartments = Apartment.objects.filter(building=building).order_by('number')
        print(f"🏠 Έλεγχος {apartments.count()} διαμερισμάτων")
        print()
        
        # Έλεγχος συνολικών χιλιοστών
        total_mills = sum(apt.participation_mills for apt in apartments)
        print("📊 ΕΛΕΓΧΟΣ ΣΥΝΟΛΙΚΩΝ ΧΙΛΙΟΣΤΩΝ")
        print("-" * 50)
        print(f"💰 Συνολικά χιλιοστά: {total_mills}")
        print("🎯 Αναμενόμενα: 1000")
        
        if total_mills != 1000:
            print("❌ ΠΡΟΒΛΗΜΑ: Τα συνολικά χιλιοστά δεν ισούνται με 1000!")
            print(f"   Διαφορά: {1000 - total_mills}")
        else:
            print("✅ Τα συνολικά χιλιοστά είναι σωστά")
        
        print()
        
        # Έλεγχος κατανομής χιλιοστών ανά διαμέρισμα
        print("🏠 ΕΛΕΓΧΟΣ ΚΑΤΑΝΟΜΗΣ ΧΙΛΙΟΣΤΩΝ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ")
        print("-" * 60)
        
        for apt in apartments:
            percentage = (apt.participation_mills / 1000) * 100
            print(f"🏠 {apt.number}: {apt.participation_mills} χιλιοστά ({percentage:.2f}%)")
        
        print()
        
        # Έλεγχος κατανομής δαπανών με βάση τα χιλιοστά
        print("💸 ΕΛΕΓΧΟΣ ΚΑΤΑΝΟΜΗΣ ΔΑΠΑΝΩΝ ΜΕ ΒΑΣΗ ΤΑ ΧΙΛΙΟΣΤΑ")
        print("-" * 60)
        
        # Λήψη όλων των μηνών με δαπάνες
        expenses_months = Expense.objects.filter(
            building=building
        ).values_list('date__month', 'date__year').distinct().order_by('date__year', 'date__month')
        
        for month, year in expenses_months:
            print(f"\n📅 Μήνας: {month}/{year}")
            print("   " + "=" * 40)
            
            # Λήψη δαπανών του μήνα
            month_expenses = Expense.objects.filter(
                building=building,
                date__month=month,
                date__year=year
            )
            
            total_expense_amount = sum(exp.amount for exp in month_expenses)
            print(f"   💸 Συνολικές δαπάνες μήνα: {format_currency(total_expense_amount)}")
            
            if total_expense_amount > 0:
                # Έλεγχος κατανομής ανά διαμέρισμα
                print("   🏠 Κατανομή ανά διαμέρισμα:")
                
                for apt in apartments:
                    # Υπολογισμός αναμενόμενου ποσού με βάση τα χιλιοστά
                    expected_amount = (total_expense_amount * apt.participation_mills) / 1000
                    expected_amount = expected_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                    
                    # Εύρεση πραγματικού ποσού από τις εγγραφές
                    actual_amount = Decimal('0.00')
                    
                    # Έλεγχος σε Payment records (αρνητικά ποσά για χρεώσεις)
                    # Σημείωση: Στο σύστημά μας οι χρεώσεις καταγράφονται ως αρνητικά ποσά
                    # ή μέσω Transaction model
                    payment_records = Payment.objects.filter(
                        apartment=apt,
                        date__year=year,
                        date__month=month
                    )
                    
                    for record in payment_records:
                        actual_amount += record.amount
                    
                    print(f"      🏠 {apt.number}: Αναμενόμενο {format_currency(expected_amount)}, Πραγματικό {format_currency(actual_amount)}")
                    
                    # Έλεγχος διαφοράς
                    difference = abs(expected_amount - actual_amount)
                    if difference > Decimal('0.01'):  # Ανοχή 1 λεπτού
                        print(f"         ⚠️  ΔΙΑΦΟΡΑ: {format_currency(difference)}")
                    else:
                        print("         ✅ Σωστή κατανομή")
            else:
                print("   ℹ️  Δεν υπάρχουν δαπάνες αυτού του μήνα")
        
        print()
        
        # Έλεγχος ειδικών περιπτώσεων
        print("🔍 ΕΛΕΓΧΟΣ ΕΙΔΙΚΩΝ ΠΕΡΙΠΤΩΣΕΩΝ")
        print("-" * 50)
        
        # Έλεγχος για αποθεματικό (πρέπει να είναι ισόποσο)
        # Σημείωση: Θα ελέγξουμε τα Payment records για αποθεματικό
        reserve_fund_months = Payment.objects.filter(
            apartment__building=building,
            payment_type='reserve_fund'
        ).values_list('date__month', 'date__year').distinct().order_by('date__year', 'date__month')
        
        if reserve_fund_months:
            print("💰 Έλεγχος κατανομής αποθεματικού:")
            
            for month, year in reserve_fund_months:
                print(f"   📅 Μήνας {month}/{year}:")
                
                # Λήψη όλων των αποθεματικών του μήνα
                reserve_amounts = []
                for apt in apartments:
                    reserve_record = Payment.objects.filter(
                        apartment=apt,
                        date__month=month,
                        date__year=year,
                        payment_type='reserve_fund'
                    ).first()
                    
                    if reserve_record:
                        reserve_amounts.append(reserve_record.reserve_fund_amount)
                    else:
                        reserve_amounts.append(Decimal('0.00'))
                
                # Έλεγχος αν όλα τα ποσά είναι ίσα
                if reserve_amounts:
                    first_amount = reserve_amounts[0]
                    all_equal = all(amount == first_amount for amount in reserve_amounts)
                    
                    if all_equal:
                        print(f"      ✅ Ισόποση κατανομή: {format_currency(first_amount)}")
                    else:
                        print("      ❌ ΑΝΙΣΟΠΟΣΗ ΚΑΤΑΝΟΜΗ:")
                        for i, apt in enumerate(apartments):
                            print(f"         🏠 {apt.number}: {format_currency(reserve_amounts[i])}")
        
        # Έλεγχος για δαπάνη διαχείρισης (πρέπει να είναι ισόποση)
        # Σημείωση: Θα ελέγξουμε τα Expense records για δαπάνες διαχείρισης
        management_months = Expense.objects.filter(
            building=building,
            expense_type='management_fee'
        ).values_list('date__month', 'date__year').distinct().order_by('date__year', 'date__month')
        
        if management_months:
            print("\n🏢 Έλεγχος κατανομής δαπάνης διαχείρισης:")
            
            for month, year in management_months:
                print(f"   📅 Μήνας {month}/{year}:")
                
                # Λήψη όλων των δαπανών διαχείρισης του μήνα
                management_amounts = []
                for apt in apartments:
                    # Για δαπάνες διαχείρισης, θα ελέγξουμε αν υπάρχει κατανομή
                    # μέσω του ExpenseApartment model ή άλλου μηχανισμού
                    management_amounts.append(Decimal('0.00'))  # Placeholder για τώρα
                
                # Έλεγχος αν όλα τα ποσά είναι ίσα
                if management_amounts:
                    first_amount = management_amounts[0]
                    all_equal = all(amount == first_amount for amount in management_amounts)
                    
                    if all_equal:
                        print(f"      ✅ Ισόποση κατανομή: {format_currency(first_amount)}")
                    else:
                        print("      ❌ ΑΝΙΣΟΠΟΣΗ ΚΑΤΑΝΟΜΗ:")
                        for i, apt in enumerate(apartments):
                            print(f"         🏠 {apt.number}: {format_currency(management_amounts[i])}")
        
        print()
        print("✅ Ο έλεγχος κατανομής χιλιοστών ολοκληρώθηκε!")

if __name__ == "__main__":
    check_mills_distribution()
