from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, Optional

from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from buildings.models import Building
from core.permissions import IsUltraAdmin
from core.emailing import send_templated_email

from .models import MarketplaceOfferRequest, MarketplaceOfferRequestStatus, MarketplaceProvider
from .serializers import MarketplaceOfferRequestSerializer, MarketplaceProviderSerializer
from .utils import haversine_km, safe_float


def _is_ultra_user(user) -> bool:
    return bool(
        user
        and getattr(user, "is_authenticated", False)
        and getattr(user, "role", None) == "admin"
        and getattr(user, "is_superuser", False)
        and getattr(user, "is_staff", False)
    )


class MarketplaceProviderViewSet(viewsets.ModelViewSet):
    """
    Marketplace Providers (PUBLIC schema).

    - list/retrieve: authenticated users
    - write: Ultra Admin only
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = MarketplaceProviderSerializer
    pagination_class = None  # Keep predictable array response + distance ordering

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["service_type", "is_verified", "is_featured"]
    search_fields = ["name", "short_description", "detailed_description"]
    ordering_fields = ["is_featured", "rating", "created_at", "name"]
    ordering = ["-is_featured", "-rating", "name"]

    def get_queryset(self):
        qs = MarketplaceProvider.objects.all()

        # Default: regular users see only active + visible providers.
        if self.action in ["list", "retrieve"] and not _is_ultra_user(self.request.user):
            qs = qs.filter(is_active=True, show_in_marketplace=True)

        return qs

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsUltraAdmin()]

    def list(self, request, *args, **kwargs):
        """
        List providers with optional geolocation sorting:
        - building_id=<int> OR lat=<float>&lng=<float>
        - max_distance_km=<float>
        """
        queryset = self.filter_queryset(self.get_queryset())

        origin_lat: Optional[float] = None
        origin_lng: Optional[float] = None

        building_id_raw = request.query_params.get("building_id") or request.query_params.get("building")
        lat_raw = request.query_params.get("lat") or request.query_params.get("latitude")
        lng_raw = request.query_params.get("lng") or request.query_params.get("longitude")

        if building_id_raw:
            try:
                building_id = int(building_id_raw)
            except ValueError:
                return Response({"error": "Invalid building_id"}, status=status.HTTP_400_BAD_REQUEST)

            building = Building.objects.filter(id=building_id).first()
            if not building:
                return Response({"error": "Building not found"}, status=status.HTTP_404_NOT_FOUND)

            origin_lat = safe_float(building.latitude)
            origin_lng = safe_float(building.longitude)
        else:
            origin_lat = safe_float(lat_raw)
            origin_lng = safe_float(lng_raw)

        max_distance_km = safe_float(request.query_params.get("max_distance_km") or request.query_params.get("radius_km"))

        providers = list(queryset)
        distances: Dict[str, Optional[float]] = {}

        # Precompute distances (when coords exist)
        for p in providers:
            p_lat = safe_float(p.latitude)
            p_lng = safe_float(p.longitude)

            distance_km: Optional[float] = None
            if origin_lat is not None and origin_lng is not None and p_lat is not None and p_lng is not None:
                distance_km = haversine_km(origin_lat, origin_lng, p_lat, p_lng)

            distances[str(p.id)] = distance_km

        # Distance-based filtering
        filtered: list[MarketplaceProvider] = []
        for p in providers:
            d = distances.get(str(p.id))

            # Provider-level radius (optional)
            if not p.is_nationwide and d is not None and p.service_radius_km is not None:
                try:
                    radius_val = float(p.service_radius_km)
                    if d > radius_val:
                        continue
                except Exception:
                    pass

            # Request-level max distance (optional)
            if max_distance_km is not None and not p.is_nationwide and d is not None and d > max_distance_km:
                continue

            filtered.append(p)

        # Sorting: distance asc (if available), then featured, then rating
        def sort_key(p: MarketplaceProvider):
            d = distances.get(str(p.id))
            has_distance = d is not None
            return (
                0 if has_distance else 1,
                d if d is not None else 10**9,
                0 if p.is_featured else 1,
                -float(p.rating or Decimal("0.00")),
                (p.name or "").lower(),
            )

        filtered.sort(key=sort_key)

        serializer = self.get_serializer(filtered, many=True, context={"distances": distances})
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()

        origin_lat: Optional[float] = None
        origin_lng: Optional[float] = None

        building_id_raw = request.query_params.get("building_id") or request.query_params.get("building")
        lat_raw = request.query_params.get("lat") or request.query_params.get("latitude")
        lng_raw = request.query_params.get("lng") or request.query_params.get("longitude")

        if building_id_raw:
            try:
                building_id = int(building_id_raw)
            except ValueError:
                return Response({"error": "Invalid building_id"}, status=status.HTTP_400_BAD_REQUEST)

            building = Building.objects.filter(id=building_id).first()
            if building:
                origin_lat = safe_float(building.latitude)
                origin_lng = safe_float(building.longitude)
        else:
            origin_lat = safe_float(lat_raw)
            origin_lng = safe_float(lng_raw)

        distance_km: Optional[float] = None
        if origin_lat is not None and origin_lng is not None:
            p_lat = safe_float(obj.latitude)
            p_lng = safe_float(obj.longitude)
            if p_lat is not None and p_lng is not None:
                distance_km = haversine_km(origin_lat, origin_lng, p_lat, p_lng)

        serializer = self.get_serializer(obj, context={"distances": {str(obj.id): distance_km}})
        return Response(serializer.data)


class MarketplaceOfferRequestViewSet(viewsets.ModelViewSet):
    """
    RFQ flow:
    - create/list/retrieve: authenticated users (tenant-side)
    - by-token retrieve/submit: AllowAny (provider-side)
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = MarketplaceOfferRequestSerializer
    pagination_class = None

    def get_queryset(self):
        # Requests are stored in public schema. Filter by current tenant schema to avoid leakage.
        from django.db import connection
        tenant_schema = getattr(connection, "schema_name", "") or ""
        return MarketplaceOfferRequest.objects.filter(tenant_schema=tenant_schema).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        """
        Create an offer request and send email to provider with a magic-link.
        Payload: { provider_id, project_id, message_to_provider? }
        """
        from django.db import connection
        from django_tenants.utils import schema_context

        provider_id = request.data.get("provider_id") or request.data.get("provider")
        project_id = request.data.get("project_id") or request.data.get("project")
        message_to_provider = (request.data.get("message_to_provider") or "").strip()

        if not provider_id or not project_id:
            return Response({"detail": "provider_id και project_id είναι υποχρεωτικά."}, status=status.HTTP_400_BAD_REQUEST)

        tenant_schema = getattr(connection, "schema_name", None) or ""
        tenant_host = (request.META.get("HTTP_X_TENANT_HOST") or "").split(":")[0].strip()

        # Fetch tenant project snapshot
        try:
            from projects.models import Project
            project = Project.objects.select_related("building").filter(id=project_id).first()
        except Exception:
            project = None
        if not project:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        # Fetch provider (public schema)
        with schema_context("public"):
            provider = MarketplaceProvider.objects.filter(id=provider_id).first()
            if not provider:
                return Response({"detail": "Provider not found."}, status=status.HTTP_404_NOT_FOUND)
            if not provider.email:
                return Response({"detail": "Ο provider δεν έχει email για αποστολή προσφοράς."}, status=status.HTTP_400_BAD_REQUEST)

            obj = MarketplaceOfferRequest.objects.create(
                tenant_schema=tenant_schema,
                tenant_host=tenant_host,
                building_id=getattr(project, "building_id", None),
                project_id=project.id,
                provider_id=provider.id,
                provider_name_snapshot=provider.name,
                provider_email_snapshot=provider.email,
                provider_phone_snapshot=provider.phone,
                project_title_snapshot=project.title,
                project_description_snapshot=project.description,
                requested_by_user_id=getattr(request.user, "id", None),
                requested_by_email_snapshot=getattr(request.user, "email", "") or "",
                message_to_provider=message_to_provider,
                status=MarketplaceOfferRequestStatus.SENT,
                email_sent_at=timezone.now(),
            )

            # Build provider form URL (prefer tenant host if available)
            base_frontend = ""
            if tenant_host:
                base_frontend = f"https://{tenant_host}".rstrip("/")
            else:
                base_frontend = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
            provider_form_url = f"{base_frontend}/marketplace/offer-request/{obj.token}"

            # Send email
            send_templated_email(
                to=provider.email,
                subject=f"Αίτημα προσφοράς: {project.title}",
                template_html="emails/marketplace_offer_request.html",
                context={
                    "provider_name": provider.name,
                    "project_title": project.title,
                    "project_description": project.description,
                    "building_name": getattr(project.building, "name", ""),
                    "building_address": getattr(project.building, "address", ""),
                    "message_to_provider": message_to_provider,
                    "provider_form_url": provider_form_url,
                },
                sender_user=request.user,
            )

            data = MarketplaceOfferRequestSerializer(obj).data
            data["provider_form_url"] = provider_form_url
            return Response(data, status=status.HTTP_201_CREATED)

    @action(
        detail=False,
        methods=["get"],
        url_path=r"by-token/(?P<token>[^/.]+)",
        authentication_classes=[],
        permission_classes=[AllowAny],
    )
    def by_token(self, request, token=None):
        from django_tenants.utils import schema_context

        with schema_context("public"):
            obj = MarketplaceOfferRequest.objects.filter(token=token).first()
            if not obj:
                return Response({"detail": "Invalid token."}, status=status.HTTP_404_NOT_FOUND)

            # Mark opened
            if obj.status == MarketplaceOfferRequestStatus.SENT:
                obj.status = MarketplaceOfferRequestStatus.OPENED
                obj.opened_at = timezone.now()
                obj.save(update_fields=["status", "opened_at", "updated_at"])

            return Response(
                {
                    "token": str(obj.token),
                    "status": obj.status,
                    "provider_name": obj.provider_name_snapshot,
                    "project_title": obj.project_title_snapshot,
                    "project_description": obj.project_description_snapshot,
                    "message_to_provider": obj.message_to_provider,
                }
            )

    @action(
        detail=False,
        methods=["post"],
        url_path=r"by-token/(?P<token>[^/.]+)/submit",
        authentication_classes=[],
        permission_classes=[AllowAny],
        parser_classes=[MultiPartParser, FormParser],
    )
    def submit_by_token(self, request, token=None):
        """
        Provider submits offer fields + optional files (multipart).
        Creates Offer in tenant schema + OfferFile attachments.
        """
        from decimal import Decimal
        from django_tenants.utils import schema_context

        with schema_context("public"):
            obj = MarketplaceOfferRequest.objects.filter(token=token).first()
            if not obj:
                return Response({"detail": "Invalid token."}, status=status.HTTP_404_NOT_FOUND)
            if obj.status == MarketplaceOfferRequestStatus.CANCELLED:
                return Response({"detail": "Request cancelled."}, status=status.HTTP_400_BAD_REQUEST)

            provider = MarketplaceProvider.objects.filter(id=obj.provider_id).first()

        # Extract fields (strings) from multipart
        def _get(name: str) -> str:
            return (request.data.get(name) or "").strip()

        amount_raw = _get("amount")
        if not amount_raw:
            return Response({"amount": ["Το ποσό είναι υποχρεωτικό."]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(amount_raw)
        except Exception:
            return Response({"amount": ["Μη έγκυρο ποσό."]}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({"amount": ["Το ποσό πρέπει να είναι > 0."]}, status=status.HTTP_400_BAD_REQUEST)

        advance_raw = _get("advance_payment")
        advance_payment = None
        if advance_raw:
            try:
                advance_payment = Decimal(advance_raw)
            except Exception:
                return Response({"advance_payment": ["Μη έγκυρη προκαταβολή."]}, status=status.HTTP_400_BAD_REQUEST)
            if advance_payment < 0:
                return Response({"advance_payment": ["Η προκαταβολή δεν μπορεί να είναι αρνητική."]}, status=status.HTTP_400_BAD_REQUEST)
            if advance_payment > amount:
                return Response({"advance_payment": ["Η προκαταβολή δεν μπορεί να είναι μεγαλύτερη από το ποσό."]}, status=status.HTTP_400_BAD_REQUEST)

        payment_method = _get("payment_method") or None
        installments = request.data.get("installments")
        installments_val = None
        if installments not in (None, "", []):
            try:
                installments_val = int(installments)
            except Exception:
                return Response({"installments": ["Μη έγκυρος αριθμός δόσεων."]}, status=status.HTTP_400_BAD_REQUEST)
            if installments_val <= 0:
                return Response({"installments": ["Ο αριθμός δόσεων πρέπει να είναι > 0."]}, status=status.HTTP_400_BAD_REQUEST)

        if payment_method == "installments" and (installments_val is None or installments_val <= 0):
            return Response({"installments": ["Οι δόσεις είναι υποχρεωτικές όταν ο τρόπος πληρωμής είναι Δόσεις."]}, status=status.HTTP_400_BAD_REQUEST)
        if payment_method == "one_time" and installments_val and installments_val > 1:
            return Response({"installments": ["Η εφάπαξ πληρωμή δεν μπορεί να έχει δόσεις > 1."]}, status=status.HTTP_400_BAD_REQUEST)

        completion_time = _get("completion_time") or None
        warranty_period = _get("warranty_period") or None
        description = _get("description") or None
        payment_terms = _get("payment_terms") or None

        # Create Offer + OfferFiles in tenant schema
        with schema_context(obj.tenant_schema):
            from projects.models import Offer, Project, OfferFile

            project = Project.objects.filter(id=obj.project_id).first()
            if not project:
                return Response({"detail": "Project not found in tenant."}, status=status.HTTP_400_BAD_REQUEST)

            offer = Offer.objects.create(
                project=project,
                contractor_name=(provider.name if provider else obj.provider_name_snapshot),
                contractor_contact="",
                contractor_phone=(provider.phone if provider else obj.provider_phone_snapshot) or None,
                contractor_email=(provider.email if provider else obj.provider_email_snapshot) or None,
                contractor_address=(provider.address if provider else None) if provider else None,
                marketplace_provider_id=obj.provider_id,
                amount=amount,
                description=description,
                payment_terms=payment_terms,
                payment_method=payment_method,
                installments=installments_val,
                advance_payment=advance_payment,
                warranty_period=warranty_period,
                completion_time=completion_time,
                status="submitted",
            )

            files = request.FILES.getlist("files") or []
            for f in files:
                OfferFile.objects.create(
                    offer=offer,
                    file=f,
                    filename=getattr(f, "name", "attachment"),
                    file_type=getattr(f, "content_type", "") or "",
                    file_size=getattr(f, "size", None),
                    uploaded_by=None,
                )

        # Update request record (public schema)
        with schema_context("public"):
            req = MarketplaceOfferRequest.objects.filter(token=token).first()
            if req:
                req.status = MarketplaceOfferRequestStatus.SUBMITTED
                req.submitted_at = timezone.now()
                req.submitted_offer_id = offer.id
                req.save(update_fields=["status", "submitted_at", "submitted_offer_id", "updated_at"])

        return Response({"offer_id": str(offer.id), "status": "submitted"}, status=status.HTTP_201_CREATED)


