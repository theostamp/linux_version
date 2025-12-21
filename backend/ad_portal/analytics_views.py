from __future__ import annotations

from datetime import timedelta

from django.db import connection
from django.db.models import Count
from django.utils import timezone
from django_tenants.utils import schema_context
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsUltraAdmin


class AdAnalyticsSummaryView(APIView):
    """
    Minimal funnel analytics for Ad Portal.
    Auth: Ultra Admin only.
    """

    permission_classes = [IsAuthenticated, IsUltraAdmin]

    def get(self, request):
        tenant_schema = connection.schema_name
        building_id = request.GET.get("building_id")
        days = int(request.GET.get("days", "30") or 30)
        since = timezone.now() - timedelta(days=days)

        with schema_context("public"):
            from ad_portal.models import AdEvent

            qs = AdEvent.objects.filter(tenant_schema=tenant_schema, created_at__gte=since)
            if building_id:
                try:
                    bid = int(building_id)
                    qs = qs.filter(building_id=bid)
                except Exception:
                    pass

            by_type = dict(qs.values("event_type").annotate(c=Count("id")).values_list("event_type", "c"))

            # Placement breakdown for key conversion steps (from metadata.placement where available)
            placement_counts = (
                qs.filter(event_type__in=["trial_started", "checkout_started", "payment_success"])
                .values("event_type", "metadata__placement")
                .annotate(c=Count("id"))
                .order_by("event_type")
            )

            placement_breakdown = {}
            for row in placement_counts:
                et = row.get("event_type") or "unknown"
                plc = row.get("metadata__placement") or "unknown"
                placement_breakdown.setdefault(et, {})
                placement_breakdown[et][plc] = int(row.get("c") or 0)

            return Response(
                {
                    "tenant_schema": tenant_schema,
                    "building_id": int(building_id) if building_id and str(building_id).isdigit() else None,
                    "since": since,
                    "days": days,
                    "counts": {k: int(v) for k, v in by_type.items()},
                    "placement_breakdown": placement_breakdown,
                }
            )


