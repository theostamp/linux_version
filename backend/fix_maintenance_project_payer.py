#!/usr/bin/env python3
"""
Ενημέρωση δαπανών με κατηγορία 'maintenance_project' σε payer_responsibility='owner'
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense

def fix_maintenance_project_payer():
    """Ενημερώνει maintenance_project expenses σε owner"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΕΝΗΜΕΡΩΣΗ maintenance_project EXPENSES → ΙΔΙΟΚΤΗΤΗΣ")
        print("="*80 + "\n")
        
        # Βρίσκουμε δαπάνες με category='maintenance_project'
        maintenance_expenses = Expense.objects.filter(
            category='maintenance_project'
        ).exclude(
            payer_responsibility='owner'
        )
        
        count = maintenance_expenses.count()
        
        if count == 0:
            print("✅ Δεν βρέθηκαν maintenance_project expenses που χρειάζονται ενημέρωση!\n")
            return
        
        print(f"📊 Βρέθηκαν {count} maintenance_project expenses:\n")
        
        # Εμφάνιση
        for exp in maintenance_expenses:
            current_payer = exp.payer_responsibility or 'not_set'
            print(f"• ID:{exp.id} | {exp.date} | €{exp.amount}")
            print(f"  Title: {exp.title}")
            print(f"  Current payer: {current_payer} → Will be: owner")
            print()
        
        # Ενημέρωση
        updated = maintenance_expenses.update(payer_responsibility='owner')
        
        print("="*80)
        print(f"✅ Ενημερώθηκαν {updated} maintenance_project expenses σε payer='owner'")
        print("="*80 + "\n")

if __name__ == '__main__':
    fix_maintenance_project_payer()

