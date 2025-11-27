# backend/office_staff/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import OfficeStaffPermissions, ActivityLog

User = get_user_model()


class OfficeStaffPermissionsSerializer(serializers.ModelSerializer):
    """Serializer για τα permissions υπαλλήλου"""
    
    class Meta:
        model = OfficeStaffPermissions
        fields = [
            'id',
            'job_title',
            # Οικονομικά
            'can_view_financials',
            'can_record_payments',
            'can_create_expenses',
            'can_edit_expenses',
            # Ανακοινώσεις
            'can_create_announcements',
            'can_send_notifications',
            # Αιτήματα
            'can_manage_requests',
            'can_manage_maintenance',
            # Κτίρια
            'can_view_apartments',
            'can_edit_apartments',
            # Χρήστες
            'can_view_residents',
            'can_invite_residents',
            # Έγγραφα
            'can_upload_documents',
            'can_delete_documents',
            # Status
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OfficeStaffUserSerializer(serializers.ModelSerializer):
    """Serializer για προβολή υπαλλήλου με permissions"""
    
    permissions = OfficeStaffPermissionsSerializer(source='staff_permissions', read_only=True)
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'is_active',
            'date_joined',
            'last_login',
            'permissions',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class CreateOfficeStaffSerializer(serializers.Serializer):
    """Serializer για δημιουργία νέου υπαλλήλου"""
    
    # Στοιχεία χρήστη
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    password = serializers.CharField(write_only=True, min_length=8)
    
    # Θέση εργασίας
    job_title = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Permissions (με defaults)
    can_view_financials = serializers.BooleanField(default=True)
    can_record_payments = serializers.BooleanField(default=False)
    can_create_expenses = serializers.BooleanField(default=False)
    can_edit_expenses = serializers.BooleanField(default=False)
    can_create_announcements = serializers.BooleanField(default=False)
    can_send_notifications = serializers.BooleanField(default=False)
    can_manage_requests = serializers.BooleanField(default=True)
    can_manage_maintenance = serializers.BooleanField(default=False)
    can_view_apartments = serializers.BooleanField(default=True)
    can_edit_apartments = serializers.BooleanField(default=False)
    can_view_residents = serializers.BooleanField(default=True)
    can_invite_residents = serializers.BooleanField(default=False)
    can_upload_documents = serializers.BooleanField(default=False)
    can_delete_documents = serializers.BooleanField(default=False)
    
    def validate_email(self, value):
        """Έλεγχος ότι το email δεν υπάρχει ήδη"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Υπάρχει ήδη χρήστης με αυτό το email")
        return value
    
    def validate_password(self, value):
        """Έλεγχος ασφάλειας κωδικού"""
        validate_password(value)
        return value
    
    def create(self, validated_data):
        """Δημιουργία χρήστη και permissions"""
        request = self.context.get('request')
        
        # Εξαγωγή permissions από validated_data
        permission_fields = [
            'job_title', 'can_view_financials', 'can_record_payments',
            'can_create_expenses', 'can_edit_expenses', 'can_create_announcements',
            'can_send_notifications', 'can_manage_requests', 'can_manage_maintenance',
            'can_view_apartments', 'can_edit_apartments', 'can_view_residents',
            'can_invite_residents', 'can_upload_documents', 'can_delete_documents'
        ]
        
        permissions_data = {k: validated_data.pop(k, None) for k in permission_fields if k in validated_data}
        
        # Δημιουργία χρήστη
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            role=User.SystemRole.OFFICE_STAFF,
            is_active=True,
            email_verified=True,  # Verified αφού τον δημιουργεί ο admin
            tenant=request.user.tenant if request and request.user else None
        )
        
        # Δημιουργία permissions
        OfficeStaffPermissions.objects.create(
            user=user,
            created_by=request.user if request else None,
            **{k: v for k, v in permissions_data.items() if v is not None}
        )
        
        return user


class UpdateOfficeStaffSerializer(serializers.Serializer):
    """Serializer για ενημέρωση υπαλλήλου"""
    
    # Στοιχεία χρήστη (optional)
    first_name = serializers.CharField(max_length=50, required=False)
    last_name = serializers.CharField(max_length=50, required=False)
    password = serializers.CharField(write_only=True, min_length=8, required=False)
    is_active = serializers.BooleanField(required=False)
    
    # Θέση εργασίας
    job_title = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Permissions
    can_view_financials = serializers.BooleanField(required=False)
    can_record_payments = serializers.BooleanField(required=False)
    can_create_expenses = serializers.BooleanField(required=False)
    can_edit_expenses = serializers.BooleanField(required=False)
    can_create_announcements = serializers.BooleanField(required=False)
    can_send_notifications = serializers.BooleanField(required=False)
    can_manage_requests = serializers.BooleanField(required=False)
    can_manage_maintenance = serializers.BooleanField(required=False)
    can_view_apartments = serializers.BooleanField(required=False)
    can_edit_apartments = serializers.BooleanField(required=False)
    can_view_residents = serializers.BooleanField(required=False)
    can_invite_residents = serializers.BooleanField(required=False)
    can_upload_documents = serializers.BooleanField(required=False)
    can_delete_documents = serializers.BooleanField(required=False)
    
    def validate_password(self, value):
        if value:
            validate_password(value)
        return value
    
    def update(self, instance, validated_data):
        """Ενημέρωση χρήστη και permissions"""
        # Εξαγωγή permissions
        permission_fields = [
            'job_title', 'can_view_financials', 'can_record_payments',
            'can_create_expenses', 'can_edit_expenses', 'can_create_announcements',
            'can_send_notifications', 'can_manage_requests', 'can_manage_maintenance',
            'can_view_apartments', 'can_edit_apartments', 'can_view_residents',
            'can_invite_residents', 'can_upload_documents', 'can_delete_documents'
        ]
        
        permissions_data = {k: validated_data.pop(k) for k in permission_fields if k in validated_data}
        
        # Ενημέρωση χρήστη
        if 'first_name' in validated_data:
            instance.first_name = validated_data['first_name']
        if 'last_name' in validated_data:
            instance.last_name = validated_data['last_name']
        if 'is_active' in validated_data:
            instance.is_active = validated_data['is_active']
        if 'password' in validated_data and validated_data['password']:
            instance.set_password(validated_data['password'])
        
        instance.save()
        
        # Ενημέρωση permissions
        if permissions_data:
            permissions, created = OfficeStaffPermissions.objects.get_or_create(
                user=instance,
                defaults={'created_by': self.context.get('request').user}
            )
            for key, value in permissions_data.items():
                setattr(permissions, key, value)
            permissions.save()
        
        return instance


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer για προβολή Activity Log"""
    
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'user_email',
            'user_role',
            'action',
            'action_display',
            'action_description',
            'target_model',
            'target_id',
            'target_description',
            'building_id',
            'building_name',
            'extra_data',
            'ip_address',
            'severity',
            'severity_display',
            'created_at',
        ]
        read_only_fields = fields  # Όλα τα πεδία είναι read-only


class ActivityLogFilterSerializer(serializers.Serializer):
    """Serializer για filtering Activity Logs"""
    
    user_id = serializers.IntegerField(required=False)
    action = serializers.ChoiceField(choices=ActivityLog.ActionType.choices, required=False)
    building_id = serializers.IntegerField(required=False)
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)
    severity = serializers.ChoiceField(choices=ActivityLog.Severity.choices, required=False)

