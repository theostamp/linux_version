#!/usr/bin/env python3
"""
Script για διόρθωση της ημερομηνίας έναρξης αποθεματικού
"""

import os
import sys
import django
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def fix_reserve_fund_start_date():
    """Ορισμός ημερομηνίας έναρξης αποθεματικού"""
    
    with schema_context('demo'):
        print("🔧 ΔΙΟΡΘΩΣΗ ΗΜΕΡΟΜΗΝΙΑΣ ΕΝΑΡΞΗΣ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("=" * 60)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"🏦 Στόχος αποθεματικού: {building.reserve_fund_goal}€")
        print(f"📅 Διάρκεια αποθεματικού: {building.reserve_fund_duration_months} μήνες")
        print(f"📅 Τρέχουσα ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        print()
        
        # Ορισμός ημερομηνίας έναρξης (1η Ιανουαρίου 2025)
        start_date = date(2025, 1, 1)
        building.reserve_fund_start_date = start_date
        building.save()
        
        print(f"✅ Ορίστηκε ημερομηνία έναρξης: {start_date}")
        print()
        
        # Επιβεβαίωση
        building.refresh_from_db()
        print(f"📅 Νέα ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        
        print("\n" + "=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΔΙΟΡΘΩΣΗ")

if __name__ == "__main__":
    fix_reserve_fund_start_date()
