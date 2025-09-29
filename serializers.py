from rest_framework import serializers
from buildings.models import Building
from .models import DocumentUpload
from users.serializers import CustomUserSerializer

class DocumentUploadSerializer(serializers.ModelSerializer):
    """
    Serializer για το μοντέλο DocumentUpload.
    Διαχειρίζεται το ανέβασμα αρχείων και την εμφάνιση των δεδομένων.
    """
    uploaded_by = CustomUserSerializer(read_only=True)
    
    # Χρησιμοποιούμε PrimaryKeyRelatedField για τη δημιουργία/ενημέρωση
    building_id = serializers.PrimaryKeyRelatedField(
        queryset=Building.objects.all(), source='building', write_only=True, label="ID Κτιρίου"
    )
    
    # Χρησιμοποιούμε ένα πεδίο μόνο για ανάγνωση για να δείχνουμε το URL του αρχείου
    original_file_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentUpload
        fields = [
            'id', 
            'building', 
            'building_id',
            'uploaded_by', 
            'original_file', 
            'original_file_url',
            'status', 
            'extracted_data', 
            'created_at', 
            'updated_at',
            'error_message',
        ]
        # Πεδία που είναι μόνο για ανάγνωση και δεν μπορούν να αλλαχθούν από τον χρήστη μέσω του API
        read_only_fields = [
            'id', 'building', 'uploaded_by', 'status', 'extracted_data', 
            'raw_text', 'created_at', 'updated_at', 'error_message', 'linked_object'
        ]
        extra_kwargs = {
            'original_file': {'write_only': True, 'required': True}
        }

    def get_original_file_url(self, obj):
        request = self.context.get('request')
        if obj.original_file and hasattr(obj.original_file, 'url'):
            return request.build_absolute_uri(obj.original_file.url)
        return None