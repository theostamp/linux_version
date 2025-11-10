import pytest
from uuid import uuid4
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django_tenants.utils import schema_context
from buildings.models import Building
from maintenance.models import ServiceReceipt, Contractor
from financial.models import UnifiedReceipt, Expense
from users.models import CustomUser
from datetime import date


pytestmark = pytest.mark.django_db

def unique_email(prefix: str) -> str:
    return f"{prefix}+{uuid4().hex[:8]}@test.com"


def test_issue_unified_receipt_creates_expense_and_links():
    with schema_context('demo'):
        building = Building.objects.create(name='Test', address='Addr')
        user = CustomUser.objects.create_user(email=unique_email('admin'), password='x', is_staff=True)
        ur = UnifiedReceipt.objects.create(
            building=building,
            title='Test UR',
            description='',
            amount=100,
            service_date=date.today(),
            category='miscellaneous',
            distribution_type='by_participation_mills',
            status='draft',
            created_by=user,
        )
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse('financial:unified-receipts-issue', args=[ur.pk])
        resp = client.post(url, {})
        assert resp.status_code == status.HTTP_200_OK
        ur.refresh_from_db()
        assert ur.status == 'issued'
        assert ur.expense_id is not None
        assert Expense.objects.filter(id=ur.expense_id, building=building).exists()


def test_cancel_unified_receipt_creates_credit_and_sets_cancelled():
    with schema_context('demo'):
        building = Building.objects.create(name='Test', address='Addr')
        user = CustomUser.objects.create_user(email=unique_email('admin2'), password='x', is_staff=True)
        ur = UnifiedReceipt.objects.create(
            building=building,
            title='Issued UR',
            description='',
            amount=50,
            service_date=date.today(),
            category='miscellaneous',
            distribution_type='by_participation_mills',
            status='issued',
            created_by=user,
        )
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse('financial:unified-receipts-cancel', args=[ur.pk])
        resp = client.post(url, {'reason': 'test'})
        assert resp.status_code == status.HTTP_200_OK
        ur.refresh_from_db()
        assert ur.status == 'cancelled'
        assert ur.credit_expense_id is not None
        credit = Expense.objects.get(id=ur.credit_expense_id)
        assert float(credit.amount) < 0


def test_delete_requires_admin_permissions():
    with schema_context('demo'):
        building = Building.objects.create(name='Test3', address='Addr')
        admin = CustomUser.objects.create_user(email=unique_email('admin3'), password='x', is_staff=True)
        user = CustomUser.objects.create_user(email=unique_email('user'), password='x')
        ur = UnifiedReceipt.objects.create(
            building=building,
            title='To delete',
            description='',
            amount=10,
            service_date=date.today(),
            category='miscellaneous',
            distribution_type='by_participation_mills',
            status='draft',
            created_by=admin,
        )
        # Non-admin cannot delete
        c1 = APIClient(); c1.force_authenticate(user=user)
        url = reverse('financial:unified-receipts-detail', args=[ur.pk])
        resp = c1.delete(url)
        assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)
        # Admin can delete
        c2 = APIClient(); c2.force_authenticate(user=admin)
        resp2 = c2.delete(url)
        assert resp2.status_code in (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK)


def test_financial_system_health_endpoint():
    with schema_context('demo'):
        user = CustomUser.objects.create_user(email=unique_email('admin4'), password='x', is_staff=True)
        client = APIClient(); client.force_authenticate(user=user)
        url = reverse('financial:system-health-check')
        resp = client.get(url)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data.get('status') == 'success'
