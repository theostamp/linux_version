from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Optional

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from online_payments.models import (
    Charge,
    ChargeCategory,
    LedgerSyncSource,
    OnlinePaymentAuditAction,
    OnlinePaymentAuditLog,
    OnlinePaymentLedgerLink,
    Payment,
    PaymentAttempt,
)
from financial.models import Payment as FinancialPayment


@dataclass
class LedgerSyncResult:
    link: Optional[OnlinePaymentLedgerLink]
    created: bool
    reason: str


def _resolve_payment_type(charge: Charge):
    if charge.category == ChargeCategory.OPERATIONAL:
        return "common_expense", Decimal("0.00")
    if charge.category == ChargeCategory.RESERVE:
        return "reserve_fund", charge.amount
    if charge.category == ChargeCategory.FEE:
        return "other", Decimal("0.00")
    return "other", Decimal("0.00")


def _resolve_payer_info(charge: Charge):
    apartment = charge.apartment
    if charge.resident_user_id or apartment.tenant_user_id or apartment.is_rented:
        return "tenant", apartment.tenant_name or ""
    return "owner", apartment.owner_name or ""


def _resolve_payment_date(event_created: Optional[datetime]):
    if event_created:
        return event_created.date()
    return timezone.now().date()


def sync_ledger_for_online_payment(
    *,
    charge: Charge,
    online_payment: Payment,
    payment_attempt: Optional[PaymentAttempt] = None,
    event_id: Optional[str] = None,
    event_type: Optional[str] = None,
    event_created: Optional[datetime] = None,
) -> LedgerSyncResult:
    if not getattr(settings, "ENABLE_LEDGER_SYNC", False):
        OnlinePaymentAuditLog.log_action(
            action=OnlinePaymentAuditAction.SYNC_SKIPPED,
            description="Ledger sync disabled by feature flag",
            charge=charge,
            online_payment=online_payment,
            provider_event_id=event_id,
            metadata={"event_type": event_type},
        )
        return LedgerSyncResult(link=None, created=False, reason="ledger_sync_disabled")

    if event_id:
        existing = OnlinePaymentLedgerLink.objects.filter(provider_event_id=event_id).first()
        if existing:
            OnlinePaymentAuditLog.log_action(
                action=OnlinePaymentAuditAction.SYNC_SKIPPED,
                description="Ledger link already exists for provider_event_id",
                charge=charge,
                online_payment=online_payment,
                financial_payment=existing.financial_payment,
                provider_event_id=event_id,
                metadata={"event_type": event_type},
            )
            return LedgerSyncResult(link=existing, created=False, reason="event_already_linked")

    existing = OnlinePaymentLedgerLink.objects.filter(online_payment=online_payment).first()
    if existing:
        OnlinePaymentAuditLog.log_action(
            action=OnlinePaymentAuditAction.SYNC_SKIPPED,
            description="Ledger link already exists for online_payment",
            charge=charge,
            online_payment=online_payment,
            financial_payment=existing.financial_payment,
            provider_event_id=event_id,
            metadata={"event_type": event_type},
        )
        return LedgerSyncResult(link=existing, created=False, reason="payment_already_linked")

    payment_type, reserve_amount = _resolve_payment_type(charge)
    payer_type, payer_name = _resolve_payer_info(charge)
    payment_date = _resolve_payment_date(event_created)

    try:
        with transaction.atomic():
            financial_payment = FinancialPayment.objects.create(
                apartment=charge.apartment,
                amount=charge.amount,
                reserve_fund_amount=reserve_amount,
                previous_obligations_amount=Decimal("0.00"),
                date=payment_date,
                method="card",
                payment_type=payment_type,
                payer_type=payer_type,
                payer_name=payer_name,
                reference_number=online_payment.provider_payment_id,
                notes=f"Stripe payment for charge {charge.id} ({event_type or 'unknown'})",
            )

            link = OnlinePaymentLedgerLink.objects.create(
                charge=charge,
                payment_attempt=payment_attempt,
                online_payment=online_payment,
                financial_payment=financial_payment,
                provider=online_payment.provider,
                provider_event_id=event_id,
                provider_payment_id=online_payment.provider_payment_id,
                source=LedgerSyncSource.WEBHOOK,
            )

            OnlinePaymentAuditLog.log_action(
                action=OnlinePaymentAuditAction.WEBHOOK_SYNC,
                description="Ledger payment created from webhook",
                charge=charge,
                online_payment=online_payment,
                financial_payment=financial_payment,
                provider_event_id=event_id,
                metadata={
                    "event_type": event_type,
                    "provider_payment_id": online_payment.provider_payment_id,
                },
            )
            return LedgerSyncResult(link=link, created=True, reason="created")
    except IntegrityError:
        existing = OnlinePaymentLedgerLink.objects.filter(online_payment=online_payment).first()
        OnlinePaymentAuditLog.log_action(
            action=OnlinePaymentAuditAction.SYNC_SKIPPED,
            description="Ledger link already exists (IntegrityError)",
            charge=charge,
            online_payment=online_payment,
            financial_payment=existing.financial_payment if existing else None,
            provider_event_id=event_id,
            metadata={"event_type": event_type},
        )
        return LedgerSyncResult(link=existing, created=False, reason="integrity_error")
