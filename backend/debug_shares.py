#!/usr/bin/env python3
"""
Debug script για να δω τη δομή των shares
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

def debug_shares():
    """Debug τη δομή των shares"""
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο Αλκμάνος 22
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο Αλκμάνος")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        
        # Δημιουργία calculator
        calculator = AdvancedCommonExpenseCalculator(
            building_id=building.id
        )
        
        # Υπολογισμός μεριδίων
        shares = calculator.calculate_advanced_shares()
        
        print(f"📊 Αριθμός διαμερισμάτων: {len(shares)}")
        
        # Εκτύπωση δομής του πρώτου διαμερίσματος
        if shares:
            first_apartment_id = list(shares.keys())[0]
            first_share = shares[first_apartment_id]
            
            print(f"\n🔍 Δομή του πρώτου διαμερίσματος ({first_apartment_id}):")
            for key, value in first_share.items():
                print(f"   {key}: {value}")

if __name__ == "__main__":
    debug_shares()
