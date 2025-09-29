#!/usr/bin/env python3
"""
Test script για το κτίριο Αραχώβης 12
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment
from django_tenants.utils import schema_context

def test_araxovis_building():
    """Test για το κτίριο Αραχώβης 12"""
    print("🧪 TEST: Κτίριο Αραχώβης 12")
    print("=" * 50)
    
    # Χρήση demo tenant schema
    with schema_context('demo'):
        # 1. Έλεγχος κτιρίου
        building = Building.objects.filter(name='Αραχώβης 12').first()
        if not building:
            print("❌ Το κτίριο Αραχώβης 12 δεν βρέθηκε!")
            return False
        
        print(f"✅ Κτίριο βρέθηκε: {building.name}")
        print(f"   Διεύθυνση: {building.address}")
        print(f"   Πόλη: {building.city}")
        print(f"   Τ.Κ.: {building.postal_code}")
        print(f"   Διαχειριστής: {building.internal_manager_name}")
        print(f"   Τηλέφωνο: {building.internal_manager_phone}")
        print(f"   Γραφείο: {building.management_office_name}")
        print(f"   Αποθεματικό: {building.current_reserve}€")
        
        # 2. Έλεγχος διαμερισμάτων
        apartments = Apartment.objects.filter(building=building).order_by('number')
        print(f"\n🏠 Διαμερίσματα ({apartments.count()}):")
        
        for apt in apartments:
            status = "🔴 Ενοικιασμένο" if apt.is_rented else "🟢 Ιδιοκτησία"
            balance_color = "🟢" if apt.current_balance >= 0 else "🔴"
            print(f"   {apt.number} ({apt.floor}ος): {apt.owner_name}")
            if apt.is_rented:
                print(f"      → Ενοικιαστής: {apt.tenant_name}")
            print(f"      {status} | {balance_color} Υπόλοιπο: {apt.current_balance}€")
            print(f"      Χιλιοστά: {apt.participation_mills} | Θέρμανση: {apt.heating_mills} | Ανελκυστήρας: {apt.elevator_mills}")
        
        # 3. Έλεγχος δαπανών
        expenses = Expense.objects.filter(building=building).order_by('-date')
        print(f"\n💰 Δαπάνες ({expenses.count()}):")
        
        total_expenses = Decimal('0.00')
        for expense in expenses:
            print(f"   {expense.title}: {expense.amount}€ ({expense.get_category_display()})")
            total_expenses += expense.amount
        
        print(f"   Σύνολο δαπανών: {total_expenses}€")
        
        # 4. Έλεγχος εισπράξεων
        payments = Payment.objects.filter(apartment__building=building).order_by('-date')
        print(f"\n💳 Εισπράξεις ({payments.count()}):")
        
        total_payments = Decimal('0.00')
        for payment in payments:
            print(f"   {payment.apartment.number}: {payment.amount}€ ({payment.get_method_display()}) - {payment.date}")
            total_payments += payment.amount
        
        print(f"   Σύνολο εισπράξεων: {total_payments}€")
        
        # 5. Στατιστικά
        print("\n📊 Στατιστικά:")
        print(f"   Συνολικό αποθεματικό κτιρίου: {building.current_reserve}€")
        print(f"   Συνολικές δαπάνες: {total_expenses}€")
        print(f"   Συνολικές εισπράξεις: {total_payments}€")
        
        # 6. Έλεγχος χιλιοστών
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        print("\n📏 Χιλιοστά:")
        print(f"   Συνολικά χιλιοστά: {total_mills}")
        print("   Αναμενόμενα: 1000 (100% × 10 διαμερίσματα)")
        
        if total_mills == 1000:
            print("   ✅ Χιλιοστά είναι σωστά!")
        else:
            print(f"   ⚠️ Χιλιοστά διαφέρουν: {total_mills}/1000")
        
        print("\n✅ Test ολοκληρώθηκε!")
        return True

if __name__ == '__main__':
    test_araxovis_building()
