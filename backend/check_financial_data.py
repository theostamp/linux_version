#!/usr/bin/env python3
"""
Script to check financial data for building ID 1 in February 2025
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
from financial.models import Payment, Expense
from django.db import models

def check_financial_data():
    with schema_context('demo'):
        # Get current month and year
        current_date = datetime.now()
        year = current_date.year
        month = current_date.month
        
        print("=== ΕΛΕΓΧΟΣ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ ===")
        print(f"Περίοδος: {month}/{year}")
        print()
        
        # Check buildings
        buildings = Building.objects.all()
        print(f"Πολυκατοικίες στη βάση: {buildings.count()}")
        
        for building in buildings:
            print(f"\n--- Πολυκατοικία ID: {building.id} ---")
            print(f"Διεύθυνση: {building.address}")
            print(f"Αριθμός διαμερισμάτων: {building.apartments_count}")
            print(f"Στόχος αποθεματικού: €{building.reserve_fund_goal or 0}")
            print(f"Διάρκεια αποθεματικού (μήνες): {building.reserve_fund_duration_months or 0}")
            print(f"Τρέχον αποθεματικό: €{building.current_reserve or 0}")
            print(f"Συνεισφορά ανά διαμέρισμα: €{building.reserve_contribution_per_apartment or 0}")
            
            # Check payments for this building
            payments = Payment.objects.filter(
                apartment__building=building,
                date__year=year,
                date__month=month
            )
            total_payments = payments.aggregate(total=models.Sum('amount'))['total'] or 0
            print(f"Εισπράξεις {month}/{year}: €{total_payments}")
            print(f"Αριθμός πληρωμών: {payments.count()}")
            
            # Check expenses for this building
            expenses = Expense.objects.filter(
                building=building,
                date__year=year,
                date__month=month
            )
            total_expenses = expenses.aggregate(total=models.Sum('amount'))['total'] or 0
            print(f"Δαπάνες {month}/{year}: €{total_expenses}")
            print(f"Αριθμός δαπανών: {expenses.count()}")
            
            # Check by category
            management_expenses = expenses.filter(category='management_fees').aggregate(total=models.Sum('amount'))['total'] or 0
            building_expenses = expenses.exclude(category='management_fees').aggregate(total=models.Sum('amount'))['total'] or 0
            print(f"  - Δαπάνες διαχείρισης: €{management_expenses}")
            print(f"  - Δαπάνες πολυκατοικίας: €{building_expenses}")
            
            # Calculate reserve fund target
            if building.reserve_fund_goal and building.reserve_fund_duration_months:
                reserve_target = float(building.reserve_fund_goal) / building.reserve_fund_duration_months
            else:
                reserve_target = float(building.reserve_contribution_per_apartment or 0) * building.apartments_count
            
            print(f"Στόχος αποθεματικού/μήνα: €{reserve_target}")
            
            # Calculate surplus
            surplus = total_payments - total_expenses
            surplus = max(0, surplus)
            print(f"Πλεόνασμα: €{surplus}")
            
            print("-" * 50)

if __name__ == "__main__":
    check_financial_data()
