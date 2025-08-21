#!/usr/bin/env python3
"""
Script to debug the obligations calculation
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment
from financial.services import FinancialDashboardService
from django.db.models import Sum

def debug_obligations_calculation():
    """Debug the obligations calculation"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ ΥΠΟΛΟΓΙΣΜΟΥ ΕΚΚΡΕΜΟΤΗΤΩΝ")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22, Αθήνα 115 28 (ID: {building_id})")
        print()
        
        # 1. Έλεγχος υπολοίπων διαμερισμάτων
        print("📊 1. ΥΠΟΛΟΙΠΑ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("-" * 50)
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        apartment_obligations = Decimal('0.00')
        
        for apartment in apartments:
            balance = apartment.current_balance or Decimal('0.00')
            if balance < 0:
                abs_balance = abs(balance)
                apartment_obligations += abs_balance
                print(f"   Διαμέρισμα {apartment.number}: {balance:,.2f}€ (οφειλή: {abs_balance:,.2f}€)")
            else:
                print(f"   Διαμέρισμα {apartment.number}: {balance:,.2f}€")
        
        print(f"\n💰 Συνολικές οφειλές διαμερισμάτων: {apartment_obligations:,.2f}€")
        print()
        
        # 2. Έλεγχος ανέκδοτων δαπανών
        print("📊 2. ΑΝΕΚΔΟΤΕΣ ΔΑΠΑΝΕΣ")
        print("-" * 50)
        
        pending_expenses = Expense.objects.filter(
            building_id=building_id,
            is_issued=False
        )
        
        pending_expenses_total = pending_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"📋 Αριθμός ανέκδοτων δαπανών: {pending_expenses.count()}")
        print(f"💰 Συνολικό ποσό ανέκδοτων δαπανών: {pending_expenses_total:,.2f}€")
        
        if pending_expenses.exists():
            print("\n📋 Λεπτομέρειες ανέκδοτων δαπανών:")
            for expense in pending_expenses:
                print(f"   • {expense.title}: {expense.amount:,.2f}€ ({expense.date})")
        else:
            print("   ✅ Δεν υπάρχουν ανέκδοτες δαπάνες")
        
        print()
        
        # 3. Υπολογισμός συνολικών εκκρεμοτήτων
        print("📊 3. ΥΠΟΛΟΓΙΣΜΟΣ ΣΥΝΟΛΙΚΩΝ ΕΚΚΡΕΜΟΤΗΤΩΝ")
        print("-" * 50)
        
        total_obligations = apartment_obligations + pending_expenses_total
        
        print(f"💰 Οφειλές διαμερισμάτων: {apartment_obligations:,.2f}€")
        print(f"💰 Ανέκδοτες δαπάνες: {pending_expenses_total:,.2f}€")
        print(f"💰 Συνολικές εκκρεμότητες: {total_obligations:,.2f}€")
        print()
        
        # 4. Έλεγχος FinancialDashboardService
        print("📊 4. ΕΛΕΓΧΟΣ FINANCIALDASHBOARDSERVICE")
        print("-" * 50)
        
        try:
            service = FinancialDashboardService(building_id)
            summary = service.get_summary()
            
            print(f"🔍 Service total_obligations: {summary.get('current_obligations', 0):,.2f}€")
            print(f"🔍 Service current_reserve: {summary.get('current_reserve', 0):,.2f}€")
            print(f"🔍 Service reserve_fund_goal: {summary.get('reserve_fund_goal', 0):,.2f}€")
            print(f"🔍 Service reserve_fund_monthly_target: {summary.get('reserve_fund_monthly_target', 0):,.2f}€")
            
        except Exception as e:
            print(f"❌ Σφάλμα στο FinancialDashboardService: {e}")
        
        print()
        
        # 5. Έλεγχος πληρωμών και δαπανών
        print("📊 5. ΕΛΕΓΧΟΣ ΠΛΗΡΩΜΩΝ ΚΑΙ ΔΑΠΑΝΩΝ")
        print("-" * 50)
        
        total_payments = Payment.objects.filter(
            apartment__building_id=building_id
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        total_expenses = Expense.objects.filter(
            building_id=building_id
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        current_reserve = total_payments - total_expenses
        
        print(f"💰 Συνολικές πληρωμές: {total_payments:,.2f}€")
        print(f"💰 Συνολικές δαπάνες: {total_expenses:,.2f}€")
        print(f"💰 Τρέχον αποθεματικό: {current_reserve:,.2f}€")
        print()
        
        # 6. Ανάλυση διαφοράς
        print("📊 6. ΑΝΑΛΥΣΗ ΔΙΑΦΟΡΑΣ")
        print("-" * 50)
        
        if total_obligations > 0:
            print(f"⚠️ Υπάρχουν εκκρεμότητες: {total_obligations:,.2f}€")
            
            if apartment_obligations > 0:
                print(f"   • Οφειλές διαμερισμάτων: {apartment_obligations:,.2f}€")
            
            if pending_expenses_total > 0:
                print(f"   • Ανέκδοτες δαπάνες: {pending_expenses_total:,.2f}€")
            
            print("\n🔧 Προτάσεις επιλύσεως:")
            print("   1. Εκδώστε τις ανέκδοτες δαπάνες")
            print("   2. Εισπράξτε τις οφειλές διαμερισμάτων")
            print("   3. Επαναυπολογίστε τα υπόλοιπα")
        else:
            print("✅ Δεν υπάρχουν εκκρεμότητες")
        
        print()
        print("=" * 60)
        print("🏁 ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΕΛΕΓΧΟΣ")

if __name__ == "__main__":
    debug_obligations_calculation()


