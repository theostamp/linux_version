#!/usr/bin/env python3
"""
Script to check the difference between totalPendingAmount and current_obligations
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
from apartments.models import Apartment
from buildings.models import Building
from financial.models import Expense, Payment
from django.db.models import Sum
from decimal import Decimal

def check_obligations_difference():
    """Check the difference between totalPendingAmount and current_obligations"""
    
    with schema_context('demo'):
        building_id = 4  # Αλκμάνος 22, Αθήνα 115 28
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building=building)
        
        print(f"🏢 Building: {building.name}")
        print(f"📊 Total apartments: {apartments.count()}")
        print()
        
        # 1. Υπολογισμός current_obligations (backend API)
        print("📊 1. CURRENT_OBLIGATIONS (Backend API)")
        print("-" * 50)
        
        # Συνολικές οφειλές: αρνητικά υπόλοιπα
        apartment_obligations = sum(
            abs(apt.current_balance) for apt in apartments 
            if apt.current_balance and apt.current_balance < 0
        )
        
        # Ανέκδοτες δαπάνες που δεν έχουν χρεωθεί ακόμα στα διαμερίσματα
        pending_expenses_all = Expense.objects.filter(
            building_id=building_id,
            is_issued=False
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Συνολικές υποχρεώσεις = Υφιστάμενες οφειλές + Ανέκδοτες δαπάνες
        current_obligations = apartment_obligations + pending_expenses_all
        
        print(f"💰 Οφειλές διαμερισμάτων: {apartment_obligations:,.2f}€")
        print(f"💰 Ανέκδοτες δαπάνες: {pending_expenses_all:,.2f}€")
        print(f"💰 Current obligations: {current_obligations:,.2f}€")
        print()
        
        # 2. Υπολογισμός totalPendingAmount (frontend analytics)
        print("📊 2. TOTALPENDINGAMOUNT (Frontend Analytics)")
        print("-" * 50)
        
        # Αυτό υπολογίζεται από το frontend βάσει των shares
        # Ας δούμε τι shares θα είχε το frontend
        from financial.services import CommonExpenseCalculator
        
        calculator = CommonExpenseCalculator(building_id)
        shares = calculator.calculate_shares()
        
        total_pending_amount = 0
        for apartment_id, share_data in shares.items():
            apartment = Apartment.objects.get(id=apartment_id)
            total_due = share_data.get('total_due', 0)
            
            # Frontend logic: if total_due < 0, add to pending amount
            if total_due < 0:
                total_pending_amount += abs(total_due)
                print(f"   Διαμέρισμα {apartment.number}: {total_due:,.2f}€ → +{abs(total_due):,.2f}€")
        
        print(f"💰 Total pending amount: {total_pending_amount:,.2f}€")
        print()
        
        # 3. Σύγκριση
        print("📊 3. ΣΥΓΚΡΙΣΗ")
        print("-" * 50)
        
        difference = current_obligations - total_pending_amount
        print(f"💰 Current obligations: {current_obligations:,.2f}€")
        print(f"💰 Total pending amount: {total_pending_amount:,.2f}€")
        print(f"💰 Διαφορά: {difference:,.2f}€")
        print()
        
        # 4. Ανάλυση ανέκδοτων δαπανών
        print("📊 4. ΑΝΑΛΥΣΗ ΑΝΕΚΔΟΤΩΝ ΔΑΠΑΝΩΝ")
        print("-" * 50)
        
        pending_expenses = Expense.objects.filter(
            building_id=building_id,
            is_issued=False
        )
        
        print(f"📋 Αριθμός ανέκδοτων δαπανών: {pending_expenses.count()}")
        
        if pending_expenses.exists():
            print("\n📋 Λεπτομέρειες ανέκδοτων δαπανών:")
            for expense in pending_expenses:
                print(f"   • {expense.title}: {expense.amount:,.2f}€ ({expense.date})")
        else:
            print("   ✅ Δεν υπάρχουν ανέκδοτες δαπάνες")
        
        print()
        
        # 5. Συμπέρασμα
        print("📊 5. ΣΥΜΠΕΡΑΣΜΑ")
        print("-" * 50)
        
        if abs(difference) < 0.01:
            print("✅ Οι τιμές ταιριάζουν!")
        else:
            print("❌ Υπάρχει διαφορά!")
            print(f"   Η διαφορά είναι: {difference:,.2f}€")
            
            if difference > 0:
                print("   Το current_obligations είναι μεγαλύτερο")
                print("   Αυτό σημαίνει ότι υπάρχουν ανέκδοτες δαπάνες")
            else:
                print("   Το totalPendingAmount είναι μεγαλύτερο")
                print("   Αυτό σημαίνει ότι το frontend υπολογίζει διαφορετικά")

if __name__ == "__main__":
    check_obligations_difference()
