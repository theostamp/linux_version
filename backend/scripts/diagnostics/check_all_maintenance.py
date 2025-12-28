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
    for sm in ScheduledMaintenance.objects.all():
        print(f'\nID: {sm.id} - {sm.title}')
        print(f'  estimated_cost: {sm.estimated_cost}')
        print(f'  actual_cost: {sm.actual_cost}')
        print(f'  total_cost: {sm.total_cost if hasattr(sm, "total_cost") else "N/A"}')
        
        if hasattr(sm, 'payment_schedule'):
            ps = sm.payment_schedule
            print(f'  Payment Schedule:')
            print(f'    total_amount: {ps.total_amount}')
            print(f'    payment_type: {ps.payment_type}')
        else:
            print('  No payment schedule')