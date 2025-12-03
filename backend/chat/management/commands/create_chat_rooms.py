"""
Management command to create chat rooms for buildings that don't have one.
Supports multi-tenant architecture with django-tenants.
"""
from django.core.management.base import BaseCommand
from django_tenants.utils import get_tenant_model, schema_context


class Command(BaseCommand):
    help = 'Creates chat rooms for buildings that do not have one'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating',
        )
        parser.add_argument(
            '--tenant',
            type=str,
            help='Specific tenant schema name to process (e.g., "demo", "theo")',
        )
        parser.add_argument(
            '--all-tenants',
            action='store_true',
            help='Process all tenants (excluding public schema)',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        tenant_name = options.get('tenant')
        all_tenants = options.get('all_tenants', False)
        
        TenantModel = get_tenant_model()
        
        if tenant_name:
            # Process specific tenant
            try:
                tenant = TenantModel.objects.get(schema_name=tenant_name)
                self.process_tenant(tenant, dry_run)
            except TenantModel.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Tenant "{tenant_name}" δεν βρέθηκε!'))
                return
        elif all_tenants:
            # Process all tenants except public
            tenants = TenantModel.objects.exclude(schema_name='public')
            self.stdout.write(f'Βρέθηκαν {tenants.count()} tenants')
            
            for tenant in tenants:
                self.stdout.write(f'\n{"="*50}')
                self.stdout.write(f'Processing tenant: {tenant.schema_name}')
                self.stdout.write(f'{"="*50}')
                self.process_tenant(tenant, dry_run)
        else:
            self.stdout.write(self.style.WARNING(
                'Πρέπει να ορίσετε --tenant=<schema_name> ή --all-tenants\n\n'
                'Παραδείγματα:\n'
                '  python manage.py create_chat_rooms --tenant=demo\n'
                '  python manage.py create_chat_rooms --tenant=theo\n'
                '  python manage.py create_chat_rooms --all-tenants\n'
                '  python manage.py create_chat_rooms --all-tenants --dry-run'
            ))
    
    def process_tenant(self, tenant, dry_run):
        """Process a single tenant schema."""
        # Import models inside the method to avoid import issues
        from buildings.models import Building
        from chat.models import ChatRoom
        
        with schema_context(tenant.schema_name):
            # Get all buildings without chat rooms
            buildings_without_chat = Building.objects.exclude(
                id__in=ChatRoom.objects.values_list('building_id', flat=True)
            )
            
            count = buildings_without_chat.count()
            
            if count == 0:
                self.stdout.write(self.style.SUCCESS(
                    f'[{tenant.schema_name}] Όλα τα κτίρια έχουν ήδη chat room!'
                ))
                return
            
            self.stdout.write(f'[{tenant.schema_name}] Βρέθηκαν {count} κτίρια χωρίς chat room.')
            
            if dry_run:
                self.stdout.write(self.style.WARNING('DRY RUN - Τα παρακάτω chat rooms ΔΕΝ θα δημιουργηθούν:'))
            
            created_count = 0
            for building in buildings_without_chat:
                if dry_run:
                    self.stdout.write(f'  - Θα δημιουργούνταν: Chat Room για "{building.name}"')
                else:
                    chat_room = ChatRoom.objects.create(
                        building=building,
                        name=f'Chat - {building.name}',
                        is_active=True
                    )
                    self.stdout.write(
                        f'  ✓ Δημιουργήθηκε: Chat Room για "{building.name}" (ID: {chat_room.id})'
                    )
                    created_count += 1
            
            if not dry_run and created_count > 0:
                self.stdout.write(self.style.SUCCESS(
                    f'[{tenant.schema_name}] Δημιουργήθηκαν {created_count} chat rooms επιτυχώς!'
                ))

