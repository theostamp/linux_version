from django.contrib import admin

from .models import Charge, ManualPayment, Payment, PaymentAttempt, PayeeSettings


@admin.register(Charge)
class ChargeAdmin(admin.ModelAdmin):
    list_display = ("id", "building", "apartment", "category", "amount", "currency", "period", "status", "paid_at")
    list_filter = ("status", "category", "period", "currency")
    search_fields = ("id", "description")


@admin.register(PaymentAttempt)
class PaymentAttemptAdmin(admin.ModelAdmin):
    list_display = ("id", "charge", "provider", "provider_session_id", "status", "amount", "currency", "created_at")
    list_filter = ("provider", "status")
    search_fields = ("provider_session_id", "provider_payment_intent_id")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "charge", "provider", "provider_payment_id", "paid_at", "amount", "currency", "routed_to")
    list_filter = ("provider", "currency", "routed_to")
    search_fields = ("provider_payment_id",)


@admin.register(ManualPayment)
class ManualPaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "charge", "method", "recorded_by_user_id", "recorded_at")
    list_filter = ("method",)


@admin.register(PayeeSettings)
class PayeeSettingsAdmin(admin.ModelAdmin):
    list_display = ("id", "mode", "provider", "updated_at")


