#!/usr/bin/env python3
"""
Δοκιμή της νέας λειτουργικότητας προτεραιότητας αποθεματικού
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
from financial.services import AdvancedCommonExpenseCalculator
from apartments.models import Apartment

def test_reserve_fund_priority():
    """Δοκιμή της λογικής προτεραιότητας αποθεματικού"""
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο Αλκμάνος 22
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο Αλκμάνος")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📊 Τρέχουσα προτεραιότητα: {building.reserve_fund_priority}")
        print(f"🎯 Στόχος αποθεματικού: €{building.reserve_fund_goal}")
        print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        print()
        
        # Δοκιμή 1: Μετά τις εκκρεμότητες (προεπιλογή)
        print("🧪 ΔΟΚΙΜΗ 1: Προτεραιότητα 'Μετά τις Εκκρεμότητες'")
        building.reserve_fund_priority = 'after_obligations'
        building.save()
        
        # Δημιουργία calculator για τον τρέχοντα μήνα
        apartments = Apartment.objects.filter(building=building)
        calculator = AdvancedCommonExpenseCalculator(
            building_id=building.id
        )
        
        # Υπολογισμός μεριδίων
        shares = calculator.calculate_advanced_shares()
        
        # Έλεγχος αποτελεσμάτων
        total_reserve_fund = sum(share.get('breakdown', {}).get('reserve_fund_contribution', 0) for share in shares.values() if isinstance(share, dict))
        print(f"   💰 Συνολική εισφορά αποθεματικού: €{total_reserve_fund}")
        
        if total_reserve_fund > 0:
            print("   ✅ Αποθεματικό συλλέγεται")
        else:
            print("   🚫 Αποθεματικό ΔΕΝ συλλέγεται (υπάρχουν εκκρεμότητες)")
        
        print()
        
        # Δοκιμή 2: Πάντα (ανεξάρτητα)
        print("🧪 ΔΟΚΙΜΗ 2: Προτεραιότητα 'Πάντα (Ανεξάρτητα)'")
        building.reserve_fund_priority = 'always'
        building.save()
        
        # Επαναυπολογισμός
        calculator2 = AdvancedCommonExpenseCalculator(
            building_id=building.id
        )
        
        shares2 = calculator2.calculate_advanced_shares()
        total_reserve_fund2 = sum(share.get('breakdown', {}).get('reserve_fund_contribution', 0) for share in shares2.values() if isinstance(share, dict))
        print(f"   💰 Συνολική εισφορά αποθεματικού: €{total_reserve_fund2}")
        
        if total_reserve_fund2 > 0:
            print("   ✅ Αποθεματικό συλλέγεται ανεξάρτητα από εκκρεμότητες")
        else:
            print("   🚫 Αποθεματικό ΔΕΝ συλλέγεται")
        
        print()
        
        # Επαναφορά στην προεπιλογή
        building.reserve_fund_priority = 'after_obligations'
        building.save()
        print("🔄 Επαναφορά στην προεπιλογή: 'Μετά τις Εκκρεμότητες'")

if __name__ == "__main__":
    test_reserve_fund_priority()
