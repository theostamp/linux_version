import json
import logging
from datetime import datetime, timedelta, timezone as dt_timezone

import stripe
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django_tenants.utils import schema_context
from rest_framework.views import APIView

from ad_portal.models import AdBillingKind, AdBillingRecord, AdBillingStatus, AdContract, AdContractStatus
from ad_portal.services.stripe_checkout import mark_contract_paid_period
from .models import WebhookEvent, WebhookProcessingStatus

logger = logging.getLogger(__name__)


def _ts_to_dt(ts: int | None):
    if not ts:
        return None
    return datetime.fromtimestamp(int(ts), tz=dt_timezone.utc)


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """
    Stripe webhook handler for Ad Portal.
    Runs on PUBLIC schema and updates public ad_portal models.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

        signature_valid = False
        event = None
        try:
            secret = getattr(settings, "AD_PORTAL_STRIPE_WEBHOOK_SECRET", None) or getattr(settings, "STRIPE_WEBHOOK_SECRET", None)
            if secret and sig_header:
                event = stripe.Webhook.construct_event(payload, sig_header, secret)
                signature_valid = True
            else:
                if not getattr(settings, "STRIPE_MOCK_MODE", False):
                    return HttpResponse(status=400)
                event = json.loads(payload)
                signature_valid = False
        except Exception as e:
            logger.error(f"[AD_PORTAL][WEBHOOK] Signature/parse error: {e}")
            return HttpResponse(status=400)

        event_id = event.get("id")
        event_type = event.get("type")

        with schema_context("public"):
            # Idempotency
            if event_id and WebhookEvent.objects.filter(event_id=event_id).exists():
                WebhookEvent.objects.filter(event_id=event_id).update(
                    processed_at=timezone.now(),
                    processing_status=WebhookProcessingStatus.DUPLICATE,
                )
                return HttpResponse(status=200)

            we = WebhookEvent.objects.create(
                provider="stripe",
                event_id=event_id or "",
                signature_valid=signature_valid,
                payload_json=event,
                processing_status=WebhookProcessingStatus.OK,
            )

            try:
                obj = (event.get("data") or {}).get("object") or {}
                metadata = obj.get("metadata") or {}

                if event_type == "checkout.session.completed":
                    session_id = obj.get("id")
                    payment_intent_id = obj.get("payment_intent")
                    subscription_id = obj.get("subscription")
                    customer_id = obj.get("customer")

                    contract_id = metadata.get("ad_contract_id")
                    billing_kind = metadata.get("billing_kind") or ("subscription" if subscription_id else "manual")

                    if not contract_id:
                        raise ValueError("Missing ad_contract_id in metadata")

                    contract = AdContract.objects.select_related("placement_type").get(id=contract_id)

                    # Update billing record created at checkout start
                    AdBillingRecord.objects.filter(stripe_checkout_session_id=session_id, contract=contract).update(
                        status=AdBillingStatus.PAID,
                        stripe_payment_intent_id=payment_intent_id or "",
                        raw_summary={"event_id": event_id, "type": event_type, "billing_kind": billing_kind},
                    )

                    if billing_kind == "manual":
                        period_end = timezone.now() + timedelta(days=30)
                        AdBillingRecord.objects.filter(stripe_checkout_session_id=session_id, contract=contract).update(
                            period_start=timezone.now(),
                            period_end=period_end,
                        )
                        mark_contract_paid_period(
                            contract=contract,
                            period_end=period_end,
                            payment_meta={"session_id": session_id, "payment_intent": payment_intent_id},
                        )
                        try:
                            from ad_portal.models import AdEvent
                            AdEvent.objects.create(
                                event_type="payment_success",
                                tenant_schema=contract.tenant_schema,
                                building_id=contract.building_id,
                                contract=contract,
                                metadata={"placement": contract.placement_type.code, "mode": "manual"},
                            )
                        except Exception:
                            pass
                        try:
                            from ad_portal.tasks import send_ad_portal_payment_success_email_task
                            send_ad_portal_payment_success_email_task.delay(contract.id)
                        except Exception:
                            pass

                    else:
                        # Subscription
                        contract.stripe_customer_id = customer_id or contract.stripe_customer_id
                        contract.stripe_subscription_id = subscription_id or contract.stripe_subscription_id
                        contract.stripe_subscription_status = "active"
                        contract.status = AdContractStatus.ACTIVE_PAID

                        period_end = None
                        if subscription_id and getattr(settings, "STRIPE_SECRET_KEY", None):
                            try:
                                stripe.api_key = settings.STRIPE_SECRET_KEY
                                sub = stripe.Subscription.retrieve(subscription_id)
                                contract.stripe_subscription_status = sub.get("status") or contract.stripe_subscription_status
                                period_end = _ts_to_dt(sub.get("current_period_end"))
                            except Exception as sub_err:
                                logger.warning(f"[AD_PORTAL][WEBHOOK] Failed to retrieve subscription: {sub_err}")

                        contract.last_payment_at = timezone.now()
                        if period_end:
                            contract.active_until = period_end
                        contract.save(update_fields=[
                            "stripe_customer_id",
                            "stripe_subscription_id",
                            "stripe_subscription_status",
                            "status",
                            "last_payment_at",
                            "active_until",
                            "updated_at",
                        ])

                        AdBillingRecord.objects.filter(stripe_checkout_session_id=session_id, contract=contract).update(
                            period_start=timezone.now(),
                            period_end=period_end,
                        )
                        try:
                            from ad_portal.models import AdEvent
                            AdEvent.objects.create(
                                event_type="payment_success",
                                tenant_schema=contract.tenant_schema,
                                building_id=contract.building_id,
                                contract=contract,
                                metadata={"placement": contract.placement_type.code, "mode": "subscription"},
                            )
                        except Exception:
                            pass
                        try:
                            from ad_portal.tasks import send_ad_portal_payment_success_email_task
                            send_ad_portal_payment_success_email_task.delay(contract.id)
                        except Exception:
                            pass

                elif event_type == "invoice.paid":
                    invoice_id = obj.get("id")
                    subscription_id = obj.get("subscription")
                    currency = (obj.get("currency") or "eur").upper()
                    amount_paid = obj.get("amount_paid") or 0
                    if not invoice_id:
                        raise ValueError("Missing invoice id")

                    # Determine contract by subscription id (preferred)
                    contract = None
                    if subscription_id:
                        contract = AdContract.objects.filter(stripe_subscription_id=subscription_id).first()

                    # Try metadata fallback
                    if not contract:
                        inv_meta = obj.get("metadata") or {}
                        cid = inv_meta.get("ad_contract_id")
                        if cid:
                            contract = AdContract.objects.filter(id=cid).first()

                    if not contract:
                        raise ValueError("Unable to resolve contract for invoice.paid")

                    # period end: use invoice lines if present
                    period_end_ts = None
                    try:
                        lines = (obj.get("lines") or {}).get("data") or []
                        if lines and (lines[0].get("period") or {}).get("end"):
                            period_end_ts = (lines[0].get("period") or {}).get("end")
                    except Exception:
                        period_end_ts = None

                    period_end = _ts_to_dt(period_end_ts)

                    AdBillingRecord.objects.get_or_create(
                        contract=contract,
                        kind=AdBillingKind.SUBSCRIPTION,
                        stripe_invoice_id=invoice_id or "",
                        defaults={
                            "status": AdBillingStatus.PAID,
                            "amount_eur": (amount_paid / 100) if amount_paid else contract.placement_type.monthly_price_eur,
                            "currency": currency,
                            "period_start": timezone.now(),
                            "period_end": period_end,
                            "raw_summary": {"event_id": event_id, "type": event_type, "subscription": subscription_id},
                        },
                    )

                    contract.status = AdContractStatus.ACTIVE_PAID
                    contract.last_payment_at = timezone.now()
                    if period_end:
                        contract.active_until = period_end
                    contract.save(update_fields=["status", "last_payment_at", "active_until", "updated_at"])

                elif event_type == "invoice.payment_failed":
                    subscription_id = obj.get("subscription")
                    if subscription_id:
                        contract = AdContract.objects.filter(stripe_subscription_id=subscription_id).first()
                        AdContract.objects.filter(stripe_subscription_id=subscription_id).update(
                            status=AdContractStatus.PAUSED,
                            updated_at=timezone.now(),
                        )
                        if contract:
                            try:
                                from ad_portal.models import AdEvent
                                AdEvent.objects.create(
                                    event_type="payment_failed",
                                    tenant_schema=contract.tenant_schema,
                                    building_id=contract.building_id,
                                    contract=contract,
                                    metadata={"placement": contract.placement_type.code, "mode": "subscription"},
                                )
                            except Exception:
                                pass
                            try:
                                from ad_portal.tasks import send_ad_portal_payment_failed_email_task
                                send_ad_portal_payment_failed_email_task.delay(contract.id)
                            except Exception:
                                pass

                elif event_type == "customer.subscription.deleted":
                    subscription_id = obj.get("id")
                    if subscription_id:
                        AdContract.objects.filter(stripe_subscription_id=subscription_id).update(
                            status=AdContractStatus.CANCELLED,
                            updated_at=timezone.now(),
                        )

                else:
                    logger.info(f"[AD_PORTAL][WEBHOOK] Unhandled event type: {event_type}")

                we.processed_at = timezone.now()
                we.processing_status = WebhookProcessingStatus.OK
                we.save(update_fields=["processed_at", "processing_status"])
                return HttpResponse(status=200)

            except Exception as e:
                logger.error(f"[AD_PORTAL][WEBHOOK] Processing error: {e}", exc_info=True)
                we.processed_at = timezone.now()
                we.processing_status = WebhookProcessingStatus.FAILED
                we.error_message = str(e)
                we.save(update_fields=["processed_at", "processing_status", "error_message"])
                return HttpResponse(status=500)


