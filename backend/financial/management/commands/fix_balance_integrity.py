"""
Django Management Command για Διόρθωση Ακεραιότητας Υπολοίπων
============================================================

Χρήση:
python manage.py fix_balance_integrity --building-id 1 --validate-only
python manage.py fix_balance_integrity --building-id 1 --fix-balances
python manage.py fix_balance_integrity --building-id 1 --remove-duplicates
python manage.py fix_balance_integrity --building-id 1 --full-repair
"""

from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import schema_context
import sys
import os
sys.path.append('/app')
from financial.services.balance_integrity_service import BalanceIntegrityService, BalanceMaintenanceService


class Command(BaseCommand):
    help = 'Επαληθεύει και διορθώνει προβλήματα ακεραιότητας υπολοίπων'

    def add_arguments(self, parser):
        parser.add_argument(
            '--building-id',
            type=int,
            help='ID του κτιρίου για επαλήθευση (αν δεν δοθεί, επαληθεύει όλα)'
        )
        parser.add_argument(
            '--validate-only',
            action='store_true',
            help='Επαλήθευση μόνο (χωρίς διόρθωση)'
        )
        parser.add_argument(
            '--fix-balances',
            action='store_true',
            help='Διόρθωση υπολοίπων'
        )
        parser.add_argument(
            '--remove-duplicates',
            action='store_true',
            help='Αφαίρεση διπλών καταχωρήσεων'
        )
        parser.add_argument(
            '--full-repair',
            action='store_true',
            help='Πλήρης διόρθωση (υπολοίπων + διπλών καταχωρήσεων)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Εξαναγκασμένη διόρθωση ακόμα και αν δεν υπάρχουν σφάλματα'
        )
        parser.add_argument(
            '--generate-report',
            action='store_true',
            help='Δημιουργία αναφοράς ακεραιότητας'
        )
        parser.add_argument(
            '--send-alert',
            action='store_true',
            help='Αποστολή ειδοποίησης για προβλήματα'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🔧 ΕΠΑΛΗΘΕΥΣΗ ΚΑΙ ΔΙΟΡΘΩΣΗ ΥΠΟΛΟΙΠΩΝ'))
        self.stdout.write('=' * 60)
        
        building_id = options.get('building_id')
        
        if building_id:
            # Επαλήθευση συγκεκριμένου κτιρίου
            self.handle_single_building(building_id, options)
        else:
            # Επαλήθευση όλων των κτιρίων
            self.handle_all_buildings(options)

    def handle_single_building(self, building_id, options):
        """Επεξεργασία συγκεκριμένου κτιρίου"""
        with schema_context('demo'):
            try:
                from buildings.models import Building
                building = Building.objects.get(id=building_id)
                
                self.stdout.write(f"🏢 Κτίριο: {building.name} (ID: {building_id})")
                
                service = BalanceIntegrityService(building_id)
                
                # Επαλήθευση
                if options.get('validate_only') or not any([
                    options.get('fix_balances'),
                    options.get('remove_duplicates'),
                    options.get('full_repair')
                ]):
                    self.stdout.write("\n🔍 ΕΠΑΛΗΘΕΥΣΗ...")
                    results = service.validate_all_balances()
                    self.display_validation_results(results)
                    
                    if options.get('generate_report'):
                        report = service.generate_integrity_report()
                        self.stdout.write("\n📄 ΑΝΑΦΟΡΑ:")
                        self.stdout.write(report)
                    
                    if options.get('send_alert') and (results['errors_found'] > 0 or results['duplicate_transactions']):
                        service.send_integrity_alert(results)
                
                # Διόρθωση υπολοίπων
                if options.get('fix_balances') or options.get('full_repair'):
                    self.stdout.write("\n🔧 ΔΙΟΡΘΩΣΗ ΥΠΟΛΟΙΠΩΝ...")
                    fix_results = service.fix_all_balances(options.get('force', False))
                    self.display_fix_results(fix_results)
                
                # Αφαίρεση διπλών καταχωρήσεων
                if options.get('remove_duplicates') or options.get('full_repair'):
                    self.stdout.write("\n🗑️ ΑΦΑΙΡΕΣΗ ΔΙΠΛΩΝ ΚΑΤΑΧΩΡΗΣΕΩΝ...")
                    validation_results = service.validate_all_balances()
                    
                    if validation_results['duplicate_transactions']:
                        duplicate_results = service.remove_duplicate_transactions(
                            validation_results['duplicate_transactions']
                        )
                        self.display_duplicate_results(duplicate_results)
                    else:
                        self.stdout.write("✅ Δεν βρέθηκαν διπλές καταχωρήσεις")
                
                self.stdout.write(self.style.SUCCESS("\n✅ Επεξεργασία ολοκληρώθηκε επιτυχώς!"))
                
            except Building.DoesNotExist:
                raise CommandError(f"Δεν βρέθηκε κτίριο με ID: {building_id}")
            except Exception as e:
                raise CommandError(f"Σφάλμα επεξεργασίας: {e}")

    def handle_all_buildings(self, options):
        """Επεξεργασία όλων των κτιρίων"""
        with schema_context('demo'):
            from buildings.models import Building
            buildings = Building.objects.all()
            
            self.stdout.write(f"🏢 Βρέθηκαν {buildings.count()} κτίρια")
            
            total_errors = 0
            total_corrections = 0
            
            for building in buildings:
                self.stdout.write(f"\n🏢 Επεξεργασία κτιρίου: {building.name}")
                
                service = BalanceIntegrityService(building.id)
                
                # Επαλήθευση
                results = service.validate_all_balances()
                total_errors += results['errors_found']
                
                # Διόρθωση αν χρειάζεται
                if results['errors_found'] > 0 and (options.get('fix_balances') or options.get('full_repair')):
                    fix_results = service.fix_all_balances(options.get('force', False))
                    total_corrections += fix_results['corrections_made']
                
                # Αφαίρεση διπλών καταχωρήσεων
                if results['duplicate_transactions'] and (options.get('remove_duplicates') or options.get('full_repair')):
                    service.remove_duplicate_transactions(results['duplicate_transactions'])
            
            self.stdout.write(f"\n📊 ΣΥΝΟΨΗ:")
            self.stdout.write(f"   Συνολικά σφάλματα: {total_errors}")
            self.stdout.write(f"   Συνολικές διορθώσεις: {total_corrections}")

    def display_validation_results(self, results):
        """Εμφάνιση αποτελεσμάτων επαλήθευσης"""
        self.stdout.write(f"\n📊 ΑΠΟΤΕΛΕΣΜΑΤΑ ΕΠΑΛΗΘΕΥΣΗΣ:")
        self.stdout.write(f"   Συνολικά διαμερίσματα: {results['total_apartments']}")
        self.stdout.write(f"   Σφάλματα βρέθηκαν: {results['errors_found']}")
        self.stdout.write(f"   Διπλές καταχωρήσεις: {len(results['duplicate_transactions'])}")
        
        if results['errors_found'] > 0:
            self.stdout.write(self.style.WARNING("\n⚠️ ΔΙΑΜΕΡΙΣΜΑΤΑ ΜΕ ΣΦΑΛΜΑΤΑ:"))
            for apartment_result in results['apartment_results']:
                if apartment_result['has_errors']:
                    self.stdout.write(f"   🏠 {apartment_result['apartment_number']} - {apartment_result['owner_name']}")
                    for error in apartment_result['errors']:
                        self.stdout.write(f"      ❌ {error['description']}")
        
        if results['duplicate_transactions']:
            self.stdout.write(self.style.WARNING("\n⚠️ ΔΙΠΛΕΣ ΚΑΤΑΧΩΡΗΣΕΙΣ:"))
            for duplicate in results['duplicate_transactions']:
                self.stdout.write(f"   🏠 {duplicate['apartment_number']} - {duplicate['amount']}€ ({duplicate['type']})")

    def display_fix_results(self, results):
        """Εμφάνιση αποτελεσμάτων διόρθωσης"""
        self.stdout.write(f"\n🔧 ΑΠΟΤΕΛΕΣΜΑΤΑ ΔΙΟΡΘΩΣΗΣ:")
        self.stdout.write(f"   Διαμερίσματα επεξεργασμένα: {results['apartments_processed']}")
        self.stdout.write(f"   Διορθώσεις που έγιναν: {results['corrections_made']}")
        self.stdout.write(f"   Σφάλματα: {len(results['errors'])}")
        
        if results['corrections_made'] > 0:
            self.stdout.write(self.style.SUCCESS("\n✅ ΔΙΟΡΘΩΣΕΙΣ:"))
            for apartment_result in results['apartment_results']:
                if apartment_result['correction_made']:
                    self.stdout.write(f"   🏠 {apartment_result['apartment_number']}: {apartment_result['old_balance']}€ → {apartment_result['new_balance']}€")

    def display_duplicate_results(self, results):
        """Εμφάνιση αποτελεσμάτων αφαίρεσης διπλών καταχωρήσεων"""
        self.stdout.write(f"\n🗑️ ΑΠΟΤΕΛΕΣΜΑΤΑ ΑΦΑΙΡΕΣΗΣ ΔΙΠΛΩΝ ΚΑΤΑΧΩΡΗΣΕΩΝ:")
        self.stdout.write(f"   Διπλές καταχωρήσεις που βρέθηκαν: {results['duplicates_found']}")
        self.stdout.write(f"   Διπλές καταχωρήσεις που διαγράφηκαν: {results['duplicates_removed']}")
        self.stdout.write(f"   Σφάλματα: {len(results['errors'])}")
