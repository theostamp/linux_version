from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.db import connection
from django.db.models import Count, Q
from django.utils import timezone
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from buildings.models import Building

from .models import (
    AdContract,
    AdContractStatus,
    AdCreative,
    AdCreativeStatus,
    AdEvent,
    AdLead,
    AdLandingToken,
    AdPlacementType,
)
from .serializers import (
    LandingResponseSerializer,
    ManageResponseSerializer,
    CheckoutResponseSerializer,
    StartTrialRequestSerializer,
    StartTrialResponseSerializer,
    UpdateCreativeRequestSerializer,
)
from .services.stripe_checkout import create_checkout_for_ad_manual, create_checkout_for_ad_subscription


def _active_contracts_q(*, tenant_schema: str, building_id: int):
    """
    Active contracts for slot counting / kiosk eligibility.
    Note: Runs in PUBLIC schema.
    """
    now = timezone.now()
    return AdContract.objects.filter(tenant_schema=tenant_schema, building_id=building_id).filter(
        Q(status=AdContractStatus.ACTIVE_PAID)
        | Q(status=AdContractStatus.TRIAL_ACTIVE, trial_ends_at__isnull=True)
        | Q(status=AdContractStatus.TRIAL_ACTIVE, trial_ends_at__gt=now)
    )


def _record_event(*, event_type: str, tenant_schema: str, building_id: int | None, landing_token=None, contract=None, request=None, metadata=None):
    metadata = metadata or {}
    ip = None
    ua = ""
    if request is not None:
        ip = request.META.get("REMOTE_ADDR")
        ua = (request.META.get("HTTP_USER_AGENT") or "")[:2000]

    AdEvent.objects.create(
        event_type=event_type,
        tenant_schema=tenant_schema or "",
        building_id=building_id,
        landing_token=landing_token,
        contract=contract,
        metadata=metadata,
        ip_address=ip,
        user_agent=ua,
    )


def _resolve_frontend_base(request) -> str:
    """
    Prefer the tenant domain (from headers) in production so Stripe redirects back to the right tenant.
    """
    base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    try:
        if not getattr(settings, "DEBUG", False):
            host = (
                request.headers.get("X-Tenant-Host")
                or request.headers.get("x-forwarded-host")
                or request.headers.get("host")
                or ""
            ).split(":")[0]
            if host:
                base = f"https://{host}"
    except Exception:
        pass
    return base.rstrip("/")


