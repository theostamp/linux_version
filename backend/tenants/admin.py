from django.contrib import admin # type: ignore  # type: ignore  # type: ignore
from .models import Client, Domain
from .admin_views import TenantCreatorAdminView

@admin.register(Client)
class ClientAdmin(TenantCreatorAdminView):
    list_display = ("schema_name", "name", "paid_until", "on_trial")

@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ("domain", "tenant", "is_primary")
