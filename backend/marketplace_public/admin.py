from django.contrib import admin

from .models import (
    MarketplaceCommission,
    MarketplaceCommissionPolicy,
    MarketplaceOfferRequest,
    MarketplaceProvider,
)


@admin.register(MarketplaceProvider)
class MarketplaceProviderAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "service_type",
        "is_featured",
        "is_verified",
        "rating",
        "show_in_marketplace",
        "is_active",
        "updated_at",
    )
    list_filter = ("service_type", "is_featured", "is_verified", "show_in_marketplace", "is_active")
    search_fields = ("name", "short_description", "detailed_description", "email", "phone")
    ordering = ("-is_featured", "-is_verified", "-rating", "name")


@admin.register(MarketplaceCommission)
class MarketplaceCommissionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "tenant_schema",
        "building_id",
        "project_id",
        "offer_id",
        "provider_name_snapshot",
        "gross_amount",
        "commission_rate_percent",
        "commission_amount",
        "status",
        "created_at",
    )
    list_filter = ("status", "tenant_schema")
    search_fields = ("provider_name_snapshot", "tenant_schema")
    ordering = ("-created_at",)


@admin.register(MarketplaceCommissionPolicy)
class MarketplaceCommissionPolicyAdmin(admin.ModelAdmin):
    list_display = (
        "service_type",
        "base_commission_rate_percent",
        "featured_bonus_commission_rate_percent",
        "is_active",
        "updated_at",
    )
    list_filter = ("is_active", "service_type")
    ordering = ("service_type",)


@admin.register(MarketplaceOfferRequest)
class MarketplaceOfferRequestAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "status",
        "tenant_schema",
        "project_title_snapshot",
        "provider_name_snapshot",
        "provider_email_snapshot",
    )
    list_filter = ("status", "tenant_schema")
    search_fields = ("project_title_snapshot", "provider_name_snapshot", "provider_email_snapshot", "tenant_schema")
    readonly_fields = ("id", "token", "created_at", "updated_at", "email_sent_at", "opened_at", "submitted_at")
    ordering = ("-created_at",)


