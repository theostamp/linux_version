# billing/serializers.py

from rest_framework import serializers
from decimal import Decimal
from typing import Dict, Any

from .models import (
    SubscriptionPlan, UserSubscription, BillingCycle, 
    UsageTracking, PaymentMethod
)
from users.models import CustomUser


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """
    Serializer για subscription plans
    """
    
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'plan_type', 'name', 'description',
            'monthly_price', 'yearly_price',
            'max_buildings', 'max_apartments', 'max_users',
            'max_api_calls', 'max_storage_gb',
            'has_analytics', 'has_custom_integrations',
            'has_priority_support', 'has_white_label',
            'trial_days', 'is_active',
            # Stripe integration fields
            'stripe_product_id', 'stripe_price_id_monthly', 'stripe_price_id_yearly'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'stripe_product_id', 'stripe_price_id_monthly', 'stripe_price_id_yearly']


class UserSubscriptionSerializer(serializers.ModelSerializer):
    """
    Serializer για user subscriptions
    """
    plan = SubscriptionPlanSerializer(read_only=True)
    plan_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = UserSubscription
        fields = [
            'id', 'plan', 'plan_id', 'status', 'billing_interval',
            'trial_start', 'trial_end', 'current_period_start', 'current_period_end',
            'price', 'currency', 'is_trial',
            'canceled_at',
            'tenant_domain',  # Added for frontend redirect
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'plan', 'status', 'trial_start', 'trial_end',
            'current_period_start', 'current_period_end',
            'price', 'currency', 'is_trial', 'cancelled_at',
            'tenant_domain',  # Read-only field set by backend
            'created_at', 'updated_at'
        ]


class BillingCycleSerializer(serializers.ModelSerializer):
    """
    Serializer για billing cycles
    """
    
    class Meta:
        model = BillingCycle
        fields = [
            'id', 'period_start', 'period_end', 'amount_due', 'amount_paid',
            'currency', 'status', 'due_date', 'paid_at',
            'stripe_invoice_id', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'period_start', 'period_end', 'amount_due', 'amount_paid',
            'currency', 'status', 'due_date', 'paid_at',
            'stripe_invoice_id', 'created_at', 'updated_at'
        ]


class UsageTrackingSerializer(serializers.ModelSerializer):
    """
    Serializer για usage tracking
    """
    
    class Meta:
        model = UsageTracking
        fields = [
            'id', 'metric_type', 'current_value', 'limit_value',
            'period_start', 'period_end'
        ]
        read_only_fields = [
            'id', 'current_value', 'limit_value',
            'period_start', 'period_end'
        ]


class PaymentMethodSerializer(serializers.ModelSerializer):
    """
    Serializer για payment methods
    """
    
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'payment_type', 'card_brand', 'card_last4',
            'card_exp_month', 'card_exp_year', 'is_default',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'payment_type', 'card_brand', 'card_last4',
            'card_exp_month', 'card_exp_year', 'created_at', 'updated_at'
        ]


class CreateSubscriptionSerializer(serializers.Serializer):
    """
    Serializer για δημιουργία subscription
    """
    plan_id = serializers.IntegerField()
    billing_interval = serializers.ChoiceField(
        choices=[('month', 'Monthly'), ('year', 'Yearly')],
        default='month'
    )
    payment_method_id = serializers.CharField(
        required=False,
        help_text='Stripe payment method ID'
    )
    
    def validate_plan_id(self, value):
        """
        Επαλήθευση ότι το plan υπάρχει και είναι active
        """
        try:
            plan = SubscriptionPlan.objects.get(id=value, is_active=True)
            return value
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive plan")
    
    def validate(self, attrs):
        """
        Επαλήθευση ότι ο user δεν έχει ήδη active subscription
        """
        user = self.context['request'].user
        
        # Check if user already has active subscription
        existing_subscription = UserSubscription.objects.filter(
            user=user,
            status__in=['trial', 'active']
        ).first()
        
        if existing_subscription:
            raise serializers.ValidationError(
                "User already has an active subscription"
            )
        
        return attrs


class UpdateSubscriptionSerializer(serializers.Serializer):
    """
    Serializer για ενημέρωση subscription
    """
    plan_id = serializers.IntegerField()
    
    def validate_plan_id(self, value):
        """
        Επαλήθευση ότι το plan υπάρχει και είναι active
        """
        try:
            plan = SubscriptionPlan.objects.get(id=value, is_active=True)
            return value
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive plan")
    
    def validate(self, attrs):
        """
        Επαλήθευση ότι ο user έχει active subscription
        """
        user = self.context['request'].user
        
        subscription = UserSubscription.objects.filter(
            user=user,
            status__in=['trial', 'active']
        ).first()
        
        if not subscription:
            raise serializers.ValidationError(
                "No active subscription found"
            )
        
        # Check if trying to change to same plan
        if subscription.plan.id == attrs['plan_id']:
            raise serializers.ValidationError(
                "Cannot change to the same plan"
            )
        
        return attrs


class CancelSubscriptionSerializer(serializers.Serializer):
    """
    Serializer για ακύρωση subscription
    """
    cancel_at_period_end = serializers.BooleanField(default=True)
    
    def validate(self, attrs):
        """
        Επαλήθευση ότι ο user έχει active subscription
        """
        user = self.context['request'].user
        
        subscription = UserSubscription.objects.filter(
            user=user,
            status__in=['trial', 'active']
        ).first()
        
        if not subscription:
            raise serializers.ValidationError(
                "No active subscription found"
            )
        
        return attrs


class AddPaymentMethodSerializer(serializers.Serializer):
    """
    Serializer για προσθήκη payment method
    """
    payment_method_id = serializers.CharField(
        help_text='Stripe payment method ID'
    )
    
    def validate_payment_method_id(self, value):
        """
        Basic validation για Stripe payment method ID format
        """
        if not value.startswith('pm_'):
            raise serializers.ValidationError(
                "Invalid Stripe payment method ID format"
            )
        return value


class PaymentIntentSerializer(serializers.Serializer):
    """
    Serializer για payment intent response
    """
    client_secret = serializers.CharField()
    payment_intent_id = serializers.CharField()


class SubscriptionSummarySerializer(serializers.Serializer):
    """
    Serializer για subscription summary
    """
    subscription = UserSubscriptionSerializer()
    billing_cycles = BillingCycleSerializer(many=True)
    usage_tracking = UsageTrackingSerializer(many=True)
    payment_methods = PaymentMethodSerializer(many=True)
    
    def to_representation(self, instance):
        """
        Custom representation για subscription summary
        """
        subscription = instance
        
        return {
            'subscription': UserSubscriptionSerializer(subscription).data,
            'billing_cycles': BillingCycleSerializer(
                subscription.billing_cycles.all()[:5], many=True
            ).data,
            'usage_tracking': UsageTrackingSerializer(
                subscription.usage_tracking.all(), many=True
            ).data,
            'payment_methods': PaymentMethodSerializer(
                PaymentMethod.objects.filter(user=subscription.user), many=True
            ).data,
            'plan_features': {
                'has_analytics': subscription.plan.has_analytics,
                'has_custom_integrations': subscription.plan.has_custom_integrations,
                'has_priority_support': subscription.plan.has_priority_support,
                'has_white_label': subscription.plan.has_white_label,
            },
            'limits': {
                'buildings': subscription.plan.max_buildings,
                'apartments': subscription.plan.max_apartments,
                'users': subscription.plan.max_users,
                'api_calls': subscription.plan.max_api_calls,
                'storage_gb': subscription.plan.max_storage_gb,
            }
        }


