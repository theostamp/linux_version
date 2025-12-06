"""
Serializers for Tenant Invitation System
"""
from rest_framework import serializers
from .models_invitation import TenantInvitation
from .models import CustomUser


class TenantInvitationSerializer(serializers.ModelSerializer):
    """Serializer for viewing invitations"""
    
    invited_by_email = serializers.EmailField(source='invited_by.email', read_only=True)
    invited_by_name = serializers.SerializerMethodField()
    apartment_info = serializers.SerializerMethodField()
    building_info = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    can_be_accepted = serializers.BooleanField(read_only=True)
    invitation_url = serializers.SerializerMethodField()
    
    class Meta:
        model = TenantInvitation
        fields = [
            'id', 'email', 'invited_role', 'building_id', 'building_info',
            'apartment', 'apartment_info',
            'invited_by', 'invited_by_email', 'invited_by_name',
            'invited_at', 'expires_at', 'status',
            'accepted_at', 'declined_at', 'message',
            'is_expired', 'can_be_accepted', 'invitation_url'
        ]
        read_only_fields = [
            'id', 'invited_by', 'invited_at', 'status',
            'accepted_at', 'declined_at', 'is_expired', 'can_be_accepted'
        ]
    
    def get_invited_by_name(self, obj):
        return obj.invited_by.get_full_name() or obj.invited_by.email
    
    def get_building_info(self, obj):
        """Get building info from building_id or apartment"""
        building_id = obj.building_id
        if not building_id and obj.apartment and hasattr(obj.apartment, 'building_id'):
            building_id = obj.apartment.building_id
        
        if building_id:
            try:
                from buildings.models import Building
                building = Building.objects.get(id=building_id)
                return {
                    'id': building.id,
                    'name': building.name,
                    'address': building.address
                }
            except Exception:
                return {'id': building_id, 'name': None, 'address': None}
        return None
    
    def get_apartment_info(self, obj):
        if obj.apartment:
            return {
                'id': obj.apartment.id,
                'number': getattr(obj.apartment, 'number', None) or getattr(obj.apartment, 'apartment_number', None),
                'floor': obj.apartment.floor,
                'building': obj.apartment.building.name if obj.apartment.building else None,
                'building_id': obj.apartment.building_id if obj.apartment.building else None
            }
        return None
    
    def get_invitation_url(self, obj):
        return obj.get_invitation_url()


class CreateInvitationSerializer(serializers.Serializer):
    """Serializer for creating a single invitation"""
    
    email = serializers.EmailField()
    invited_role = serializers.ChoiceField(
        choices=TenantInvitation.InvitedRole.choices,
        default=TenantInvitation.InvitedRole.RESIDENT
    )
    building_id = serializers.IntegerField(required=False, allow_null=True, help_text='Building ID for context')
    apartment_id = serializers.IntegerField(required=False, allow_null=True)
    message = serializers.CharField(required=False, allow_blank=True, max_length=500)
    expires_in_days = serializers.IntegerField(default=7, min_value=1, max_value=30)
    
    def validate_email(self, value):
        """Check if user already exists in this tenant"""
        request = self.context.get('request')
        if request and hasattr(request, 'tenant'):
            # Check if user already exists in tenant
            if CustomUser.objects.filter(email=value).exists():
                raise serializers.ValidationError(
                    "Ο χρήστης με αυτό το email υπάρχει ήδη στο tenant"
                )
        return value
    
    def validate_apartment_id(self, value):
        """Validate apartment exists and belongs to tenant"""
        if value:
            from buildings.models import Apartment
            try:
                apartment = Apartment.objects.get(id=value)
                return value
            except Apartment.DoesNotExist:
                raise serializers.ValidationError("Το διαμέρισμα δεν βρέθηκε")
        return None


class BulkInvitationSerializer(serializers.Serializer):
    """Serializer for creating multiple invitations at once"""
    
    emails = serializers.ListField(
        child=serializers.EmailField(),
        min_length=1,
        max_length=50,  # Limit bulk invitations
        help_text="List of email addresses to invite"
    )
    invited_role = serializers.ChoiceField(
        choices=TenantInvitation.InvitedRole.choices,
        default=TenantInvitation.InvitedRole.RESIDENT
    )
    message = serializers.CharField(required=False, allow_blank=True, max_length=500)
    expires_in_days = serializers.IntegerField(default=7, min_value=1, max_value=30)
    
    def validate_emails(self, value):
        """Remove duplicates and validate"""
        # Remove duplicates
        unique_emails = list(set(value))
        
        # Check for existing users
        request = self.context.get('request')
        if request and hasattr(request, 'tenant'):
            existing_users = CustomUser.objects.filter(email__in=unique_emails).values_list('email', flat=True)
            if existing_users:
                raise serializers.ValidationError(
                    f"Οι ακόλουθοι χρήστες υπάρχουν ήδη: {', '.join(existing_users)}"
                )
        
        return unique_emails


class AcceptInvitationSerializer(serializers.Serializer):
    """Serializer for accepting an invitation"""
    
    token = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=50, required=False)
    last_name = serializers.CharField(max_length=50, required=False)
    phone = serializers.CharField(max_length=20, required=False)
    
    def validate_token(self, value):
        """Verify invitation token"""
        try:
            invitation = TenantInvitation.verify_token(value)
            self.context['invitation'] = invitation
            return value
        except Exception as e:
            raise serializers.ValidationError(f"Μη έγκυρο ή ληγμένο token: {str(e)}")


class DeclineInvitationSerializer(serializers.Serializer):
    """Serializer for declining an invitation"""
    
    token = serializers.CharField(required=True)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=200)
    
    def validate_token(self, value):
        """Verify invitation token"""
        try:
            invitation = TenantInvitation.verify_token(value)
            self.context['invitation'] = invitation
            return value
        except Exception as e:
            raise serializers.ValidationError(f"Μη έγκυρο ή ληγμένο token: {str(e)}")

