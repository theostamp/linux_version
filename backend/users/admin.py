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
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Προσωπικά Στοιχεία', {'fields': ('first_name', 'last_name')}),
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
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Μετατρέπουμε list σε tuple για IN clause ή array για ANY
                if len(ids) == 1:
                    # Single ID - χρησιμοποιούμε απλό WHERE
                    cursor.execute(
                        "DELETE FROM users_customuser WHERE id = %s",
                        [ids[0]],
                    )
                else:
                    # Multiple IDs - χρησιμοποιούμε IN clause
                    placeholders = ','.join(['%s'] * len(ids))
                    cursor.execute(
                        f"DELETE FROM users_customuser WHERE id IN ({placeholders})",
                        ids,
                    )

    def delete_view(self, request, object_id, extra_context=None):
        """
        Προσαρμοσμένο delete view που παρακάμπτει την πρόσβαση σε tenant-only tables.
        """
        opts = self.model._meta
        obj = self.get_object(request, unquote(object_id))
        if obj is None:
            return super().delete_view(request, object_id, extra_context)

        if not self.has_delete_permission(request, obj):
            raise PermissionDenied

        if request.method == 'POST':
            obj_display = force_str(obj)
            try:
                self._delete_user_rows([obj.pk])
            except ProgrammingError as e:
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
        }
        if extra_context:
            context.update(extra_context)
        # Χρησιμοποιούμε custom template που δεν χρειάζεται deleted_objects structure
        return TemplateResponse(request, "admin/users/customuser/delete_confirmation.html", context)

    def delete_queryset(self, request, queryset):
        """
        Προσαρμοσμένη διαγραφή για bulk actions χωρίς πρόσβαση σε tenant tables.
        """
        ids = list(queryset.values_list('pk', flat=True))
        objects = list(queryset)
        if not ids:
            return
        try:
            self._delete_user_rows(ids)
        except ProgrammingError as e:
            error_str = str(e)
            if 'buildings_buildingmembership' in error_str or 'does not exist' in error_str:
                messages.error(
                    request,
                    _("Αποτυχία μαζικής διαγραφής επειδή υπάρχουν BuildingMembership εγγραφές. Τρέξε migrate_schemas για όλους τους tenants και δοκίμασε ξανά."),
                )
                return
            raise

        for obj in objects:
            self.log_deletion(request, obj, force_str(obj))

admin.site.register(CustomUser, CustomUserAdmin)
