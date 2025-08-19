#!/usr/bin/env python3
"""
Script to check expense status and understand the is_issued logic
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building
from django.db.models import Sum
from decimal import Decimal

def check_expense_status():
    """Check expense status and understand the is_issued logic"""
    
    with schema_context('demo'):
        building_id = 4  # Αλκμάνος 22, Αθήνα 115 28
        building = Building.objects.get(id=building_id)
        
        print(f"🏢 Building: {building.name}")
        print()
        
        # 1. Όλες οι δαπάνες
        print("📊 1. ΌΛΕΣ ΟΙ ΔΑΠΑΝΕΣ")
        print("-" * 50)
        
        all_expenses = Expense.objects.filter(building_id=building_id)
        total_all = all_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"📋 Συνολικές δαπάνες: {all_expenses.count()}")
        print(f"💰 Συνολικό ποσό: {total_all:,.2f}€")
        print()
        
        # 2. Εκδομένες δαπάνες (is_issued=True)
        print("📊 2. ΕΚΔΟΜΕΝΕΣ ΔΑΠΑΝΕΣ (is_issued=True)")
        print("-" * 50)
        
        issued_expenses = Expense.objects.filter(
            building_id=building_id,
            is_issued=True
        )
        total_issued = issued_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"📋 Αριθμός εκδομένων: {issued_expenses.count()}")
        print(f"💰 Συνολικό ποσό: {total_issued:,.2f}€")
        
        if issued_expenses.exists():
            print("\n📋 Λεπτομέρειες εκδομένων δαπανών:")
            for expense in issued_expenses:
                print(f"   • {expense.title}: {expense.amount:,.2f}€ ({expense.date})")
        print()
        
        # 3. Ανέκδοτες δαπάνες (is_issued=False)
        print("📊 3. ΑΝΕΚΔΟΤΕΣ ΔΑΠΑΝΕΣ (is_issued=False)")
        print("-" * 50)
        
        unissued_expenses = Expense.objects.filter(
            building_id=building_id,
            is_issued=False
        )
        total_unissued = unissued_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"📋 Αριθμός ανέκδοτων: {unissued_expenses.count()}")
        print(f"💰 Συνολικό ποσό: {total_unissued:,.2f}€")
        
        if unissued_expenses.exists():
            print("\n📋 Λεπτομέρειες ανέκδοτων δαπανών:")
            for expense in unissued_expenses:
                print(f"   • {expense.title}: {expense.amount:,.2f}€ ({expense.date})")
                print(f"     - Κατηγορία: {expense.category}")
                print(f"     - Ημερομηνία: {expense.date}")
                print(f"     - Εκδομένη: {expense.is_issued}")
                print(f"     - Περιγραφή: {expense.title}")
        print()
        
        # 4. Ανάλυση προβλήματος
        print("📊 4. ΑΝΑΛΥΣΗ ΠΡΟΒΛΗΜΑΤΟΣ")
        print("-" * 50)
        
        print("🔍 Ερωτήσεις:")
        print("   1. Γιατί υπάρχουν ανέκδοτες δαπάνες;")
        print("   2. Πώς γίνεται μια δαπάνη εκδομένη;")
        print("   3. Πρέπει να υπάρχει διαφορά;")
        print()
        
        # 5. Προτάσεις
        print("📊 5. ΠΡΟΤΑΣΕΙΣ")
        print("-" * 50)
        
        print("💡 Πιθανές λύσεις:")
        print("   1. Αφαίρεση της λογικής is_issued")
        print("   2. Όλες οι δαπάνες είναι ενεργές")
        print("   3. Απλοποίηση του υπολογισμού")
        print()
        
        # 6. Επιπτώσεις
        print("📊 6. ΕΠΙΠΤΩΣΕΙΣ")
        print("-" * 50)
        
        print("📈 Τι θα αλλάξει:")
        print("   • Συνολικές Υποχρεώσεις = Οφειλές διαμερισμάτων")
        print("   • Δεν θα υπάρχουν ανέκδοτες δαπάνες")
        print("   • Απλοποίηση του dashboard")
        print("   • Καλύτερη κατανόηση από τους χρήστες")

if __name__ == "__main__":
    check_expense_status()
