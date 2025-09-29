#!/usr/bin/env python3
"""
Script για να δημιουργήσουμε test data για προγραμματισμένα έργα
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from maintenance.models import ScheduledMaintenance, PaymentSchedule, PaymentInstallment, Contractor
from buildings.models import Building
from decimal import Decimal
from datetime import date, timedelta

def create_test_scheduled_maintenance():
    """Δημιουργεί test data για προγραμματισμένα έργα"""
    
    with schema_context('demo'):
        print("=== Δημιουργία Test Scheduled Maintenance ===")
        
        building = Building.objects.get(id=1)
        
        # Δημιουργία contractor αν δεν υπάρχει
        contractor, created = Contractor.objects.get_or_create(
            name="Test Contractor",
            defaults={
                'contact_person': 'Test Person',
                'phone': '1234567890',
                'email': 'test@contractor.com',
                'address': 'Test Address'
            }
        )
        print(f"Contractor: {contractor.name} (created: {created})")
        
        # Δημιουργία scheduled maintenance
        maintenance, created = ScheduledMaintenance.objects.get_or_create(
            title="Συντήρηση Κήπου",
            building=building,
            defaults={
                'description': 'Μηνιαία συντήρηση κήπου και φυτών',
                'contractor': contractor,
                'scheduled_date': date(2025, 3, 15),
                'estimated_cost': Decimal('200.00'),
                'status': 'scheduled'
            }
        )
        print(f"Maintenance: {maintenance.title} (created: {created})")
        
        # Δημιουργία payment schedule
        payment_schedule, created = PaymentSchedule.objects.get_or_create(
            scheduled_maintenance=maintenance,
            defaults={
                'payment_type': 'installments',
                'total_amount': Decimal('200.00'),
                'installment_count': 4,
                'installment_frequency': 'monthly',
                'start_date': date(2025, 3, 1),
                'advance_percentage': Decimal('0.00')
            }
        )
        print(f"Payment Schedule: {payment_schedule.payment_type} (created: {created})")
        
        # Δημιουργία installments
        if created:
            installment_amount = payment_schedule.total_amount / payment_schedule.installment_count
            current_date = payment_schedule.start_date
            
            for i in range(1, payment_schedule.installment_count + 1):
                installment = PaymentInstallment.objects.create(
                    payment_schedule=payment_schedule,
                    installment_type='installment',
                    installment_number=i,
                    amount=installment_amount,
                    due_date=current_date,
                    status='pending'
                )
                print(f"Created installment {i}: €{installment.amount} due {installment.due_date}")
                
                # Προσθήκη ενός μήνα
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
        
        # Δημιουργία επιπλέον scheduled maintenance
        maintenance2, created = ScheduledMaintenance.objects.get_or_create(
            title="Συντήρηση Ανελκυστήρα",
            building=building,
            defaults={
                'description': 'Ετήσια συντήρηση ανελκυστήρα',
                'contractor': contractor,
                'scheduled_date': date(2025, 4, 1),
                'estimated_cost': Decimal('500.00'),
                'estimated_duration': 1,  # 1 day
                'status': 'scheduled'
            }
        )
        print(f"Maintenance 2: {maintenance2.title} (created: {created})")
        
        # Δημιουργία payment schedule για το δεύτερο έργο
        payment_schedule2, created = PaymentSchedule.objects.get_or_create(
            scheduled_maintenance=maintenance2,
            defaults={
                'payment_type': 'lump_sum',
                'total_amount': Decimal('500.00'),
                'installment_count': 1,
                'start_date': date(2025, 4, 1)
            }
        )
        print(f"Payment Schedule 2: {payment_schedule2.payment_type} (created: {created})")
        
        # Δημιουργία lump sum installment
        if created:
            installment = PaymentInstallment.objects.create(
                payment_schedule=payment_schedule2,
                installment_type='full',
                installment_number=1,
                amount=payment_schedule2.total_amount,
                due_date=payment_schedule2.start_date,
                status='pending'
            )
            print(f"Created lump sum installment: €{installment.amount} due {installment.due_date}")
        
        print("\n=== Summary ===")
        print(f"Total Scheduled Maintenance: {ScheduledMaintenance.objects.count()}")
        print(f"Total Payment Schedules: {PaymentSchedule.objects.count()}")
        print(f"Total Installments: {PaymentInstallment.objects.count()}")
        
        # Ελέγχος installments για Μάρτιο 2025
        march_installments = PaymentInstallment.objects.filter(
            due_date__year=2025,
            due_date__month=3,
            status='pending'
        )
        print(f"\nMarch 2025 installments: {march_installments.count()}")
        for installment in march_installments:
            print(f"- {installment.payment_schedule.scheduled_maintenance.title}: €{installment.amount}")

if __name__ == '__main__':
    create_test_scheduled_maintenance()
