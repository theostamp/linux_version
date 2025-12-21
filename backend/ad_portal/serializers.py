from __future__ import annotations

from rest_framework import serializers


class PlacementPackageSerializer(serializers.Serializer):
    code = serializers.CharField()
    display_name = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    monthly_price_eur = serializers.DecimalField(max_digits=8, decimal_places=2)
    max_slots_per_building = serializers.IntegerField()
    active_slots = serializers.IntegerField()
    remaining_slots = serializers.IntegerField()
    is_available = serializers.BooleanField()


class LandingBuildingSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    address = serializers.CharField()
    city = serializers.CharField()
    postal_code = serializers.CharField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, allow_null=True, required=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, allow_null=True, required=False)


class LandingResponseSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    tenant_schema = serializers.CharField()
    building_id = serializers.IntegerField()
    token_valid = serializers.BooleanField()
    token_expires_at = serializers.DateTimeField(allow_null=True)
    building = LandingBuildingSerializer()
    packages = PlacementPackageSerializer(many=True)


class StartTrialRequestSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    placement_code = serializers.ChoiceField(choices=["ticker", "banner", "interstitial"])

    email = serializers.EmailField()
    business_name = serializers.CharField(max_length=255)
    place_id = serializers.CharField(max_length=255, required=False, allow_blank=True)
    category = serializers.CharField(max_length=120, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True)

    # GDPR/terms
    consent_terms = serializers.BooleanField()
    consent_marketing = serializers.BooleanField(required=False, default=False)

    # Optional initial creative
    headline = serializers.CharField(max_length=120, required=False, allow_blank=True)
    body = serializers.CharField(max_length=240, required=False, allow_blank=True)
    ticker_text = serializers.CharField(max_length=160, required=False, allow_blank=True)
    image_url = serializers.URLField(required=False, allow_blank=True)
    cta_url = serializers.URLField(required=False, allow_blank=True)


class StartTrialResponseSerializer(serializers.Serializer):
    contract_id = serializers.IntegerField()
    manage_token = serializers.UUIDField()
    status = serializers.CharField()
    trial_ends_at = serializers.DateTimeField(allow_null=True)


class CreativeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    status = serializers.CharField()
    headline = serializers.CharField(allow_blank=True)
    body = serializers.CharField(allow_blank=True)
    ticker_text = serializers.CharField(allow_blank=True)
    image_url = serializers.CharField(allow_blank=True)
    cta_url = serializers.CharField(allow_blank=True)
    updated_at = serializers.DateTimeField()


class ManageResponseSerializer(serializers.Serializer):
    contract_id = serializers.IntegerField()
    tenant_schema = serializers.CharField()
    building_id = serializers.IntegerField()
    placement_code = serializers.CharField()
    monthly_price_eur = serializers.DecimalField(max_digits=8, decimal_places=2)
    status = serializers.CharField()
    trial_ends_at = serializers.DateTimeField(allow_null=True)
    active_until = serializers.DateTimeField(allow_null=True)
    creative = CreativeSerializer(allow_null=True)


class UpdateCreativeRequestSerializer(serializers.Serializer):
    headline = serializers.CharField(max_length=120, required=False, allow_blank=True)
    body = serializers.CharField(max_length=240, required=False, allow_blank=True)
    ticker_text = serializers.CharField(max_length=160, required=False, allow_blank=True)
    image_url = serializers.URLField(required=False, allow_blank=True)
    cta_url = serializers.URLField(required=False, allow_blank=True)


class CheckoutResponseSerializer(serializers.Serializer):
    checkout_url = serializers.URLField()


