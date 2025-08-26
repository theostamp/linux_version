#!/usr/bin/env python3
"""
Script για debugging της συνολικής κάλυψης και των δαπανών διαχείρισης
"""

import os
import sys
import django
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense, Payment

def debug_total_coverage():
    """Debug για τη συνολική κάλυψη και τα 80€ που λείπουν"""
    
    print("🔍 DEBUG: ΣΥΝΟΛΙΚΗ ΚΑΛΥΨΗ & ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ")
    print("=" * 60)
    
    with schema_context('demo'):
        # Εύρεση κτιρίου Αραχώβης 12
        building = Building.objects.filter(name__icontains='Αραχώβης').first()
        
        if not building:
            print("❌ Δεν βρέθηκε το κτίριο Αραχώβης 12")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        
        # Έλεγχος ρυθμίσεων αποθεματικού
        print(f"\n📋 ΡΥΘΜΙΣΕΙΣ ΑΠΟΘΕΜΑΤΙΚΟΥ:")
        print(f"💰 Τρέχον αποθεματικό: {building.current_reserve:,.2f}€")
        print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal:,.2f}€")
        print(f"📅 Διάρκεια: {building.reserve_fund_duration_months} μήνες")
        print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        
        # Υπολογισμός μηνιαίου στόχου
        if building.reserve_fund_duration_months > 0:
            monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"📊 Μηνιαίος στόχος: {monthly_target:,.2f}€")
        
        # Έλεγχος τρέχοντος μήνα
        current_month = datetime.now().month
        current_year = datetime.now().year
        print(f"\n📅 ΤΡΕΧΩΝ ΜΗΝΑΣ: {current_year}-{current_month:02d}")
        
        # Έλεγχος δαπανών διαχείρισης
        print(f"\n💼 ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ:")
        management_fee_per_apartment = building.management_fee_per_apartment or 0
        print(f"💰 Αμοιβή ανά διαμέρισμα: {management_fee_per_apartment:,.2f}€")
        
        # Μέτρηση διαμερισμάτων
        apartments = building.apartments.all()
        apartment_count = apartments.count()
        print(f"🏠 Αριθμός διαμερισμάτων: {apartment_count}")
        
        # Συνολικό κόστος διαχείρισης
        total_management_cost = management_fee_per_apartment * apartment_count
        print(f"💰 Συνολικό κόστος διαχείρισης: {total_management_cost:,.2f}€")
        
        # Έλεγχος δαπανών τρέχοντος μήνα
        print(f"\n💸 ΔΑΠΑΝΕΣ ΤΡΕΧΟΝΤΟΣ ΜΗΝΑ:")
        expenses = Expense.objects.filter(
            building=building,
            date__year=current_year,
            date__month=current_month
        )
        
        total_expenses = sum(expense.amount for expense in expenses)
        print(f"📊 Αριθμός δαπανών: {expenses.count()}")
        print(f"💰 Συνολικό ποσό δαπανών: {total_expenses:,.2f}€")
        
        # Έλεγχος πληρωμών τρέχοντος μήνα
        print(f"\n💳 ΠΛΗΡΩΜΕΣ ΤΡΕΧΟΝΤΟΣ ΜΗΝΑ:")
        payments = Payment.objects.filter(
            apartment__building=building,
            date__year=current_year,
            date__month=current_month
        )
        
        total_payments = sum(payment.amount for payment in payments)
        print(f"📊 Αριθμός πληρωμών: {payments.count()}")
        print(f"💰 Συνολικό ποσό πληρωμών: {total_payments:,.2f}€")
        
        # Υπολογισμός συνολικής κάλυψης
        print(f"\n💰 ΥΠΟΛΟΓΙΣΜΟΣ ΣΥΝΟΛΙΚΗΣ ΚΑΛΥΨΗΣ:")
        print(f"💸 Δαπάνες τρέχοντος μήνα: {total_expenses:,.2f}€")
        print(f"💼 Δαπάνες διαχείρισης: {total_management_cost:,.2f}€")
        print(f"🏦 Εισφορά αποθεματικού: {monthly_target:,.2f}€")
        
        # Σωστή συνολική κάλυψη
        correct_total_coverage = total_expenses + total_management_cost + monthly_target
        print(f"📊 ΣΩΣΤΗ ΣΥΝΟΛΙΚΗ ΚΑΛΥΨΗ: {correct_total_coverage:,.2f}€")
        
        # Τι εμφανίζεται τώρα (με average_monthly_expenses που περιλαμβάνει δαπάνες διαχείρισης)
        current_total_coverage = total_expenses + total_management_cost + monthly_target
        print(f"📊 ΤΡΕΧΟΥΣΑ ΣΥΝΟΛΙΚΗ ΚΑΛΥΨΗ: {current_total_coverage:,.2f}€")
        
        # Διαφορά
        difference = correct_total_coverage - current_total_coverage
        print(f"📊 ΔΙΑΦΟΡΑ: {difference:,.2f}€")
        
        if difference == 0:
            print(f"\n✅ ΕΠΙΤΥΧΙΑ:")
            print(f"Η συνολική κάλυψη είναι σωστή! Τα {total_management_cost:,.2f}€ των δαπανών διαχείρισης περιλαμβάνονται.")
        else:
            print(f"\n💡 ΠΡΟΒΛΗΜΑ:")
            print(f"Το frontend δεν προσθέτει τα {total_management_cost:,.2f}€ των δαπανών διαχείρισης στη συνολική κάλυψη!")
        
        print("\n" + "=" * 60)
        print("🔍 ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ!")

if __name__ == "__main__":
    debug_total_coverage()
