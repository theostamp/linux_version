#!/usr/bin/env python3
"""
Script για διόρθωση της διάρκειας αποθεματικού
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

def fix_reserve_fund_duration():
    """Διόρθωση διάρκειας αποθεματικού"""
    
    with schema_context('demo'):
        print("🔧 ΔΙΟΡΘΩΣΗ ΔΙΑΡΚΕΙΑΣ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("=" * 60)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"🏦 Στόχος αποθεματικού: {building.reserve_fund_goal}€")
        print(f"📅 Διάρκεια αποθεματικού: {building.reserve_fund_duration_months} μήνες")
        print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        print()
        
        # Υπολογισμός σωστής διάρκειας
        # Θέλουμε να συλλέγουμε αποθεματικό μέχρι να φτάσουμε στον στόχο
        # Μηνιαίος στόχος = 500€ (1000€ ÷ 2 μήνες)
        # Αλλά θέλουμε να συνεχίσουμε τη συλλογή μέχρι να φτάσουμε στον στόχο
        monthly_target = 500  # € ανά μήνα
        total_goal = 1000     # € συνολικός στόχος
        
        # Υπολογίζουμε πόσους μήνες χρειάζεται για να φτάσουμε στον στόχο
        # με μηνιαία εισφορά 500€
        required_months = total_goal / monthly_target  # 1000 ÷ 500 = 2 μήνες
        
        # Αλλά θέλουμε να συνεχίσουμε τη συλλογή μέχρι να φτάσουμε στον στόχο
        # Οπότε θέτουμε τη διάρκεια σε έναν μεγάλο αριθμό (π.χ. 24 μήνες)
        # και το σύστημα θα σταματήσει όταν φτάσει στον στόχο
        new_duration = 24  # μήνες
        
        building.reserve_fund_duration_months = new_duration
        building.save()
        
        print(f"✅ Ορίστηκε νέα διάρκεια: {new_duration} μήνες")
        print(f"📊 Μηνιαίος στόχος: {monthly_target}€")
        print(f"🎯 Συνολικός στόχος: {total_goal}€")
        print()
        
        # Επιβεβαίωση
        building.refresh_from_db()
        print(f"📅 Νέα διάρκεια αποθεματικού: {building.reserve_fund_duration_months} μήνες")
        
        print("\n" + "=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΔΙΟΡΘΩΣΗ")

if __name__ == "__main__":
    fix_reserve_fund_duration()
