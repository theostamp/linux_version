from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context
from decimal import Decimal
from financial.models import Payment, Transaction
from apartments.models import Apartment
from django.db import models

class Command(BaseCommand):
    help = 'Check payment balance logic for apartment 10'

    def handle(self, *args, **options):
        with schema_context('demo'):
            # Βρες το διαμέρισμα 10
            apartment = Apartment.objects.filter(building_id=4, number='10').first()
            if not apartment:
                self.stdout.write(self.style.ERROR("❌ Δεν βρέθηκε διαμέρισμα 10"))
                return
            
            self.stdout.write(f"🏠 Διαμέρισμα: {apartment.number}")
            self.stdout.write(f"👤 Ενοικιαστής: {apartment.tenant_name}")
            self.stdout.write(f"💰 Τρέχον Υπόλοιπο: {apartment.current_balance}€")
            
            # Βρες την τελευταία πληρωμή
            latest_payment = Payment.objects.filter(
                apartment=apartment,
                payment_type='common_expense'
            ).order_by('-date').first()
            
            if latest_payment:
                self.stdout.write(f"\n📊 Τελευταία Πληρωμή:")
                self.stdout.write(f"   Ημερομηνία: {latest_payment.date}")
                self.stdout.write(f"   Ποσό: {latest_payment.amount}€")
                self.stdout.write(f"   Αποθεματικό: {latest_payment.reserve_fund_amount}€")
                self.stdout.write(f"   Σύνολο: {latest_payment.amount + (latest_payment.reserve_fund_amount or 0)}€")
            
            # Βρες όλες τις συναλλαγές
            transactions = Transaction.objects.filter(
                apartment=apartment
            ).order_by('date')
            
            self.stdout.write(f"\n📜 Ιστορικό Συναλλαγών:")
            running_balance = Decimal('0.00')
            
            for i, transaction in enumerate(transactions):
                if transaction.type == 'payment':
                    running_balance += transaction.amount
                else:  # charge
                    running_balance -= transaction.amount
                
                self.stdout.write(f"   {i+1}. {transaction.date}: {transaction.description}")
                self.stdout.write(f"      Ποσό: {transaction.amount}€ ({transaction.type})")
                self.stdout.write(f"      Υπόλοιπο μετά: {transaction.balance_after}€")
                self.stdout.write(f"      Υπολογισμένο: {running_balance}€")
                self.stdout.write("")
            
            self.stdout.write(f"🎯 Τελικό Υπολογισμένο Υπόλοιπο: {running_balance}€")
            self.stdout.write(f"🎯 Τρέχον Υπόλοιπο από DB: {apartment.current_balance}€")
            
            # Υπολογισμός από πληρωμές και χρεώσεις
            total_payments = Payment.objects.filter(
                apartment=apartment,
                payment_type='common_expense'
            ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
            
            total_reserve_payments = Payment.objects.filter(
                apartment=apartment,
                payment_type='reserve_fund'
            ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
            
            self.stdout.write(f"\n💰 Συνολικές Εισπράξεις:")
            self.stdout.write(f"   Κοινόχρηστα: {total_payments}€")
            self.stdout.write(f"   Αποθεματικό: {total_reserve_payments}€")
            self.stdout.write(f"   Σύνολο: {total_payments + total_reserve_payments}€")
            
            # Υπολογισμός χρεώσεων (κοινόχρηστα)
            from financial.services import CommonExpenseCalculator
            calculator = CommonExpenseCalculator(4)  # building_id = 4
            shares = calculator.calculate_shares()
            
            apartment_share = shares.get(apartment.id, {})
            total_charges = apartment_share.get('total_amount', Decimal('0.00'))
            
            self.stdout.write(f"\n💳 Συνολικές Χρεώσεις:")
            self.stdout.write(f"   Κοινόχρηστα: {total_charges}€")
            
            # Υπολογισμός τελικού υπολοίπου
            final_balance = (total_payments + total_reserve_payments) - total_charges
            self.stdout.write(f"\n🎯 Τελικός Υπολογισμός:")
            self.stdout.write(f"   Εισπράξεις - Χρεώσεις = {final_balance}€")
            self.stdout.write(f"   Διαφορά από DB: {final_balance - apartment.current_balance}€")
            
            # Επιπλέον έλεγχος για το πρόβλημα
            if running_balance != apartment.current_balance:
                self.stdout.write(self.style.WARNING(f"\n⚠️  ΠΡΟΒΛΗΜΑ: Το υπολογισμένο υπόλοιπο ({running_balance}€) δεν ταιριάζει με το DB ({apartment.current_balance}€)"))
                self.stdout.write(self.style.WARNING(f"   Αυτό μπορεί να εξηγεί γιατί το modal εμφανίζει λάθος υπόλοιπο"))
            
            if final_balance != Decimal('0.00'):
                self.stdout.write(self.style.WARNING(f"\n⚠️  ΠΡΟΒΛΗΜΑ: Το τελικό υπόλοιπο θα έπρεπε να είναι 0,00€ αλλά είναι {final_balance}€"))
