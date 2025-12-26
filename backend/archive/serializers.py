from rest_framework import serializers
from .models import ArchiveDocument


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
