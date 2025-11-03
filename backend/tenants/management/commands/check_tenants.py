from django.core.management.base import BaseCommand
from tenants.models import Client, Domain
from users.models import CustomUser
from django_tenants.utils import schema_exists


class Command(BaseCommand):
    help = 'Check what tenants and users exist in the database'

    def handle(self, *args, **options):
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('TENANT DATABASE CHECK'))
        self.stdout.write('='*60)

        # Check tenants
        tenants = Client.objects.all().order_by('-created_on')
        self.stdout.write(f'\n📊 Total Tenants: {tenants.count()}')

        for tenant in tenants:
            self.stdout.write(f'\n🏢 Tenant: {tenant.schema_name}')
            self.stdout.write(f'   Name: {tenant.name}')
            self.stdout.write(f'   Created: {tenant.created_on}')
            
            # Check domains
            domains = Domain.objects.filter(tenant=tenant)
            self.stdout.write(f'   Domains ({domains.count()}):')
            for domain in domains:
                primary = '(primary)' if domain.is_primary else ''
                self.stdout.write(f'      - {domain.domain} {primary}')
            
            # Check if schema exists
            exists = schema_exists(tenant.schema_name)
            status = self.style.SUCCESS('✅') if exists else self.style.ERROR('❌')
            self.stdout.write(f'   Schema exists: {status} {exists}')

        # Check users
        self.stdout.write(f'\n👥 Total Users: {CustomUser.objects.count()}')
        users = CustomUser.objects.all().order_by('-date_joined')[:10]
        for user in users:
            tenant_name = user.tenant.schema_name if user.tenant else None
            self.stdout.write(f'\n   {user.email}')
            self.stdout.write(f'      Tenant: {tenant_name}')
            self.stdout.write(f'      Active: {user.is_active}')
            self.stdout.write(f'      Staff: {user.is_staff}')
            self.stdout.write(f'      Superuser: {user.is_superuser}')

        self.stdout.write('\n' + '='*60 + '\n')

