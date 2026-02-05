from datetime import datetime
from decimal import Decimal

from django.test import override_settings
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase

from apartments.models import Apartment
from buildings.models import Building
from financial.models import Payment as FinancialPayment
from online_payments.models import (
    Charge,
    ChargeCategory,
    OnlinePaymentLedgerLink,
    Payment,
)
from online_payments.services.ledger_sync import sync_ledger_for_online_payment


class LedgerSyncTests(TenantTestCase):
    def setUp(self):
        self.building = Building.objects.create(
            name="Test Building",
            address="Test Address",
            financial_system_start_date=datetime(2025, 1, 1).date(),
        )
        self.apartment = Apartment.objects.create(
            building=self.building,
            number="101",
            floor=1,
            owner_name="Owner One",
            participation_mills=100,
        )
        self.charge = Charge.objects.create(
            building=self.building,
            apartment=self.apartment,
            category=ChargeCategory.OPERATIONAL,
            amount=Decimal("120.00"),
            currency="EUR",
            period="2026-02",
            status="unpaid",
        )
        self.online_payment = Payment.objects.create(
            charge=self.charge,
            provider="stripe",
            provider_payment_id="pi_test_123",
            paid_at=timezone.now(),
            amount=self.charge.amount,
            currency=self.charge.currency,
            method="card",
            routed_to=self.charge.compute_routed_to(),
        )

    @override_settings(ENABLE_LEDGER_SYNC=True)
    def test_sync_creates_financial_payment_and_link(self):
        result = sync_ledger_for_online_payment(
            charge=self.charge,
            online_payment=self.online_payment,
            event_id="evt_test_1",
            event_type="checkout.session.completed",
            event_created=timezone.now(),
        )

        self.assertTrue(result.created)
        self.assertIsNotNone(result.link)
        self.assertEqual(FinancialPayment.objects.count(), 1)
        self.assertEqual(OnlinePaymentLedgerLink.objects.count(), 1)
        self.assertEqual(result.link.financial_payment.amount, self.charge.amount)

    @override_settings(ENABLE_LEDGER_SYNC=True)
    def test_sync_idempotent_same_event_id(self):
        first = sync_ledger_for_online_payment(
            charge=self.charge,
            online_payment=self.online_payment,
            event_id="evt_test_2",
            event_type="payment_intent.succeeded",
            event_created=timezone.now(),
        )
        second = sync_ledger_for_online_payment(
            charge=self.charge,
            online_payment=self.online_payment,
            event_id="evt_test_2",
            event_type="payment_intent.succeeded",
            event_created=timezone.now(),
        )

        self.assertTrue(first.created)
        self.assertFalse(second.created)
        self.assertEqual(FinancialPayment.objects.count(), 1)
        self.assertEqual(OnlinePaymentLedgerLink.objects.count(), 1)

    @override_settings(ENABLE_LEDGER_SYNC=True)
    def test_sync_idempotent_same_payment_different_event(self):
        first = sync_ledger_for_online_payment(
            charge=self.charge,
            online_payment=self.online_payment,
            event_id="evt_test_3",
            event_type="checkout.session.completed",
            event_created=timezone.now(),
        )
        second = sync_ledger_for_online_payment(
            charge=self.charge,
            online_payment=self.online_payment,
            event_id="evt_test_4",
            event_type="payment_intent.succeeded",
            event_created=timezone.now(),
        )

        self.assertTrue(first.created)
        self.assertFalse(second.created)
        self.assertEqual(FinancialPayment.objects.count(), 1)
        self.assertEqual(OnlinePaymentLedgerLink.objects.count(), 1)
