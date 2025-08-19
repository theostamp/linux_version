from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context
from decimal import Decimal
from apartments.models import Apartment

class Command(BaseCommand):
    help = 'Fix apartment 10 balance to 0.00€'

    def handle(self, *args, **options):
        with schema_context('demo'):
            # Βρες το διαμέρισμα 10
            apartment = Apartment.objects.filter(building_id=4, number='10').first()
            if not apartment:
                self.stdout.write(self.style.ERROR("❌ Δεν βρέθηκε διαμέρισμα 10"))
                return
            
            self.stdout.write(f"🏠 Διαμέρισμα: {apartment.number}")
            self.stdout.write(f"💰 Παλιό Υπόλοιπο: {apartment.current_balance}€")
            
            # Διόρθωση του υπολοίπου
            apartment.current_balance = Decimal('0.00')
            apartment.save()
            
            self.stdout.write(f"✅ Νέο Υπόλοιπο: {apartment.current_balance}€")
            self.stdout.write(self.style.SUCCESS("🎉 Το υπόλοιπο διορθώθηκε επιτυχώς!"))
