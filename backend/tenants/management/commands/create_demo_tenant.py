# 📄 backend/tenants/management/commands/create_demo_tenant.py

from django.core.management.base import BaseCommand # type: ignore
from tenants.models import Client, Domain
from django.utils.timezone import now # type: ignore
from datetime import timedelta


class Command(BaseCommand):
    help = "Δημιουργεί έναν demo tenant με schema 'demo' και domain 'demo.localhost'"

    def handle(self, *args, **options):
        if Client.objects.filter(schema_name="demo").exists():
            self.stdout.write(self.style.WARNING("ℹ️ Ο tenant 'demo' υπάρχει ήδη."))
            return

        demo = Client.objects.create(
            schema_name="demo",
            name="Demo Tenant",
            paid_until=now().date() + timedelta(days=365),
            on_trial=True,
        )

        Domain.objects.create(
            domain="demo.localhost",
            tenant=demo,
            is_primary=True,
        )

        self.stdout.write(self.style.SUCCESS("✅ Ο demo tenant δημιουργήθηκε επιτυχώς."))
