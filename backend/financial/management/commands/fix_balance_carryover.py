"""
Django Management Command για Διόρθωση Μεταφοράς Υπολοίπων

Αυτή η εντολή:
1. Επανυπολογίζει όλα τα MonthlyBalance records
2. Επιβεβαιώνει την ακεραιότητα της μεταφοράς υπολοίπων
3. Διορθώνει προβλήματα στην αλυσίδα carry_forward

Usage:
    python manage.py fix_balance_carryover --building 1
    python manage.py fix_balance_carryover --building 1 --verify-only
    python manage.py fix_balance_carryover --building 1 --from 2025-01 --to 2025-12
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from decimal import Decimal
from datetime import date

from buildings.models import Building
from financial.monthly_balance_service import MonthlyBalanceService
from django_tenants.utils import schema_context


class Command(BaseCommand):
    help = 'Διορθώνει και επιβεβαιώνει τη μεταφορά υπολοίπων από μήνα σε μήνα'

    def add_arguments(self, parser):
        parser.add_argument(
            '--building',
            type=int,
            required=True,
            help='ID κτιρίου'
        )
        
        parser.add_argument(
            '--schema',
            type=str,
            default='demo',
            help='Tenant schema (default: demo)'
        )
        
        parser.add_argument(
            '--from',
            dest='from_month',
            type=str,
            help='Μήνας έναρξης (format: YYYY-MM)'
        )
        
        parser.add_argument(
            '--to',
            dest='to_month',
            type=str,
            help='Μήνας λήξης (format: YYYY-MM)'
        )
        
        parser.add_argument(
            '--verify-only',
            action='store_true',
            help='Μόνο επιβεβαίωση, χωρίς διορθώσεις'
        )
        
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Διόρθωση προβλημάτων (default: True εκτός αν --verify-only)'
        )

    def handle(self, *args, **options):
        building_id = options['building']
        schema = options['schema']
        from_month = options.get('from_month')
        to_month = options.get('to_month')
        verify_only = options['verify_only']
        fix = options.get('fix', not verify_only)
        
        with schema_context(schema):
            self.stdout.write("=" * 80)
            self.stdout.write(self.style.SUCCESS("🔧 ΔΙΟΡΘΩΣΗ ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ"))
            self.stdout.write("=" * 80)
            
            # 1. Βρίσκουμε το κτίριο
            try:
                building = Building.objects.get(id=building_id)
            except Building.DoesNotExist:
                raise CommandError(f'❌ Κτίριο με ID {building_id} δεν βρέθηκε')
            
            self.stdout.write(f"\n🏢 Κτίριο: {building.name}")
            self.stdout.write(f"📅 Ημερομηνία Έναρξης Συστήματος: {building.financial_system_start_date}")
            
            # 2. Υπολογισμός περιόδου
            if from_month:
                start_year, start_month = map(int, from_month.split('-'))
            else:
                # Αν δεν δοθεί from_month, ξεκινάμε από το financial_system_start_date
                if building.financial_system_start_date:
                    start_year = building.financial_system_start_date.year
                    start_month = building.financial_system_start_date.month
                else:
                    raise CommandError('❌ Δεν υπάρχει financial_system_start_date και δεν δόθηκε --from')
            
            if to_month:
                end_year, end_month = map(int, to_month.split('-'))
            else:
                # Αν δεν δοθεί to_month, χρησιμοποιούμε τον τρέχοντα μήνα
                today = date.today()
                end_year = today.year
                end_month = today.month
            
            self.stdout.write(f"📊 Περίοδος: {start_month:02d}/{start_year} - {end_month:02d}/{end_year}\n")
            
            # 3. Δημιουργία service
            service = MonthlyBalanceService(building)
            
            # 4. Επιβεβαίωση
            self.stdout.write(self.style.WARNING("🔍 ΕΠΙΒΕΒΑΙΩΣΗ ΑΚΕΡΑΙΟΤΗΤΑΣ"))
            self.stdout.write("-" * 80)
            
            verification_result = service.verify_balance_chain(
                start_year, start_month, end_year, end_month
            )
            
            # Εμφάνιση αποτελεσμάτων επιβεβαίωσης
            if verification_result['status'] == 'ok':
                self.stdout.write(self.style.SUCCESS("\n✅ Όλα τα υπόλοιπα είναι σωστά!"))
            elif verification_result['status'] == 'warning':
                self.stdout.write(self.style.WARNING(f"\n⚠️  Βρέθηκαν {verification_result['total_warnings']} προειδοποιήσεις"))
                for warning in verification_result['summary_warnings']:
                    self.stdout.write(f"   ⚠️  {warning}")
            else:
                self.stdout.write(self.style.ERROR(f"\n❌ Βρέθηκαν {verification_result['total_issues']} προβλήματα"))
                for issue in verification_result['summary_issues']:
                    self.stdout.write(f"   ❌ {issue}")
            
            # Λεπτομερής αναφορά ανά μήνα
            self.stdout.write("\n📋 Λεπτομερής Αναφορά:")
            self.stdout.write("-" * 80)
            for month_result in verification_result['verified_months']:
                status_icon = {
                    'ok': '✅',
                    'warning': '⚠️',
                    'error': '❌'
                }.get(month_result['status'], '❓')
                
                self.stdout.write(f"{status_icon} {month_result['month']}")
                
                if month_result.get('issues'):
                    for issue in month_result['issues']:
                        self.stdout.write(f"   ❌ {issue}")
                
                if month_result.get('warnings'):
                    for warning in month_result['warnings']:
                        self.stdout.write(f"   ⚠️  {warning}")
            
            # 5. Διόρθωση (αν ζητηθεί)
            if fix and not verify_only:
                self.stdout.write("\n" + "=" * 80)
                self.stdout.write(self.style.WARNING("🔧 ΔΙΟΡΘΩΣΗ ΥΠΟΛΟΙΠΩΝ"))
                self.stdout.write("=" * 80)
                
                self.stdout.write("\nΘα επανυπολογιστούν όλα τα MonthlyBalance records...")
                
                # Ερώτηση επιβεβαίωσης (εκτός αν --no-input)
                if not options.get('no_input', False):
                    confirm = input("\nΘέλετε να συνεχίσετε; (yes/no): ")
                    if confirm.lower() not in ['yes', 'y']:
                        self.stdout.write(self.style.WARNING("❌ Ακυρώθηκε από τον χρήστη"))
                        return
                
                try:
                    with transaction.atomic():
                        service.recalculate_all_months(
                            start_year, start_month, end_year, end_month
                        )
                    
                    self.stdout.write(self.style.SUCCESS("\n✅ Η διόρθωση ολοκληρώθηκε επιτυχώς!"))
                    
                    # Επανέλεγχος
                    self.stdout.write("\n🔍 Επανέλεγχος...")
                    verification_result = service.verify_balance_chain(
                        start_year, start_month, end_year, end_month
                    )
                    
                    if verification_result['status'] == 'ok':
                        self.stdout.write(self.style.SUCCESS("✅ Όλα τα υπόλοιπα είναι πλέον σωστά!"))
                    else:
                        self.stdout.write(self.style.ERROR(
                            f"❌ Εξακολουθούν να υπάρχουν {verification_result['total_issues']} προβλήματα"
                        ))
                        for issue in verification_result['summary_issues']:
                            self.stdout.write(f"   ❌ {issue}")
                
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"\n❌ Σφάλμα κατά τη διόρθωση: {str(e)}"))
                    raise
            
            elif verify_only:
                self.stdout.write("\n" + "=" * 80)
                self.stdout.write(self.style.WARNING("ℹ️  Τρέχει μόνο σε λειτουργία επιβεβαίωσης (--verify-only)"))
                self.stdout.write("Για να διορθωθούν τα προβλήματα, τρέξτε χωρίς το --verify-only")
                self.stdout.write("=" * 80)
            
            # 6. Σύνοψη
            self.stdout.write("\n" + "=" * 80)
            self.stdout.write(self.style.SUCCESS("📊 ΣΥΝΟΨΗ"))
            self.stdout.write("=" * 80)
            self.stdout.write(f"Κτίριο: {building.name}")
            self.stdout.write(f"Περίοδος: {start_month:02d}/{start_year} - {end_month:02d}/{end_year}")
            self.stdout.write(f"Συνολικά Προβλήματα: {verification_result['total_issues']}")
            self.stdout.write(f"Συνολικές Προειδοποιήσεις: {verification_result['total_warnings']}")
            self.stdout.write(f"Κατάσταση: {verification_result['status'].upper()}")
            
            if verification_result['status'] == 'ok':
                self.stdout.write("\n" + self.style.SUCCESS("✅ Η μεταφορά υπολοίπων λειτουργεί σωστά!"))
            elif fix and not verify_only:
                self.stdout.write("\n" + self.style.SUCCESS("✅ Τα προβλήματα διορθώθηκαν!"))
            else:
                self.stdout.write("\n" + self.style.WARNING("⚠️  Υπάρχουν προβλήματα που χρήζουν διόρθωσης"))
                self.stdout.write("Τρέξτε με --fix για να διορθωθούν αυτόματα")

