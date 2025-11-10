#!/usr/bin/env python3
"""
Script για την προσθήκη πραγματικών δαπανών Αυγούστου 2025
στο κτίριο Αραχώβης 12
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date
from django.db.models import Sum

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense

def add_august_2025_expenses():
    """
    Προσθήκη πραγματικών δαπανών για τον Αύγουστο 2025
    """
    print("💰 Ξεκινάει η προσθήκη δαπανών Αυγούστου 2025...")
    
    with schema_context('demo'):
        # Εύρεση του κτιρίου Αραχώβης 12
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
        
        # Έλεγχος υπαρχόντων δαπανών Αυγούστου 2025
        august_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=8
        )
        
        print(f"📊 Υπάρχουσες δαπάνες Αυγούστου 2025: {august_expenses.count()}")
        
        if august_expenses.exists():
            print("📋 Λίστα υπαρχόντων δαπανών:")
            for expense in august_expenses:
                print(f"   - {expense.title}: {expense.amount}€ ({expense.date})")
        
        # Προσθήκη πραγματικών δαπανών
        august_expenses_data = [
            {
                'title': 'Διαχειριστικά έξοδα Αυγούστου 2025',
                'amount': Decimal('120.00'),
                'category': 'management',
                'date': date(2025, 8, 15),
                'notes': 'Διαχειριστικά έξοδα για τον Αύγουστο 2025'
            },
            {
                'title': 'Ηλεκτρική ενέργεια κοινοχρήστων',
                'amount': Decimal('80.00'),
                'category': 'electricity',
                'date': date(2025, 8, 20),
                'notes': 'Κόστος ηλεκτρικής ενέργειας για κοινοχρήστους χώρους'
            },
            {
                'title': 'Καθαρισμός κτιρίου',
                'amount': Decimal('60.00'),
                'category': 'cleaning',
                'date': date(2025, 8, 25),
                'notes': 'Κόστος καθαρισμού κοινοχρήστων χώρων'
            },
            {
                'title': 'Συντήρηση ανελκυστήρα',
                'amount': Decimal('40.00'),
                'category': 'maintenance',
                'date': date(2025, 8, 28),
                'notes': 'Συντήρηση και έλεγχος ανελκυστήρα'
            }
        ]
        
        print(f"\n📝 Προσθήκη {len(august_expenses_data)} νέων δαπανών...")
        
        total_added = Decimal('0.00')
        for expense_data in august_expenses_data:
            # Έλεγχος αν υπάρχει ήδη η δαπάνη
            existing = Expense.objects.filter(
                building=building,
                title=expense_data['title'],
                date=expense_data['date']
            ).first()
            
            if existing:
                print(f"⚠️  Η δαπάνη '{expense_data['title']}' υπάρχει ήδη")
                continue
            
            # Δημιουργία νέας δαπάνης
            expense = Expense.objects.create(
                building=building,
                title=expense_data['title'],
                amount=expense_data['amount'],
                category=expense_data['category'],
                date=expense_data['date'],
                notes=expense_data['notes']
            )
            
            print(f"✅ Προστέθηκε: {expense.title} - {expense.amount}€")
            total_added += expense.amount
        
        print(f"\n💰 Συνολικό ποσό που προστέθηκε: {total_added}€")
        
        # Επιβεβαίωση
        final_august_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=8
        )
        
        total_august = final_august_expenses.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        print("\n📊 ΕΠΙΒΕΒΑΙΩΣΗ:")
        print(f"📋 Συνολικές δαπάνες Αυγούστου 2025: {total_august}€")
        print(f"📝 Αριθμός δαπανών: {final_august_expenses.count()}")
        
        print("\n📋 Λίστα όλων των δαπανών Αυγούστου:")
        for expense in final_august_expenses.order_by('date'):
            print(f"   - {expense.date.strftime('%d/%m/%Y')}: {expense.title} - {expense.amount}€")

if __name__ == "__main__":
    try:
        add_august_2025_expenses()
        print("\n🎉 Η προσθήκη δαπανών ολοκληρώθηκε επιτυχώς!")
    except Exception as e:
        print(f"\n❌ Σφάλμα κατά την προσθήκη: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
