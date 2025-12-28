#!/usr/bin/env python3
"""
Script για έλεγχο του management_fee_per_apartment
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment

def format_currency(amount):
    """Format currency with Greek locale"""
    return f"{amount:,.2f} €"

def check_management_fee():
    """Ελέγχει το management_fee_per_apartment"""
    print("=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ MANAGEMENT FEE PER APARTMENT")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        apartments = Apartment.objects.filter(building=building)
        
        print(f"\n🏢 Κτίριο: {building.name}")
        print(f"💰 Management fee per apartment: {format_currency(building.management_fee_per_apartment)}")
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments.count()}")
        
        # Υπολογισμός συνολικού κόστους διαχείρισης
        total_management_cost = building.management_fee_per_apartment * apartments.count()
        print(f"💰 Συνολικό κόστος διαχείρισης: {format_currency(total_management_cost)}")
        
        # Εμφάνιση διαμερισμάτων
        print(f"\n🏠 Διαμερίσματα:")
        for apartment in apartments:
            print(f"   - {apartment.number} (χιλιοστά: {apartment.participation_mills})")
        
        return {
            'management_fee_per_apartment': building.management_fee_per_apartment,
            'apartments_count': apartments.count(),
            'total_management_cost': total_management_cost
        }

def main():
    """Κύρια λειτουργία"""
    print("🚀 ΕΛΕΓΧΟΣ MANAGEMENT FEE")
    print("=" * 80)
    
    try:
        result = check_management_fee()
        
        print(f"\n📊 ΣΥΝΟΠΤΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ:")
        print(f"   Management fee per apartment: {format_currency(result['management_fee_per_apartment'])}")
        print(f"   Αριθμός διαμερισμάτων: {result['apartments_count']}")
        print(f"   Συνολικό κόστος διαχείρισης: {format_currency(result['total_management_cost'])}")
        
        # Ανάλυση για την εύρεση της διαφοράς
        dashboard_total = Decimal('2000.01')
        known_expenses = Decimal('1331.99')  # Οκτώβριος + Σεπτέμβριος
        difference = dashboard_total - known_expenses
        
        print(f"\n🔍 ΑΝΑΛΥΣΗ ΔΙΑΦΟΡΑΣ:")
        print(f"   Dashboard εμφανίζει: {format_currency(dashboard_total)}")
        print(f"   Γνωστές δαπάνες: {format_currency(known_expenses)}")
        print(f"   Διαφορά: {format_currency(difference)}")
        print(f"   Management fee: {format_currency(result['total_management_cost'])}")
        
        if abs(difference - result['total_management_cost']) < Decimal('0.01'):
            print(f"   ✅ Η διαφορά ταιριάζει με το management fee!")
        else:
            print(f"   ⚠️  Η διαφορά ΔΕΝ ταιριάζει με το management fee")
            print(f"   Διαφορά: {format_currency(difference)}")
            print(f"   Management fee: {format_currency(result['total_management_cost'])}")
            print(f"   Υπόλοιπο διαφοράς: {format_currency(difference - result['total_management_cost'])}")
            
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
