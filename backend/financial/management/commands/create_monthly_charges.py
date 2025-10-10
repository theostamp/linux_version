"""
Management Command: Create Monthly Charges

This command creates automatic monthly charges for all buildings:
- Management Fees (Δαπάνες Διαχείρισης)
- Reserve Fund (Αποθεματικό)

Usage:
    # ✅ IMPORTANT: Always specify --schema for multi-tenant systems!
    
    # Create charges for current month (all buildings in demo schema)
    python manage.py create_monthly_charges --schema demo
    
    # Create charges for specific month
    python manage.py create_monthly_charges --schema demo --month 2025-10
    
    # Create charges for specific building
    python manage.py create_monthly_charges --schema demo --building 1
    
    # Retroactive creation (from start to current month) ⭐ RECOMMENDED FOR SETUP
    python manage.py create_monthly_charges --schema demo --building 1 --retroactive
    
    # Future months (create N months ahead) ⭐ NEW!
    python manage.py create_monthly_charges --schema demo --building 1 --future-months 12
    
    # Dry run (preview without creating)
    python manage.py create_monthly_charges --schema demo --dry-run
    
    # Verbose output
    python manage.py create_monthly_charges --schema demo --building 1 --retroactive --verbose

Cron Job:
    Schedule this command to run on the 1st of each month:
    0 0 1 * * python manage.py create_monthly_charges --schema demo
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import date, datetime
from decimal import Decimal
from django_tenants.utils import schema_context, get_tenant_model

from buildings.models import Building
from financial.monthly_charge_service import MonthlyChargeService
from financial.utils.date_helpers import parse_month_string, get_month_first_day


class Command(BaseCommand):
    help = 'Create monthly charges (management fees, reserve fund) for buildings'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--month',
            type=str,
            help='Target month in YYYY-MM format (default: current month)'
        )
        
        parser.add_argument(
            '--building',
            type=int,
            help='Specific building ID (default: all active buildings)'
        )
        
        parser.add_argument(
            '--retroactive',
            action='store_true',
            help='Create charges from financial_system_start_date to target month'
        )
        
        parser.add_argument(
            '--future-months',
            type=int,
            default=0,
            help='Create charges for N months into the future (e.g., 12 for next year)'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be created without actually creating'
        )
        
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output'
        )
        
        parser.add_argument(
            '--schema',
            type=str,
            default='demo',
            help='Tenant schema to use (default: demo)'
        )
    
    def handle(self, *args, **options):
        schema_name = options['schema']
        
        # ✅ CRITICAL: Use tenant schema context for multi-tenant system
        with schema_context(schema_name):
            self._handle_with_schema(*args, **options)
    
    def _handle_with_schema(self, *args, **options):
        """Handle command within schema context"""
        # Parse target month
        if options['month']:
            try:
                year, month = parse_month_string(options['month'])
                target_month = get_month_first_day(year, month)
            except ValueError as e:
                raise CommandError(f"Invalid month format: {e}")
        else:
            target_month = date.today().replace(day=1)
        
        dry_run = options['dry_run']
        verbose = options['verbose']
        schema_name = options['schema']
        
        self.stdout.write(self.style.SUCCESS(
            f"\n{'🔍 DRY RUN - ' if dry_run else ''}Creating Monthly Charges"
        ))
        self.stdout.write(f"Schema: {schema_name}")
        self.stdout.write(f"Target Month: {target_month.strftime('%B %Y')}\n")
        
        # Get buildings
        if options['building']:
            try:
                buildings = [Building.objects.get(id=options['building'])]
                buildings_count = 1
            except Building.DoesNotExist:
                raise CommandError(f"Building with ID {options['building']} does not exist")
        else:
            buildings = Building.objects.filter(is_active=True)
            buildings_count = buildings.count()
        
        self.stdout.write(f"Buildings: {buildings_count}\n")
        
        # Process buildings
        total_results = []
        
        for building in buildings:
            self.stdout.write(self.style.HTTP_INFO(
                f"\n{'─' * 60}"
            ))
            self.stdout.write(f"Building: {building.name} (ID: {building.id})")
            
            if options['retroactive']:
                # Create charges from start to target month
                results = self._create_retroactive_charges(
                    building, target_month, dry_run, verbose
                )
                total_results.extend(results)
            elif options['future_months'] > 0:
                # ✨ NEW: Create charges for N months into the future
                results = self._create_future_charges(
                    building, target_month, options['future_months'], dry_run, verbose
                )
                total_results.extend(results)
            else:
                # Create charges for target month only
                result = self._create_single_month_charges(
                    building, target_month, dry_run, verbose
                )
                total_results.append(result)
        
        # Summary
        self._print_summary(total_results, dry_run)
        
        if dry_run:
            self.stdout.write(self.style.WARNING(
                "\n⚠️  DRY RUN COMPLETED - No charges were actually created"
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                "\n✅ Monthly charges created successfully!"
            ))
    
    def _create_single_month_charges(
        self, 
        building: Building, 
        target_month: date, 
        dry_run: bool,
        verbose: bool
    ) -> dict:
        """Create charges for a single month"""
        
        if dry_run:
            # Simulate what would be created
            result = self._simulate_charges(building, target_month)
        else:
            # Actually create charges
            result = MonthlyChargeService.create_monthly_charges(building, target_month)
        
        # Print result
        if verbose or dry_run:
            self._print_month_result(result)
        else:
            # Just print summary
            mgmt = "✅" if result.get('management_fees_created') else "⏭️"
            reserve = "✅" if result.get('reserve_fund_created') else "⏭️"
            self.stdout.write(
                f"  {target_month.strftime('%Y-%m')}: "
                f"Management {mgmt} | Reserve {reserve}"
            )
        
        return result
    
    def _create_retroactive_charges(
        self,
        building: Building,
        end_month: date,
        dry_run: bool,
        verbose: bool
    ) -> list:
        """Create charges from start to end month"""
        
        start_month = building.financial_system_start_date or date.today().replace(day=1)
        start_month = get_month_first_day(start_month.year, start_month.month)
        
        self.stdout.write(f"  Retroactive: {start_month.strftime('%Y-%m')} to {end_month.strftime('%Y-%m')}")
        
        if dry_run:
            # Simulate retroactive creation
            results = []
            current = start_month
            while current <= end_month:
                result = self._simulate_charges(building, current)
                results.append(result)
                # Next month
                if current.month == 12:
                    current = date(current.year + 1, 1, 1)
                else:
                    current = date(current.year, current.month + 1, 1)
            return results
        else:
            return MonthlyChargeService.create_charges_for_building(
                building.id,
                start_month,
                end_month
            )
    
    def _create_future_charges(
        self,
        building: Building,
        start_month: date,
        num_months: int,
        dry_run: bool,
        verbose: bool
    ) -> list:
        """✨ NEW: Create charges for N months into the future"""
        
        end_month = start_month
        for _ in range(num_months - 1):
            if end_month.month == 12:
                end_month = date(end_month.year + 1, 1, 1)
            else:
                end_month = date(end_month.year, end_month.month + 1, 1)
        
        self.stdout.write(self.style.SUCCESS(
            f"  🔮 Creating {num_months} months: "
            f"{start_month.strftime('%Y-%m')} to {end_month.strftime('%Y-%m')}"
        ))
        
        results = []
        current = start_month
        
        for i in range(num_months):
            if dry_run:
                result = self._simulate_charges(building, current)
            else:
                result = MonthlyChargeService.create_monthly_charges(building, current)
            
            results.append(result)
            
            # Print progress
            if verbose or dry_run:
                self._print_month_result(result)
            else:
                mgmt = "✅" if result.get('management_fees_created') else "⏭️"
                reserve = "✅" if result.get('reserve_fund_created') else "⏭️"
                self.stdout.write(
                    f"  {current.strftime('%Y-%m')}: "
                    f"Management {mgmt} | Reserve {reserve}"
                )
            
            # Next month
            if current.month == 12:
                current = date(current.year + 1, 1, 1)
            else:
                current = date(current.year, current.month + 1, 1)
        
        return results
    
    def _simulate_charges(self, building: Building, target_month: date) -> dict:
        """Simulate what would be created (dry run)"""
        
        result = {
            'building_id': building.id,
            'building_name': building.name,
            'target_month': target_month.strftime('%Y-%m'),
            'management_fees_created': False,
            'management_fees_amount': Decimal('0.00'),
            'reserve_fund_created': False,
            'reserve_fund_amount': Decimal('0.00'),
            'apartments_charged': building.apartments.count(),
            'transactions_created': 0
        }
        
        # Check if management fees would be created
        if MonthlyChargeService._should_charge_management_fees(building, target_month):
            fee_per_apt = building.management_fee_per_apartment or Decimal('0.00')
            apt_count = building.apartments.count()
            result['management_fees_created'] = True
            result['management_fees_amount'] = fee_per_apt * apt_count
            result['transactions_created'] += apt_count
        
        # Check if reserve fund would be created
        if MonthlyChargeService._should_charge_reserve_fund(building, target_month):
            if building.reserve_fund_goal and building.reserve_fund_duration_months:
                monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
                result['reserve_fund_created'] = True
                result['reserve_fund_amount'] = monthly_target
                result['transactions_created'] += building.apartments.count()
        
        return result
    
    def _print_month_result(self, result: dict):
        """Print detailed result for a month"""
        
        month = result.get('target_month', 'N/A')
        self.stdout.write(f"\n  Month: {month}")
        
        if result.get('management_fees_created'):
            amount = result.get('management_fees_amount', 0)
            self.stdout.write(self.style.SUCCESS(
                f"    ✅ Management Fees: {amount}€"
            ))
        else:
            self.stdout.write("    ⏭️ Management Fees: Skipped")
        
        if result.get('reserve_fund_created'):
            amount = result.get('reserve_fund_amount', 0)
            self.stdout.write(self.style.SUCCESS(
                f"    ✅ Reserve Fund: {amount}€"
            ))
        else:
            self.stdout.write("    ⏭️ Reserve Fund: Skipped")
        
        tx_count = result.get('transactions_created', 0)
        if tx_count > 0:
            self.stdout.write(f"    📝 Transactions: {tx_count}")
    
    def _print_summary(self, results: list, dry_run: bool):
        """Print summary of all operations"""
        
        self.stdout.write(self.style.HTTP_INFO(
            f"\n{'═' * 60}"
        ))
        self.stdout.write(self.style.HTTP_INFO("SUMMARY"))
        self.stdout.write(self.style.HTTP_INFO('═' * 60))
        
        total_mgmt = sum(
            float(r.get('management_fees_amount', 0)) 
            for r in results 
            if r.get('management_fees_created')
        )
        
        total_reserve = sum(
            float(r.get('reserve_fund_amount', 0))
            for r in results
            if r.get('reserve_fund_created')
        )
        
        total_tx = sum(r.get('transactions_created', 0) for r in results)
        
        mgmt_count = sum(1 for r in results if r.get('management_fees_created'))
        reserve_count = sum(1 for r in results if r.get('reserve_fund_created'))
        
        self.stdout.write(f"Total Months Processed: {len(results)}")
        self.stdout.write(f"Management Fees: {mgmt_count} months, {total_mgmt:.2f}€")
        self.stdout.write(f"Reserve Fund: {reserve_count} months, {total_reserve:.2f}€")
        self.stdout.write(f"Total Transactions: {total_tx}")
        self.stdout.write(f"Total Amount: {(total_mgmt + total_reserve):.2f}€")