class LandingBootstrapView(APIView):
    """
    Public landing bootstrap endpoint.
    Returns building + packages + availability for a landing token.
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request, token):
        current_schema = connection.schema_name

        with schema_context("public"):
            lt = AdLandingToken.objects.filter(token=token).first()
            if not lt:
                return Response({"error": "Invalid token"}, status=status.HTTP_404_NOT_FOUND)

            # Optional safety: if request is routed through a tenant schema, enforce match.
            if current_schema not in ("public", "information_schema") and lt.tenant_schema and current_schema != lt.tenant_schema:
                return Response({"error": "Token/tenant mismatch"}, status=status.HTTP_404_NOT_FOUND)

            if not lt.is_active or lt.is_expired:
                return Response(
                    {"error": "Token expired or inactive", "token_expires_at": lt.expires_at},
                    status=status.HTTP_410_GONE,
                )

            # Packages
            placements = list(AdPlacementType.objects.filter(is_active=True).order_by("monthly_price_eur", "code"))

            active = _active_contracts_q(tenant_schema=lt.tenant_schema, building_id=lt.building_id)
            counts = {
                row["placement_type_id"]: row["c"]
                for row in active.values("placement_type_id").annotate(c=Count("id"))
            }

            packages = []
            for p in placements:
                active_slots = int(counts.get(p.id, 0))
                remaining = max(0, int(p.max_slots_per_building) - active_slots)
                packages.append(
                    {
                        "code": p.code,
                        "display_name": p.display_name,
                        "description": p.description or "",
                        "monthly_price_eur": p.monthly_price_eur,
                        "max_slots_per_building": int(p.max_slots_per_building),
                        "active_slots": active_slots,
                        "remaining_slots": remaining,
                        "is_available": remaining > 0,
                    }
                )

            # Building info lives in tenant schema.
            with schema_context(lt.tenant_schema):
                building = Building.objects.filter(id=lt.building_id).first()
                if not building:
                    return Response({"error": "Building not found"}, status=status.HTTP_404_NOT_FOUND)

                building_payload = {
                    "id": building.id,
                    "name": building.name,
                    "address": building.address,
                    "city": building.city,
                    "postal_code": building.postal_code,
                    "latitude": building.latitude,
                    "longitude": building.longitude,
                }

            _record_event(
                event_type="landing_view",
                tenant_schema=lt.tenant_schema,
                building_id=lt.building_id,
                landing_token=lt,
                request=request,
                metadata={"placement_count": len(packages)},
            )

            resp = {
                "token": lt.token,
                "tenant_schema": lt.tenant_schema,
                "building_id": lt.building_id,
                "token_valid": True,
                "token_expires_at": lt.expires_at,
                "building": building_payload,
                "packages": packages,
            }

        return Response(LandingResponseSerializer(resp).data)


class StartTrialView(APIView):
    """
    Public trial start (no card).
    Creates lead + contract + initial creative and returns manage_token.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        req = StartTrialRequestSerializer(data=request.data)
        req.is_valid(raise_exception=True)
        data = req.validated_data

        if not data.get("consent_terms"):
            return Response({"error": "consent_terms is required"}, status=status.HTTP_400_BAD_REQUEST)

        current_schema = connection.schema_name

        with schema_context("public"):
            lt = AdLandingToken.objects.filter(token=data["token"]).first()
            if not lt or not lt.is_active or lt.is_expired:
                return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)

            if current_schema not in ("public", "information_schema") and lt.tenant_schema and current_schema != lt.tenant_schema:
                return Response({"error": "Token/tenant mismatch"}, status=status.HTTP_404_NOT_FOUND)

            placement = AdPlacementType.objects.filter(code=data["placement_code"], is_active=True).first()
            if not placement:
                return Response({"error": "Invalid placement"}, status=status.HTTP_400_BAD_REQUEST)

            active_for_placement = _active_contracts_q(tenant_schema=lt.tenant_schema, building_id=lt.building_id).filter(
                placement_type=placement
            )
            if active_for_placement.count() >= placement.max_slots_per_building:
                return Response({"error": "No slots available"}, status=status.HTTP_409_CONFLICT)

            # Upsert lead
            lead, created = AdLead.objects.get_or_create(
                tenant_schema=lt.tenant_schema,
                building_id=lt.building_id,
                email=data["email"].lower().strip(),
                defaults={
                    "business_name": data["business_name"].strip(),
                    "place_id": data.get("place_id", "") or "",
                    "category": data.get("category", "") or "",
                    "phone": data.get("phone", "") or "",
                    "consent_terms": bool(data.get("consent_terms")),
                    "consent_marketing": bool(data.get("consent_marketing")),
                    "source_token": lt,
                },
            )
            if not created:
                # keep latest info (non-destructive)
                lead.business_name = data["business_name"].strip() or lead.business_name
                lead.place_id = data.get("place_id", "") or lead.place_id
                lead.category = data.get("category", "") or lead.category
                lead.phone = data.get("phone", "") or lead.phone
                lead.consent_terms = bool(data.get("consent_terms")) or lead.consent_terms
                lead.consent_marketing = bool(data.get("consent_marketing")) or lead.consent_marketing
                lead.source_token = lead.source_token or lt
                lead.save(update_fields=["business_name", "place_id", "category", "phone", "consent_terms", "consent_marketing", "source_token"])

            # Prevent duplicate concurrent trials for same email+placement
            now = timezone.now()
            existing = AdContract.objects.filter(
                tenant_schema=lt.tenant_schema,
                building_id=lt.building_id,
                lead=lead,
                placement_type=placement,
            ).filter(
                Q(status=AdContractStatus.TRIAL_ACTIVE, trial_ends_at__gt=now)
                | Q(status=AdContractStatus.ACTIVE_PAID)
            )
            if existing.exists():
                return Response({"error": "Existing active contract found"}, status=status.HTTP_409_CONFLICT)

            trial_ends = now + timedelta(days=30)
            contract = AdContract.objects.create(
                tenant_schema=lt.tenant_schema,
                building_id=lt.building_id,
                lead=lead,
                placement_type=placement,
                status=AdContractStatus.TRIAL_ACTIVE,
                trial_started_at=now,
                trial_ends_at=trial_ends,
            )

            # Initial creative (text-first)
            headline = (data.get("headline") or "").strip()
            body = (data.get("body") or "").strip()
            ticker_text = (data.get("ticker_text") or "").strip()
            if not ticker_text:
                cat = (lead.category or "").strip()
                base = lead.business_name.strip()
                ticker_text = f"{base} — {cat}" if cat else base
                ticker_text = ticker_text[:160]

            AdCreative.objects.create(
                contract=contract,
                headline=headline,
                body=body,
                ticker_text=ticker_text,
                image_url=(data.get("image_url") or "").strip(),
                cta_url=(data.get("cta_url") or "").strip(),
                status=AdCreativeStatus.DRAFT,
            )

            _record_event(
                event_type="trial_started",
                tenant_schema=lt.tenant_schema,
                building_id=lt.building_id,
                landing_token=lt,
                contract=contract,
                request=request,
                metadata={"placement": placement.code},
            )

            # Fire-and-forget: send trial started email (Celery if available)
            try:
                from ad_portal.tasks import send_ad_portal_trial_started_email_task
                send_ad_portal_trial_started_email_task.delay(contract.id)
            except Exception:
                # Celery not running or import error - best-effort sync
                try:
                    from ad_portal.email_service import send_trial_started_email
                    send_trial_started_email(contract=contract)
                except Exception:
                    pass

            resp = {
                "contract_id": contract.id,
                "manage_token": contract.manage_token,
                "status": contract.status,
                "trial_ends_at": contract.trial_ends_at,
            }

        return Response(StartTrialResponseSerializer(resp).data, status=status.HTTP_201_CREATED)


