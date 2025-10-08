#!/usr/bin/env python
import os
import sys
import django

# Add the backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from buildings.models import Building
from datetime import date

buildings = Building.objects.all()
print('🏢 Buildings και financial_system_start_date:\n')
print('='*70)

for b in buildings:
    print(f'\nBuilding: {b.name}')
    print(f'  ID: {b.id}')
    print(f'  Financial System Start Date: {b.financial_system_start_date}')
    print(f'  Management Fee per Apartment: €{b.management_fee_per_apartment}')
    
    if b.financial_system_start_date:
        oct_2025 = date(2025, 10, 1)
        print(f'\n  📅 Σύγκριση με Οκτώβριο 2025:')
        print(f'     Οκτώβριος 2025: {oct_2025}')
        print(f'     Financial Start: {b.financial_system_start_date}')
        
        if oct_2025 < b.financial_system_start_date:
            print(f'     ⚠️  ΠΡΟΒΛΗΜΑ: Οκτώβριος 2025 < Financial Start Date')
            print(f'     ⚠️  Δεν θα χρεωθούν management fees για τον Οκτώβριο!')
            print(f'     ⚠️  Δεν θα υπάρχουν υποχρεώσεις αν δεν υπάρχουν άλλες δαπάνες!')
        elif oct_2025 >= b.financial_system_start_date:
            print(f'     ✅ OK: Οκτώβριος 2025 >= Financial Start Date')
            print(f'     ✅ Τα management fees θα χρεωθούν κανονικά')
    else:
        print(f'  ℹ️  Δεν έχει οριστεί financial_system_start_date')
    
    print('-'*70)

