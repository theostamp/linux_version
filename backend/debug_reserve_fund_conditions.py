#!/usr/bin/env python3
"""
Script για έλεγχο συνθηκών αποθεματικού
"""

import os
import sys
import django
from decimal import Decimal
from django.db.models import Sum

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Transaction

def debug_reserve_fund_conditions():
    """Έλεγχος συνθηκών αποθεματικού"""
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ ΣΥΝΘΗΚΩΝ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("=" * 60)
        
        # 1. Βάση δεδομένων κτιρίου
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"🏦 Στόχος αποθεματικού: {building.reserve_fund_goal}€")
        print(f"📅 Διάρκεια αποθεματικού: {building.reserve_fund_duration_months} μήνες")
        print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        print()
        
        # 2. Έλεγχος εκκρεμοτήτων
        print("💰 ΕΛΕΓΧΟΣ ΕΚΚΡΕΜΟΤΗΤΩΝ")
        apartments = Apartment.objects.filter(building_id=building.id)
        
        total_obligations = Decimal('0.00')
        for apartment in apartments:
            balance = apartment.current_balance or Decimal('0.00')
            if balance < 0:
                total_obligations += abs(balance)
                print(f"🏠 {apartment.number}: {balance}€ (οφειλή)")
            else:
                print(f"🏠 {apartment.number}: {balance}€ (ενήμερο)")
        
        print(f"📊 Συνολικές εκκρεμότητες: {total_obligations}€")
        print()
        
        # 3. Έλεγχος ιστορικών υπολοίπων
        print("📊 ΕΛΕΓΧΟΣ ΙΣΤΟΡΙΚΩΝ ΥΠΟΛΟΙΠΩΝ")
        for apartment in apartments:
            # Υπολογισμός ιστορικού υπολοίπου
            total_payments = Transaction.objects.filter(
                apartment=apartment,
                type__in=['common_expense_payment', 'payment_received', 'refund']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            total_charges = Transaction.objects.filter(
                apartment=apartment,
                type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                         'interest_charge', 'penalty_charge']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            historical_balance = total_payments - total_charges
            print(f"🏠 {apartment.number}: {historical_balance}€ (ιστορικό)")
        
        print()
        
        # 4. Έλεγχος συνθηκών
        print("🔍 ΕΛΕΓΧΟΣ ΣΥΝΘΗΚΩΝ")
        
        # Συνθήκη 1: reserve_fund_start_date
        if building.reserve_fund_start_date:
            print("✅ reserve_fund_start_date υπάρχει")
        else:
            print("❌ reserve_fund_start_date δεν υπάρχει")
        
        # Συνθήκη 2: εκκρεμότητες
        if total_obligations > 0:
            print("❌ Υπάρχουν εκκρεμότητες - δεν συλλέγεται αποθεματικό")
        else:
            print("✅ Δεν υπάρχουν εκκρεμότητες - συλλέγεται αποθεματικό")
        
        # Συνθήκη 3: monthly_target > 0
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"✅ monthly_target: {monthly_target}€")
        else:
            print("❌ Δεν μπορεί να υπολογιστεί monthly_target")
        
        print()
        
        # 5. Συμπέρασμα
        print("📋 ΣΥΜΠΕΡΑΣΜΑ")
        if not building.reserve_fund_start_date:
            print("❌ Το αποθεματικό δεν συλλέγεται επειδή δεν έχει οριστεί ημερομηνία έναρξης")
        elif total_obligations > 0:
            print("❌ Το αποθεματικό δεν συλλέγεται επειδή υπάρχουν εκκρεμότητες")
        else:
            print("✅ Το αποθεματικό θα συλλέγεται κανονικά")
        
        print("\n" + "=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΕΛΕΓΧΟΣ")

if __name__ == "__main__":
    debug_reserve_fund_conditions()