class ManageView(APIView):
    """
    Public manage endpoint (token-auth via manage_token).
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request, manage_token):
        with schema_context("public"):
            contract = AdContract.objects.select_related("placement_type").filter(manage_token=manage_token).first()
            if not contract:
                return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

            # Auto-expire trial if needed
            if contract.status == AdContractStatus.TRIAL_ACTIVE and contract.trial_ends_at and timezone.now() >= contract.trial_ends_at:
                contract.status = AdContractStatus.TRIAL_EXPIRED
                contract.save(update_fields=["status", "updated_at"])

            creative = contract.creatives.order_by("-updated_at").first()
            creative_payload = None
            if creative:
                creative_payload = {
                    "id": creative.id,
                    "status": creative.status,
                    "headline": creative.headline or "",
                    "body": creative.body or "",
                    "ticker_text": creative.ticker_text or "",
                    "image_url": creative.image_url or "",
                    "cta_url": creative.cta_url or "",
                    "updated_at": creative.updated_at,
                }

            _record_event(
                event_type="manage_view",
                tenant_schema=contract.tenant_schema,
                building_id=contract.building_id,
                contract=contract,
                request=request,
                metadata={"status": contract.status},
            )

            payload = {
                "contract_id": contract.id,
                "tenant_schema": contract.tenant_schema,
                "building_id": contract.building_id,
                "placement_code": contract.placement_type.code,
                "monthly_price_eur": contract.placement_type.monthly_price_eur,
                "status": contract.status,
                "trial_ends_at": contract.trial_ends_at,
                "active_until": contract.active_until,
                "creative": creative_payload,
            }

        return Response(ManageResponseSerializer(payload).data)


class UpdateCreativeView(APIView):
    """
    Update creative for a manage token (token-auth).
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request, manage_token):
        req = UpdateCreativeRequestSerializer(data=request.data)
        req.is_valid(raise_exception=True)
        data = req.validated_data

        with schema_context("public"):
            contract = AdContract.objects.filter(manage_token=manage_token).first()
            if not contract:
                return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

            creative = contract.creatives.order_by("-updated_at").first()
            if not creative:
                creative = AdCreative.objects.create(contract=contract, status=AdCreativeStatus.DRAFT)

            # Only update provided fields
            for field in ("headline", "body", "ticker_text", "image_url", "cta_url"):
                if field in data:
                    setattr(creative, field, (data.get(field) or "").strip())

            creative.status = AdCreativeStatus.PENDING if creative.status == AdCreativeStatus.DRAFT else creative.status
            creative.save()

            _record_event(
                event_type="creative_updated",
                tenant_schema=contract.tenant_schema,
                building_id=contract.building_id,
                contract=contract,
                request=request,
                metadata={"creative_id": creative.id},
            )

            payload = {
                "contract_id": contract.id,
                "tenant_schema": contract.tenant_schema,
                "building_id": contract.building_id,
                "placement_code": contract.placement_type.code,
                "monthly_price_eur": contract.placement_type.monthly_price_eur,
                "status": contract.status,
                "trial_ends_at": contract.trial_ends_at,
                "active_until": contract.active_until,
                "creative": {
                    "id": creative.id,
                    "status": creative.status,
                    "headline": creative.headline or "",
                    "body": creative.body or "",
                    "ticker_text": creative.ticker_text or "",
                    "image_url": creative.image_url or "",
                    "cta_url": creative.cta_url or "",
                    "updated_at": creative.updated_at,
                },
            }

        return Response(ManageResponseSerializer(payload).data)


