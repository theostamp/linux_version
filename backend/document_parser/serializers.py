from rest_framework import serializers
from .models import DocumentUpload


class DocumentUploadSerializer(serializers.ModelSerializer):
    """Serializer for DocumentUpload model"""
    
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    
    def create(self, validated_data):
        """Override create to extract filename and file info from uploaded file"""
        file = validated_data.get('file')
        if file:
            validated_data['original_filename'] = file.name
            validated_data['file_size'] = file.size
            validated_data['mime_type'] = file.content_type
        
        return super().create(validated_data)
    
    class Meta:
        model = DocumentUpload
        fields = [
            'id',
            'building',
            'building_name',
            'uploaded_by',
            'uploaded_by_name',
            'file',
            'original_filename',
            'file_size',
            'mime_type',
            'status',
            'processing_started_at',
            'processing_completed_at',
            'raw_analysis',
            'extracted_data',
            'confidence_score',
            'error_message',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'uploaded_by',
            'original_filename',
            'file_size',
            'mime_type',
            'status',
            'processing_started_at',
            'processing_completed_at',
            'raw_analysis',
            'extracted_data',
            'confidence_score',
            'error_message',
            'created_at',
            'updated_at',
        ]
