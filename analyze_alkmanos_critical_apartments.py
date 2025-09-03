#!/usr/bin/env python3
"""
Script to analyze the critical apartment situation in Αλκμάνος 22 building
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
from financial.models import Payment, Expense
from apartments.models import Apartment
from buildings.models import Building
from financial.services import CommonExpenseCalculator

def analyze_critical_apartments():
    """Analyze why 9 apartments are showing as critical"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔍 ΑΝΑΛΥΣΗ ΚΡΙΤΙΚΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ - ΑΛΚΜΑΝΟΣ 22")
        print("=" * 80)
        print(f"🏢 Κτίριο: Αλκμάνος 22, Αθήνα 115 28 (ID: {building_id})")
        print(f"📅 Ημερομηνία ανάλυσης: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        print()
        
        # 1. Βασικές πληροφορίες κτιρίου
        print("📊 1. ΒΑΣΙΚΕΣ ΠΛΗΡΟΦΟΡΙΕΣ ΚΤΙΡΙΟΥ")
        print("-" * 50)
        
        building = Building.objects.get(id=building_id)
        print(f"🏢 Όνομα: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print(f"🏠 Συνολικά διαμερίσματα: {building.apartments_count}")
        print(f"💰 Τρέχον αποθεματικό: {building.current_reserve:,.2f}€")
        print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal:,.2f}€")
        print(f"⏱️ Διάρκεια αποθεματικού: {building.reserve_fund_duration_months} μήνες")
        print()
        
        # 2. Ανάλυση διαμερισμάτων
        print("📊 2. ΑΝΑΛΥΣΗ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("-" * 50)
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        print(f"🏠 Βρέθηκαν {apartments.count()} διαμερίσματα:")
        print()
        
        # Κατηγοριοποίηση διαμερισμάτων
        current_apartments = 0
        behind_apartments = 0
        critical_apartments = 0
        
        apartment_details = []
        
        for apartment in apartments:
            balance = apartment.current_balance or Decimal('0.00')
            
            # Υπολογισμός μηνιαίας οφειλής
            try:
                calculator = CommonExpenseCalculator(building_id)
                shares = calculator.calculate_shares()
                apartment_share = shares.get(apartment.id, {})
                monthly_due = apartment_share.get('total_amount', 0)
            except Exception as e:
                monthly_due = 0
                print(f"⚠️ Σφάλμα υπολογισμού για διαμέρισμα {apartment.number}: {e}")
            
            # Κατηγοριοποίηση βάσει οφειλών
            if balance >= 0:
                status = "Ενημερωμένο"
                current_apartments += 1
            elif abs(balance) <= monthly_due * 2:
                status = "Καθυστέρηση"
                behind_apartments += 1
            else:
                status = "Κρίσιμο"
                critical_apartments += 1
            
            apartment_details.append({
                'number': apartment.number,
                'owner': apartment.owner_name,
                'balance': balance,
                'monthly_due': monthly_due,
                'status': status,
                'mills': apartment.participation_mills
            })
            
            print(f"   Διαμέρισμα {apartment.number}:")
            print(f"     • Ιδιοκτήτης: {apartment.owner_name}")
            print(f"     • Υπόλοιπο: {balance:,.2f}€")
            print(f"     • Μηνιαία οφειλή: {monthly_due:,.2f}€")
            print(f"     • Χιλιοστά: {apartment.participation_mills}")
            print(f"     • Κατάσταση: {status}")
            print()
        
        # 3. Στατιστικά
        print("📊 3. ΣΤΑΤΙΣΤΙΚΑ")
        print("-" * 50)
        print(f"✅ Ενημερωμένα: {current_apartments} διαμερίσματα")
        print(f"⚠️ Καθυστέρηση: {behind_apartments} διαμερίσματα")
        print(f"🚨 Κρίσιμα: {critical_apartments} διαμερίσματα")
        print()
        
        # 4. Ανάλυση κρίσιμων διαμερισμάτων
        if critical_apartments > 0:
            print("🚨 4. ΛΕΠΤΟΜΕΡΗΣ ΑΝΑΛΥΣΗ ΚΡΙΤΙΚΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
            print("-" * 50)
            
            critical_details = [apt for apt in apartment_details if apt['status'] == 'Κρίσιμο']
            
            for apt in critical_details:
                months_behind = abs(apt['balance']) / apt['monthly_due'] if apt['monthly_due'] > 0 else 0
                print(f"   Διαμέρισμα {apt['number']} ({apt['owner']}):")
                print(f"     • Υπόλοιπο: {apt['balance']:,.2f}€")
                print(f"     • Μηνιαία οφειλή: {apt['monthly_due']:,.2f}€")
                print(f"     • Μήνες καθυστέρησης: {months_behind:.1f}")
                print(f"     • Χιλιοστά: {apt['mills']}")
                print()
        
        # 5. Ανάλυση δαπανών
        print("📊 5. ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ")
        print("-" * 50)
        
        expenses = Expense.objects.filter(building_id=building_id)
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"💰 Συνολικές δαπάνες: {total_expenses:,.2f}€")
        print(f"📋 Αριθμός δαπανών: {expenses.count()}")
        print()
        
        for expense in expenses.order_by('-date'):
            print(f"   • {expense.title}: {expense.amount:,.2f}€ ({expense.date})")
        
        print()
        
        # 6. Ανάλυση πληρωμών
        print("📊 6. ΑΝΑΛΥΣΗ ΠΛΗΡΩΜΩΝ")
        print("-" * 50)
        
        payments = Payment.objects.filter(apartment__building_id=building_id)
        total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"💰 Συνολικές πληρωμές: {total_payments:,.2f}€")
        print(f"📋 Αριθμός πληρωμών: {payments.count()}")
        print()
        
        # Πληρωμές ανά διαμέρισμα
        for apartment in apartments:
            apt_payments = payments.filter(apartment=apartment)
            apt_total = apt_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            print(f"   Διαμέρισμα {apartment.number}: {apt_total:,.2f}€ ({apt_payments.count()} πληρωμές)")
        
        print()
        
        # 7. Υπολογισμός αποθεματικού
        print("📊 7. ΥΠΟΛΟΓΙΣΜΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("-" * 50)
        
        # Χειροκίνητος υπολογισμός αποθεματικού
        monthly_reserve = building.reserve_fund_goal / building.reserve_fund_duration_months if building.reserve_fund_duration_months > 0 else 0
        
        print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal:,.2f}€")
        print(f"💰 Μηνιαία εισφορά: {monthly_reserve:,.2f}€")
        print(f"📅 Διάρκεια: {building.reserve_fund_duration_months} μήνες")
        print()
        
        # 8. Συνολική οικονομική κατάσταση
        print("📊 8. ΣΥΝΟΛΙΚΗ ΟΙΚΟΝΟΜΙΚΗ ΚΑΤΑΣΤΑΣΗ")
        print("-" * 50)
        
        total_apartment_balance = sum(apt['balance'] for apt in apartment_details)
        total_monthly_obligations = sum(apt['monthly_due'] for apt in apartment_details)
        
        print(f"💰 Συνολικό υπόλοιπο διαμερισμάτων: {total_apartment_balance:,.2f}€")
        print(f"📋 Συνολικές μηνιαίες οφειλές: {total_monthly_obligations:,.2f}€")
        print(f"🏦 Τρέχον αποθεματικό: {building.current_reserve:,.2f}€")
        print(f"📊 Συνολικές δαπάνες: {total_expenses:,.2f}€")
        print(f"💰 Συνολικές πληρωμές: {total_payments:,.2f}€")
        print()
        
        # Επιβεβαίωση υπολογισμών
        expected_balance = total_payments - total_expenses
        print(f"🔍 Επιβεβαίωση: Πληρωμές - Δαπάνες = {expected_balance:,.2f}€")
        print(f"🔍 Πραγματικό αποθεματικό: {building.current_reserve:,.2f}€")
        
        if abs(expected_balance - building.current_reserve) > Decimal('0.01'):
            print("⚠️ Προσοχή: Υπάρχει διαφορά μεταξύ αναμενόμενου και πραγματικού αποθεματικού!")
        else:
            print("✅ Τα υπολογισμοί είναι συνεπή")
        
        print()
        print("=" * 80)
        print("🏁 ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΑΝΑΛΥΣΗ")

if __name__ == "__main__":
    analyze_critical_apartments()