class CheckoutManualView(APIView):
    """
    Manual monthly renewal (1-click checkout each month).
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request, manage_token):
        if not getattr(settings, "STRIPE_SECRET_KEY", None):
            return Response({"error": "Stripe not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        with schema_context("public"):
            contract = (
                AdContract.objects.select_related("placement_type")
                .filter(manage_token=manage_token)
                .first()
            )
            if not contract:
                return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

            frontend = _resolve_frontend_base(request)
            success_url = f"{frontend}/advertise/manage/{contract.manage_token}?checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{frontend}/advertise/manage/{contract.manage_token}?checkout=cancel"

            result = create_checkout_for_ad_manual(contract=contract, success_url=success_url, cancel_url=cancel_url)
            _record_event(
                event_type="checkout_started",
                tenant_schema=contract.tenant_schema,
                building_id=contract.building_id,
                contract=contract,
                request=request,
                metadata={"mode": "manual"},
            )
            return Response(CheckoutResponseSerializer({"checkout_url": result["checkout_url"]}).data)


class CheckoutSubscriptionView(APIView):
    """
    Auto-renew subscription (recommended).
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request, manage_token):
        if not getattr(settings, "STRIPE_SECRET_KEY", None):
            return Response({"error": "Stripe not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        with schema_context("public"):
            contract = (
                AdContract.objects.select_related("placement_type")
                .filter(manage_token=manage_token)
                .first()
            )
            if not contract:
                return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

            frontend = _resolve_frontend_base(request)
            success_url = f"{frontend}/advertise/manage/{contract.manage_token}?checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{frontend}/advertise/manage/{contract.manage_token}?checkout=cancel"

            result = create_checkout_for_ad_subscription(contract=contract, success_url=success_url, cancel_url=cancel_url)
            _record_event(
                event_type="checkout_started",
                tenant_schema=contract.tenant_schema,
                building_id=contract.building_id,
                contract=contract,
                request=request,
                metadata={"mode": "subscription"},
            )
            return Response(CheckoutResponseSerializer({"checkout_url": result["checkout_url"]}).data)


