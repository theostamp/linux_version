# backend/tenants/management/commands/verify_subdomain.py

from django.core.management.base import BaseCommand, CommandError
from tenants.utils import verify_subdomain_accessibility, get_production_subdomain
from django_tenants.utils import get_tenant_model, get_tenant_domain_model
import json


class Command(BaseCommand):
    help = 'Verify if a tenant subdomain is accessible (DNS + HTTP)'

    def add_arguments(self, parser):
        parser.add_argument(
            'subdomain',
            type=str,
            nargs='?',
            help='Full subdomain to check (e.g., theo.newconcierge.app) or schema name'
        )
        parser.add_argument(
            '--schema',
            type=str,
            dest='schema_name',
            help='Tenant schema name (will generate production subdomain)'
        )
        parser.add_argument(
            '--protocol',
            type=str,
            default='https',
            choices=['http', 'https'],
            help='Protocol to use for verification'
        )
        parser.add_argument(
            '--timeout',
            type=int,
            default=10,
            help='Timeout in seconds for HTTP requests'
        )
        parser.add_argument(
            '--no-ssl-verify',
            action='store_true',
            help='Skip SSL certificate verification'
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output results as JSON'
        )
        parser.add_argument(
            '--list-all',
            action='store_true',
            help='Verify all tenant subdomains in the system'
        )

    def handle(self, *args, **options):
        subdomain = options.get('subdomain')
        schema_name = options.get('schema_name')
        protocol = options.get('protocol', 'https')
        timeout = options.get('timeout', 10)
        verify_ssl = not options.get('no_ssl_verify', False)
        output_json = options.get('json', False)
        list_all = options.get('list_all', False)

        # Handle --list-all option
        if list_all:
            return self.verify_all_tenants(protocol, timeout, verify_ssl, output_json)

        # Determine which subdomain to check
        if not subdomain and not schema_name:
            raise CommandError('Either --subdomain, --schema, or --list-all must be provided')

        if schema_name:
            subdomain = get_production_subdomain(schema_name)
            self.stdout.write(f"Using production subdomain for schema '{schema_name}': {subdomain}")

        # Verify the subdomain
        self.stdout.write(f"Verifying subdomain: {subdomain}")
        result = verify_subdomain_accessibility(
            subdomain,
            protocol=protocol,
            timeout=timeout,
            verify_ssl=verify_ssl
        )

        # Output results
        if output_json:
            self.stdout.write(json.dumps(result, indent=2))
        else:
            self.output_human_readable(subdomain, result)

        # Exit with appropriate code
        if not result['accessible']:
            raise CommandError(f"Subdomain {subdomain} is not accessible: {result.get('error', 'Unknown error')}")

    def verify_all_tenants(self, protocol, timeout, verify_ssl, output_json):
        """Verify all tenant subdomains."""
        TenantModel = get_tenant_model()
        DomainModel = get_tenant_domain_model()

        tenants = TenantModel.objects.all()
        results = []

        self.stdout.write(f"Verifying {tenants.count()} tenants...")

        for tenant in tenants:
            domains = DomainModel.objects.filter(tenant=tenant, is_primary=True)
            
            if not domains.exists():
                self.stdout.write(
                    self.style.WARNING(f"⚠️  Tenant {tenant.schema_name} has no primary domain")
                )
                continue

            for domain in domains:
                self.stdout.write(f"\nChecking: {domain.domain} (tenant: {tenant.schema_name})")
                
                result = verify_subdomain_accessibility(
                    domain.domain,
                    protocol=protocol,
                    timeout=timeout,
                    verify_ssl=verify_ssl
                )
                
                result['tenant_schema'] = tenant.schema_name
                result['tenant_name'] = tenant.name
                result['domain'] = domain.domain
                results.append(result)

                if output_json:
                    continue

                # Human-readable output
                if result['accessible']:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✅ Accessible (HTTP {result['status_code']}, IP: {result.get('ip_address', 'N/A')})"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f"  ❌ Not accessible: {result.get('error', 'Unknown error')}")
                    )

        if output_json:
            self.stdout.write(json.dumps(results, indent=2))
        else:
            # Summary
            accessible_count = sum(1 for r in results if r['accessible'])
            total_count = len(results)
            
            self.stdout.write(f"\n{'=' * 60}")
            self.stdout.write(
                self.style.SUCCESS(f"\nSummary: {accessible_count}/{total_count} subdomains are accessible")
            )

        return results

    def output_human_readable(self, subdomain, result):
        """Output human-readable verification results."""
        self.stdout.write(f"\n{'=' * 60}")
        self.stdout.write(f"Verification Results for: {subdomain}")
        self.stdout.write(f"{'=' * 60}\n")

        # DNS Resolution
        if result['dns_resolved']:
            self.stdout.write(
                self.style.SUCCESS(f"✅ DNS Resolution: SUCCESS (IP: {result.get('ip_address', 'N/A')})")
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"❌ DNS Resolution: FAILED")
            )

        # HTTP Accessibility
        if result['http_accessible']:
            status_code = result.get('status_code', 'N/A')
            status_style = self.style.SUCCESS if status_code < 400 else self.style.WARNING
            self.stdout.write(
                status_style(f"✅ HTTP Accessibility: SUCCESS (Status: {status_code})")
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"❌ HTTP Accessibility: FAILED")
            )

        # Overall Status
        self.stdout.write(f"\n{'─' * 60}")
        if result['accessible']:
            self.stdout.write(
                self.style.SUCCESS(f"\n🎉 Overall: SUBDOMAIN IS ACCESSIBLE")
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"\n⚠️  Overall: SUBDOMAIN IS NOT ACCESSIBLE")
            )
            if result.get('error'):
                self.stdout.write(f"   Error: {result['error']}")

        self.stdout.write(f"{'=' * 60}\n")

