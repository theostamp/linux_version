#!/usr/bin/env python3
"""
Script για δημιουργία δαπανών προηγούμενων μηνών
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building
from decimal import Decimal
from datetime import date

def create_previous_expenses():
    """Δημιουργία δαπανών προηγούμενων μηνών"""
    
    with schema_context('demo'):
        print("📅 Δημιουργία Δαπανών Προηγούμενων Μηνών")
        print("=" * 50)
        
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        
        # 1. Δημιουργία δαπανών για Ιούλιο 2025
        print(f"\n📅 Ιούλιος 2025:")
        
        july_expenses = [
            {
                'title': 'ΔΕΗ Κοινοχρήστων - Ιούλιος 2025',
                'amount': Decimal('150.00'),
                'date': date(2025, 7, 15),
                'category': 'electricity_common'
            },
            {
                'title': 'Νερό Κοινοχρήστων - Ιούλιος 2025',
                'amount': Decimal('80.00'),
                'date': date(2025, 7, 20),
                'category': 'water_common'
            },
            {
                'title': 'Καθαρισμός Κοινοχρήστων - Ιούλιος 2025',
                'amount': Decimal('120.00'),
                'date': date(2025, 7, 25),
                'category': 'cleaning'
            }
        ]
        
        for expense_data in july_expenses:
            expense = Expense.objects.create(
                building=building,
                title=expense_data['title'],
                amount=expense_data['amount'],
                date=expense_data['date'],
                category=expense_data['category'],
                expense_type='regular',
                distribution_type='by_participation_mills',
                notes=f"Δαπάνη {expense_data['date'].strftime('%B %Y')}"
            )
            print(f"   ✅ Δημιουργήθηκε: {expense.title} - €{expense.amount}")
        
        # 2. Δημιουργία δαπανών για Αύγουστο 2025
        print(f"\n📅 Αύγουστος 2025:")
        
        august_expenses = [
            {
                'title': 'ΔΕΗ Κοινοχρήστων - Αύγουστος 2025',
                'amount': Decimal('180.00'),
                'date': date(2025, 8, 15),
                'category': 'electricity_common'
            },
            {
                'title': 'Νερό Κοινοχρήστων - Αύγουστος 2025',
                'amount': Decimal('90.00'),
                'date': date(2025, 8, 20),
                'category': 'water_common'
            },
            {
                'title': 'Καθαρισμός Κοινοχρήστων - Αύγουστος 2025',
                'amount': Decimal('120.00'),
                'date': date(2025, 8, 25),
                'category': 'cleaning'
            },
            {
                'title': 'Συντήρηση Ανελκυστήρα - Αύγουστος 2025',
                'amount': Decimal('300.00'),
                'date': date(2025, 8, 30),
                'category': 'elevator_maintenance'
            }
        ]
        
        for expense_data in august_expenses:
            expense = Expense.objects.create(
                building=building,
                title=expense_data['title'],
                amount=expense_data['amount'],
                date=expense_data['date'],
                category=expense_data['category'],
                expense_type='regular',
                distribution_type='by_participation_mills',
                notes=f"Δαπάνη {expense_data['date'].strftime('%B %Y')}"
            )
            print(f"   ✅ Δημιουργήθηκε: {expense.title} - €{expense.amount}")
        
        # 3. Υπολογισμός συνολικών δαπανών
        july_total = sum(exp['amount'] for exp in july_expenses)
        august_total = sum(exp['amount'] for exp in august_expenses)
        total_previous = july_total + august_total
        
        print(f"\n💰 Συνολικό Ποσό:")
        print(f"   • Ιούλιος 2025: €{july_total}")
        print(f"   • Αύγουστος 2025: €{august_total}")
        print(f"   • Σύνολο προηγούμενων: €{total_previous}")
        
        # 4. Έλεγχος δαπανών
        all_expenses = Expense.objects.filter(building=building).order_by('date')
        print(f"\n📊 Σύνολο Δαπανών: {all_expenses.count()}")
        
        for expense in all_expenses:
            print(f"   • {expense.title}: €{expense.amount} ({expense.date})")
        
        print(f"\n✅ Ολοκληρώθηκε η δημιουργία δαπανών προηγούμενων μηνών!")
        print(f"💡 Τώρα θα πρέπει να εμφανίζονται παλαιότερες οφειλές στη 'Κατάσταση Διαμερισμάτων'")

if __name__ == "__main__":
    create_previous_expenses()
