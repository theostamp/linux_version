"""
Management command για δημιουργία production tenant με πλήρη setup
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.management import call_command
from datetime import timedelta
from tenants.models import Client, Domain
from django.db import transaction
from users.models import CustomUser


class Command(BaseCommand):
    help = 'Create a new production tenant with complete setup'

    def add_arguments(self, parser):
        parser.add_argument(
            '--schema-name',
            type=str,
            required=True,
            help='Schema name for the tenant (e.g., "theo")'
        )
        parser.add_argument(
            '--tenant-name',
            type=str,
            required=True,
            help='Display name for the tenant (e.g., "Theo Stam")'
        )
        parser.add_argument(
            '--domain',
            type=str,
            help='Full domain name (default: <schema_name>.newconcierge.app)'
        )
        parser.add_argument(
            '--admin-email',
            type=str,
            help='Admin email for the tenant'
        )
        parser.add_argument(
            '--admin-password',
            type=str,
            default='admin123!@#',
            help='Admin password (default: admin123!@#)'
        )
        parser.add_argument(
            '--trial-days',
            type=int,
            default=30,
            help='Trial period in days (default: 30)'
        )
        parser.add_argument(
            '--skip-demo-data',
            action='store_true',
            help='Skip demo data creation'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform a dry run without creating anything'
        )

    def handle(self, *args, **options):
        schema_name = options['schema_name']
        tenant_name = options['tenant_name']
        domain_name = options.get('domain') or f"{schema_name}.newconcierge.app"
        admin_email = options.get('admin_email') or f"admin@{schema_name}.newconcierge.app"
        admin_password = options['admin_password']
        trial_days = options['trial_days']
        skip_demo = options['skip_demo_data']
        dry_run = options['dry_run']
        
        self.stdout.write(self.style.SUCCESS('🏗️  PRODUCTION TENANT CREATION'))
        self.stdout.write('=' * 70)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('🧪 DRY RUN MODE - No changes will be made'))
        
        # Display configuration
        self.stdout.write('\n📋 Configuration:')
        self.stdout.write(f'   Schema Name: {schema_name}')
        self.stdout.write(f'   Tenant Name: {tenant_name}')
        self.stdout.write(f'   Domain: {domain_name}')
        self.stdout.write(f'   Admin Email: {admin_email}')
        self.stdout.write(f'   Admin Password: {"*" * len(admin_password)}')
        self.stdout.write(f'   Trial Days: {trial_days}')
        self.stdout.write(f'   Demo Data: {"No" if skip_demo else "Yes"}')
        
        # Check if tenant already exists
        if Client.objects.filter(schema_name=schema_name).exists():
            self.stdout.write(self.style.ERROR(f'\n❌ Tenant with schema_name "{schema_name}" already exists!'))
            return
        
        # Check if domain already exists
        if Domain.objects.filter(domain=domain_name).exists():
            self.stdout.write(self.style.ERROR(f'\n❌ Domain "{domain_name}" already exists!'))
            return
        
        if dry_run:
            self.stdout.write(self.style.SUCCESS('\n✅ Dry run completed - configuration is valid'))
            return
        
        try:
            with transaction.atomic():
                # Step 1: Create tenant
                self.stdout.write('\n🏢 Step 1: Creating tenant...')
                tenant = Client.objects.create(
                    schema_name=schema_name,
                    name=tenant_name,
                    paid_until=timezone.now().date() + timedelta(days=trial_days),
                    on_trial=True,
                    is_active=True,
                    trial_days=trial_days
                )
                self.stdout.write(self.style.SUCCESS(f'   ✅ Tenant created: {tenant.name}'))
                
                # Step 2: Create domain
                self.stdout.write('\n🌐 Step 2: Creating domain...')
                domain = Domain.objects.create(
                    domain=domain_name,
                    tenant=tenant,
                    is_primary=True
                )
                self.stdout.write(self.style.SUCCESS(f'   ✅ Domain created: {domain.domain}'))
                
                # Step 3: Run migrations for the new schema
                self.stdout.write('\n🔄 Step 3: Running migrations for new schema...')
                call_command('migrate_schemas', schema_name=schema_name, interactive=False)
                self.stdout.write(self.style.SUCCESS(f'   ✅ Migrations completed for {schema_name}'))
                
                # Step 4: Create admin user in the tenant
                self.stdout.write('\n👤 Step 4: Creating admin user...')
                from django_tenants.utils import schema_context
                
                with schema_context(schema_name):
                    admin_user = CustomUser.objects.create(
                        email=admin_email,
                        first_name=tenant_name.split()[0] if ' ' in tenant_name else tenant_name,
                        last_name=' '.join(tenant_name.split()[1:]) if ' ' in tenant_name else 'Admin',
                        is_staff=True,
                        is_superuser=True,
                        is_active=True,
                        role='admin',
                        email_verified=True
                    )
                    admin_user.set_password(admin_password)
                    admin_user.save()
                    self.stdout.write(self.style.SUCCESS(f'   ✅ Admin user created: {admin_email}'))
                
                # Step 5: Create demo data (optional)
                if not skip_demo:
                    self.stdout.write('\n🎨 Step 5: Creating demo data...')
                    with schema_context(schema_name):
                        # Import here to avoid circular imports
                        from buildings.models import Building
                        from datetime import date
                        
                        # Create a demo building
                        building = Building.objects.create(
                            name=f'Κτίριο {tenant_name}',
                            address=f'Διεύθυνση {tenant_name}',
                            city='Αθήνα',
                            postal_code='10000',
                            apartments_count=1,
                            financial_system_start_date=date.today().replace(day=1)
                        )
                        self.stdout.write(self.style.SUCCESS(f'   ✅ Demo building created: {building.name}'))
                else:
                    self.stdout.write('\n⏭️  Step 5: Skipping demo data creation')
                
                # Success summary
                self.stdout.write('\n' + '=' * 70)
                self.stdout.write(self.style.SUCCESS('✅ TENANT CREATION COMPLETED!'))
                self.stdout.write('=' * 70)
                
                self.stdout.write('\n📊 Tenant Details:')
                self.stdout.write(f'   Schema Name: {schema_name}')
                self.stdout.write(f'   Tenant ID: {tenant.id}')
                self.stdout.write(f'   Domain: {domain_name}')
                self.stdout.write(f'   Status: {"Trial" if tenant.on_trial else "Active"}')
                self.stdout.write(f'   Trial Until: {tenant.paid_until}')
                
                self.stdout.write('\n🔐 Admin Credentials:')
                self.stdout.write(f'   Email: {admin_email}')
                self.stdout.write(f'   Password: {admin_password}')
                
                self.stdout.write('\n🌐 Access URLs:')
                self.stdout.write(f'   Frontend: https://{domain_name}')
                self.stdout.write(f'   Backend API: https://linuxversion-production.up.railway.app/api/')
                self.stdout.write(f'   Admin Panel: https://linuxversion-production.up.railway.app/admin/')
                
                self.stdout.write('\n📝 Next Steps:')
                self.stdout.write('   1. Test login at the frontend')
                self.stdout.write('   2. Configure DNS if needed')
                self.stdout.write('   3. Add buildings and apartments')
                self.stdout.write('   4. Invite users')
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Tenant creation failed: {e}'))
            import traceback
            self.stdout.write(traceback.format_exc())
            raise

