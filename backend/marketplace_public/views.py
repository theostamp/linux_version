from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, Optional

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from buildings.models import Building
from core.permissions import IsUltraAdmin

from .models import MarketplaceProvider
from .serializers import MarketplaceProviderSerializer
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


