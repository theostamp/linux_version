# backend/tenants/admin.py

from django.contrib import admin
from .models import Client, Domain

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("schema_name", "name", "status", "paid_until", "on_trial", "is_active", "created_on")
    list_filter = ("on_trial", "is_active")
    actions = ["activate_tenants", "deactivate_tenants", "start_trial", "end_trial", "extend_payment"]

    def activate_tenants(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"✅ Ενεργοποιήθηκαν {updated} tenants.")
    activate_tenants.short_description = "Ενεργοποίηση επιλεγμένων tenants"

    def deactivate_tenants(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"❌ Απενεργοποιήθηκαν {updated} tenants.")
    deactivate_tenants.short_description = "Απενεργοποίηση επιλεγμένων tenants"

    def start_trial(self, request, queryset):
        updated = queryset.update(on_trial=True)
        self.message_user(request, f"🟡 Ενεργοποιήθηκε trial για {updated} tenants.")
    start_trial.short_description = "Έναρξη δοκιμαστικής περιόδου"

    def end_trial(self, request, queryset):
        updated = queryset.update(on_trial=False)
        self.message_user(request, f"🔒 Έληξε trial για {updated} tenants.")
    end_trial.short_description = "Λήξη δοκιμαστικής περιόδου"

    def extend_payment(self, request, queryset):
        from django.utils import timezone
        from datetime import timedelta
        for tenant in queryset:
            tenant.paid_until = (tenant.paid_until or timezone.now().date()) + timedelta(days=30)
            tenant.save()
        self.message_user(request, "📅 Ανανεώθηκε η πληρωμή κατά 30 μέρες για τους επιλεγμένους tenants.")
    extend_payment.short_description = "Προσθήκη 30 ημερών πληρωμής"
