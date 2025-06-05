# tenants/admin_views.py

from django.contrib import admin    
from django.http import HttpResponseRedirect    
from django.urls import path    
from django.shortcuts import render    
from django.contrib import messages    
from django.utils import timezone    
from datetime import timedelta
from django_tenants.utils import schema_context    
from buildings.models import Building, BuildingMembership
from announcements.models import Announcement
from user_requests.models import UserRequest
from votes.models import Vote
from obligations.models import Obligation
from tenants.models import Client, Domain
from users.models import CustomUser
from django.core.management import call_command    

TENANT_CREATE_TEMPLATE = "admin/tenant_create.html"

class TenantCreatorAdminView(admin.ModelAdmin):
    change_list_template = "admin/tenants/change_list_with_create_button.html"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("create-tenant/", self.admin_site.admin_view(self.create_tenant_view), name="create-tenant"),
        ]
        return custom_urls + urls

    def create_tenant_view(self, request):
        if request.method == "POST":
            tenant_name = request.POST.get("tenant_name", "").strip().lower()
            manager_email = request.POST.get("manager_email", "").strip()
            manager_password = request.POST.get("manager_password", "").strip()
            if not tenant_name or not manager_email or not manager_password:
                messages.error(request, "Όλα τα πεδία είναι υποχρεωτικά.")
                return render(request, TENANT_CREATE_TEMPLATE)

            if Client.objects.filter(schema_name=tenant_name).exists():
                messages.error(request, f"Το schema '{tenant_name}' υπάρχει ήδη.")
                return render(request, TENANT_CREATE_TEMPLATE)

            tenant = Client.objects.create(
                schema_name=tenant_name,
                name=f"{tenant_name.title()} Office",
                paid_until=timezone.now() + timedelta(days=365),
                on_trial=True,
            )
            Domain.objects.create(
                domain=f"{tenant_name}.localhost",
                tenant=tenant,
                is_primary=True
            )
            call_command("migrate_schemas", schema_name=tenant.schema_name, interactive=False)
            call_command("migrate_schemas", schema_name=tenant.schema_name, interactive=False)

            with schema_context(tenant.schema_name):
                manager = CustomUser.objects.create_user(
                    email=manager_email,
                    password=manager_password,
                    first_name="Auto",
                    last_name="Manager",
                    is_staff=True
                )
                resident = CustomUser.objects.create_user(
                    email=f"resident@{tenant_name}.com",
                    password="123456"
                )
                building = Building.objects.create(
                    name="Demo Κτίριο",
                    address="Οδός Demo",
                    city="Αθήνα",
                    postal_code="11111",
                    apartments_count=5,
                    internal_manager_name="Demo",
                    manager=manager,
                )
                BuildingMembership.objects.create(building=building, resident=resident)

                Announcement.objects.create(
                    title="Καλωσορίσατε!",
                    description="Αυτή είναι μια δοκιμαστική ανακοίνωση για το νέο σας demo κτίριο.",
                    building=building,
                    author=manager,
                    published=True,
                    is_active=True,
                )

                UserRequest.objects.create(
                    title="Ενδεικτικό αίτημα",
                    description="Ένα demo αίτημα.",
                    building=building,
                    created_by=resident
                )

                Vote.objects.create(
                    title="Demo ψηφοφορία",
                    description="Συμμετοχή στη demo ψηφοφορία.",
                    building=building,
                    created_by=manager,
                    expires_at=timezone.now() + timedelta(days=5),
                )

                Obligation.objects.create(
                    building=building,
                    title="Demo οφειλή",
                    amount=50.0,
                    due_date=timezone.now() + timedelta(days=30),
                    created_by=manager,
                )

            messages.success(request, f"✅ Ο tenant '{tenant_name}' δημιουργήθηκε με επιτυχία.")
            return HttpResponseRedirect("/admin/tenants/client/")

        return render(request, TENANT_CREATE_TEMPLATE)
