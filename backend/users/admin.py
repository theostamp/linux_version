# backend/users/admin.py

from django.contrib import admin  # type: ignore  # type: ignore
from django.contrib.auth.admin import UserAdmin  # type: ignore  # type: ignore
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

admin.site.register(CustomUser, CustomUserAdmin)
