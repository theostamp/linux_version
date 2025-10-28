# backend/tenants/management/commands/check_tenant_names.py
"""
Django management command to check tenant naming patterns and potential collisions
"""
from django.core.management.base import BaseCommand
from tenants.models import Client
from collections import Counter
import re


class Command(BaseCommand):
    help = 'Analyze tenant naming patterns and check for potential collisions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--show-duplicates',
            action='store_true',
            help='Show base names with multiple variants (e.g., john, john-1, john-2)',
        )
        parser.add_argument(
            '--stats',
            action='store_true',
            help='Show naming statistics',
        )

    def handle(self, *args, **options):
        tenants = Client.objects.all().order_by('schema_name')
        
        if not tenants.exists():
            self.stdout.write(self.style.WARNING('No tenants found in database.'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'\n📊 Total Tenants: {tenants.count()}\n'))
        
        # Analyze naming patterns
        base_names = []
        numbered_patterns = {}
        
        for tenant in tenants:
            schema = tenant.schema_name
            
            # Check if it has a numbered suffix (e.g., john-1, john-2)
            match = re.match(r'^(.+)-(\d+)$', schema)
            if match:
                base = match.group(1)
                number = int(match.group(2))
                
                if base not in numbered_patterns:
                    numbered_patterns[base] = []
                numbered_patterns[base].append(number)
                base_names.append(base)
            else:
                base_names.append(schema)
        
        if options['show_duplicates']:
            self.show_duplicates(numbered_patterns, tenants)
        
        if options['stats']:
            self.show_stats(base_names, tenants)
        
        # Default: show all tenants
        if not options['show_duplicates'] and not options['stats']:
            self.show_all_tenants(tenants)
    
    def show_all_tenants(self, tenants):
        """Show all tenants with their details"""
        self.stdout.write(self.style.SUCCESS('📝 All Tenants:\n'))
        
        for tenant in tenants:
            status = '✅' if tenant.is_active else '❌'
            trial = '🆓' if tenant.on_trial else '💳'
            
            self.stdout.write(
                f'  {status} {trial} {tenant.schema_name:30} | {tenant.name:40} | {tenant.paid_until}'
            )
    
    def show_duplicates(self, numbered_patterns, tenants):
        """Show base names that have multiple variants"""
        self.stdout.write(self.style.WARNING('\n⚠️  Base Names with Multiple Variants:\n'))
        
        if not numbered_patterns:
            self.stdout.write('  None found (all schema names are unique)')
            return
        
        for base, numbers in sorted(numbered_patterns.items()):
            # Check if the base name itself exists
            base_exists = Client.objects.filter(schema_name=base).exists()
            
            variants = []
            if base_exists:
                variants.append(base)
            variants.extend([f'{base}-{n}' for n in sorted(numbers)])
            
            self.stdout.write(f'\n  📦 Base: {base}')
            self.stdout.write(f'     Variants: {", ".join(variants)} ({len(variants)} total)')
            
            # Show details for each variant
            for variant in variants:
                try:
                    tenant = Client.objects.get(schema_name=variant)
                    status = '✅ Active' if tenant.is_active else '❌ Inactive'
                    self.stdout.write(f'       - {variant:20} | {tenant.name:30} | {status}')
                except Client.DoesNotExist:
                    pass
    
    def show_stats(self, base_names, tenants):
        """Show naming statistics"""
        self.stdout.write(self.style.SUCCESS('\n📈 Naming Statistics:\n'))
        
        # Count occurrences of each base name
        base_counter = Counter(base_names)
        
        # Most common base names
        most_common = base_counter.most_common(10)
        
        if most_common:
            self.stdout.write('  🔝 Most Common Base Names:')
            for base, count in most_common:
                if count > 1:
                    self.stdout.write(f'     {base:20} : {count} variants')
        
        # Naming pattern analysis
        with_numbers = sum(1 for t in tenants if re.match(r'^.+-\d+$', t.schema_name))
        without_numbers = tenants.count() - with_numbers
        
        self.stdout.write(f'\n  📊 Pattern Analysis:')
        self.stdout.write(f'     Unique names (no suffix):  {without_numbers}')
        self.stdout.write(f'     With numeric suffix:       {with_numbers}')
        
        # Average schema name length
        avg_length = sum(len(t.schema_name) for t in tenants) / tenants.count()
        self.stdout.write(f'     Average name length:       {avg_length:.1f} characters')
        
        # PostgreSQL schema name limit is 63 characters
        over_limit = sum(1 for t in tenants if len(t.schema_name) > 63)
        if over_limit > 0:
            self.stdout.write(
                self.style.ERROR(f'     ⚠️  Names over 63 chars:   {over_limit} (PostgreSQL limit!)')
            )

