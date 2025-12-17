import csv
import logging
from typing import Any

from django.db.models import Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from online_payments.models import Charge, ChargeStatus, ManualPayment, PayeeSettings
from online_payments.serializers import (
    ChargeSerializer,
    CheckoutRequestSerializer,
    CheckoutResponseSerializer,
    PayeeSettingsSerializer,
)
from online_payments.services.stripe_checkout import create_checkout_for_charge

logger = logging.getLogger(__name__)


def _is_office_level(user: Any) -> bool:
    role = getattr(user, "role", None)
    return bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False) or role in {"manager", "admin", "office_staff", "staff"})


class ChargeViewSet(viewsets.ModelViewSet):
    queryset = Charge.objects.select_related("building", "apartment").all()
    serializer_class = ChargeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()

        building_id = self.request.query_params.get("building")
        status_param = self.request.query_params.get("status")
        period = self.request.query_params.get("period")
        category = self.request.query_params.get("category")
        apartment_id = self.request.query_params.get("apartment")

        if building_id:
            qs = qs.filter(building_id=building_id)
        if apartment_id:
            qs = qs.filter(apartment_id=apartment_id)
        if status_param:
            qs = qs.filter(status=status_param)
        if period:
            qs = qs.filter(period=period)
        if category:
            qs = qs.filter(category=category)

        # Resident visibility: only their own charges (owner/tenant user id)
        if not _is_office_level(self.request.user):
            qs = qs.filter(resident_user_id=self.request.user.id)

        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        # default resident is the logged-in user if not office-level
        resident_user_id = None if _is_office_level(self.request.user) else self.request.user.id
        serializer.save(created_by_user_id=self.request.user.id, resident_user_id=resident_user_id)

    def partial_update(self, request, *args, **kwargs):
        # Allow office-level edits only
        if not _is_office_level(request.user):
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        if not _is_office_level(request.user) and obj.resident_user_id != request.user.id:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    def mark_paid(self, request, pk=None):
        charge = self.get_object()
        if not _is_office_level(request.user):
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        method = request.data.get("method")
        note = request.data.get("note")
        attachment_url = request.data.get("attachment_url")

        ManualPayment.objects.create(
            charge=charge,
            method=method,
            recorded_by_user_id=request.user.id,
            recorded_at=timezone.now(),
            note=note,
            attachment_url=attachment_url,
        )
        charge.status = ChargeStatus.PAID
        charge.paid_at = timezone.now()
        charge.save(update_fields=["status", "paid_at", "updated_at"])
        return Response(ChargeSerializer(charge).data)


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        req = CheckoutRequestSerializer(data=request.data)
        req.is_valid(raise_exception=True)
        charge_id = req.validated_data["charge_id"]

        try:
            charge = Charge.objects.select_related("apartment", "building").get(id=charge_id)
        except Charge.DoesNotExist:
            return Response({"error": "Charge not found"}, status=status.HTTP_404_NOT_FOUND)

        if not _is_office_level(request.user) and charge.resident_user_id != request.user.id:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        result = create_checkout_for_charge(charge=charge, customer_email=getattr(request.user, "email", None))
        resp = CheckoutResponseSerializer(result)
        return Response(resp.data)


class MyPaymentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # MVP: expose paid charges for resident
        qs = Charge.objects.filter(resident_user_id=request.user.id).exclude(status=ChargeStatus.UNPAID).order_by("-updated_at")
        return Response(ChargeSerializer(qs, many=True).data)


class BuildingPaymentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_office_level(request.user):
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        building_id = request.query_params.get("building")
        qs = Charge.objects.all()
        if building_id:
            qs = qs.filter(building_id=building_id)
        qs = qs.exclude(status=ChargeStatus.UNPAID).order_by("-updated_at")
        return Response(ChargeSerializer(qs, many=True).data)


class ReconciliationSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_office_level(request.user):
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        building_id = request.query_params.get("building")
        period = request.query_params.get("period")
        qs = Charge.objects.all()
        if building_id:
            qs = qs.filter(building_id=building_id)
        if period:
            qs = qs.filter(period=period)

        totals = qs.values("status").annotate(total_amount=Sum("amount")).order_by("status")
        return Response(
            {
                "building": building_id,
                "period": period,
                "totals_by_status": list(totals),
                "total_amount": float(qs.aggregate(total=Sum("amount"))["total"] or 0),
            }
        )


class ReconciliationExportCsvView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_office_level(request.user):
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        building_id = request.query_params.get("building")
        period = request.query_params.get("period")
        qs = Charge.objects.select_related("building", "apartment").all()
        if building_id:
            qs = qs.filter(building_id=building_id)
        if period:
            qs = qs.filter(period=period)

        resp = HttpResponse(content_type="text/csv")
        resp["Content-Disposition"] = 'attachment; filename="reconciliation.csv"'
        writer = csv.writer(resp)
        writer.writerow(["charge_id", "building_id", "apartment_id", "period", "category", "amount", "currency", "status", "paid_at", "routed_to"])
        for c in qs.order_by("-created_at"):
            writer.writerow([str(c.id), c.building_id, c.apartment_id, c.period, c.category, str(c.amount), c.currency, c.status, c.paid_at.isoformat() if c.paid_at else "", c.compute_routed_to()])
        return resp


class PayeeSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_office_level(request.user):
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        obj = PayeeSettings.objects.first()
        if not obj:
            obj = PayeeSettings.objects.create()
        return Response(PayeeSettingsSerializer(obj).data)

    def put(self, request):
        if not _is_office_level(request.user):
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        obj = PayeeSettings.objects.first()
        if not obj:
            obj = PayeeSettings.objects.create()
        ser = PayeeSettingsSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


