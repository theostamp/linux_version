from rest_framework import serializers

from .models import DunningEvent, DunningPolicy, DunningRun, PromiseToPay


class DunningPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = DunningPolicy
        fields = [
            "id",
            "building",
            "name",
            "is_active",
            "min_days_overdue",
            "max_days_overdue",
            "channel",
            "frequency_days",
            "escalation_level",
            "max_attempts",
            "template_slug",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "building", "created_by", "created_at", "updated_at"]

    def validate(self, attrs):
        min_days = attrs.get("min_days_overdue", getattr(self.instance, "min_days_overdue", 0))
        max_days = attrs.get("max_days_overdue", getattr(self.instance, "max_days_overdue", None))
        if max_days is not None and max_days < min_days:
            raise serializers.ValidationError("Το max_days_overdue πρέπει να είναι >= min_days_overdue.")
        return attrs


class DunningRunSerializer(serializers.ModelSerializer):
    policy_name = serializers.CharField(source="policy.name", read_only=True)

    class Meta:
        model = DunningRun
        fields = [
            "id",
            "building",
            "policy",
            "policy_name",
            "source",
            "status",
            "month",
            "idempotency_key",
            "total_candidates",
            "total_sent",
            "total_failed",
            "total_skipped",
            "metadata",
            "triggered_by",
            "started_at",
            "finished_at",
            "updated_at",
        ]
        read_only_fields = fields


class DunningEventSerializer(serializers.ModelSerializer):
    apartment_number = serializers.CharField(source="apartment.number", read_only=True)

    class Meta:
        model = DunningEvent
        fields = [
            "id",
            "run",
            "policy",
            "building",
            "apartment",
            "apartment_number",
            "channel",
            "status",
            "recipient",
            "days_overdue",
            "amount_due",
            "attempt_number",
            "provider_message_id",
            "error_code",
            "error_message",
            "trace_id",
            "payload",
            "sent_at",
            "created_at",
        ]
        read_only_fields = fields


class PromiseToPaySerializer(serializers.ModelSerializer):
    apartment_number = serializers.CharField(source="apartment.number", read_only=True)

    class Meta:
        model = PromiseToPay
        fields = [
            "id",
            "building",
            "apartment",
            "apartment_number",
            "resident_user",
            "source_event",
            "amount",
            "promised_date",
            "status",
            "kept_at",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "building", "created_by", "created_at", "updated_at"]

    def validate(self, attrs):
        building_context = self.context.get("building_context")
        apartment = attrs.get("apartment", getattr(self.instance, "apartment", None))
        source_event = attrs.get("source_event", getattr(self.instance, "source_event", None))

        if building_context and apartment and apartment.building_id != building_context.id:
            raise serializers.ValidationError("Το διαμέρισμα δεν ανήκει στο επιλεγμένο κτίριο.")

        if building_context and source_event and source_event.building_id != building_context.id:
            raise serializers.ValidationError("Το source event δεν ανήκει στο επιλεγμένο κτίριο.")

        return attrs


class DunningRunTriggerSerializer(serializers.Serializer):
    policy_id = serializers.PrimaryKeyRelatedField(queryset=DunningPolicy.objects.all())
    month = serializers.RegexField(
        r"^\d{4}-\d{2}$",
        required=False,
        allow_blank=True,
        help_text="YYYY-MM",
    )
    idempotency_key = serializers.CharField(max_length=80, required=False, allow_blank=True)


class DunningRunRetrySerializer(serializers.Serializer):
    idempotency_key = serializers.CharField(max_length=80, required=False, allow_blank=True)
