import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.utils import schema_context
from rest_framework.test import APIClient

from buildings.models import Building
from .models import Contractor, ScheduledMaintenance, PaymentSchedule, PaymentInstallment, PaymentReceipt


User = get_user_model()


@pytest.mark.django_db
def test_create_payment_schedule_and_installments():
    with schema_context('demo'):
        user = User.objects.create_user(email='admin@example.com', password='testpass', is_staff=True)
        b = Building.objects.create(name='B1', address='A', city='Ath', postal_code='11528')
        c = Contractor.objects.create(name='TechCo', service_type='maintenance', contact_person='CP', phone='210')
        m = ScheduledMaintenance.objects.create(
            title='Boiler service', description='Annual', building=b, contractor=c,
            scheduled_date=timezone.now().date(), estimated_duration=2, created_by=user
        )

        client = APIClient(); client.force_authenticate(user=user)
        res = client.post(f"/api/maintenance/scheduled/{m.id}/create_payment_schedule/", {
            'payment_type': 'advance_installments',
            'total_amount': '1000.00',
            'advance_percentage': '20',
            'installment_count': 4,
            'installment_frequency': 'monthly',
            'start_date': str(m.scheduled_date),
        }, format='json')
        assert res.status_code == 201, res.data
        ps_id = res.data['payment_schedule']['id']
        assert PaymentSchedule.objects.filter(id=ps_id).exists()
        # Advance + 4 installments
        assert PaymentInstallment.objects.filter(payment_schedule_id=ps_id).count() == 5


@pytest.mark.django_db
def test_process_payment_marks_installment_paid_and_creates_receipt():
    with schema_context('demo'):
        user = User.objects.create_user(email='admin2@example.com', password='testpass', is_staff=True)
        b = Building.objects.create(name='B2', address='A', city='Ath', postal_code='11528')
        c = Contractor.objects.create(name='MaintCo', service_type='maintenance', contact_person='CP', phone='210')
        m = ScheduledMaintenance.objects.create(
            title='Elevator', description='Service', building=b, contractor=c,
            scheduled_date=timezone.now().date(), estimated_duration=1, created_by=user
        )
        ps = PaymentSchedule.objects.create(
            scheduled_maintenance=m, payment_type='lump_sum', total_amount='300.00', start_date=m.scheduled_date, created_by=user
        )
        inst = PaymentInstallment.objects.create(
            payment_schedule=ps, installment_type='full', installment_number=1, amount='300.00', due_date=m.scheduled_date
        )

        client = APIClient(); client.force_authenticate(user=user)
        res = client.post(f"/api/maintenance/scheduled/{m.id}/process_payment/", {
            'installment': inst.id,
            'payment_date': str(m.scheduled_date),
            'receipt_type': 'payment',
            'description': 'Full payment',
        }, format='json')
        assert res.status_code == 200, res.data
        inst.refresh_from_db()
        assert inst.status == 'paid'
        assert PaymentReceipt.objects.filter(installment=inst, scheduled_maintenance=m).exists()


@pytest.mark.django_db
def test_generate_pdf_receipt_endpoint():
    with schema_context('demo'):
        user = User.objects.create_user(email='admin3@example.com', password='testpass', is_staff=True)
        b = Building.objects.create(name='B3', address='A', city='Ath', postal_code='11528')
        m = ScheduledMaintenance.objects.create(
            title='Painting', description='Walls', building=b, scheduled_date=timezone.now().date(), estimated_duration=5, created_by=user
        )
        r = PaymentReceipt.objects.create(
            scheduled_maintenance=m,
            receipt_type='payment',
            receipt_number='REC-TEST',
            amount='50.00',
            payment_date=timezone.now().date(),
            description='Test',
            status='issued',
            created_by=user,
        )
        client = APIClient(); client.force_authenticate(user=user)
        res = client.post(f"/api/maintenance/payment-receipts/{r.id}/generate_pdf/")
        # Either OK PDF or 501 if libs missing
        assert res.status_code in (200, 501)

