#!/usr/bin/env python
import os
import sys
import django
from decimal import Decimal
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from maintenance.models import ScheduledMaintenance, PaymentSchedule, PaymentInstallment

with schema_context('demo'):
    # Find existing maintenance records
    maintenances = ScheduledMaintenance.objects.all()
    print(f"Found {maintenances.count()} scheduled maintenance records")
    
    for maintenance in maintenances:
        print(f"\nProcessing: {maintenance.title} (ID: {maintenance.id})")
        
        # Check if already has payment schedule
        if hasattr(maintenance, 'payment_schedule'):
            ps = maintenance.payment_schedule
            print(f"  Already has payment schedule: {ps.payment_type}, total: €{ps.total_amount}")
            
            # Check installments
            installments = ps.installments.all()
            print(f"  Installments: {installments.count()}")
            
            if installments.count() == 0 and ps.payment_type == 'advance_installments':
                print("  Creating missing installments...")
                
                # Create advance installment
                advance_amount = ps.advance_amount or (ps.total_amount * Decimal('0.3'))
                advance_date = ps.start_date
                
                PaymentInstallment.objects.create(
                    payment_schedule=ps,
                    installment_type='advance',
                    installment_number=0,
                    amount=advance_amount,
                    due_date=advance_date,
                    status='pending',
                    notes='Προκαταβολή',
                    description=f"Προκαταβολή για {maintenance.title}"
                )
                print(f"    Created advance installment: €{advance_amount}")
                
                # Create regular installments
                remaining_amount = ps.total_amount - advance_amount
                installment_count = ps.installment_count or 3
                installment_amount = remaining_amount / installment_count
                
                current_date = advance_date + relativedelta(months=1)
                
                for i in range(installment_count):
                    PaymentInstallment.objects.create(
                        payment_schedule=ps,
                        installment_type='installment',
                        installment_number=i + 1,
                        amount=installment_amount,
                        due_date=current_date,
                        status='pending',
                        notes=f'Δόση {i+1} από {installment_count}',
                        description=f"Δόση {i+1}/{installment_count} για {maintenance.title}"
                    )
                    print(f"    Created installment {i+1}: €{installment_amount}, due: {current_date}")
                    current_date = current_date + relativedelta(months=1)
                    
        else:
            # Create a simple payment schedule for demonstration
            total_cost = maintenance.total_cost or maintenance.estimated_cost
            if total_cost and total_cost > 0:
                print(f"  Creating new payment schedule for €{total_cost}")
                
                # Create payment schedule
                ps = PaymentSchedule.objects.create(
                    scheduled_maintenance=maintenance,
                    payment_type='advance_installments',
                    total_amount=total_cost,
                    advance_percentage=Decimal('30'),
                    advance_amount=total_cost * Decimal('0.3'),
                    remaining_amount=total_cost * Decimal('0.7'),
                    installment_count=3,
                    installment_frequency='monthly',
                    start_date=date.today(),
                    status='pending',
                    notes='Auto-created payment schedule'
                )
                
                # Create advance installment
                advance_amount = ps.advance_amount
                advance_date = ps.start_date
                
                PaymentInstallment.objects.create(
                    payment_schedule=ps,
                    installment_type='advance',
                    installment_number=0,
                    amount=advance_amount,
                    due_date=advance_date,
                    status='pending',
                    notes='Προκαταβολή',
                    description=f"Προκαταβολή για {maintenance.title}"
                )
                print(f"    Created advance installment: €{advance_amount}")
                
                # Create regular installments
                remaining_amount = ps.remaining_amount
                installment_count = ps.installment_count
                installment_amount = remaining_amount / installment_count
                
                current_date = advance_date + relativedelta(months=1)
                
                for i in range(installment_count):
                    PaymentInstallment.objects.create(
                        payment_schedule=ps,
                        installment_type='installment',
                        installment_number=i + 1,
                        amount=installment_amount,
                        due_date=current_date,
                        status='pending',
                        notes=f'Δόση {i+1} από {installment_count}',
                        description=f"Δόση {i+1}/{installment_count} για {maintenance.title}"
                    )
                    print(f"    Created installment {i+1}: €{installment_amount}, due: {current_date}")
                    current_date = current_date + relativedelta(months=1)
            else:
                print(f"  No cost specified, skipping")
                
    print(f"\nSummary:")
    print(f"Payment Schedules: {PaymentSchedule.objects.count()}")
    print(f"Payment Installments: {PaymentInstallment.objects.count()}")