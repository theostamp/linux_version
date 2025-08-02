# backend/tenants/forms.py

from django import forms
from tenants.models import Client, Domain
from users.models import CustomUser
from django.utils import timezone
from datetime import timedelta


class TenantCreationForm(forms.Form):
    schema_name = forms.SlugField(label="Schema (π.χ. tenant1)")
    domain = forms.CharField(label="Domain (π.χ. tenant1.localhost)")
    name = forms.CharField(label="Όνομα Tenant")
    manager_email = forms.EmailField(label="Email Διαχειριστή")
    manager_password = forms.CharField(widget=forms.PasswordInput, label="Κωδικός")
    trial_days = forms.IntegerField(label="Δοκιμαστικές ημέρες", initial=30)

    def save(self):
        # ➊ Δημιουργία tenant
        schema_name = self.cleaned_data["schema_name"]
        name = self.cleaned_data["name"]
        trial_days = self.cleaned_data["trial_days"]

        client = Client.objects.create(
            schema_name=schema_name,
            name=name,
            on_trial=True,
            paid_until=timezone.now().date() + timedelta(days=trial_days),
        )
        client.save()

        # ➋ Domain
        domain = self.cleaned_data["domain"]
        Domain.objects.create(
            domain=domain,
            tenant=client,
            is_primary=True,
        )

        # ➌ Tenant migrations
        from django.core.management import call_command
        call_command("migrate_schemas", schema_name=schema_name, interactive=False, verbosity=0)

        # ➍ Δημιουργία διαχειριστή στο νέο schema
        from django_tenants.utils import schema_context
        with schema_context(schema_name):
            CustomUser.objects.create_user(
                email=self.cleaned_data["manager_email"],
                password=self.cleaned_data["manager_password"],
                first_name="Tenant",
                last_name="Manager",
                is_staff=True,
                is_active=True,
                role="manager",
            )

        return client
