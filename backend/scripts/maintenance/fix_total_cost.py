#!/usr/bin/env python
import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from maintenance.models import ScheduledMaintenance

with schema_context('demo'):
    sm = ScheduledMaintenance.objects.get(id=2)
    print(f'Updating: {sm.title}')
    print(f'Current total_cost: {sm.total_cost}')
    print(f'Current estimated_cost: {sm.estimated_cost}')
    
    # Set total_cost to match estimated_cost
    sm.total_cost = sm.estimated_cost
    sm.save()
    
    print(f'Updated total_cost to: {sm.total_cost}')