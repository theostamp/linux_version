from __future__ import annotations

from rest_framework import serializers

from .models import MarketplaceCommission, MarketplaceOfferRequest, MarketplaceProvider


class MarketplaceProviderSerializer(serializers.ModelSerializer):
    service_type_display = serializers.CharField(source="get_service_type_display", read_only=True)
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = MarketplaceProvider
        fields = [
            "id",
            "name",
            "service_type",
            "service_type_display",
            "rating",
            "phone",
            "email",
            "website",
            "address",
            "is_verified",
            "is_featured",
            "short_description",
            "detailed_description",
            "special_offers",
            "coupon_code",
            "coupon_description",
            "portfolio_links",
            "latitude",
            "longitude",
            "is_nationwide",
            "service_radius_km",
            "show_in_marketplace",
            "is_active",
            "created_at",
            "updated_at",
            "distance_km",
        ]
        read_only_fields = ["created_at", "updated_at", "distance_km", "service_type_display"]

    def get_distance_km(self, obj: MarketplaceProvider):
        distances = self.context.get("distances") or {}
        value = distances.get(str(obj.id)) or distances.get(obj.id)
        if value is None:
            return None
        try:
            return round(float(value), 2)
        except Exception:
            return None


class MarketplaceCommissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketplaceCommission
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class MarketplaceOfferRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketplaceOfferRequest
        fields = "__all__"
        read_only_fields = ["id", "token", "tenant_schema", "created_at", "updated_at", "email_sent_at", "opened_at", "submitted_at"]


