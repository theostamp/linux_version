from django.contrib import admin

from .models import (
    AdLandingToken,
    AdPlacementType,
    AdLead,
    AdContract,
    AdCreative,
    AdBillingRecord,
    AdEvent,
)


@admin.register(AdPlacementType)
class AdPlacementTypeAdmin(admin.ModelAdmin):
    list_display = ("code", "display_name", "monthly_price_eur", "max_slots_per_building", "is_active", "updated_at")
    list_filter = ("is_active", "code")
    search_fields = ("code", "display_name")


@admin.register(AdLandingToken)
class AdLandingTokenAdmin(admin.ModelAdmin):
    list_display = ("token", "tenant_schema", "building_id", "campaign_source", "is_active", "expires_at", "created_at")
    list_filter = ("is_active", "tenant_schema")
    search_fields = ("token", "tenant_schema", "campaign_source", "utm_campaign", "utm_source")


@admin.register(AdLead)
class AdLeadAdmin(admin.ModelAdmin):
    list_display = ("business_name", "email", "tenant_schema", "building_id", "category", "created_at")
    list_filter = ("tenant_schema", "category")
    search_fields = ("business_name", "email", "place_id")


@admin.register(AdContract)
class AdContractAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "tenant_schema",
        "building_id",
        "placement_type",
        "status",
        "trial_ends_at",
        "active_until",
        "updated_at",
    )
    list_filter = ("status", "tenant_schema", "placement_type__code")
    search_fields = ("id", "tenant_schema", "stripe_subscription_id", "stripe_customer_id")


@admin.register(AdCreative)
class AdCreativeAdmin(admin.ModelAdmin):
    list_display = ("id", "contract", "status", "headline", "ticker_text", "updated_at")
    list_filter = ("status",)
    search_fields = ("headline", "ticker_text", "body", "cta_url")


@admin.register(AdBillingRecord)
class AdBillingRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "contract", "kind", "status", "amount_eur", "currency", "period_end", "created_at")
    list_filter = ("kind", "status")
    search_fields = ("stripe_checkout_session_id", "stripe_payment_intent_id", "stripe_invoice_id")


@admin.register(AdEvent)
class AdEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "tenant_schema", "building_id", "created_at")
    list_filter = ("event_type", "tenant_schema")
    search_fields = ("event_type", "tenant_schema", "user_agent")


