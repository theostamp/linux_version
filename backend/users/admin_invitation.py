# backend/users/admin_invitation.py

from django.contrib import admin
from django.contrib import messages
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from django.urls import reverse

from .models_invitation import TenantInvitation


@admin.register(TenantInvitation)
class TenantInvitationAdmin(admin.ModelAdmin):
    """
    Admin interface για διαχείριση προσκλήσεων.
    Ειδικά για προβολή και διαγραφή ενεργών χρηστών από προσκλήσεις.
    """
    
    list_display = (
        'email',
        'invited_role',
        'status',
        'created_user_link',
        'invited_by_link',
        'invited_at',
        'accepted_at',
        'is_active_user',
        'user_actions'
    )
    
    list_filter = (
        'status',
        'invited_role',
        'invited_at',
        'accepted_at',
        ('created_user__is_active', admin.BooleanFieldListFilter),
    )
    
    search_fields = (
        'email',
        'created_user__email',
        'created_user__first_name',
        'created_user__last_name',
        'invited_by__email',
    )
    
    readonly_fields = (
        'id',
        'email',
        'invited_role',
        'invited_by',
        'invited_at',
        'expires_at',
        'status',
        'accepted_at',
        'declined_at',
        'created_user',
        'created_user_info',
        'message',
        'invitation_url_display',
    )
    
    fieldsets = (
        ('Προσκλήσεις', {
            'fields': ('id', 'email', 'invited_role', 'status', 'invited_by', 'invited_at', 'expires_at')
        }),
        ('Αποτελέσματα', {
            'fields': ('accepted_at', 'declined_at', 'created_user', 'created_user_info'),
            'description': 'Πληροφορίες για τον χρήστη που δημιουργήθηκε από την πρόσκληση'
        }),
        ('Επιπλέον', {
            'fields': ('message', 'invitation_url_display'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['delete_selected_invitations', 'mark_as_expired']
    
    def created_user_link(self, obj):
        """Link προς τον χρήστη που δημιουργήθηκε από την πρόσκληση"""
        if obj.created_user:
            url = reverse('admin:users_customuser_change', args=[obj.created_user.pk])
            return format_html(
                '<a href="{}">{} ({})</a>',
                url,
                obj.created_user.email,
                obj.created_user.get_full_name() or 'N/A'
            )
        return '-'
    created_user_link.short_description = 'Δημιουργημένος Χρήστης'
    created_user_link.admin_order_field = 'created_user__email'
    
    def invited_by_link(self, obj):
        """Link προς τον χρήστη που έστειλε την πρόσκληση"""
        if obj.invited_by:
            url = reverse('admin:users_customuser_change', args=[obj.invited_by.pk])
            return format_html(
                '<a href="{}">{}</a>',
                url,
                obj.invited_by.email
            )
        return '-'
    invited_by_link.short_description = 'Στάλθηκε από'
    invited_by_link.admin_order_field = 'invited_by__email'
    
    def is_active_user(self, obj):
        """Ένδειξη αν ο χρήστης είναι ενεργός"""
        if obj.created_user:
            if obj.created_user.is_active:
                return format_html('<span style="color: green;">✓ Ενεργός</span>')
            else:
                return format_html('<span style="color: red;">✗ Ανενεργός</span>')
        return '-'
    is_active_user.short_description = 'Κατάσταση Χρήστη'
    is_active_user.boolean = True
    
    def user_actions(self, obj):
        """Links για actions στον χρήστη"""
        if obj.created_user:
            user_url = reverse('admin:users_customuser_change', args=[obj.created_user.pk])
            delete_inv_url = reverse('admin:users_tenantinvitation_delete', args=[obj.pk])
            return format_html(
                '<a href="{}" class="button">👤 Χρήστης</a> | '
                '<a href="{}" class="button" style="color: red;">🗑️ Διαγραφή Πρόσκλησης</a>',
                user_url,
                delete_inv_url
            )
        return '-'
    user_actions.short_description = 'Ενέργειες'
    
    def created_user_info(self, obj):
        """Εμφάνιση λεπτομερών πληροφοριών για τον δημιουργημένο χρήστη"""
        if obj.created_user:
            user = obj.created_user
            info = f"""
            <div style="padding: 10px; background: #f5f5f5; border-radius: 5px;">
                <strong>Email:</strong> {user.email}<br>
                <strong>Όνομα:</strong> {user.get_full_name() or 'N/A'}<br>
                <strong>Ρόλος:</strong> {user.role or 'N/A'}<br>
                <strong>Ενεργός:</strong> {'Ναι' if user.is_active else 'Όχι'}<br>
                <strong>Email Verified:</strong> {'Ναι' if getattr(user, 'email_verified', False) else 'Όχι'}<br>
                <strong>Ημερομηνία Εγγραφής:</strong> {user.date_joined.strftime('%d/%m/%Y %H:%M') if user.date_joined else 'N/A'}
            </div>
            """
            return format_html(info)
        return format_html('<em>Δεν έχει δημιουργηθεί χρήστης ακόμα</em>')
    created_user_info.short_description = 'Πληροφορίες Χρήστη'
    
    def invitation_url_display(self, obj):
        """Εμφάνιση του invitation URL"""
        if obj.status == TenantInvitation.InvitationStatus.PENDING:
            url = obj.get_invitation_url()
            return format_html('<a href="{}" target="_blank">{}</a>', url, url)
        return '-'
    invitation_url_display.short_description = 'Invitation URL'
    
    def get_queryset(self, request):
        """
        Βελτιωμένο queryset με select_related για καλύτερη απόδοση.
        Προαιρετικά: φιλτράρει για accepted invitations με created_user.
        """
        qs = super().get_queryset(request)
        qs = qs.select_related('created_user', 'invited_by')
        
        # Αν ο χρήστης θέλει να δει μόνο ενεργούς χρήστες, μπορεί να χρησιμοποιήσει το filter
        # Αλλά εδώ δείχνουμε όλες τις προσκλήσεις για πλήρη εποπτεία
        return qs
    
    def delete_selected_invitations(self, request, queryset):
        """
        Action: Διαγραφή επιλεγμένων προσκλήσεων.
        Οι χρήστες που δημιουργήθηκαν από αυτές παραμένουν.
        """
        count = queryset.count()
        user_count = queryset.filter(created_user__isnull=False).count()
        
        queryset.delete()
        
        self.message_user(
            request,
            _('✅ Διαγράφηκαν %(count)d προσκλήσεις. %(users)d χρήστες παραμένουν στη βάση.') % {
                'count': count,
                'users': user_count
            },
            messages.SUCCESS
        )
    delete_selected_invitations.short_description = _('🗑️ Διαγραφή επιλεγμένων προσκλήσεων (διατήρηση χρηστών)')
    
    def mark_as_expired(self, request, queryset):
        """Action: Σήμανση προσκλήσεων ως expired"""
        count = queryset.filter(status=TenantInvitation.InvitationStatus.PENDING).update(
            status=TenantInvitation.InvitationStatus.EXPIRED
        )
        self.message_user(
            request,
            _('✅ Σημάνθηκαν %(count)d προσκλήσεις ως expired.') % {'count': count},
            messages.SUCCESS
        )
    mark_as_expired.short_description = _('⏰ Σήμανση ως expired')
    
    def has_add_permission(self, request):
        """Απενεργοποίηση προσθήκης νέων προσκλήσεων από admin (πρέπει να γίνονται μέσω API)"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Read-only για προσκλήσεις (μπορούν να διαγραφούν μόνο)"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Ενεργοποίηση διαγραφής"""
        return True

