# backend/office_staff/admin.py

from django.contrib import admin
from .models import OfficeStaffPermissions, ActivityLog


@admin.register(OfficeStaffPermissions)
class OfficeStaffPermissionsAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'job_title', 'is_active', 
        'can_record_payments', 'can_create_expenses',
        'created_at'
    ]
    list_filter = ['is_active', 'can_record_payments', 'can_create_expenses']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'job_title']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    
    fieldsets = (
        ('Χρήστης', {
            'fields': ('user', 'job_title', 'is_active')
        }),
        ('Οικονομικά', {
            'fields': (
                'can_view_financials', 'can_record_payments',
                'can_create_expenses', 'can_edit_expenses'
            )
        }),
        ('Επικοινωνία', {
            'fields': ('can_create_announcements', 'can_send_notifications')
        }),
        ('Αιτήματα & Συντήρηση', {
            'fields': ('can_manage_requests', 'can_manage_maintenance')
        }),
        ('Κτίρια & Διαμερίσματα', {
            'fields': ('can_view_apartments', 'can_edit_apartments')
        }),
        ('Χρήστες', {
            'fields': ('can_view_residents', 'can_invite_residents')
        }),
        ('Έγγραφα', {
            'fields': ('can_upload_documents', 'can_delete_documents')
        }),
        ('Μεταδεδομένα', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = [
        'created_at', 'user_email', 'action', 
        'target_description', 'building_name', 'severity'
    ]
    list_filter = ['action', 'severity', 'created_at']
    search_fields = ['user_email', 'action_description', 'target_description']
    readonly_fields = [
        'user', 'user_email', 'user_role', 'action', 'action_description',
        'target_model', 'target_id', 'target_description',
        'building_id', 'building_name', 'extra_data',
        'ip_address', 'user_agent', 'severity', 'created_at'
    ]
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        return False  # Δεν επιτρέπεται η χειροκίνητη δημιουργία
    
    def has_change_permission(self, request, obj=None):
        return False  # Δεν επιτρέπεται η επεξεργασία
    
    def has_delete_permission(self, request, obj=None):
        return False  # Δεν επιτρέπεται η διαγραφή
