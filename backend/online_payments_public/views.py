import json
import logging
from datetime import datetime

import stripe
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django_tenants.utils import schema_context
from rest_framework.views import APIView

from online_payments_public.models import WebhookEvent, WebhookProcessingStatus

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """
    Stripe webhook handler for online payments (charges).
    Runs on PUBLIC schema and switches into tenant schema via metadata.tenant_schema.
    """

    authentication_classes = []  # Stripe doesn't authenticate with JWT
    permission_classes = []  # handled by signature verification

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

        # Parse & verify signature
        signature_valid = False
        event = None
        try:
            if settings.STRIPE_WEBHOOK_SECRET and sig_header:
                event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
                signature_valid = True
            else:
                # Dev fallback: parse without verification only if explicitly in mock mode.
                if not getattr(settings, "STRIPE_MOCK_MODE", False):
                    return HttpResponse(status=400)
                event = json.loads(payload)
                signature_valid = False
        except Exception as e:
            logger.error(f"[ONLINE_PAYMENTS][WEBHOOK] Signature/parse error: {e}")
            return HttpResponse(status=400)

        event_id = event.get("id")
        event_type = event.get("type")
        event_created_ts = event.get("created")
        event_created = None
        if event_created_ts:
            event_created = datetime.fromtimestamp(event_created_ts, tz=timezone.utc)

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
            tenant_schema = metadata.get("tenant_schema")
            charge_id = metadata.get("charge_id")
            building_id = metadata.get("building_id")

            if not tenant_schema or not charge_id:
                raise ValueError("Missing tenant_schema/charge_id in metadata")

            with schema_context(str(tenant_schema)):
                from online_payments.models import Charge, Payment, PaymentAttempt, ChargeStatus, PaymentAttemptStatus
                from online_payments.services.ledger_sync import sync_ledger_for_online_payment

                charge = Charge.objects.get(id=charge_id)

                # Map events
                if event_type == "checkout.session.completed":
                    session_id = obj.get("id")
                    payment_intent_id = obj.get("payment_intent")
                    # Update attempt
                    PaymentAttempt.objects.filter(provider_session_id=session_id).update(
                        status=PaymentAttemptStatus.SUCCEEDED,
                        provider_payment_intent_id=payment_intent_id,
                        updated_at=timezone.now(),
                    )
                    # Create payment record (provider_payment_id uses payment_intent if available else session id)
                    provider_payment_id = payment_intent_id or session_id
                    online_payment, _created = Payment.objects.get_or_create(
                        provider_payment_id=provider_payment_id,
                        defaults={
                            "charge": charge,
                            "provider": "stripe",
                            "paid_at": timezone.now(),
                            "amount": charge.amount,
                            "currency": charge.currency,
                            "method": "unknown",
                            "routed_to": charge.compute_routed_to(),
                            "raw_summary": {"event_id": event_id, "type": event_type, "building_id": building_id},
                        },
                    )
                    payment_attempt = PaymentAttempt.objects.filter(provider_session_id=session_id).first()
                    charge.status = ChargeStatus.PAID
                    charge.paid_at = timezone.now()
                    charge.save(update_fields=["status", "paid_at", "updated_at"])
                    sync_ledger_for_online_payment(
                        charge=charge,
                        online_payment=online_payment,
                        payment_attempt=payment_attempt,
                        event_id=event_id,
                        event_type=event_type,
                        event_created=event_created,
                    )

                elif event_type == "payment_intent.payment_failed":
                    pi_id = obj.get("id")
                    PaymentAttempt.objects.filter(provider_payment_intent_id=pi_id).update(
                        status=PaymentAttemptStatus.FAILED,
                        updated_at=timezone.now(),
                    )
                    charge.status = ChargeStatus.FAILED
                    charge.save(update_fields=["status", "updated_at"])

                elif event_type == "payment_intent.succeeded":
                    pi_id = obj.get("id")
                    # Hard confirm if needed
                    PaymentAttempt.objects.filter(provider_payment_intent_id=pi_id).update(
                        status=PaymentAttemptStatus.SUCCEEDED,
                        updated_at=timezone.now(),
                    )
                    online_payment, _created = Payment.objects.get_or_create(
                        provider_payment_id=pi_id,
                        defaults={
                            "charge": charge,
                            "provider": "stripe",
                            "paid_at": timezone.now(),
                            "amount": charge.amount,
                            "currency": charge.currency,
                            "method": "unknown",
                            "routed_to": charge.compute_routed_to(),
                            "raw_summary": {"event_id": event_id, "type": event_type, "building_id": building_id},
                        },
                    )
                    charge.status = ChargeStatus.PAID
                    charge.paid_at = timezone.now()
                    charge.save(update_fields=["status", "paid_at", "updated_at"])
                    payment_attempt = PaymentAttempt.objects.filter(provider_payment_intent_id=pi_id).first()
                    sync_ledger_for_online_payment(
                        charge=charge,
                        online_payment=online_payment,
                        payment_attempt=payment_attempt,
                        event_id=event_id,
                        event_type=event_type,
                        event_created=event_created,
                    )

                else:
                    logger.info(f"[ONLINE_PAYMENTS][WEBHOOK] Unhandled event type: {event_type}")

            we.processed_at = timezone.now()
            we.processing_status = WebhookProcessingStatus.OK
            we.save(update_fields=["processed_at", "processing_status"])
            return HttpResponse(status=200)

        except Exception as e:
            logger.error(f"[ONLINE_PAYMENTS][WEBHOOK] Processing error: {e}", exc_info=True)
            we.processed_at = timezone.now()
            we.processing_status = WebhookProcessingStatus.FAILED
            we.error_message = str(e)
            we.save(update_fields=["processed_at", "processing_status", "error_message"])
            return HttpResponse(status=500)

