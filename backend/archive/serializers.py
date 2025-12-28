from rest_framework import serializers
from .models import ArchiveDocument
from core.file_hashing import sha256_hexdigest


class ArchiveDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(
        source="uploaded_by.get_full_name", read_only=True
    )
    building_name = serializers.CharField(source="building.name", read_only=True)
    file_url = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        if request:
            return f"/api/archive/documents/{obj.id}/preview/"
        return None

    def get_download_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        if request:
            return f"/api/archive/documents/{obj.id}/download/"
        return None

    def create(self, validated_data):
        file = validated_data.get("file")
        if file:
            validated_data["original_filename"] = file.name
            validated_data["file_size"] = file.size
            validated_data["mime_type"] = file.content_type
        return super().create(validated_data)

    def validate(self, attrs):
        """
        Prevent duplicate archive documents:
        - Same file content (SHA-256) within the same building
        - Same supplier_vat + document_number + document_date within the same building (when provided)
        """
        building = attrs.get("building") or getattr(self.instance, "building", None)

        # Normalize important string fields (avoid duplicates due to whitespace)
        if "supplier_vat" in attrs and isinstance(attrs.get("supplier_vat"), str):
            attrs["supplier_vat"] = attrs["supplier_vat"].strip()
        if "document_number" in attrs and isinstance(attrs.get("document_number"), str):
            attrs["document_number"] = attrs["document_number"].strip()

        uploaded_file = attrs.get("file")
        if uploaded_file and building:
            file_hash = sha256_hexdigest(uploaded_file)
            attrs["file_hash"] = file_hash
            qs = ArchiveDocument.objects.filter(building=building, file_hash=file_hash)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"file": "Το ίδιο αρχείο υπάρχει ήδη στο Ηλεκτρονικό Αρχείο για αυτό το κτίριο."}
                )

        supplier_vat = (attrs.get("supplier_vat") or getattr(self.instance, "supplier_vat", "") or "").strip()
        document_number = (attrs.get("document_number") or getattr(self.instance, "document_number", "") or "").strip()
        document_date = attrs.get("document_date") if "document_date" in attrs else getattr(self.instance, "document_date", None)

        if building and supplier_vat and document_number and document_date:
            qs = ArchiveDocument.objects.filter(
                building=building,
                supplier_vat__iexact=supplier_vat,
                document_number__iexact=document_number,
                document_date=document_date,
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"document_number": "Υπάρχει ήδη παραστατικό με ίδιο ΑΦΜ, αριθμό και ημερομηνία για αυτό το κτίριο."}
                )

        return attrs

    class Meta:
        model = ArchiveDocument
        fields = [
            "id",
            "building",
            "building_name",
            "uploaded_by",
            "uploaded_by_name",
            "category",
            "document_type",
            "document_number",
            "supplier_name",
            "supplier_vat",
            "document_date",
            "amount",
            "currency",
            "title",
            "description",
            "metadata",
            "file",
            "file_url",
            "download_url",
            "original_filename",
            "file_size",
            "mime_type",
            "linked_expense",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "uploaded_by",
            "original_filename",
            "file_size",
            "mime_type",
            "created_at",
            "updated_at",
        ]
