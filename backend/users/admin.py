# backend/users/admin.py

from django.contrib import admin
from django.db import ProgrammingError
from django.contrib.auth.admin import UserAdmin  # type: ignore
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

    def get_deleted_objects(self, objs, request):
        """
        Override για να χειρίζεται το σφάλμα αν ο πίνακας buildings_buildingmembership δεν υπάρχει.
        Αυτό είναι workaround μέχρι να τρέξουν οι migrations.
        """
        try:
            return super().get_deleted_objects(objs, request)
        except (ProgrammingError, Exception) as e:
            # Αν το σφάλμα είναι για missing table, επιστρέφουμε minimal info
            error_str = str(e)
            if 'buildings_buildingmembership' in error_str or 'does not exist' in error_str:
                nested = [[obj] for obj in objs]
                model_count = {self.model._meta.verbose_name: len(objs)}
                return nested, model_count, set(), []
            raise

    def delete_view(self, request, object_id, extra_context=None):
        """
        Override delete_view για να χειρίζεται το σφάλμα αν ο πίνακας buildings_buildingmembership δεν υπάρχει.
        """
        from django.shortcuts import get_object_or_404, redirect
        from django.contrib import messages
        from django.contrib.admin.utils import unquote
        
        obj = get_object_or_404(self.get_queryset(request), pk=unquote(object_id))
        
        if request.method == 'POST':
            try:
                return super().delete_view(request, object_id, extra_context)
            except (ProgrammingError, Exception) as e:
                error_str = str(e)
                if 'buildings_buildingmembership' in error_str or 'does not exist' in error_str:
                    # Αν λείπει ο πίνακας, κάνουμε απλή διαγραφή χωρίς related objects check
                    obj.delete()
                    messages.success(request, f'The {self.model._meta.verbose_name} "{obj}" was deleted successfully.')
                    from django.urls import reverse
                    return redirect(reverse(f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_changelist'))
                raise
        
        # GET request - show confirmation page
        try:
            return super().delete_view(request, object_id, extra_context)
        except (ProgrammingError, Exception) as e:
            error_str = str(e)
            if 'buildings_buildingmembership' in error_str or 'does not exist' in error_str:
                # Αν λείπει ο πίνακας, δείχνουμε confirmation page χωρίς related objects
                from django.template.response import TemplateResponse
                from django.contrib.admin.options import IS_POPUP_VAR
                
                context = {
                    **self.admin_site.each_context(request),
                    'title': f'Delete {self.model._meta.verbose_name}',
                    'object': obj,
                    'object_name': self.model._meta.verbose_name,
                    'opts': self.model._meta,
                    'is_popup': (IS_POPUP_VAR in request.POST or IS_POPUP_VAR in request.GET),
                    'has_absolute_url': False,
                    'deleted_objects': [obj],  # Minimal deleted objects
                    'model_count': {self.model._meta.verbose_name: 1},
                    **(extra_context or {}),
                }
                return TemplateResponse(request, 'admin/delete_confirmation.html', context)
            raise

admin.site.register(CustomUser, CustomUserAdmin)
