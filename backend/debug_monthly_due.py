#!/usr/bin/env python
"""
Script για έρευνα του monthly_due field
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment, Transaction
from datetime import datetime

def debug_monthly_due():
    """Ερευνά το monthly_due field"""
    
    with schema_context('demo'):
        print("🔍 ΕΡΕΥΝΑ MONTHLY_DUE FIELD")
        print("=" * 50)
        
        # 1. Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(name='Αλκμάνος 22')
        print(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
        
        # 2. Βρες το διαμέρισμα 3
        apartment = Apartment.objects.get(building=building, number='3')
        print(f"🏠 Διαμέρισμα: {apartment.number}")
        print(f"   Ιδιοκτήτης: {apartment.owner_name}")
        print(f"   Ενοικιαστής: {apartment.tenant_name}")
        
        # 3. Έλεγχος όλων των πεδίων του apartment
        print(f"\n🔍 APARTMENT FIELDS:")
        print(f"   current_balance: {apartment.current_balance}")
        print(f"   participation_mills: {apartment.participation_mills}")
        print(f"   heating_mills: {apartment.heating_mills}")
        print(f"   elevator_mills: {apartment.elevator_mills}")
        
        # 4. Έλεγχος αν υπάρχει monthly_due field
        print(f"\n🔍 MONTHLY_DUE FIELD:")
        if hasattr(apartment, 'monthly_due'):
            print(f"   monthly_due: {apartment.monthly_due}")
        else:
            print("   ❌ Το apartment δεν έχει monthly_due field")
        
        # 5. Έλεγχος όλων των attributes
        print(f"\n🔍 ALL APARTMENT ATTRIBUTES:")
        for attr in dir(apartment):
            if not attr.startswith('_') and not callable(getattr(apartment, attr)):
                try:
                    value = getattr(apartment, attr)
                    if isinstance(value, (int, float, str, bool)) or value is None:
                        print(f"   {attr}: {value}")
                except:
                    pass
        
        # 6. Έλεγχος API response
        print(f"\n🔍 API RESPONSE SIMULATION:")
        print("   Το monthly_due πιθανότατα υπολογίζεται στο frontend")
        print("   ή επιστρέφεται από το API endpoint")
        
        # 7. Έλεγχος αν υπάρχουν υποχρεώσεις
        from obligations.models import Obligation
        obligations = Obligation.objects.filter(apartment=apartment)
        print(f"\n📋 ΥΠΟΧΡΕΩΣΕΙΣ:")
        print(f"   Αριθμός υποχρεώσεων: {obligations.count()}")
        
        if obligations.exists():
            for obligation in obligations[:5]:
                print(f"   • {obligation.amount}€ - {obligation.description}")

if __name__ == "__main__":
    debug_monthly_due()
