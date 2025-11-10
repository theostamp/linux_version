"""
🔧 Django Management Command για Έξυπνη Διόρθωση Χιλιοστών

Χρήση:
    python manage.py fix_mills [--building-id BUILDING_ID] [--dry-run]

Επιλογές:
    --building-id: ID του κτιρίου (αν None, χρησιμοποιεί το πρώτο)
    --dry-run: Εμφάνιση μόνο των αλλαγών χωρίς εφαρμογή
"""

from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment


class Command(BaseCommand):
    help = '🔧 Έξυπνη διόρθωση χιλιοστών συμμετοχής'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--building-id',
            type=int,
            help='ID του κτιρίου (αν None, χρησιμοποιεί το πρώτο)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Εμφάνιση μόνο των αλλαγών χωρίς εφαρμογή',
        )
    
    def handle(self, *args, **options):
        building_id = options['building_id']
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write("🔍 DRY RUN MODE - Δεν θα εφαρμοστούν αλλαγές")
            self.stdout.write("=" * 60)
        
        with schema_context('demo'):
            # Εύρεση κτιρίου
            if building_id:
                try:
                    building = Building.objects.get(id=building_id)
                except Building.DoesNotExist:
                    raise CommandError(f"Δεν βρέθηκε κτίριο με ID {building_id}")
            else:
                building = Building.objects.first()
                if not building:
                    raise CommandError("Δεν βρέθηκε κανένα κτίριο")
            
            self.stdout.write(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
            
            # Εύρεση διαμερισμάτων
            apartments = Apartment.objects.filter(building=building).order_by('number')
            if not apartments.exists():
                raise CommandError("Δεν βρέθηκαν διαμερίσματα")
            
            self.stdout.write(f"🏠 Βρέθηκαν {apartments.count()} διαμερίσματα")
            
            # Υπολογισμός τρέχοντος συνόλου
            current_total = sum(apt.participation_mills or 0 for apt in apartments)
            expected_total = 1000
            difference = current_total - expected_total
            
            self.stdout.write(f"💰 Τρέχον σύνολο χιλιοστών: {current_total}")
            self.stdout.write(f"🎯 Αναμενόμενο σύνολο: {expected_total}")
            self.stdout.write(f"📊 Διαφορά: {difference}")
            
            if difference == 0:
                self.stdout.write(self.style.SUCCESS("✅ Τα χιλιοστά είναι ήδη σωστά!"))
                return
            
            # Έξυπνη διόρθωση
            self.stdout.write("\n🔧 Εφαρμογή έξυπνης διόρθωσης...")
            
            changes = []
            
            if abs(difference) <= apartments.count():
                # Μικρή διαφορά - κατανέμουμε ισόποσα
                self.stdout.write("📊 Μικρή διαφορά - ισόποση κατανομή")
                adjustment_per_apartment = difference / apartments.count()
                
                for apartment in apartments:
                    current_mills = apartment.participation_mills or 0
                    new_mills = max(0, current_mills - adjustment_per_apartment)
                    
                    changes.append({
                        'apartment': apartment,
                        'current': current_mills,
                        'new': new_mills,
                        'adjustment': adjustment_per_apartment
                    })
                    
                    self.stdout.write(f"   {apartment.number}: {current_mills} → {new_mills} ({adjustment_per_apartment:+.1f})")
            
            else:
                # Μεγάλη διαφορά - έλεγχος για ομοιόμορφη κατανομή
                self.stdout.write("📊 Μεγάλη διαφορά - ανάλυση κατανομής")
                
                # Έλεγχος αν όλα τα διαμερίσματα έχουν ίδια χιλιοστά
                unique_mills = set(apt.participation_mills or 0 for apt in apartments)
                
                if len(unique_mills) == 1:
                    # Όλα τα διαμερίσματα έχουν ίδια χιλιοστά - πιθανό scaling issue
                    common_mills = list(unique_mills)[0]
                    if common_mills > 0:
                        # Υπολογισμός scaling factor
                        scaling_factor = expected_total / (common_mills * apartments.count())
                        self.stdout.write(f"   🔍 Ανιχνεύθηκε scaling issue: factor = {scaling_factor:.2f}")
                        
                        # Εφαρμογή scaling correction
                        for apartment in apartments:
                            current_mills = apartment.participation_mills or 0
                            new_mills = current_mills * scaling_factor
                            
                            changes.append({
                                'apartment': apartment,
                                'current': current_mills,
                                'new': new_mills,
                                'adjustment': current_mills - new_mills
                            })
                            
                            self.stdout.write(f"   {apartment.number}: {current_mills} → {new_mills:.1f} (×{scaling_factor:.2f})")
                    else:
                        # Όλα είναι 0 - ισόποση κατανομή
                        equal_share = expected_total / apartments.count()
                        for apartment in apartments:
                            changes.append({
                                'apartment': apartment,
                                'current': 0,
                                'new': equal_share,
                                'adjustment': equal_share
                            })
                            self.stdout.write(f"   {apartment.number}: 0 → {equal_share:.1f}")
                else:
                    # Διαφορετικά χιλιοστά - αναλογική κατανομή
                    self.stdout.write("📊 Αναλογική κατανομή λόγω διαφορετικών χιλιοστών")
                    total_current = sum(apt.participation_mills or 0 for apt in apartments)
                    
                    if total_current > 0:
                        # Αναλογική μείωση/αύξηση
                        for apartment in apartments:
                            current_mills = apartment.participation_mills or 0
                            if total_current > 0:
                                proportion = current_mills / total_current
                                adjustment = difference * proportion
                                new_mills = max(0, current_mills - adjustment)
                            else:
                                new_mills = expected_total / apartments.count()
                            
                            changes.append({
                                'apartment': apartment,
                                'current': current_mills,
                                'new': new_mills,
                                'adjustment': current_mills - new_mills
                            })
                            
                            self.stdout.write(f"   {apartment.number}: {current_mills} → {new_mills:.1f}")
                    else:
                        # Αν δεν υπάρχουν καθόλου χιλιοστά, κατανέμουμε ισόποσα
                        equal_share = expected_total / apartments.count()
                        for apartment in apartments:
                            changes.append({
                                'apartment': apartment,
                                'current': 0,
                                'new': equal_share,
                                'adjustment': equal_share
                            })
                            self.stdout.write(f"   {apartment.number}: 0 → {equal_share:.1f}")
            
            # Εφαρμογή αλλαγών (αν δεν είναι dry-run)
            if not dry_run:
                self.stdout.write("\n💾 Εφαρμογή αλλαγών...")
                for change in changes:
                    change['apartment'].participation_mills = change['new']
                    change['apartment'].save()
                
                # Επιβεβαίωση
                updated_total = sum(apt.participation_mills or 0 for apt in apartments)
                self.stdout.write("\n📊 Επιβεβαίωση:")
                self.stdout.write(f"   Νέο σύνολο: {updated_total}")
                self.stdout.write(f"   Διαφορά από στόχο: {updated_total - expected_total}")
                
                if abs(updated_total - expected_total) < 0.1:
                    self.stdout.write(self.style.SUCCESS("✅ Η διόρθωση ήταν επιτυχής!"))
                    
                    # Εμφάνιση τελικής κατανομής
                    self.stdout.write("\n📋 Τελική Κατανομή:")
                    for apartment in apartments:
                        mills = apartment.participation_mills or 0
                        percentage = (mills / expected_total) * 100
                        self.stdout.write(f"   {apartment.number}: {mills:.1f} χιλιοστά ({percentage:.1f}%)")
                else:
                    self.stdout.write(self.style.WARNING("⚠️ Η διόρθωση δεν ήταν πλήρης"))
            else:
                self.stdout.write("\n🔍 DRY RUN - Δεν εφαρμόστηκαν αλλαγές")
                
                # Προσομοίωση αποτελέσματος
                simulated_total = sum(change['new'] for change in changes)
                self.stdout.write(f"📊 Προσομοιωμένο σύνολο: {simulated_total}")
                self.stdout.write(f"📊 Διαφορά από στόχο: {simulated_total - expected_total}")
                
                if abs(simulated_total - expected_total) < 0.1:
                    self.stdout.write(self.style.SUCCESS("✅ Η διόρθωση θα ήταν επιτυχής!"))
                else:
                    self.stdout.write(self.style.WARNING("⚠️ Η διόρθωση δεν θα ήταν πλήρης"))
