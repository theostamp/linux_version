"""
Management command to fix/add tenant domain for existing tenants
"""
from django.core.management.base import BaseCommand
from tenants.models import Client, Domain
from django_tenants.utils import get_public_schema_name


class Command(BaseCommand):
    help = 'Fix or add domain for a tenant (e.g., theo.newconcierge.app for tenant "theo")'

    def add_arguments(self, parser):
        parser.add_argument(
            '--schema-name',
            type=str,
            required=True,
            help='Schema name of the tenant (e.g., "theo")'
        )
        parser.add_argument(
            '--domain',
            type=str,
            help='Full domain name (e.g., "theo.newconcierge.app"). If not provided, will use schema_name + TENANT_BASE_DOMAIN'
        )
        parser.add_argument(
            '--base-domain',
            type=str,
            default='newconcierge.app',
            help='Base domain to use if --domain is not provided (default: newconcierge.app)'
        )

    def handle(self, *args, **options):
        schema_name = options['schema_name']
        domain_name = options.get('domain')
        base_domain = options.get('base_domain', 'newconcierge.app')
        
        # Construct domain name if not provided
        if not domain_name:
            domain_name = f"{schema_name}.{base_domain}"
        
        self.stdout.write(f"Looking for tenant with schema_name: {schema_name}")
        
        try:
            # Get tenant
            tenant = Client.objects.get(schema_name=schema_name)
            self.stdout.write(self.style.SUCCESS(f"Found tenant: {tenant.name} (ID: {tenant.id})"))
            
            # Check if domain already exists
            existing_domain = Domain.objects.filter(domain=domain_name).first()
            
            if existing_domain:
                if existing_domain.tenant == tenant:
                    self.stdout.write(self.style.SUCCESS(f"Domain {domain_name} already exists and is correctly linked to tenant {schema_name}"))
                    return
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Domain {domain_name} exists but belongs to different tenant: {existing_domain.tenant.schema_name}"
                        )
                    )
                    # Ask if we should reassign
                    self.stdout.write(f"Reassigning domain to tenant {schema_name}...")
                    existing_domain.tenant = tenant
                    existing_domain.is_primary = True
                    existing_domain.save()
                    self.stdout.write(self.style.SUCCESS(f"Domain {domain_name} reassigned to tenant {schema_name}"))
                    return
            
            # Check if tenant has any domains
            existing_tenant_domains = Domain.objects.filter(tenant=tenant)
            if existing_tenant_domains.exists():
                self.stdout.write(f"Tenant already has {existing_tenant_domains.count()} domain(s):")
                for dom in existing_tenant_domains:
                    self.stdout.write(f"  - {dom.domain} (primary: {dom.is_primary})")
                
                # Set is_primary based on whether tenant has a primary domain
                is_primary = not existing_tenant_domains.filter(is_primary=True).exists()
            else:
                is_primary = True
            
            # Create new domain
            Domain.objects.create(
                domain=domain_name,
                tenant=tenant,
                is_primary=is_primary
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully created domain {domain_name} for tenant {schema_name} (primary: {is_primary})"
                )
            )
            
        except Client.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"Tenant with schema_name '{schema_name}' not found")
            )
            self.stdout.write("Available tenants:")
            for tenant in Client.objects.all():
                domains = Domain.objects.filter(tenant=tenant)
                domain_list = ", ".join([d.domain for d in domains]) if domains.exists() else "no domains"
                self.stdout.write(f"  - {tenant.schema_name} ({tenant.name}) - Domains: {domain_list}")
            return

