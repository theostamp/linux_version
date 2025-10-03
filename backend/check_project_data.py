#!/usr/bin/env python3
"""
🔍 Script για έλεγχο δεδομένων έργου
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
from projects.models import Project

def check_project_data():
    """Έλεγχος δεδομένων έργου"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΔΕΔΟΜΕΝΩΝ ΕΡΓΟΥ")
    print("=" * 70)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Έλεγχος έργων
        projects = Project.objects.filter(building=building)
        print(f"🔧 Σύνολο έργων: {projects.count()}")
        print()
        
        if projects.exists():
            print("📋 ΕΡΓΑ:")
            print("-" * 50)
            
            for project in projects:
                print(f"📋 {project.title}")
                print(f"   💰 Εκτιμώμενο κόστος: {project.estimated_cost or 'N/A'}€")
                print(f"   💰 Τελικό κόστος: {project.final_cost or 'N/A'}€")
                print(f"   📅 Κατάσταση: {project.get_status_display()}")
                print(f"   💳 Δόσεις: {project.installments or 'N/A'}")
                print(f"   💰 Προκαταβολή: {project.advance_payment or 'N/A'}€")
                print(f"   📝 Όροι πληρωμής: {project.payment_terms or 'N/A'}")
                print(f"   🔗 Συνδεδεμένη δαπάνη: {project.linked_expense}")
                print()
        
        # Έλεγχος δαπανών έργου
        project_expenses = Expense.objects.filter(
            building=building,
            category='project'
        ).order_by('date')
        
        print(f"💸 Δαπάνες έργου: {project_expenses.count()}")
        print()
        
        if project_expenses.exists():
            print("📋 ΔΑΠΑΝΕΣ ΕΡΓΟΥ:")
            print("-" * 50)
            
            for expense in project_expenses:
                print(f"📅 {expense.date.strftime('%Y-%m-%d')} | {expense.title}")
                print(f"   💰 Ποσό: {expense.amount:,.2f}€")
                print(f"   📂 Κατηγορία: {expense.category}")
                print(f"   🔗 Συνδεδεμένα έργα: {expense.linked_projects.count()}")
                
                # Έλεγχος συνδεδεμένων έργων
                linked_projects = expense.linked_projects.all()
                for project in linked_projects:
                    print(f"      - {project.title} (Δόσεις: {project.installments})")
                print()
        
        # Έλεγχος δαπανών με installment στο όνομα
        installment_expenses = Expense.objects.filter(
            building=building,
            title__icontains='δόση'
        ).order_by('date')
        
        print(f"💳 Δαπάνες με 'δόση' στο όνομα: {installment_expenses.count()}")
        print()
        
        if installment_expenses.exists():
            print("📋 ΔΑΠΑΝΕΣ ΜΕ ΔΟΣΕΣ:")
            print("-" * 50)
            
            for expense in installment_expenses:
                print(f"📅 {expense.date.strftime('%Y-%m-%d')} | {expense.title}")
                print(f"   💰 Ποσό: {expense.amount:,.2f}€")
                print(f"   📂 Κατηγορία: {expense.category}")
                print()
        
        # Ανάλυση ημερομηνιών δόσεων
        print("📅 ΑΝΑΛΥΣΗ ΗΜΕΡΟΜΗΝΙΩΝ ΔΟΣΕΩΝ:")
        print("-" * 50)
        
        # Ομαδοποίηση δαπανών έργου ανά μήνα
        monthly_expenses = {}
        for expense in project_expenses:
            month_key = f"{expense.date.year}-{expense.date.month:02d}"
            if month_key not in monthly_expenses:
                monthly_expenses[month_key] = []
            monthly_expenses[month_key].append(expense)
        
        for month_key in sorted(monthly_expenses.keys()):
            expenses = monthly_expenses[month_key]
            print(f"📅 {month_key}: {len(expenses)} δαπάνες")
            for expense in expenses:
                print(f"   - {expense.title}: {expense.amount:,.2f}€")
        
        print("\n" + "=" * 70)
        print("✅ Ο έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    check_project_data()
