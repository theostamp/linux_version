#!/usr/bin/env python3
"""
🔍 Script για έλεγχο όλων των δαπανών αποθεματικού
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
from buildings.models import Building
from financial.models import Expense

def check_reserve_fund_expenses():
    """Έλεγχος όλων των δαπανών αποθεματικού"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΔΑΠΑΝΩΝ ΑΠΟΘΕΜΑΤΙΚΟΥ")
    print("=" * 70)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Έλεγχος όλων των δαπανών αποθεματικού
        reserve_expenses = Expense.objects.filter(
            building=building,
            category='reserve_fund'
        ).order_by('date')
        
        print(f"💸 Σύνολο δαπανών αποθεματικού: {reserve_expenses.count()}")
        print()
        
        if reserve_expenses.exists():
            print("📋 ΔΑΠΑΝΕΣ ΑΠΟΘΕΜΑΤΙΚΟΥ:")
            print("-" * 50)
            
            total_amount = 0
            for expense in reserve_expenses:
                print(f"📅 {expense.date.strftime('%Y-%m-%d')} | {expense.description} | €{expense.amount:,.2f}")
                total_amount += expense.amount
            
            print("-" * 50)
            print(f"💰 ΣΥΝΟΛΟ: €{total_amount:,.2f}")
        else:
            print("❌ Δεν υπάρχουν δαπάνες αποθεματικού")
        
        print()
        
        # Έλεγχος δαπανών ανά μήνα για το τρέχον έτος
        current_year = datetime.now().year
        print(f"📅 ΔΑΠΑΝΕΣ ΑΝΑ ΜΗΝΑ {current_year}:")
        print("-" * 50)
        
        for month in range(1, 13):
            month_expenses = Expense.objects.filter(
                building=building,
                category='reserve_fund',
                date__year=current_year,
                date__month=month
            )
            
            month_name = datetime(current_year, month, 1).strftime('%B')
            if month_expenses.exists():
                total_month = sum(expense.amount for expense in month_expenses)
                print(f"{month_name:>10}: {month_expenses.count()} δαπάνες, €{total_month:,.2f}")
            else:
                print(f"{month_name:>10}: 0 δαπάνες")
        
        print()
        
        # Έλεγχος ρυθμίσεων κτιρίου
        print("🔧 ΡΥΘΜΙΣΕΙΣ ΚΤΙΡΙΟΥ:")
        print("-" * 50)
        print(f"💰 Τρέχον αποθεματικό: {building.current_reserve:,.2f}€")
        print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal:,.2f}€")
        print(f"📅 Διάρκεια αποθεματικού: {building.reserve_fund_duration_months} μήνες")
        print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        print(f"📅 Ημερομηνία ολοκλήρωσης: {building.reserve_fund_target_date}")
        print(f"⚡ Προτεραιότητα: {building.reserve_fund_priority}")
        
        print()
        
        # Προτάσεις διόρθωσης
        print("🔧 ΠΡΟΤΑΣΕΙΣ ΔΙΟΡΘΩΣΗΣ:")
        print("-" * 50)
        
        if building.reserve_fund_goal == 0:
            print("1. Ορισμός στόχου αποθεματικού (π.χ. 5,000€)")
        
        if building.reserve_fund_duration_months == 0:
            print("2. Ορισμός διάρκειας αποθεματικού (π.χ. 12 μήνες)")
        
        if building.reserve_fund_start_date is None:
            print("3. Ορισμός ημερομηνίας έναρξης (π.χ. 2025-10-01)")
        
        if building.reserve_fund_target_date is None and building.reserve_fund_start_date and building.reserve_fund_duration_months:
            from datetime import timedelta
            target_date = building.reserve_fund_start_date + timedelta(days=building.reserve_fund_duration_months * 30)
            print(f"4. Ορισμός ημερομηνίας ολοκλήρωσης (π.χ. {target_date})")
        
        print("\n" + "=" * 70)
        print("✅ Ο έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    check_reserve_fund_expenses()
