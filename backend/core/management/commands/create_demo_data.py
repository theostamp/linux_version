"""
Management command to create demo data.
This can be run separately from auto_init if needed.

Usage:
    python manage.py create_demo_data
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Create demo data (buildings, apartments, users, etc.)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant',
            type=str,
            help='Tenant schema name (default: demo)',
            default='demo',
        )

    def handle(self, *args, **options):
        tenant_schema = options['tenant']
        self.stdout.write(self.style.SUCCESS(f'📦 Creating demo data for tenant: {tenant_schema}'))
        
        # Note: This is a placeholder - the actual demo data creation logic
        # is in scripts/auto_initialization.py. This command can be extended
        # to call specific parts of that script or implement its own logic.
        
        self.stdout.write(self.style.WARNING('⚠️  Demo data creation is currently handled by auto_init command.'))
        self.stdout.write(self.style.SUCCESS('✅ Use "python manage.py auto_init" to create demo data.'))

