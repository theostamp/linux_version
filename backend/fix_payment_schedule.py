#!/usr/bin/env python
import os
import sys
import django
from decimal import Decimal

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from maintenance.models import ScheduledMaintenance, PaymentSchedule

with schema_context('demo'):
    # Fix maintenance #2
    sm = ScheduledMaintenance.objects.get(id=2)
    print(f'Fixing: {sm.title}')
    print(f'Current estimated_cost: {sm.estimated_cost}')
    
    if hasattr(sm, 'payment_schedule'):
        ps = sm.payment_schedule
        print(f'Current payment schedule total_amount: {ps.total_amount}')
        
        # Update payment schedule to use the estimated_cost
        if sm.estimated_cost and ps.total_amount == 0:
            ps.total_amount = sm.estimated_cost
            ps.save()
            print(f'Updated payment schedule total_amount to: {ps.total_amount}')
            
            # Also update advance_amount if needed
            if ps.payment_type == 'advance_installments' and ps.advance_percentage:
                ps.advance_amount = (ps.total_amount * ps.advance_percentage) / Decimal('100')
                ps.remaining_amount = ps.total_amount - ps.advance_amount
                ps.save()
                print(f'Updated advance_amount to: {ps.advance_amount}')
                print(f'Updated remaining_amount to: {ps.remaining_amount}')
        else:
            print('No update needed or no estimated_cost')
    else:
        print('No payment schedule found')