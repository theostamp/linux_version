#!/usr/bin/env python3
"""
Django Management Command για τη διαγραφή όλων των οικονομικών ποσών

Χρήση:
python manage.py clear_financial_data --tenant=demo --confirm

⚠️  ΠΡΟΣΟΧΗ: Αυτό το script διαγράφει ΜΟΝΙΜΑ όλα τα οικονομικά δεδομένα!
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import schema_context
from django.db import transaction
from django.conf import settings

class Command(BaseCommand):
    help = 'Διαγράφει όλα τα οικονομικά δεδομένα από τη βάση δεδομένων'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant',
            type=str,
            default='demo',
            help='Όνομα του tenant (default: demo)'
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Επιβεβαίωση διαγραφής (απαιτείται για εκτέλεση)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Εμφάνιση μόνο των εγγραφών που θα διαγραφούν (χωρίς διαγραφή)'
        )
    
    def handle(self, *args, **options):
        tenant = options['tenant']
        confirm = options['confirm']
        dry_run = options['dry_run']
        
        if not confirm and not dry_run:
            self.stdout.write(
                self.style.ERROR(
                    '❌ Χωρίς επιβεβαίωση! Χρησιμοποιήστε --confirm για να συνεχίσετε.'
                )
            )
            return
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('🔍 DRY RUN - Δεν θα διαγραφούν δεδομένα')
            )
        
        try:
            with schema_context(tenant):
                self.clear_financial_data(dry_run)
                
        except Exception as e:
            raise CommandError(f'Σφάλμα κατά τη διαγραφή: {str(e)}')
    
    def clear_financial_data(self, dry_run=False):
        """Διαγράφει όλα τα οικονομικά δεδομένα"""
        
        self.stdout.write(
            self.style.WARNING(
                '🚨 ΕΚΚΙΝΗΣΗ ΔΙΑΓΡΑΦΗΣ ΟΛΩΝ ΤΩΝ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ 🚨'
            )
        )
        self.stdout.write('=' * 70)
        
        if not dry_run:
            # Επιβεβαίωση από τον χρήστη
            confirmation = input("Είστε σίγουροι ότι θέλετε να διαγράψετε ΟΛΑ τα οικονομικά δεδομένα; (yes/no): ")
            if confirmation.lower() != 'yes':
                self.stdout.write(self.style.ERROR('❌ Ακύρωση διαγραφής.'))
                return
            
            # Επιπλέον επιβεβαίωση
            final_confirmation = input("ΠΡΟΣΟΧΗ: Αυτή η ενέργεια ΔΕΝ μπορεί να αναιρεθεί! Γράψτε 'DELETE ALL' για να συνεχίσετε: ")
            if final_confirmation != 'DELETE ALL':
                self.stdout.write(self.style.ERROR('❌ Ακύρωση διαγραφής.'))
                return
        
        self.stdout.write('\n🔄 Ξεκινάει η διαγραφή των οικονομικών δεδομένων...')
        
        try:
            if dry_run:
                self.dry_run_analysis()
            else:
                self.perform_deletion()
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'\n❌ ΣΦΑΛΜΑ κατά τη διαγραφή: {str(e)}')
            )
            raise
    
    def dry_run_analysis(self):
        """Εμφανίζει ανάλυση των δεδομένων που θα διαγραφούν"""
        
        self.stdout.write('\n📊 ΑΝΑΛΥΣΗ ΔΕΔΟΜΕΝΩΝ ΠΟΥ ΘΑ ΔΙΑΓΡΑΦΟΥΝ:')
        self.stdout.write('=' * 50)
        
        # Έλεγχος για οικονομικά δεδομένα
        models_to_check = [
            ('Συναλλαγές', 'financial.models.Transaction'),
            ('Εισπράξεις', 'financial.models.Payment'),
            ('Αποδείξεις', 'financial.models.FinancialReceipt'),
            ('Σχέσεις Δαπανών-Διαμερισμάτων', 'financial.models.ExpenseApartment'),
            ('Μερίδια Διαμερισμάτων', 'financial.models.ApartmentShare'),
            ('Περίοδοι Κοινοχρήστων', 'financial.models.CommonExpensePeriod'),
            ('Μετρήσεις', 'financial.models.MeterReading'),
            ('Δαπάνες', 'financial.models.Expense'),
            ('Προμηθευτές', 'financial.models.Supplier'),
        ]
        
        total_records = 0
        for name, model_path in models_to_check:
            try:
                module_name, class_name = model_path.rsplit('.', 1)
                module = __import__(module_name, fromlist=[class_name])
                model_class = getattr(module, class_name)
                
                count = model_class.objects.count()
                total_records += count
                
                if count > 0:
                    self.stdout.write(f"   • {name}: {count} εγγραφές")
                else:
                    self.stdout.write(f"   • {name}: 0 εγγραφές ✅")
                    
            except Exception as e:
                self.stdout.write(f"   • {name}: Σφάλμα - {str(e)}")
        
        # Έλεγχος για υπόλοιπα διαμερισμάτων
        try:
            from apartments.models import Apartment
            apartment_count = Apartment.objects.count()
            apartments_with_balance = Apartment.objects.exclude(current_balance=Decimal('0.00')).count()
            
            self.stdout.write(f"\n💰 Υπόλοιπα διαμερισμάτων:")
            self.stdout.write(f"   • Σύνολο διαμερισμάτων: {apartment_count}")
            self.stdout.write(f"   • Με μη μηδενικό υπόλοιπο: {apartments_with_balance}")
            
        except Exception as e:
            self.stdout.write(f"\n💰 Υπόλοιπα διαμερισμάτων: Σφάλμα - {str(e)}")
        
        self.stdout.write(f"\n📊 ΣΥΝΟΛΟ ΕΓΓΡΑΦΩΝ ΠΟΥ ΘΑ ΔΙΑΓΡΑΦΟΥΝ: {total_records}")
        
        if total_records > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'\n⚠️  Χρησιμοποιήστε --confirm για να διαγράψετε αυτές τις {total_records} εγγραφές!'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('\n🎉 Η βάση δεδομένων είναι ήδη καθαρή!')
            )
    
    def perform_deletion(self):
        """Εκτελεί τη διαγραφή των δεδομένων"""
        
        with transaction.atomic():
            
            # Διαγραφή σε σωστή σειρά (αποφυγή foreign key errors)
            
            # 1. Συναλλαγές
            self.stdout.write("🗑️  Διαγραφή συναλλαγών...")
            from financial.models import Transaction
            transaction_count = Transaction.objects.count()
            Transaction.objects.all().delete()
            self.stdout.write(f"   ✅ Διαγράφηκαν {transaction_count} συναλλαγές")
            
            # 2. Εισπράξεις
            self.stdout.write("🗑️  Διαγραφή εισπράξεων...")
            from financial.models import Payment
            payment_count = Payment.objects.count()
            Payment.objects.all().delete()
            self.stdout.write(f"   ✅ Διαγράφηκαν {payment_count} εισπράξεις")
            
            # 3. Αποδείξεις
            self.stdout.write("🗑️  Διαγραφή αποδείξεων...")
            from financial.models import FinancialReceipt
            receipt_count = FinancialReceipt.objects.count()
            FinancialReceipt.objects.all().delete()
            self.stdout.write(f"   ✅ Διαγράφηκαν {receipt_count} αποδείξεις")
            
            # 4. Σχέσεις δαπανών-διαμερισμάτων
            self.stdout.write("🗑️  Διαγραφή σχέσεων δαπανών-διαμερισμάτων...")
            from financial.models import ExpenseApartment
            expense_apt_count = ExpenseApartment.objects.count()
            ExpenseApartment.objects.all().delete()
            self.stdout.write(f"   ✅ Διαγράφηκαν {expense_apt_count} σχέσεις δαπανών-διαμερισμάτων")
            
            # 5. Μερίδια διαμερισμάτων
            self.stdout.write("🗑️  Διαγραφή μεριδίων διαμερισμάτων...")
            from financial.models import ApartmentShare
            share_count = ApartmentShare.objects.count()
            ApartmentShare.objects.all().delete()
            self.stdout.write(f"   ✅ Διαγράφηκαν {share_count} μερίδια διαμερισμάτων")
            
            # 6. Περίοδοι κοινοχρήστων
            self.stdout.write("🗑️  Διαγραφή περιόδων κοινοχρήστων...")
            from financial.models import CommonExpensePeriod
            period_count = CommonExpensePeriod.objects.count()
            CommonExpensePeriod.objects.all().delete()
            self.stdout.write(f"   ✅ Διαγράφηκαν {period_count} περίοδοι κοινοχρήστων")
            
            # 7. Μετρήσεις
            self.stdout.write("🗑️  Διαγραφή μετρήσεων...")
            from financial.models import MeterReading
            meter_count = MeterReading.objects.count()
            MeterReading.objects.all().delete()
            self.stdout.write(f"   ✅ Διαγράφηκαν {meter_count} μετρήσεις")
            
            # 8. Δαπάνες
            self.stdout.write("🗑️  Διαγραφή δαπανών...")
            from financial.models import Expense
            expense_count = Expense.objects.count()
            Expense.objects.all().delete()
            self.stdout.write(f"   ✅ Διαγράφηκαν {expense_count} δαπάνες")
            
            # 9. Μηδενισμός υπόλοιπων διαμερισμάτων
            self.stdout.write("🔄 Μηδενισμός υπόλοιπων διαμερισμάτων...")
            from apartments.models import Apartment
            apartment_count = Apartment.objects.count()
            
            for apartment in Apartment.objects.all():
                apartment.current_balance = Decimal('0.00')
                apartment.save()
            
            self.stdout.write(f"   ✅ Μηδενίστηκαν τα υπόλοιπα για {apartment_count} διαμερίσματα")
            
            # 10. Διαγραφή προμηθευτών
            self.stdout.write("🗑️  Διαγραφή προμηθευτών...")
            from financial.models import Supplier
            supplier_count = Supplier.objects.count()
            Supplier.objects.all().delete()
            self.stdout.write(f"   ✅ Διαγράφηκαν {supplier_count} προμηθευτές")
            
            # 11. Καθαρισμός audit logs
            self.stdout.write("🗑️  Καθαρισμός audit logs...")
            try:
                from financial.audit import FinancialAuditLog
                audit_count = FinancialAuditLog.objects.count()
                FinancialAuditLog.objects.all().delete()
                self.stdout.write(f"   ✅ Διαγράφηκαν {audit_count} audit logs")
            except ImportError:
                self.stdout.write("   ℹ️  Audit logs δεν βρέθηκαν")
            
            self.stdout.write("\n" + "=" * 70)
            self.stdout.write(
                self.style.SUCCESS("🎉 ΕΠΙΤΥΧΗΣ ΔΙΑΓΡΑΦΗ ΟΛΩΝ ΤΩΝ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ! 🎉")
            )
            self.stdout.write("=" * 70)
            
            # Σύνοψη διαγραφής
            total_deleted = (transaction_count + payment_count + receipt_count + 
                           expense_apt_count + share_count + period_count + 
                           meter_count + expense_count + supplier_count)
            
            self.stdout.write(f"\n📊 ΣΥΝΟΛΙΚΑ ΔΙΑΓΡΑΦΗΚΑΝ:")
            self.stdout.write(f"   • {transaction_count} συναλλαγές")
            self.stdout.write(f"   • {payment_count} εισπράξεις")
            self.stdout.write(f"   • {receipt_count} αποδείξεις")
            self.stdout.write(f"   • {expense_apt_count} σχέσεις δαπανών-διαμερισμάτων")
            self.stdout.write(f"   • {share_count} μερίδια διαμερισμάτων")
            self.stdout.write(f"   • {period_count} περίοδοι κοινοχρήστων")
            self.stdout.write(f"   • {meter_count} μετρήσεις")
            self.stdout.write(f"   • {expense_count} δαπάνες")
            self.stdout.write(f"   • {supplier_count} προμηθευτές")
            self.stdout.write(f"   • Μηδενίστηκαν τα υπόλοιπα για {apartment_count} διαμερίσματα")
            
            self.stdout.write(f"\n💰 Συνολικό κόστος διαγραφής: €0.00")
            self.stdout.write("🔒 Η βάση δεδομένων είναι τώρα καθαρή από όλα τα οικονομικά δεδομένα!")

if __name__ == "__main__":
    # Για εκτέλεση απευθείας (όχι ως management command)
    command = Command()
    command.handle(tenant='demo', confirm=True, dry_run=False)
