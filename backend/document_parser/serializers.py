from rest_framework import serializers
from .models import DocumentUpload
from core.file_hashing import sha256_hexdigest


class DocumentUploadSerializer(serializers.ModelSerializer):
    """Serializer for DocumentUpload model"""

    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    file_url = serializers.SerializerMethodField()

    def get_file_url(self, obj):
        """Generate URL for file preview"""
        if obj.file:
            request = self.context.get('request')
            if request:
                # Return the preview endpoint URL (allows iframe)
                return f"/api/parser/uploads/{obj.id}/preview/"
        return None

    def create(self, validated_data):
        """Override create to extract filename and file info from uploaded file"""
        file = validated_data.get('file')
        if file:
            validated_data['original_filename'] = file.name
            validated_data['file_size'] = file.size
            validated_data['mime_type'] = file.content_type

            # Generate file URL for preview
            if hasattr(file, 'url'):
                validated_data['original_file_url'] = file.url

        return super().create(validated_data)

    def validate(self, attrs):
        """
        Prevent duplicate uploads for the same building based on file content hash (SHA-256).
        """
        building = attrs.get("building") or getattr(self.instance, "building", None)
        uploaded_file = attrs.get("file")

        if building and uploaded_file:
            file_hash = sha256_hexdigest(uploaded_file)
            attrs["file_hash"] = file_hash
            qs = DocumentUpload.objects.filter(building=building, file_hash=file_hash)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"file": "Το ίδιο αρχείο έχει ήδη ανέβει για αυτό το κτίριο."}
                )

        return attrs

    class Meta:
        model = DocumentUpload
        fields = [
            'id',
            'building',
            'building_name',
            'uploaded_by',
            'uploaded_by_name',
            'file',
            'file_url',
            'original_filename',
            'original_file_url',
            'file_size',
            'mime_type',
            'status',
            'processing_started_at',
            'processing_completed_at',
            'raw_analysis',
            'extracted_data',
            'confidence_score',
            'error_message',
            'linked_expense',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'uploaded_by',
            'original_filename',
            'original_file_url',
            'file_size',
            'mime_type',
            'status',
            'processing_started_at',
            'processing_completed_at',
            'raw_analysis',
            'extracted_data',
            'confidence_score',
            'error_message',
            'linked_expense',
            'created_at',
            'updated_at',
        ]
