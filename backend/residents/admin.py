from django.contrib import admin  # type: ignore  # type: ignore  # type: ignore
from .models import Resident
from buildings.models import Building


@admin.register(Resident)
class ResidentAdmin(admin.ModelAdmin):
    list_display  = ("user", "apartment", "building", "role")
    list_filter   = ("building", "role")
    search_fields = ("user__first_name", "user__last_name", "apartment")

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
