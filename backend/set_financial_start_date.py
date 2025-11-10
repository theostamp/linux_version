#!/usr/bin/env python3
"""
Ορισμός financial_system_start_date για κτίριο.
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

def set_financial_start_date():
    """Ορίζει το financial_system_start_date"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΟΡΙΣΜΟΣ FINANCIAL_SYSTEM_START_DATE")
        print("="*80 + "\n")
        
        building = Building.objects.filter(name='Αλκμάνος 22').first()
        
        if not building:
            print("❌ Δεν βρέθηκε κτίριο 'Αλκμάνος 22'\n")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"   Current financial_system_start_date: {building.financial_system_start_date}")
        
        # Ορίζουμε την ημερομηνία έναρξης ως 1 Οκτωβρίου 2025
        # (πρώτος μήνας με δαπάνες)
        new_start_date = date(2025, 10, 1)
        
        building.financial_system_start_date = new_start_date
        building.save()
        
        print(f"   ✅ NEW financial_system_start_date: {building.financial_system_start_date}")
        
        print("\n" + "="*80)
        print("✅ ΕΝΗΜΕΡΩΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ!")
        print("="*80 + "\n")

if __name__ == '__main__':
    set_financial_start_date()


