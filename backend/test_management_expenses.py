#!/usr/bin/env python3
"""
Script για έλεγχο των εξόδων διαχείρισης
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building

def test_management_expenses():
    """Έλεγχος των εξόδων διαχείρισης"""
    
    print("🔍 Έλεγχος εξόδων διαχείρισης...")
    
    # Εύρεση του demo tenant
    try:
        tenant = Client.objects.get(schema_name='demo')
        print(f"🏢 Χρήση tenant: {tenant.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε tenant 'demo'")
        return
    
    # Έλεγχος στο tenant context
    with tenant_context(tenant):
        buildings = Building.objects.all()
        print(f"📊 Βρέθηκαν {buildings.count()} κτίρια")
        
        for building in buildings:
            print(f"\n🏢 Κτίριο: {building.name}")
            print(f"   Αριθμός διαμερισμάτων: {building.apartments_count}")
            
            # Υπολογισμός εξόδων διαχείρισης
            management_fee_per_apartment = 15.00  # € ανά διαμέρισμα/μήνα
            total_management_cost = building.apartments_count * management_fee_per_apartment
            
            print(f"   Αμοιβή διαχείρισης: {management_fee_per_apartment}€ ανά διαμέρισμα/μήνα")
            print(f"   Συνολικό κόστος διαχείρισης: {total_management_cost}€/μήνα")
            print(f"   Ετήσιο κόστος διαχείρισης: {total_management_cost * 12}€/έτος")
            
            # Έλεγχος αποθεματικού
            print(f"   Τρέχον αποθεματικό: {building.current_reserve}€")
            
            # Υπολογισμός μηνιαίας δόσης αποθεματικού από τις ρυθμίσεις του κτιρίου
            reserve_fund_monthly = 0.0
            if hasattr(building, 'reserve_fund_goal') and hasattr(building, 'reserve_fund_duration_months'):
                if building.reserve_fund_goal and building.reserve_fund_duration_months:
                    reserve_fund_monthly = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
                    print(f"   Στόχος αποθεματικού: {building.reserve_fund_goal}€")
                    print(f"   Διάρκεια συλλογής: {building.reserve_fund_duration_months} μήνες")
                    print(f"   Μηνιαία δόση αποθεματικού: {reserve_fund_monthly:.2f}€")
                else:
                    print("   Δεν έχει οριστεί στόχος αποθεματικού")
            else:
                print("   Τα πεδία αποθεματικού δεν υπάρχουν στο μοντέλο")
            
            # Υπολογισμός συνολικών μηνιαίων εξόδων (διαχείριση + αποθεματικό)
            total_monthly_expenses = total_management_cost + reserve_fund_monthly
            
            print(f"   Συνολικά μηνιαία έξοδα: {total_monthly_expenses}€")
            print(f"     - Διαχείριση: {total_management_cost}€")
            print(f"     - Αποθεματικό: {reserve_fund_monthly}€")
    
    print("\n🎉 Ο έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    test_management_expenses()
