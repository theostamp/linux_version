#!/usr/bin/env python3
"""
🔍 Script για έλεγχο αποθεματικού Αραχώβης 12

Σκοπός: Έλεγχος γιατί το αποθεματικό δεν εμφανίζεται στο "Οικονομικές Υποχρεώσεις Περιόδου"
"""

import os
import sys
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from financial.models import Building, Expense, Payment
from financial.services import FinancialDashboardService

def check_arachovis_reserve_fund():
    """Έλεγχος αποθεματικού Αραχώβης 12"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ ΑΡΑΧΩΒΗΣ 12")
    print("=" * 60)
    
    with schema_context('demo'):
        # Εύρεση κτιρίου Αραχώβης 12
        building = Building.objects.filter(name__icontains='Αραχώβης').first()
        
        if not building:
            print("❌ Δεν βρέθηκε κτίριο Αραχώβης")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print(f"💰 Τρέχον αποθεματικό: {building.current_reserve:,.2f}€")
        print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal:,.2f}€")
        print(f"📅 Διάρκεια αποθεματικού: {building.reserve_fund_duration_months} μήνες")
        print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        
        # Υπολογισμός μηνιαίου στόχου
        if building.reserve_fund_duration_months > 0:
            monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"📊 Μηνιαίος στόχος: {monthly_target:,.2f}€")
        
        print("\n" + "-" * 60)
        
        # Έλεγχος τρέχοντος μήνα
        current_month = datetime.now().strftime('%Y-%m')
        print(f"📅 Τρέχων μήνας: {current_month}")
        
        # Έλεγχος δαπανών τρέχοντος μήνα
        expenses = Expense.objects.filter(
            building=building,
            date__year=datetime.now().year,
            date__month=datetime.now().month
        )
        
        print(f"💸 Δαπάνες τρέχοντος μήνα: {expenses.count()}")
        total_expenses = sum(expense.amount for expense in expenses)
        print(f"💰 Συνολικό ποσό δαπανών: {total_expenses:,.2f}€")
        
        # Έλεγχος πληρωμών τρέχοντος μήνα
        payments = Payment.objects.filter(
            apartment__building=building,
            date__year=datetime.now().year,
            date__month=datetime.now().month
        )
        
        print(f"💳 Πληρωμές τρέχοντος μήνα: {payments.count()}")
        total_payments = sum(payment.amount for payment in payments)
        print(f"💰 Συνολικό ποσό πληρωμών: {total_payments:,.2f}€")
        
        # Έλεγχος δαπανών που δημιουργήθηκαν τον τρέχοντα μήνα
        created_expenses = Expense.objects.filter(
            building=building,
            created_at__year=datetime.now().year,
            created_at__month=datetime.now().month
        )
        
        print(f"📋 Δαπάνες που δημιουργήθηκαν: {created_expenses.count()}")
        
        print("\n" + "-" * 60)
        
        # Έλεγχος FinancialDashboard service
        print("🔍 ΕΛΕΓΧΟΣ FINANCIAL DASHBOARD SERVICE")
        print("-" * 40)
        
        try:
            dashboard = FinancialDashboardService(building.id)
            current_data = dashboard.get_current_data()
            
            print(f"💰 Current reserve: {current_data.get('current_reserve', 0):,.2f}€")
            print(f"📈 Total obligations: {current_data.get('total_obligations', 0):,.2f}€")
            print(f"📊 Total balance: {current_data.get('total_balance', 0):,.2f}€")
            
            # Έλεγχος reserve fund contribution
            reserve_contribution = current_data.get('reserve_fund_contribution', 0)
            print(f"🎯 Reserve fund contribution: {reserve_contribution:,.2f}€")
            
            if reserve_contribution > 0:
                print("✅ Το αποθεματικό θα πρέπει να εμφανίζεται στο 'Οικονομικές Υποχρεώσεις Περιόδου'")
            else:
                print("❌ Το αποθεματικό ΔΕΝ θα πρέπει να εμφανίζεται (contribution = 0)")
                
        except Exception as e:
            print(f"❌ Σφάλμα στο FinancialDashboard: {e}")
        
        print("\n" + "-" * 60)
        
        # Έλεγχος λογικής αποθεματικού
        print("🧮 ΕΛΕΓΧΟΣ ΛΟΓΙΚΗΣ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("-" * 40)
        
        # Έλεγχος αν υπάρχουν εκκρεμείς υποχρεώσεις
        total_obligations = 0
        if 'current_data' in locals():
            total_obligations = current_data.get('total_obligations', 0)
        
        if total_obligations > 0:
            print(f"⚠️ Υπάρχουν εκκρεμείς υποχρεώσεις: {total_obligations:,.2f}€")
            print("ℹ️ Σύμφωνα με τη λογική, το αποθεματικό δεν εμφανίζεται όταν υπάρχουν εκκρεμείς υποχρεώσεις")
        else:
            print("✅ Δεν υπάρχουν εκκρεμείς υποχρεώσεις")
            print("ℹ️ Το αποθεματικό θα πρέπει να εμφανίζεται")
        
        # Έλεγχος αν υπάρχει δραστηριότητα τον τρέχοντα μήνα
        has_activity = (total_expenses > 0 or total_payments > 0 or created_expenses.count() > 0)
        
        if has_activity:
            print("✅ Υπάρχει δραστηριότητα τον τρέχοντα μήνα")
        else:
            print("⚠️ Δεν υπάρχει δραστηριότητα τον τρέχοντα μήνα")
            print("ℹ️ Το αποθεματικό μπορεί να μην εμφανίζεται λόγω έλλειψης δραστηριότητας")
        
        print("\n" + "-" * 60)
        
        # Προτάσεις διόρθωσης
        print("🔧 ΠΡΟΤΑΣΕΙΣ ΔΙΟΡΘΩΣΗΣ")
        print("-" * 40)
        
        if total_obligations > 0:
            print("1. Εξόφληση εκκρεμών υποχρεώσεων για να εμφανιστεί το αποθεματικό")
        
        if not has_activity:
            print("2. Προσθήκη δραστηριότητας (δαπάνες ή πληρωμές) για τον τρέχοντα μήνα")
        
        # Έλεγχος αν το αποθεματικό θα πρέπει να εμφανίζεται
        reserve_contribution = building.reserve_fund_goal / building.reserve_fund_duration_months if building.reserve_fund_duration_months > 0 else 0
        
        if reserve_contribution == 0 and total_obligations == 0 and has_activity:
            print("3. Έλεγχος ρυθμίσεων αποθεματικού (στόχος, διάρκεια, ημερομηνία έναρξης)")
        
        print("\n" + "=" * 60)
        print("✅ Ο έλεγχος ολοκληρώθηκε!")

def check_reserve_fund_logic():
    """Έλεγχος λογικής αποθεματικού"""
    
    print("\n🧮 ΕΛΕΓΧΟΣ ΛΟΓΙΚΗΣ ΑΠΟΘΕΜΑΤΙΚΟΥ")
    print("=" * 60)
    
    with schema_context('demo'):
        building = Building.objects.filter(name__icontains='Αραχώβης').first()
        
        if not building:
            return
        
        # Έλεγχος ρυθμίσεων αποθεματικού
        print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal:,.2f}€")
        print(f"📅 Διάρκεια: {building.reserve_fund_duration_months} μήνες")
        print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        
        # Υπολογισμός μηνιαίου στόχου
        if building.reserve_fund_duration_months > 0:
            monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"📊 Μηνιαίος στόχος: {monthly_target:,.2f}€")
            
            # Έλεγχος αν έχουν περάσει αρκετοί μήνες
            if building.reserve_fund_start_date:
                months_passed = ((datetime.now().date() - building.reserve_fund_start_date).days) // 30
                print(f"📅 Μήνες που έχουν περάσει: {months_passed}")
                
                if months_passed < building.reserve_fund_duration_months:
                    print("✅ Αποθεματικό ακόμα ενεργό")
                else:
                    print("⚠️ Αποθεματικό μπορεί να έχει ολοκληρωθεί")
        
        print("\n" + "-" * 60)
        print("✅ Ο έλεγχος λογικής ολοκληρώθηκε!")

if __name__ == "__main__":
    print("🔍 RESERVE FUND DISPLAY CHECKER")
    print("=" * 60)
    
    # Έλεγχος αποθεματικού Αραχώβης 12
    check_arachovis_reserve_fund()
    
    # Έλεγχος λογικής αποθεματικού
    check_reserve_fund_logic()
    
    print("\n📋 Ελέγξτε την αναφορά παραπάνω για το γιατί δεν εμφανίζεται το αποθεματικό.")
