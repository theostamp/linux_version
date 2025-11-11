# backend/users/admin.py

from django.contrib import admin  
from django.contrib.admin.utils import get_deleted_objects
from django.db import ProgrammingError
        
from django.contrib.auth.admin import UserAdmin
      # type: ignore
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
                # Επιστρέφουμε μόνο τα objects που θέλουμε να διαγράψουμε, χωρίς related objects check
                # Αυτό επιτρέπει τη διαγραφή ακόμα και αν λείπει ο πίνακας
                from django.contrib.admin.utils import NestedObjects
                collector = NestedObjects(using='default')
                # Προσθέτουμε μόνο τα βασικά objects, χωρίς να ελέγχουμε related
                for obj in objs:
                    collector.add(obj.__class__, obj.pk)
                # Επιστρέφουμε minimal nested structure
                nested = []
                for obj in objs:
                    nested.append([obj])
                return nested, len(objs), set(), []
            raise

admin.site.register(CustomUser, CustomUserAdmin)
