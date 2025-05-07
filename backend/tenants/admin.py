# backend/tenants/admin.py

from django.contrib import admin
from .models import Tenant
from buildings.models import Building

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'apartment', 'building')
    search_fields = ('first_name', 'last_name', 'apartment')
    list_filter = ('building',)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(building__manager=request.user)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "building":
            if request.user.is_superuser:
                kwargs["queryset"] = Building.objects.all()
            else:
                kwargs["queryset"] = Building.objects.filter(manager=request.user)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
