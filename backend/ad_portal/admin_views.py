from __future__ import annotations

from datetime import timedelta

from django.db import connection
from django.utils import timezone
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsUltraAdmin


class AdPlacementListView(APIView):
    """
    Ultra-admin only: list placements and pricing config (public schema).
    """

    permission_classes = [IsAuthenticated, IsUltraAdmin]

    def get(self, request):
        with schema_context("public"):
            from ad_portal.models import AdPlacementType

            rows = list(
                AdPlacementType.objects.all()
                .order_by("monthly_price_eur", "code")
                .values(
                    "code",
                    "display_name",
                    "description",
                    "monthly_price_eur",
                    "max_slots_per_building",
                    "is_active",
                    "updated_at",
                )
            )
            return Response({"placements": rows})


class AdPlacementUpdateView(APIView):
    """
    Ultra-admin only: update one placement by code.
    """

    permission_classes = [IsAuthenticated, IsUltraAdmin]

    def patch(self, request, code: str):
        allowed = {"display_name", "description", "monthly_price_eur", "max_slots_per_building", "is_active"}
        payload = {k: v for k, v in (request.data or {}).items() if k in allowed}

        with schema_context("public"):
            from ad_portal.models import AdPlacementType

            p = AdPlacementType.objects.filter(code=code).first()
            if not p:
                return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

            for k, v in payload.items():
                setattr(p, k, v)
            p.save()

            return Response(
                {
                    "code": p.code,
                    "display_name": p.display_name,
                    "description": p.description,
                    "monthly_price_eur": p.monthly_price_eur,
                    "max_slots_per_building": p.max_slots_per_building,
                    "is_active": p.is_active,
                    "updated_at": p.updated_at,
                }
            )


class AdTokenCreateView(APIView):
    """
    Ultra-admin only: create an AdLandingToken for a building.
    """

    permission_classes = [IsAuthenticated, IsUltraAdmin]

    def post(self, request):
        building_id = request.data.get("building_id")
        try:
            building_id_int = int(building_id)
        except Exception:
            return Response({"error": "building_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Determine tenant schema from current request context
        tenant_schema = connection.schema_name
        if tenant_schema == "public":
            tenant_schema = (request.data.get("tenant_schema") or "").strip()
            if not tenant_schema:
                return Response({"error": "tenant_schema is required when called from public schema"}, status=status.HTTP_400_BAD_REQUEST)

        expires_days = int(request.data.get("expires_days") or 60)
        expires_at = timezone.now() + timedelta(days=expires_days)

        campaign_source = (request.data.get("campaign_source") or "ui").strip()
        utm_source = (request.data.get("utm_source") or "letter").strip()
        utm_medium = (request.data.get("utm_medium") or "qr").strip()
        utm_campaign = (request.data.get("utm_campaign") or "local_ads").strip()

        with schema_context("public"):
            from ad_portal.models import AdLandingToken

            token = AdLandingToken.objects.create(
                tenant_schema=tenant_schema,
                building_id=building_id_int,
                campaign_source=campaign_source,
                utm_source=utm_source,
                utm_medium=utm_medium,
                utm_campaign=utm_campaign,
                expires_at=expires_at,
                is_active=True,
            )

        # Build landing URL using the current host (tenant aware)
        host = (
            request.headers.get("X-Tenant-Host")
            or request.headers.get("x-forwarded-host")
            or request.headers.get("host")
            or ""
        ).split(":")[0]
        base = f"https://{host}" if host else "http://localhost:3000"
        landing_url = f"{base}/advertise/{token.token}?utm_source={utm_source}&utm_medium={utm_medium}&utm_campaign={utm_campaign}"

        return Response(
            {
                "token": str(token.token),
                "tenant_schema": token.tenant_schema,
                "building_id": token.building_id,
                "expires_at": token.expires_at,
                "landing_url": landing_url,
            },
            status=status.HTTP_201_CREATED,
        )


