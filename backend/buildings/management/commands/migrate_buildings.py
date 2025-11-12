"""
Management command για να τρέξει migrations του buildings app σε όλα τα tenant schemas.
Χρησιμοποιείται όταν χρειάζεται να εφαρμοστούν migrations του buildings app.
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django_tenants.utils import schema_context, get_public_schema_name
from tenants.models import Client


class Command(BaseCommand):
    help = 'Run buildings migrations on all tenant schemas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--shared',
            action='store_true',
            help='Run migrations on shared schema only',
        )
        parser.add_argument(
            '--tenant',
            type=str,
            help='Run migrations on specific tenant schema',
        )

    def handle(self, *args, **options):
        if options['shared']:
            self.stdout.write(self.style.SUCCESS('📦 Migrating SHARED schema...'))
            try:
                call_command('migrate_schemas', '--shared', 'buildings', verbosity=2)
                self.stdout.write(self.style.SUCCESS('✅ Shared schema migrations completed'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
                return
        elif options['tenant']:
            tenant_name = options['tenant']
            try:
                tenant = Client.objects.get(schema_name=tenant_name)
                self.stdout.write(self.style.SUCCESS(f'🏢 Migrating tenant: {tenant.name}'))
                with schema_context(tenant.schema_name):
                    call_command('migrate', 'buildings', verbosity=2)
                self.stdout.write(self.style.SUCCESS(f'✅ {tenant.name} migrated successfully'))
            except Client.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'❌ Tenant "{tenant_name}" not found'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
        else:
            # Migrate all tenant schemas
            self.stdout.write(self.style.SUCCESS('🏢 Migrating all TENANT schemas...'))
            
            tenants = Client.objects.exclude(schema_name=get_public_schema_name())
            tenant_count = tenants.count()
            
            if tenant_count == 0:
                self.stdout.write(self.style.WARNING('⚠️  No tenant schemas found'))
                return
            
            self.stdout.write(f'📊 Found {tenant_count} tenant(s)')
            
            success_count = 0
            failed_tenants = []
            
            for tenant in tenants:
                self.stdout.write(f'  🔄 Migrating: {tenant.name} (schema: {tenant.schema_name})')
                try:
                    with schema_context(tenant.schema_name):
                        call_command('migrate', 'buildings', verbosity=1)
                    self.stdout.write(self.style.SUCCESS(f'  ✅ {tenant.name}'))
                    success_count += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  ❌ {tenant.name}: {e}'))
                    failed_tenants.append((tenant.name, str(e)))
            
            # Summary
            self.stdout.write('\n' + '=' * 60)
            self.stdout.write(self.style.SUCCESS(f'✅ Successful: {success_count}/{tenant_count}'))
            if failed_tenants:
                self.stdout.write(self.style.ERROR(f'❌ Failed: {len(failed_tenants)}'))
                for tenant_name, error in failed_tenants:
                    self.stdout.write(self.style.ERROR(f'  - {tenant_name}: {error}'))
            else:
                self.stdout.write(self.style.SUCCESS('🎉 All migrations completed successfully!'))



