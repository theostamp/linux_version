from rest_framework import serializers
from .models import Client, Domain

class DomainSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Domain
        fields = ("id", "domain", "is_primary")

class TenantSerializer(serializers.ModelSerializer):
    domains = DomainSerializer(source="domain_set", many=True, read_only=True)

    class Meta:
        model  = Client
        fields = (
            "id", "schema_name", "name",
            "building", "paid_until", "on_trial",
            "domains",
        )
        read_only_fields = ("schema_name",)
