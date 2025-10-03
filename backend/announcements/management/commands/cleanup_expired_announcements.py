"""
Django management command to deactivate expired announcements.
Run this daily via cron job to automatically hide past events.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django_tenants.utils import schema_context, get_tenant_model
from announcements.models import Announcement


class Command(BaseCommand):
    help = 'Deactivate expired announcements (past general assemblies and accepted offers)'

    def handle(self, *args, **options):
        TenantModel = get_tenant_model()
        tenants = TenantModel.objects.exclude(schema_name='public')

        total_deactivated = 0

        for tenant in tenants:
            with schema_context(tenant.schema_name):
                # Απενεργοποίηση ανακοινώσεων Γενικών Συνελεύσεων που έχουν περάσει
                assembly_announcements = Announcement.objects.filter(
                    title__icontains="Σύγκληση Γενικής Συνέλευσης",
                    end_date__lt=timezone.now().date(),
                    is_active=True
                )

                count = assembly_announcements.count()
                if count > 0:
                    assembly_announcements.update(is_active=False)
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'[{tenant.schema_name}] Απενεργοποιήθηκαν {count} ανακοινώσεις συνελεύσεων που έχουν παρέλθει'
                        )
                    )
                    total_deactivated += count

        if total_deactivated > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Συνολικά απενεργοποιήθηκαν {total_deactivated} ανακοινώσεις'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('✅ Δεν βρέθηκαν ανακοινώσεις προς απενεργοποίηση')
            )
