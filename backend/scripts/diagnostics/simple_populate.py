#!/usr/bin/env python3
"""
Simple script to populate previous_balance field with 2 decimal places
"""

import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from decimal import Decimal, ROUND_HALF_UP

def populate():
    with schema_context('demo'):
        from apartments.models import Apartment
        
        apartments = Apartment.objects.filter(building_id=1)
        print(f"Found {apartments.count()} apartments")
        
        total_mills = sum([a.participation_mills or 0 for a in apartments])
        print(f"Total participation mills: {total_mills}")
        
        for apt in apartments:
            if apt.participation_mills and total_mills > 0:
                # Calculate share and round to 2 decimal places
                share = (apt.participation_mills / total_mills) * 5000
                rounded_share = Decimal(str(share)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                apt.previous_balance = rounded_share
                apt.save()
                print(f"Apartment {apt.number}: {apt.participation_mills} mills -> {rounded_share}€")
            else:
                apt.previous_balance = Decimal('0.00')
                apt.save()
                print(f"Apartment {apt.number}: 0.00€ (no mills)")
        
        print("Done!")

if __name__ == "__main__":
    populate()
