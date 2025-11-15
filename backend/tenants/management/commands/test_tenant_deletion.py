"""
Management command to test tenant deletion and verify all related data is deleted.

Usage:
    python manage.py test_tenant_deletion <tenant_schema_name>
    
Example:
    python manage.py test_tenant_deletion demo
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django_tenants.utils import schema_context
from tenants.models import Client, Domain
from users.models import CustomUser
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment, MonthlyBalance
from projects.models import Project
from maintenance.models import Contractor, ScheduledMaintenance
from announcements.models import Announcement
try:
    from billing.models import UserSubscription, SubscriptionPlan
    BILLING_AVAILABLE = True
except ImportError:
    BILLING_AVAILABLE = False
import sys


class Command(BaseCommand):
    help = 'Test tenant deletion and verify all related data is deleted'

    def add_arguments(self, parser):
        parser.add_argument(
            'schema_name',
            type=str,
            help='Schema name of the tenant to test deletion for'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        schema_name = options['schema_name']
        dry_run = options['dry_run']

        # Find tenant
        try:
            tenant = Client.objects.get(schema_name=schema_name)
        except Client.DoesNotExist:
            raise CommandError(f'Tenant with schema_name "{schema_name}" does not exist.')

        self.stdout.write(self.style.SUCCESS(f'\n🔍 Found tenant: {tenant.name} (schema: {schema_name})'))

        # Count related data BEFORE deletion
        with schema_context(schema_name):
            counts_before = {
                'users': CustomUser.objects.count(),
                'buildings': Building.objects.count(),
                'apartments': Apartment.objects.count(),
                'expenses': Expense.objects.count(),
                'payments': Payment.objects.count(),
                'monthly_balances': MonthlyBalance.objects.count(),
                'projects': Project.objects.count(),
                'contractors': Contractor.objects.count(),
                'scheduled_maintenance': ScheduledMaintenance.objects.count(),
                'announcements': Announcement.objects.count(),
            }
            
            if BILLING_AVAILABLE:
                counts_before['subscriptions'] = UserSubscription.objects.count()

            # Get domain count
            domain_count = Domain.objects.filter(tenant=tenant).count()

        self.stdout.write(self.style.WARNING('\n📊 Data counts BEFORE deletion:'))
        self.stdout.write(f'  - Users: {counts_before["users"]}')
        self.stdout.write(f'  - Buildings: {counts_before["buildings"]}')
        self.stdout.write(f'  - Apartments: {counts_before["apartments"]}')
        self.stdout.write(f'  - Expenses: {counts_before["expenses"]}')
        self.stdout.write(f'  - Payments: {counts_before["payments"]}')
        self.stdout.write(f'  - Monthly Balances: {counts_before["monthly_balances"]}')
        self.stdout.write(f'  - Projects: {counts_before["projects"]}')
        self.stdout.write(f'  - Contractors: {counts_before["contractors"]}')
        self.stdout.write(f'  - Scheduled Maintenance: {counts_before["scheduled_maintenance"]}')
        self.stdout.write(f'  - Announcements: {counts_before["announcements"]}')
        if BILLING_AVAILABLE:
            self.stdout.write(f'  - Subscriptions: {counts_before["subscriptions"]}')
        self.stdout.write(f'  - Domains: {domain_count}')

        if dry_run:
            self.stdout.write(self.style.WARNING('\n⚠️  DRY RUN MODE - No deletion will be performed'))
            self.stdout.write('\n✅ What would happen:')
            self.stdout.write('  1. All data in tenant schema would be deleted (CASCADE)')
            self.stdout.write('  2. Tenant schema would be dropped (auto_drop_schema=True)')
            self.stdout.write('  3. Domain records would be deleted (CASCADE)')
            self.stdout.write('  4. User tenant field would be set to NULL (SET_NULL)')
            return

        # Confirm deletion
        self.stdout.write(self.style.ERROR('\n⚠️  WARNING: This will PERMANENTLY DELETE all tenant data!'))
        confirm = input('Type "DELETE" to confirm: ')
        if confirm != 'DELETE':
            self.stdout.write(self.style.ERROR('Deletion cancelled.'))
            return

        # Store user IDs that reference this tenant
        users_with_tenant = list(CustomUser.objects.filter(tenant=tenant).values_list('id', flat=True))

        # Delete tenant (this should cascade delete domains and drop schema)
        self.stdout.write(self.style.WARNING(f'\n🗑️  Deleting tenant "{tenant.name}"...'))
        tenant.delete()

        # Verify schema is dropped
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name = %s
            """, [schema_name])
            schema_exists = cursor.fetchone() is not None

        if schema_exists:
            self.stdout.write(self.style.ERROR(f'❌ ERROR: Schema "{schema_name}" still exists!'))
            sys.exit(1)
        else:
            self.stdout.write(self.style.SUCCESS(f'✅ Schema "{schema_name}" successfully dropped'))

        # Verify domains are deleted
        domains_after = Domain.objects.filter(tenant_id=tenant.id).count()
        if domains_after > 0:
            self.stdout.write(self.style.ERROR(f'❌ ERROR: {domains_after} domain(s) still exist!'))
            sys.exit(1)
        else:
            self.stdout.write(self.style.SUCCESS(f'✅ All {domain_count} domain(s) deleted'))

        # Verify users' tenant field is set to NULL
        users_with_tenant_after = CustomUser.objects.filter(id__in=users_with_tenant, tenant__isnull=False).count()
        if users_with_tenant_after > 0:
            self.stdout.write(self.style.ERROR(f'❌ ERROR: {users_with_tenant_after} user(s) still have tenant reference!'))
            sys.exit(1)
        else:
            self.stdout.write(self.style.SUCCESS(f'✅ All {len(users_with_tenant)} user(s) tenant field set to NULL'))

        # Try to access schema data (should fail)
        try:
            with schema_context(schema_name):
                # This should raise an exception
                Building.objects.count()
            self.stdout.write(self.style.ERROR('❌ ERROR: Could still access schema data!'))
            sys.exit(1)
        except Exception as e:
            self.stdout.write(self.style.SUCCESS(f'✅ Schema data inaccessible (as expected): {type(e).__name__}'))

        self.stdout.write(self.style.SUCCESS('\n✅ Tenant deletion test PASSED!'))
        self.stdout.write('\n📋 Summary:')
        self.stdout.write(f'  - Schema dropped: ✅')
        self.stdout.write(f'  - Domains deleted: ✅ ({domain_count})')
        self.stdout.write(f'  - User tenant fields set to NULL: ✅ ({len(users_with_tenant)})')
        self.stdout.write(f'  - All tenant data deleted: ✅')

