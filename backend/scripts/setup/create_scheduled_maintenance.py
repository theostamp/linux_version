#!/usr/bin/env python
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from maintenance.models import ScheduledMaintenance, PaymentSchedule
from financial.models import Expense
from datetime import datetime, timedelta
from decimal import Decimal

with schema_context('demo'):
    print("\n" + "="*70)
    print("ΔΗΜΙΟΥΡΓΙΑ SCHEDULED MAINTENANCE & PAYMENT SCHEDULE")
    print("="*70)

    # Βρες την εγκεκριμένη προσφορά
    offer = Offer.objects.filter(
        status='accepted',
        contractor_name='αβφγ'
    ).select_related('project').first()

    if not offer:
        print("\n❌ Δεν βρέθηκε η εγκεκριμένη προσφορά")
        sys.exit(1)

    project = offer.project

    print(f"\n📋 Έργο: {project.title}")
    print(f"   Συνεργείο: {offer.contractor_name}")
    print(f"   Ποσό: €{offer.amount}")
    print(f"   Δόσεις: {offer.installments}")
    print(f"   Προκαταβολή: €{offer.advance_payment or 0}")

    # Δημιουργία ScheduledMaintenance
    print("\n🔧 Δημιουργία ScheduledMaintenance...")

    scheduled, created = ScheduledMaintenance.objects.get_or_create(
        title=project.title,
        building=project.building,
        defaults={
            'description': project.description or 'Στεγανοποίηση ταράτσας και συναφείς εργασίες',
            'scheduled_date': project.deadline or (datetime.now().date() + timedelta(days=30)),
            'estimated_duration': 48,  # 48 ώρες (6 εργάσιμες ημέρες)
            'priority': project.priority or 'high',
            'status': 'in_progress' if project.status == 'approved' else 'scheduled',
            'estimated_cost': offer.amount,
            'total_cost': offer.amount,
            'payment_method': offer.payment_method or 'Τραπεζική Μεταφορά',
            'installments': offer.installments or 1,
            'advance_payment': offer.advance_payment,
            'location': 'Ταράτσα κτιρίου',
            'notes': f"Εγκεκριμένη προσφορά από {offer.contractor_name}\nΤιμή: €{offer.amount}",
            'contractor_name': offer.contractor_name,
            'contractor_contact': offer.contractor_contact or '',
            'contractor_phone': offer.contractor_phone or '',
            'contractor_email': offer.contractor_email or '',
            'created_by': project.created_by,
        }
    )

    if created:
        print(f"✅ Δημιουργήθηκε ScheduledMaintenance ID: {scheduled.id}")
    else:
        print(f"✅ Υπάρχει ήδη ScheduledMaintenance ID: {scheduled.id}")
        # Ενημέρωση με τα στοιχεία της προσφοράς
        scheduled.total_cost = offer.amount
        scheduled.installments = offer.installments or 1
        scheduled.advance_payment = offer.advance_payment
        scheduled.payment_method = offer.payment_method or 'Τραπεζική Μεταφορά'
        scheduled.contractor_name = offer.contractor_name
        scheduled.contractor_contact = offer.contractor_contact or ''
        scheduled.contractor_phone = offer.contractor_phone or ''
        scheduled.contractor_email = offer.contractor_email or ''
        scheduled.save()
        print("   Ενημερώθηκαν τα στοιχεία")

    # Σύνδεση με την υπάρχουσα δαπάνη
    if project.linked_expense:
        scheduled.linked_expense = project.linked_expense
        scheduled.save()
        print(f"   Συνδέθηκε με Δαπάνη ID: {project.linked_expense.id}")

    # Δημιουργία PaymentSchedule
    print("\n💰 Δημιουργία PaymentSchedule...")

    payment_schedule, ps_created = PaymentSchedule.objects.get_or_create(
        scheduled_maintenance=scheduled,
        defaults={
            'payment_type': 'installments' if offer.installments > 1 else 'lump_sum',
            'total_amount': offer.amount,
            'advance_percentage': Decimal('40') if offer.advance_payment else Decimal('0'),  # 40% προκαταβολή
            'installment_count': offer.installments or 1,
            'installment_frequency': 'monthly',
            'periodic_amount': Decimal('0'),  # Δεν χρησιμοποιείται για installments
            'periodic_frequency': 'monthly',
            'start_date': datetime.now().date(),
            'notes': f"Προκαταβολή: €{offer.advance_payment or 0}\nΔόσεις: {offer.installments or 1} x €{(offer.amount - (offer.advance_payment or 0)) / (offer.installments or 1):.2f}",
            'created_by': project.created_by,
        }
    )

    if ps_created:
        print(f"✅ Δημιουργήθηκε PaymentSchedule ID: {payment_schedule.id}")
    else:
        print(f"✅ Υπάρχει ήδη PaymentSchedule ID: {payment_schedule.id}")
        # Ενημέρωση
        payment_schedule.total_amount = offer.amount
        payment_schedule.installment_count = offer.installments or 1
        payment_schedule.advance_percentage = Decimal('40') if offer.advance_payment else Decimal('0')
        payment_schedule.save()
        print("   Ενημερώθηκαν τα στοιχεία")

    # Δημιουργία δόσεων (Installments)
    print("\n📅 Δημιουργία Δόσεων...")

    from maintenance.models import PaymentInstallment

    # Διαγραφή παλιών δόσεων αν υπάρχουν
    PaymentInstallment.objects.filter(payment_schedule=payment_schedule).delete()

    total = offer.amount
    advance = offer.advance_payment or Decimal('0')
    num_installments = offer.installments or 1
    remaining = total - advance
    installment_amount = remaining / num_installments if num_installments > 0 else remaining

    installments_created = []

    # Προκαταβολή
    if advance > 0:
        inst = PaymentInstallment.objects.create(
            payment_schedule=payment_schedule,
            installment_number=0,
            amount=advance,
            due_date=datetime.now().date(),
            status='pending',
            description='Προκαταβολή'
        )
        installments_created.append(inst)
        print(f"   • Προκαταβολή: €{advance} - Άμεσα")

    # Δόσεις
    for i in range(1, num_installments + 1):
        due_date = datetime.now().date() + timedelta(days=30*i)
        inst = PaymentInstallment.objects.create(
            payment_schedule=payment_schedule,
            installment_number=i,
            amount=installment_amount,
            due_date=due_date,
            status='pending',
            description=f'Δόση {i}/{num_installments}'
        )
        installments_created.append(inst)
        print(f"   • Δόση {i}/{num_installments}: €{installment_amount:.2f} - {due_date}")

    print(f"\n✅ Δημιουργήθηκαν {len(installments_created)} δόσεις")

    # Επιβεβαίωση
    print("\n" + "="*70)
    print("ΕΠΙΒΕΒΑΙΩΣΗ ΔΗΜΙΟΥΡΓΙΑΣ")
    print("="*70)

    print(f"\n✅ ScheduledMaintenance:")
    print(f"   ID: {scheduled.id}")
    print(f"   Τίτλος: {scheduled.title}")
    print(f"   Κόστος: €{scheduled.total_cost}")
    print(f"   Κατάσταση: {scheduled.status}")
    print(f"   Ημερομηνία: {scheduled.scheduled_date}")

    print(f"\n✅ PaymentSchedule:")
    print(f"   ID: {payment_schedule.id}")
    print(f"   Σύνολο: €{payment_schedule.total_amount}")
    print(f"   Δόσεις: {payment_schedule.installment_count}")
    print(f"   Προκαταβολή: {payment_schedule.advance_percentage}%")

    print(f"\n✅ Installments:")
    for inst in PaymentInstallment.objects.filter(payment_schedule=payment_schedule).order_by('installment_number'):
        print(f"   • {inst.description}: €{inst.amount} - {inst.due_date}")

    print("\n" + "="*70)
    print("✅ Η ΔΗΜΙΟΥΡΓΙΑ ΟΛΟΚΛΗΡΩΘΗΚΕ ΕΠΙΤΥΧΩΣ!")
    print("="*70)