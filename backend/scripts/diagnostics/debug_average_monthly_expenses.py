#!/usr/bin/env python3
"""
Script για debugging του average_monthly_expenses
"""

import os
import sys
import django
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense
from financial.services import FinancialDashboardService

def debug_average_monthly_expenses():
    """Debug για το average_monthly_expenses"""
    
    print("🔍 DEBUG: AVERAGE_MONTHLY_EXPENSES")
    print("=" * 60)
    
    with schema_context('demo'):
        # Εύρεση κτιρίου Αραχώβης 12
        building = Building.objects.filter(name__icontains='Αραχώβης').first()
        
        if not building:
            print("❌ Δεν βρέθηκε το κτίριο Αραχώβης 12")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        
        # Έλεγχος τρέχοντος μήνα
        current_month = datetime.now().month
        current_year = datetime.now().year
        print(f"\n📅 ΤΡΕΧΩΝ ΜΗΝΑΣ: {current_year}-{current_month:02d}")
        
        # Έλεγχος δαπανών διαχείρισης
        management_fee_per_apartment = building.management_fee_per_apartment or 0
        apartments = building.apartments.all()
        apartment_count = apartments.count()
        total_management_cost = management_fee_per_apartment * apartment_count
        
        print("\n💼 ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ:")
        print(f"💰 Αμοιβή ανά διαμέρισμα: {management_fee_per_apartment:,.2f}€")
        print(f"🏠 Αριθμός διαμερισμάτων: {apartment_count}")
        print(f"💰 Συνολικό κόστος διαχείρισης: {total_management_cost:,.2f}€")
        
        # Έλεγχος δαπανών τρέχοντος μήνα
        expenses = Expense.objects.filter(
            building=building,
            date__year=current_year,
            date__month=current_month
        )
        
        total_expenses_this_month = sum(expense.amount for expense in expenses)
        print("\n💸 ΔΑΠΑΝΕΣ ΤΡΕΧΟΝΤΟΣ ΜΗΝΑ:")
        print(f"📊 Αριθμός δαπανών: {expenses.count()}")
        print(f"💰 Συνολικό ποσό δαπανών: {total_expenses_this_month:,.2f}€")
        
        # Υπολογισμός average_monthly_expenses όπως στο backend
        average_monthly_expenses = total_expenses_this_month + total_management_cost
        print("\n📊 ΥΠΟΛΟΓΙΣΜΟΣ AVERAGE_MONTHLY_EXPENSES:")
        print(f"💸 Δαπάνες τρέχοντος μήνα: {total_expenses_this_month:,.2f}€")
        print(f"💼 Δαπάνες διαχείρισης: {total_management_cost:,.2f}€")
        print(f"📊 AVERAGE_MONTHLY_EXPENSES: {average_monthly_expenses:,.2f}€")
        
        # Έλεγχος με το FinancialDashboardService
        print("\n🔍 ΕΛΕΓΧΟΣ ΜΕ FINANCIALDASHBOARDSERVICE:")
        dashboard = FinancialDashboardService(building.id)
        summary = dashboard.get_summary()
        
        print(f"📊 API average_monthly_expenses: {summary.get('average_monthly_expenses', 0):,.2f}€")
        print(f"📊 API total_management_cost: {summary.get('total_management_cost', 0):,.2f}€")
        
        # Έλεγχος αν ταιριάζουν
        api_average = summary.get('average_monthly_expenses', 0)
        if abs(float(api_average) - float(average_monthly_expenses)) < 0.01:
            print("✅ Τα average_monthly_expenses είναι σωστά!")
        else:
            print("❌ Διαφορά στα average_monthly_expenses!")
            print(f"   Υπολογισμένο: {average_monthly_expenses:,.2f}€")
            print(f"   API: {api_average:,.2f}€")
        
        print("\n" + "=" * 60)
        print("🔍 ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ!")

if __name__ == "__main__":
    debug_average_monthly_expenses()
