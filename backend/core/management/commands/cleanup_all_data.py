import os
import sys
import django
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django_tenants.utils import schema_context


class Command(BaseCommand):
    help = 'Καθαρισμός όλων των δεδομένων από την βάση'

    def add_arguments(self, parser):
        parser.add_argument(
            '--schema',
            default='demo',
            help='Schema name to clean (default: demo)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Skip confirmation prompt'
        )

    def handle(self, *args, **options):
        schema_name = options['schema']
        force = options['force']
        
        # Import here to avoid circular imports
        from users.models import CustomUser
        from buildings.models import Building, BuildingMembership
        from apartments.models import Apartment
        from financial.models import (
            Transaction, Payment, Expense, CommonExpensePeriod,
            ApartmentShare, FinancialReceipt, ExpenseApartment
        )
        from announcements.models import Announcement
        from user_requests.models import UserRequest
        from votes.models import Vote
        
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('  🧹 ΚΑΘΑΡΙΣΜΟΣ ΒΑΣΗΣ ΔΕΔΟΜΕΝΩΝ'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(f'Schema: {schema_name}\n')
        
        with schema_context(schema_name):
            # Statistics
            user_count = CustomUser.objects.count()
            transaction_count = Transaction.objects.count()
            payment_count = Payment.objects.count()
            expense_count = Expense.objects.count()
            building_count = Building.objects.count()
            
            self.stdout.write(f'👥 Χρήστες: {user_count}')
            self.stdout.write(f'💰 Συναλλαγές: {transaction_count}')
            self.stdout.write(f'💳 Πληρωμές: {payment_count}')
            self.stdout.write(f'💸 Δαπάνες: {expense_count}')
            self.stdout.write(f'🏢 Κτίρια: {building_count}\n')
            
            if (user_count + transaction_count + payment_count + expense_count == 0):
                self.stdout.write(self.style.SUCCESS('✅ Η βάση είναι ήδη καθαρή!'))
                return
            
            # Confirmation
            if not force:
                self.stdout.write(self.style.WARNING('⚠️  ΠΡΟΣΟΧΗ: Αυτή η λειτουργία θα διαγράψει ΑΝΕΠΑΝΑΦΟΡΑ όλα τα δεδομένα!'))
                confirm = input('Είστε σίγουροι; (yes/no): ')
                if confirm.lower() not in ['yes', 'y']:
                    self.stdout.write(self.style.ERROR('❌ Ακυρώθηκε'))
                    return
            
            # Delete in correct order
            with transaction.atomic():
                # Financial data
                self.stdout.write('\n💰 Καθαρισμός οικονομικών δεδομένων...')
                FinancialReceipt.objects.all().delete()
                ApartmentShare.objects.all().delete()
                ExpenseApartment.objects.all().delete()
                CommonExpensePeriod.objects.all().delete()
                Transaction.objects.all().delete()
                Payment.objects.all().delete()
                Expense.objects.all().delete()
                
                # Reset apartment balances
                self.stdout.write('🏠 Επαναφορά υπολοίπων διαμερισμάτων...')
                for apt in Apartment.objects.all():
                    apt.current_balance = 0
                    apt.previous_balance = 0
                    apt.save()
                
                # Other data
                self.stdout.write('📋 Καθαρισμός υπόλοιπων δεδομένων...')
                Announcement.objects.all().delete()
                UserRequest.objects.all().delete()
                Vote.objects.all().delete()
                
                # Buildings
                self.stdout.write('🏢 Καθαρισμός κτιρίων...')
                BuildingMembership.objects.all().delete()
                Building.objects.all().delete()
                
                # Apartments
                self.stdout.write('🏠 Διαγραφή διαμερισμάτων...')
                Apartment.objects.all().delete()
                
                # Users
                self.stdout.write('👥 Διαγραφή χρηστών...')
                CustomUser.objects.exclude(is_superuser=True).delete()
                
                # Reset superuser
                self.stdout.write('🔑 Επαναφορά superuser...')
                try:
                    admin = CustomUser.objects.get(email='admin@demo.localhost')
                    admin.set_password('admin123456')
                    admin.save()
                    self.stdout.write('✅ Superuser επαναφέρθηκε (admin@demo.localhost / admin123456)')
                except CustomUser.DoesNotExist:
                    self.stdout.write('ℹ️ Δεν υπάρχει superuser')
            
            self.stdout.write(self.style.SUCCESS('\n✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΔΙΑΓΡΑΦΗ!'))
            self.stdout.write('\n💡 Τώρα τρέξτε: python manage.py initialize_demo_data')
