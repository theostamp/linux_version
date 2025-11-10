from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context
from decimal import Decimal
from financial.models import Payment, Transaction
from apartments.models import Apartment
from django.db.models import Sum

class Command(BaseCommand):
    help = 'Monitor apartment balance consistency and alert on discrepancies'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Automatically fix balance discrepancies',
        )
        parser.add_argument(
            '--apartment',
            type=int,
            help='Check specific apartment ID',
        )

    def handle(self, *args, **options):
        with schema_context('demo'):
            self.stdout.write("🔍 Έλεγχος συνοχής υπολοίπων διαμερισμάτων...")
            
            # Φιλτράρισμα συγκεκριμένου διαμερίσματος αν δόθηκε
            if options.get('apartment'):
                apartments = Apartment.objects.filter(id=options['apartment'])
            else:
                apartments = Apartment.objects.filter(building_id=4)  # Alkmanos building
            
            total_checked = 0
            total_discrepancies = 0
            total_fixed = 0
            
            for apartment in apartments:
                total_checked += 1
                
                # Υπολογισμός αναμενόμενου υπολοίπου
                expected_balance = self.calculate_expected_balance(apartment)
                current_balance = apartment.current_balance
                
                # Έλεγχος διαφοράς (tolerance: 0.01€)
                difference = abs(expected_balance - current_balance)
                
                if difference > Decimal('0.01'):
                    total_discrepancies += 1
                    
                    self.stdout.write(
                        self.style.WARNING(
                            f"⚠️  Διαμέρισμα {apartment.number}: "
                            f"Αναμενόμενο: {expected_balance:,.2f}€, "
                            f"Τρέχον: {current_balance:,.2f}€, "
                            f"Διαφορά: {difference:,.2f}€"
                        )
                    )
                    
                    # Αυτόματη διόρθωση αν ζητήθηκε
                    if options.get('fix'):
                        from financial.balance_service import BalanceCalculationService
                        new_balance = BalanceCalculationService.update_apartment_balance(apartment, use_locking=True)
                        total_fixed += 1

                        self.stdout.write(
                            self.style.SUCCESS(
                                f"✅ Διορθώθηκε: {apartment.number} → {new_balance:,.2f}€"
                            )
                        )
                else:
                    self.stdout.write(f"✅ Διαμέρισμα {apartment.number}: Σωστό υπόλοιπο {current_balance:,.2f}€")
            
            # Συνοπτικά αποτελέσματα
            self.stdout.write("\n" + "="*50)
            self.stdout.write("📊 ΣΥΝΟΠΤΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ:")
            self.stdout.write(f"   Συνολικά ελεγχθέντα: {total_checked}")
            self.stdout.write(f"   Ασυνέπειες βρέθηκαν: {total_discrepancies}")
            
            if options.get('fix'):
                self.stdout.write(f"   Διορθώσεις έγιναν: {total_fixed}")
            
            if total_discrepancies == 0:
                self.stdout.write(self.style.SUCCESS("🎉 Όλα τα υπόλοιπα είναι σωστά!"))
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"⚠️  Βρέθηκαν {total_discrepancies} ασυνέπειες. "
                        "Τρέξτε με --fix για αυτόματη διόρθωση."
                    )
                )
            
            # Προτάσεις
            if total_discrepancies > 0:
                self.stdout.write("\n💡 ΠΡΟΤΑΣΕΙΣ:")
                self.stdout.write("   1. Ελέγξτε τα Django Signals στο signals.py")
                self.stdout.write("   2. Τρέξτε αυτό το command κάθε βράδυ")
                self.stdout.write("   3. Ελέγξτε για race conditions στα API calls")
                self.stdout.write("   4. Εξετάστε τη λογική του CommonExpenseCalculator")

    def calculate_expected_balance(self, apartment):
        """
        Υπολογισμός αναμενόμενου υπολοίπου διαμερίσματος
        """
        # Υπολογισμός συνολικών πληρωμών
        total_payments = Payment.objects.filter(
            apartment=apartment
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Υπολογισμός χρεώσεων από calculator
        try:
            from financial.services import CommonExpenseCalculator
            calculator = CommonExpenseCalculator(apartment.building.id)
            shares = calculator.calculate_shares()
            apartment_charges = shares.get(apartment.id, {}).get('total_amount', Decimal('0.00'))
        except Exception:
            # Fallback: χρήση transactions
            apartment_charges = Transaction.objects.filter(
                apartment=apartment,
                type__in=['common_expense_charge', 'expense_created', 'expense_issued']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Αναμενόμενο υπόλοιπο = πληρωμές - χρεώσεις
        expected_balance = total_payments - apartment_charges
        
        return expected_balance
