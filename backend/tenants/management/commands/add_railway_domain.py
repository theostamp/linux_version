#!/usr/bin/env python
"""
Management command to add Railway domain to public tenant
"""
from django.core.management.base import BaseCommand
from tenants.models import Client, Domain


class Command(BaseCommand):
    help = 'Add Railway production domain to public tenant'

    def add_arguments(self, parser):
        parser.add_argument(
            '--domain',
            type=str,
            default='linuxversion-production.up.railway.app',
            help='Domain to add to public tenant'
        )

    def handle(self, *args, **options):
        domain_name = options['domain']

        try:
            # Get public tenant
            public_tenant = Client.objects.get(schema_name='public')

            # Check if domain already exists
            existing_domain = Domain.objects.filter(domain=domain_name).first()

            if existing_domain:
                self.stdout.write(
                    self.style.WARNING(f'Domain {domain_name} already exists')
                )
                if existing_domain.tenant != public_tenant:
                    self.stdout.write(
                        self.style.ERROR(
                            f'Domain belongs to tenant: {existing_domain.tenant.schema_name}'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(f'Domain correctly linked to public tenant')
                    )
            else:
                # Create new domain for public tenant
                Domain.objects.create(
                    domain=domain_name,
                    tenant=public_tenant,
                    is_primary=False
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully added domain {domain_name} to public tenant'
                    )
                )

        except Client.DoesNotExist:
            self.stdout.write(
                self.style.ERROR('Public tenant does not exist!')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error: {str(e)}')
            )
