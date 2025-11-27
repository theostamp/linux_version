# backend/users/admin.py

from django.contrib import admin
from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.db import ProgrammingError, connection, transaction
from django.contrib.auth.admin import UserAdmin  # type: ignore
from django.http import HttpResponseRedirect
from django.template.response import TemplateResponse
from django.urls import reverse
from django.utils.encoding import force_str
from django.utils.translation import gettext_lazy as _
from django.contrib.admin.utils import unquote

from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'is_active', 'is_protected')
    list_filter = ('is_staff', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    
    def is_protected(self, obj):
        """Visual indicator για προστατευμένους users"""
        if obj.email == self.PROTECTED_ADMIN_EMAIL:
            return '🛡️ Προστατευμένος'
        return ''
    is_protected.short_description = 'Κατάσταση'
    is_protected.admin_order_field = 'email'

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Προσωπικά Στοιχεία', {'fields': ('first_name', 'last_name')}),
        ('Ρόλος & Tenant', {
            'fields': ('role', 'tenant', 'email_verified'),
            'description': 'Κρίσιμα πεδία για το login και τα δικαιώματα του χρήστη'
        }),
        ('Στοιχεία Γραφείου Διαχείρισης', {
            'fields': ('office_name', 'office_phone', 'office_address', 'office_logo'),
            'classes': ('collapse',)
        }),
        ('Δικαιώματα', {'fields': ('is_staff', 'is_active', 'is_superuser', 'groups', 'user_permissions')}),
        ('Ημερομηνίες', {'fields': ('last_login',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'is_staff', 'is_active')}
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.none()  # Management Users δεν βλέπουν ΚΑΝΕΝΑΝ άλλο User

    def has_module_permission(self, request):
        return request.user.is_superuser

    # Protected admin email - cannot be deleted
    PROTECTED_ADMIN_EMAIL = 'theostam1966@gmail.com'

    def has_delete_permission(self, request, obj=None):
        """
        Override to prevent deletion of protected admin user.
        """
        if obj and obj.email == self.PROTECTED_ADMIN_EMAIL:
            return False
        return super().has_delete_permission(request, obj)

    def save_model(self, request, obj, form, change):
        """
        Override save_model to ensure username is set when creating new users.
        """
        # If creating a new user and username is not set, set it to email
        if not change and not obj.username:
            obj.username = obj.email
        # Call parent save_model which handles password hashing
        super().save_model(request, obj, form, change)

    def get_deleted_objects(self, objs, request):
        """
        Override για να χειρίζεται το σφάλμα αν ο πίνακας buildings_buildingmembership δεν υπάρχει.
        Αυτό είναι workaround μέχρι να τρέξουν οι migrations.
        
        Το Django admin περιμένει:
        - deleted_objects: nested list με structure [[obj_repr, [nested_related_objects]]]
        - model_count: dict {verbose_name: count}
        - perms_needed: set of permission names
        - protected: list of protected objects
        """
        try:
            return super().get_deleted_objects(objs, request)
        except ProgrammingError as e:
            error_str = str(e)
            if 'buildings_buildingmembership' in error_str or 'does not exist' in error_str:
                # Δημιουργούμε nested list structure που περιμένει το Django template
                # Κάθε στοιχείο είναι [obj_repr, [nested_objects]]
                deleted_objects = []
                for obj in objs:
                    deleted_objects.append([force_str(obj), []])
                
                model_count = {force_str(self.model._meta.verbose_name): len(objs)}
                perms_needed = set()
                protected = []
                return deleted_objects, model_count, perms_needed, protected
            raise

    def _delete_user_rows(self, ids):
        """
        Διαγράφει users βάσει IDs με raw SQL ώστε να μην ενεργοποιείται
        ο Django ORM delete collector (που προσπαθεί να προσπελάσει tenant tables).
        """
        if not ids:
            return
        
        # Prepare IN clause for multiple IDs or single WHERE
        if len(ids) == 1:
            where_clause = "user_id = %s"
            params = [ids[0]]
            id_where_clause = "id = %s"
            id_params = [ids[0]]
            placeholders = '%s'
        else:
            placeholders = ','.join(['%s'] * len(ids))
            where_clause = f"user_id IN ({placeholders})"
            params = ids
            id_where_clause = f"id IN ({placeholders})"
            id_params = ids
        
        # Delete related objects first (in public schema)
        # Each deletion in its own transaction to avoid "transaction aborted" errors
        # Order matters: delete child records before parent records
        
        # Tables with CASCADE delete (must delete these records)
        # Order matters: delete child records before parent records
        cascade_tables = [
            'django_admin_log',  # Admin log entries (CASCADE) - must be deleted first
            'votes_votesubmission',  # User submissions in votes (CASCADE)
            'users_passwordresettoken',  # Password reset tokens (CASCADE)
            'users_loginattempt',  # Login attempts (CASCADE)
            'users_tenantinvitation',  # Tenant invitations (CASCADE)
            'billing_usersubscription',  # User subscriptions (CASCADE)
            'todo_management_todo',  # Todos created by user (CASCADE)
        ]
        
        # Tables with SET_NULL (set to NULL instead of deleting)
        set_null_tables = [
            ('votes_vote', 'creator_id'),  # Votes created by user (SET_NULL)
        ]
        
        # Delete CASCADE tables
        for table in cascade_tables:
            try:
                with transaction.atomic():
                    with connection.cursor() as cursor:
                        # django_admin_log uses user_id, not id
                        if table == 'django_admin_log':
                            cursor.execute(f"DELETE FROM {table} WHERE user_id IN ({placeholders if len(ids) > 1 else '%s'})", params if len(ids) > 1 else [ids[0]])
                        else:
                            cursor.execute(f"DELETE FROM {table} WHERE {where_clause}", params)
            except ProgrammingError as e:
                # Table might not exist in all environments - skip silently
                error_str = str(e)
                if 'does not exist' not in error_str.lower():
                    # Log but don't raise - continue with other tables
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Could not delete from {table}: {e}")
            except Exception as e:
                # Log other errors but continue
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error deleting from {table}: {e}")
        
        # Set SET_NULL fields to NULL
        for table, field in set_null_tables:
            try:
                with transaction.atomic():
                    with connection.cursor() as cursor:
                        if len(ids) == 1:
                            cursor.execute(f"UPDATE {table} SET {field} = NULL WHERE {field} = %s", id_params)
                        else:
                            cursor.execute(f"UPDATE {table} SET {field} = NULL WHERE {field} IN ({placeholders})", id_params)
            except ProgrammingError as e:
                # Table might not exist - skip silently
                error_str = str(e)
                if 'does not exist' not in error_str.lower():
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Could not update {table}.{field}: {e}")
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error updating {table}.{field}: {e}")
        
        # Now delete the user in main transaction
        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    if len(ids) == 1:
                        cursor.execute("DELETE FROM users_customuser WHERE id = %s", [ids[0]])
                    else:
                        placeholders = ','.join(['%s'] * len(ids))
                        cursor.execute(f"DELETE FROM users_customuser WHERE id IN ({placeholders})", ids)
        except Exception as e:
            # Log the error and re-raise so it can be caught by delete_view
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error deleting user(s) {ids}: {e}", exc_info=True)
            raise

    def delete_view(self, request, object_id, extra_context=None):
        """
        Προσαρμοσμένο delete view που παρακάμπτει την πρόσβαση σε tenant-only tables.
        """
        opts = self.model._meta
        obj = self.get_object(request, unquote(object_id))
        if obj is None:
            return super().delete_view(request, object_id, extra_context)

        # Προστασία για protected admin user
        if obj.email == self.PROTECTED_ADMIN_EMAIL:
            messages.error(
                request,
                _('⚠️ ΑΔΥΝΑΤΗ Η ΔΙΑΓΡΑΦΗ: Ο χρήστης "%(email)s" είναι προστατευμένος και δεν μπορεί να διαγραφεί για λόγους ασφαλείας.') % {'email': obj.email}
            )
            return HttpResponseRedirect(
                reverse(f'admin:{opts.app_label}_{opts.model_name}_changelist')
            )

        if not self.has_delete_permission(request, obj):
            raise PermissionDenied

        if request.method == 'POST':
            obj_display = force_str(obj)
            deleting_current_user = obj.pk == getattr(request.user, 'pk', None)
            pre_logged_entry = None
            # Log before deletion only if we're deleting the currently logged-in user.
            if deleting_current_user:
                pre_logged_entry = self.log_deletion(request, obj, obj_display)
            try:
                self._delete_user_rows([obj.pk])
            except ProgrammingError as e:
                if pre_logged_entry:
                    pre_logged_entry.delete()
                error_str = str(e)
                if 'buildings_buildingmembership' in error_str or 'does not exist' in error_str:
                    messages.error(
                        request,
                        _("Αποτυχία διαγραφής επειδή υπάρχουν BuildingMembership εγγραφές. Τρέξε migrate_schemas για όλους τους tenants και δοκίμασε ξανά."),
                    )
                    return HttpResponseRedirect(
                        reverse(f'admin:{opts.app_label}_{opts.model_name}_change', args=[object_id])
                    )
                raise
            except Exception as e:
                if pre_logged_entry:
                    pre_logged_entry.delete()
                # Catch any other errors and display them
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error deleting user {obj.pk}: {e}", exc_info=True)
                messages.error(
                    request,
                    _("Αποτυχία διαγραφής: %(error)s") % {'error': str(e)},
                )
                return HttpResponseRedirect(
                    reverse(f'admin:{opts.app_label}_{opts.model_name}_changelist')
                )

            if not deleting_current_user:
                self.log_deletion(request, obj, obj_display)
            messages.success(request, _('Ο χρήστης "%(obj)s" διαγράφηκε επιτυχώς.') % {'obj': obj_display})
            return HttpResponseRedirect(reverse(f'admin:{opts.app_label}_{opts.model_name}_changelist'))

        # GET: δείχνουμε απλή σελίδα επιβεβαίωσης χωρίς related objects
        # Χρησιμοποιούμε custom template για να αποφύγουμε το πρόβλημα με τα tenant-only tables
        context = {
            **self.admin_site.each_context(request),
            'title': _('Επιβεβαίωση διαγραφής'),
            'object': obj,
            'object_name': force_str(opts.verbose_name),
            'opts': opts,
            'app_label': opts.app_label,
            'preserved_filters': self.get_preserved_filters(request),
            'is_popup': False,
            'media': self.media,
            'is_protected': obj.email == self.PROTECTED_ADMIN_EMAIL,
        }
        if extra_context:
            context.update(extra_context)
        # Χρησιμοποιούμε custom template που δεν χρειάζεται deleted_objects structure
        return TemplateResponse(request, "admin/users/customuser/delete_confirmation.html", context)

    def delete_queryset(self, request, queryset):
        """
        Προσαρμοσμένη διαγραφή για bulk actions χωρίς πρόσβαση σε tenant tables.
        """
        # Έλεγχος για protected admin user
        protected_users = queryset.filter(email=self.PROTECTED_ADMIN_EMAIL)
        if protected_users.exists():
            messages.error(
                request,
                _('⚠️ ΑΔΥΝΑΤΗ Η ΔΙΑΓΡΑΦΗ: Ο χρήστης "%(email)s" είναι προστατευμένος και δεν μπορεί να διαγραφεί για λόγους ασφαλείας.') % {'email': self.PROTECTED_ADMIN_EMAIL}
            )
            # Αφαιρούμε τον protected user από το queryset
            queryset = queryset.exclude(email=self.PROTECTED_ADMIN_EMAIL)
        
        ids = list(queryset.values_list('pk', flat=True))
        objects = list(queryset)
        if not ids:
            return
        
        current_user_pk = getattr(request.user, 'pk', None)
        pre_logged_ids = set()
        pre_logged_entries = []
        if current_user_pk in ids:
            for obj in objects:
                if obj.pk == current_user_pk:
                    entry = self.log_deletion(request, obj, force_str(obj))
                    pre_logged_entries.append(entry)
                    pre_logged_ids.add(obj.pk)
        
        try:
            self._delete_user_rows(ids)
        except ProgrammingError as e:
            for entry in pre_logged_entries:
                entry.delete()
            error_str = str(e)
            if 'buildings_buildingmembership' in error_str or 'does not exist' in error_str:
                messages.error(
                    request,
                    _("Αποτυχία μαζικής διαγραφής επειδή υπάρχουν BuildingMembership εγγραφές. Τρέξε migrate_schemas για όλους τους tenants και δοκίμασε ξανά."),
                )
                return
            raise
        except Exception:
            for entry in pre_logged_entries:
                entry.delete()
            raise

        for obj in objects:
            if obj.pk in pre_logged_ids:
                continue
            self.log_deletion(request, obj, force_str(obj))
        
        if protected_users.exists():
            messages.warning(
                request,
                _('Οι υπόλοιποι χρήστες διαγράφηκαν, αλλά ο προστατευμένος admin user παραμένει.')
            )

admin.site.register(CustomUser, CustomUserAdmin)
