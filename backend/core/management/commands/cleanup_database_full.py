"""
Full database cleanup command - cleans ALL data including public schema
"""
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django_tenants.utils import schema_context, get_public_schema_name


class Command(BaseCommand):
    help = 'Full database cleanup - removes ALL data including users, tenants, subscriptions (keeps only plans)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Skip confirmation prompt'
        )

    def handle(self, *args, **options):
        force = options['force']
        
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('  🧹 FULL DATABASE CLEANUP'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        
        if not force:
            confirm = input('\n⚠️  This will DELETE ALL DATA (users, tenants, subscriptions)!\nType "yes" to continue: ')
            if confirm != 'yes':
                self.stdout.write(self.style.ERROR('❌ Cleanup cancelled'))
                return
        
        try:
            with transaction.atomic():
                # Import models
                from users.models import CustomUser
                from tenants.models import Client, Domain
                from billing.models import UserSubscription, PaymentMethod, UsageTracking, BillingCycle
                
                public_schema = get_public_schema_name()
                
                with schema_context(public_schema):
                    # Get counts before deletion
                    user_count = CustomUser.objects.count()
                    tenant_count = Client.objects.count()
                    subscription_count = UserSubscription.objects.count()
                    domain_count = Domain.objects.count()
                    
                    self.stdout.write(f'\n📊 Current Data:')
                    self.stdout.write(f'   👥 Users: {user_count}')
                    self.stdout.write(f'   🏢 Tenants: {tenant_count}')
                    self.stdout.write(f'   💳 Subscriptions: {subscription_count}')
                    self.stdout.write(f'   🌐 Domains: {domain_count}')
                    
                    if user_count + tenant_count + subscription_count == 0:
                        self.stdout.write(self.style.SUCCESS('\n✅ Database is already clean!'))
                        return
                    
                    self.stdout.write('\n🗑️  Deleting data...')
                    
                    # Delete in correct order (respecting foreign keys)
                    # 1. Billing data
                    BillingCycle.objects.all().delete()
                    UsageTracking.objects.all().delete()
                    PaymentMethod.objects.all().delete()
                    UserSubscription.objects.all().delete()
                    self.stdout.write('   ✓ Billing data deleted')
                    
                    # 2. Tenants (delete first, before domains) - handle each tenant separately
                    tenant_count_before = Client.objects.count()
                    for tenant in Client.objects.all():
                        self.stdout.write(f'   🗑️  Dropping schema: {tenant.schema_name}')
                        try:
                            with transaction.atomic():
                                tenant.delete()
                        except Exception as e:
                            self.stdout.write(f'   ⚠️  Failed to delete tenant {tenant.schema_name}: {e}')
                            # Continue with next tenant even if one fails
                    self.stdout.write(f'   ✓ Tenants processed ({tenant_count_before} tenants)')
                    
                    # 3. Domains (delete after tenants)
                    try:
                        domain_count_before = Domain.objects.count()
                        Domain.objects.all().delete()
                        self.stdout.write(f'   ✓ Domains deleted ({domain_count_before} domains)')
                    except Exception as e:
                        self.stdout.write(f'   ⚠️  Failed to delete domains: {e}')
                    
                    # 4. Users (preserve system admin)
                    try:
                        system_admin_email = 'theostam1966@gmail.com'
                        system_admin = CustomUser.objects.filter(email=system_admin_email).first()
                        if system_admin:
                            CustomUser.objects.exclude(email=system_admin_email).delete()
                            self.stdout.write(f'   ✓ Users deleted (preserved system admin: {system_admin_email})')
                        else:
                            CustomUser.objects.all().delete()
                            self.stdout.write('   ✓ Users deleted (no system admin found)')
                    except Exception as e:
                        self.stdout.write(f'   ⚠️  Failed to delete users: {e}')
                    
                    self.stdout.write(self.style.SUCCESS('\n✅ Full database cleanup completed!'))
                    self.stdout.write(self.style.SUCCESS('   Plans and system data preserved'))
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Cleanup failed: {e}'))
            # Don't raise - allow deployment to continue

