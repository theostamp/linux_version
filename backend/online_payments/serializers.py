from rest_framework import serializers

from .models import Charge, ManualPayment, Payment, PaymentAttempt, PayeeSettings


class PayeeSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayeeSettings
        fields = [
            "id",
            "mode",
            "client_funds_iban",
            "office_fees_iban",
            "provider",
            "created_at",
            "updated_at",
        ]


class ChargeSerializer(serializers.ModelSerializer):
    routed_to = serializers.SerializerMethodField()

    class Meta:
        model = Charge
        fields = [
            "id",
            "building",
            "apartment",
            "resident_user_id",
            "category",
            "amount",
            "currency",
            "period",
            "description",
            "status",
            "due_date",
            "created_by_user_id",
            "paid_at",
            "created_at",
            "updated_at",
            "routed_to",
        ]
        read_only_fields = ["created_at", "updated_at", "paid_at", "created_by_user_id", "resident_user_id"]

    def get_routed_to(self, obj: Charge) -> str:
        return obj.compute_routed_to()


class PaymentAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAttempt
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = ["created_at"]


class ManualPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManualPayment
        fields = "__all__"


class CheckoutRequestSerializer(serializers.Serializer):
    charge_id = serializers.UUIDField()


class CheckoutResponseSerializer(serializers.Serializer):
    checkout_url = serializers.URLField()
    provider_session_id = serializers.CharField()


