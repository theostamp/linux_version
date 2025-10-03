#!/usr/bin/env python3
"""
🔍 Script για έλεγχο δόσεων έργου στις δαπάνες
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

def check_work_installments():
    """Έλεγχος δόσεων έργου στις δαπάνες"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΔΟΣΕΩΝ ΕΡΓΟΥ ΣΤΙΣ ΔΑΠΑΝΕΣ")
    print("=" * 70)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Έλεγχος όλων των δαπανών με κατηγορία 'project_installment'
        project_installments = Expense.objects.filter(
            building=building,
            category='project_installment'
        ).order_by('date')
        
        print(f"🔧 Σύνολο δόσεων έργου: {project_installments.count()}")
        print()
        
        if project_installments.exists():
            print("📋 ΔΟΣΕΣ ΕΡΓΟΥ:")
            print("-" * 50)
            
            total_amount = 0
            for expense in project_installments:
                print(f"📅 {expense.date.strftime('%Y-%m-%d')} | {expense.description} | €{expense.amount:,.2f}")
                total_amount += expense.amount
            
            print("-" * 50)
            print(f"💰 ΣΥΝΟΛΟ: €{total_amount:,.2f}")
        else:
            print("❌ Δεν υπάρχουν δόσεις έργου")
        
        print()
        
        # Έλεγχος δόσεων ανά μήνα για το 2024
        print("📅 ΔΟΣΕΣ ΕΡΓΟΥ ΑΝΑ ΜΗΝΑ 2024:")
        print("-" * 50)
        
        for month in range(1, 13):
            month_installments = Expense.objects.filter(
                building=building,
                category='project_installment',
                date__year=2024,
                date__month=month
            )
            
            month_name = datetime(2024, month, 1).strftime('%B')
            if month_installments.exists():
                total_month = sum(expense.amount for expense in month_installments)
                print(f"{month_name:>10}: {month_installments.count()} δόσεις, €{total_month:,.2f}")
                for expense in month_installments:
                    print(f"              - {expense.description}: €{expense.amount:,.2f}")
            else:
                print(f"{month_name:>10}: 0 δόσεις")
        
        print()
        
        # Ειδικός έλεγχος για Οκτώβριο και Νοέμβριο
        print("🔍 ΕΙΔΙΚΟΣ ΕΛΕΓΧΟΣ ΟΚΤΩΒΡΙΟΥ ΚΑΙ ΝΟΕΜΒΡΙΟΥ:")
        print("-" * 50)
        
        october_installments = Expense.objects.filter(
            building=building,
            category='project_installment',
            date__year=2024,
            date__month=10
        )
        
        november_installments = Expense.objects.filter(
            building=building,
            category='project_installment',
            date__year=2024,
            date__month=11
        )
        
        print(f"📅 Οκτώβριος 2024: {october_installments.count()} δόσεις")
        for expense in october_installments:
            print(f"   - {expense.date} | {expense.description} | €{expense.amount:,.2f}")
        
        print(f"📅 Νοέμβριος 2024: {november_installments.count()} δόσεις")
        for expense in november_installments:
            print(f"   - {expense.date} | {expense.description} | €{expense.amount:,.2f}")
        
        print()
        
        # Έλεγχος όλων των δαπανών για να δούμε αν υπάρχουν με άλλη κατηγορία
        print("🔍 ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΔΑΠΑΝΩΝ ΓΙΑ ΕΡΓΑ:")
        print("-" * 50)
        
        all_expenses = Expense.objects.filter(
            building=building,
            date__year=2024
        ).order_by('date')
        
        print(f"💸 Σύνολο δαπανών 2024: {all_expenses.count()}")
        print()
        
        # Ομαδοποίηση ανά κατηγορία
        categories = {}
        for expense in all_expenses:
            category = expense.category or 'no_category'
            if category not in categories:
                categories[category] = []
            categories[category].append(expense)
        
        for category, expenses in categories.items():
            print(f"📂 Κατηγορία '{category}': {len(expenses)} δαπάνες")
            for expense in expenses:
                print(f"   - {expense.date} | {expense.description} | €{expense.amount:,.2f}")
        
        print("\n" + "=" * 70)
        print("✅ Ο έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    check_work_installments()
