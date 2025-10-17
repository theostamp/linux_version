# billing/admin.py

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import (
    SubscriptionPlan, UserSubscription, BillingCycle,
    UsageTracking, PaymentMethod
)


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'plan_type', 'monthly_price', 'yearly_price',
        'max_buildings', 'max_users', 'is_active', 'trial_days'
    ]
    list_filter = ['plan_type', 'is_active', 'has_analytics', 'has_custom_integrations']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'plan_type', 'description', 'is_active')
        }),
        ('Pricing', {
            'fields': ('monthly_price', 'yearly_price')
        }),
        ('Limits', {
            'fields': ('max_buildings', 'max_apartments', 'max_users', 'max_api_calls', 'max_storage_gb')
        }),
        ('Features', {
            'fields': ('has_analytics', 'has_custom_integrations', 'has_priority_support', 'has_white_label')
        }),
        ('Trial', {
            'fields': ('trial_days',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'user_email', 'plan_name', 'status', 'billing_interval',
        'current_period_end', 'price', 'is_trial_display'
    ]
    list_filter = ['status', 'billing_interval', 'plan__plan_type', 'currency']
    search_fields = ['user__email', 'stripe_subscription_id', 'stripe_customer_id']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'current_period_end'
    
    fieldsets = (
        ('Subscription Details', {
            'fields': ('user', 'plan', 'status', 'billing_interval')
        }),
        ('Dates', {
            'fields': ('trial_start', 'trial_end', 'current_period_start', 'current_period_end', 'canceled_at')
        }),
        ('Payment', {
            'fields': ('stripe_subscription_id', 'stripe_customer_id', 'payment_method_id', 'price', 'currency')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'
    
    def plan_name(self, obj):
        return obj.plan.name
    plan_name.short_description = 'Plan'
    
    def is_trial_display(self, obj):
        if obj.is_trial:
            return format_html('<span style="color: orange;">Trial</span>')
        return format_html('<span style="color: green;">Active</span>')
    is_trial_display.short_description = 'Trial Status'


@admin.register(BillingCycle)
class BillingCycleAdmin(admin.ModelAdmin):
    list_display = [
        'subscription_user', 'status', 'period_start', 'period_end',
        'total_amount', 'currency', 'due_date', 'paid_at'
    ]
    list_filter = ['status', 'currency']
    search_fields = ['subscription__user__email', 'stripe_invoice_id']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'due_date'
    
    fieldsets = (
        ('Billing Details', {
            'fields': ('subscription', 'status', 'period_start', 'period_end', 'due_date')
        }),
        ('Amounts', {
            'fields': ('subtotal', 'tax_amount', 'total_amount', 'currency')
        }),
        ('Payment', {
            'fields': ('stripe_invoice_id', 'paid_at')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def subscription_user(self, obj):
        return obj.subscription.user.email
    subscription_user.short_description = 'User'


@admin.register(UsageTracking)
class UsageTrackingAdmin(admin.ModelAdmin):
    list_display = [
        'subscription_user', 'metric_type', 'usage_count',
        'usage_limit', 'usage_percentage_display', 'period_start'
    ]
    list_filter = ['metric_type', 'period_start']
    search_fields = ['subscription__user__email']
    readonly_fields = ['recorded_at']
    date_hierarchy = 'period_start'
    
    def subscription_user(self, obj):
        return obj.subscription.user.email
    subscription_user.short_description = 'User'
    
    def usage_percentage_display(self, obj):
        percentage = obj.usage_percentage
        if percentage > 90:
            color = 'red'
        elif percentage > 75:
            color = 'orange'
        else:
            color = 'green'
        return format_html(
            '<span style="color: {};">{:.1f}%</span>',
            color, percentage
        )
    usage_percentage_display.short_description = 'Usage %'


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = [
        'user_email', 'payment_type', 'card_display',
        'is_default', 'is_active', 'created_at'
    ]
    list_filter = ['payment_type', 'is_default', 'is_active', 'card_brand']
    search_fields = ['user__email', 'stripe_payment_method_id']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Payment Method', {
            'fields': ('user', 'payment_type', 'stripe_payment_method_id')
        }),
        ('Card Details', {
            'fields': ('card_brand', 'card_last4', 'card_exp_month', 'card_exp_year'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_default', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'
    
    def card_display(self, obj):
        if obj.payment_type == 'card' and obj.card_last4:
            return f"{obj.card_brand} •••• {obj.card_last4}"
        return obj.get_payment_type_display()
    card_display.short_description = 'Payment Method'


