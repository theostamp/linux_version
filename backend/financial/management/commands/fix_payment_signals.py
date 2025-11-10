from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context
from decimal import Decimal
from financial.models import Payment

class Command(BaseCommand):
    help = 'Add missing signal to update apartment balance when payments are created'

    def handle(self, *args, **options):
        """
        Το πρόβλημα ήταν ότι το Payment model δεν είχε signal που να ενημερώνει 
        το apartment balance. Αυτό το command δείχνει τη λύση.
        """
        with schema_context('demo'):
            self.stdout.write("🔍 Εξετάζω το πρόβλημα των Payment signals...")
            
            # Εξέταση όλων των πληρωμών
            payments = Payment.objects.all().select_related('apartment')
            
            problematic_apartments = set()
            
            for payment in payments:
                apartment = payment.apartment
                
                # Υπολογισμός αναμενόμενου υπολοίπου από πληρωμές
                apartment_payments = Payment.objects.filter(apartment=apartment)
                total_payments = sum(p.amount for p in apartment_payments)
                
                # Σύγκριση με τρέχον υπόλοιπο
                if abs(apartment.current_balance - total_payments) > Decimal('0.01'):
                    problematic_apartments.add(apartment)
            
            self.stdout.write(f"❌ Βρέθηκαν {len(problematic_apartments)} διαμερίσματα με λάθος υπόλοιπο")
            
            # Προτάσεις για πρόληψη
            self.stdout.write("\n🛠️  ΠΡΟΤΑΣΕΙΣ ΓΙΑ ΠΡΟΛΗΨΗ:")
            self.stdout.write("1. Προσθήκη Payment signal στο signals.py")
            self.stdout.write("2. Αυτόματος έλεγχος συνοχής κάθε βράδυ")
            self.stdout.write("3. Frontend validation πριν την πληρωμή")
            self.stdout.write("4. Real-time balance refresh στο modal")
            
            # Δημιουργία προτεινόμενου signal code
            suggested_code = '''
# Προσθήκη στο backend/financial/signals.py:

@receiver(post_save, sender=Payment)
def update_apartment_balance_on_payment(sender, instance, created, **kwargs):
    """
    Ενημέρωση υπολοίπου διαμερίσματος όταν δημιουργείται πληρωμή
    """
    try:
        with transaction.atomic():
            apartment = instance.apartment
            
            # Υπολογισμός νέου υπολοίπου από πληρωμές
            payments = Payment.objects.filter(apartment=apartment)
            total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Υπολογισμός χρεώσεων (από CommonExpenseCalculator)
            from financial.services import CommonExpenseCalculator
            calculator = CommonExpenseCalculator(apartment.building.id)
            shares = calculator.calculate_shares()
            apartment_charges = shares.get(apartment.id, {}).get('total_amount', Decimal('0.00'))
            
            # Νέο υπόλοιπο = πληρωμές - χρεώσεις
            new_balance = total_payments - apartment_charges
            
            if apartment.current_balance != new_balance:
                apartment.current_balance = new_balance
                apartment.save(update_fields=['current_balance'])
    except Exception as e:
        print(f"❌ Σφάλμα στην ενημέρωση υπολοίπου: {e}")
'''
            
            self.stdout.write(f"\n📝 Προτεινόμενος κώδικας:\n{suggested_code}")
            
            self.stdout.write(self.style.SUCCESS("\n✅ Η ανάλυση ολοκληρώθηκε!"))
