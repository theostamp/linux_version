#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Transaction, Payment, ExpenseApartment
from django.utils import timezone
from django.db import models

def add_financial_demo_data():
    """Προσθήκη εικονικών χρεώσεων και εισπράξεων στα demo διαμερίσματα"""
    
    try:
        # Βρίσκουμε τον demo tenant
        tenant = Client.objects.get(schema_name='demo')
        print(f'🎯 Βρέθηκε tenant: {tenant.name}')
        
        with tenant_context(tenant):
            # Βρίσκουμε τα κτίρια
            buildings = Building.objects.all()
            if not buildings.exists():
                print("❌ Δεν βρέθηκαν κτίρια. Εκτελέστε πρώτα το auto_initialization.py")
                return False
            
            print(f"🏢 Βρέθηκαν {buildings.count()} κτίρια")
            
            # Βρίσκουμε τα διαμερίσματα
            apartments = Apartment.objects.all()
            if not apartments.exists():
                print("❌ Δεν βρέθηκαν διαμερίσματα. Εκτελέστε πρώτα το auto_initialization.py")
                return False
            
            print(f"🏠 Βρέθηκαν {apartments.count()} διαμερίσματα")
            
            # 1. Δημιουργία εικονικών δαπανών κτιρίου
            print("\n💰 Δημιουργία εικονικών δαπανών...")
            
            expenses_data = [
                {
                    'title': 'Καθαρισμός Κοινοχρήστων Χώρων - Ιανουάριος 2024',
                    'amount': 450.00,
                    'category': 'cleaning',
                    'distribution_type': 'by_participation_mills',
                    'date': timezone.make_aware(datetime(2024, 1, 15)).date(),
                    'notes': 'Μηνιαίος καθαρισμός κοινοχρήστων χώρων και κλιμακοστασίων'
                },
                {
                    'title': 'ΔΕΗ Κοινοχρήστων - Ιανουάριος 2024',
                    'amount': 320.00,
                    'category': 'electricity_common',
                    'distribution_type': 'by_participation_mills',
                    'date': timezone.make_aware(datetime(2024, 1, 20)).date(),
                    'notes': 'Λογαριασμός ΔΕΗ για φωτισμό κοινοχρήστων χώρων'
                },
                {
                    'title': 'Συντήρηση Ανελκυστήρα - Ιανουάριος 2024',
                    'amount': 280.00,
                    'category': 'elevator_maintenance',
                    'distribution_type': 'by_participation_mills',
                    'date': timezone.make_aware(datetime(2024, 1, 25)).date(),
                    'notes': 'Ετήσια συντήρηση ανελκυστήρα από εξειδικευμένη εταιρεία'
                },
                {
                    'title': 'Καθαρισμός Κοινοχρήστων Χώρων - Φεβρουάριος 2024',
                    'amount': 450.00,
                    'category': 'cleaning',
                    'distribution_type': 'by_participation_mills',
                    'date': timezone.make_aware(datetime(2024, 2, 15)).date(),
                    'notes': 'Μηνιαίος καθαρισμός κοινοχρήστων χώρων και κλιμακοστασίων'
                },
                {
                    'title': 'ΔΕΗ Κοινοχρήστων - Φεβρουάριος 2024',
                    'amount': 310.00,
                    'category': 'electricity_common',
                    'distribution_type': 'by_participation_mills',
                    'date': timezone.make_aware(datetime(2024, 2, 20)).date(),
                    'notes': 'Λογαριασμός ΔΕΗ για φωτισμό κοινοχρήστων χώρων'
                },
                {
                    'title': 'Συλλογή Απορριμμάτων - Φεβρουάριος 2024',
                    'amount': 180.00,
                    'category': 'garbage_collection',
                    'distribution_type': 'by_participation_mills',
                    'date': timezone.make_aware(datetime(2024, 2, 25)).date(),
                    'notes': 'Μηνιαίος λογαριασμός συλλογής απορριμμάτων'
                },
                {
                    'title': 'Καθαρισμός Κοινοχρήστων Χώρων - Μάρτιος 2024',
                    'amount': 450.00,
                    'category': 'cleaning',
                    'distribution_type': 'by_participation_mills',
                    'date': timezone.make_aware(datetime(2024, 3, 15)).date(),
                    'notes': 'Μηνιαίος καθαρισμός κοινοχρήστων χώρων και κλιμακοστασίων'
                },
                {
                    'title': 'ΔΕΗ Κοινοχρήστων - Μάρτιος 2024',
                    'amount': 290.00,
                    'category': 'electricity_common',
                    'distribution_type': 'by_participation_mills',
                    'date': timezone.make_aware(datetime(2024, 3, 20)).date(),
                    'notes': 'Λογαριασμός ΔΕΗ για φωτισμό κοινοχρήστων χώρων'
                },
                {
                    'title': 'Επισκευή Θυροτηλεφώνου - Μάρτιος 2024',
                    'amount': 120.00,
                    'category': 'emergency_repair',
                    'distribution_type': 'by_participation_mills',
                    'date': timezone.make_aware(datetime(2024, 3, 10)).date(),
                    'notes': 'Έκτακτη επισκευή θυροτηλεφώνου στην είσοδο'
                },
                {
                    'title': 'Καθαρισμός Κοινοχρήστων Χώρων - Απρίλιος 2024',
                    'amount': 450.00,
                    'category': 'cleaning',
                    'distribution_type': 'by_participation_mills',
                    'date': timezone.make_aware(datetime(2024, 4, 15)).date(),
                    'notes': 'Μηνιαίος καθαρισμός κοινοχρήστων χώρων και κλιμακοστασίων'
                },
                {
                    'title': 'ΔΕΗ Κοινοχρήστων - Απρίλιος 2024',
                    'amount': 270.00,
                    'category': 'electricity_common',
                    'distribution_type': 'by_participation_mills',
                    'date': timezone.make_aware(datetime(2024, 4, 20)).date(),
                    'notes': 'Λογαριασμός ΔΕΗ για φωτισμό κοινοχρήστων χώρων'
                },
                {
                    'title': 'Βαψίματα Εξωτερικών - Απρίλιος 2024',
                    'amount': 1200.00,
                    'category': 'painting_exterior',
                    'distribution_type': 'by_participation_mills',
                    'date': timezone.make_aware(datetime(2024, 4, 25)).date(),
                    'notes': 'Ετήσια βαψίματα εξωτερικών χώρων και πρόσοψης'
                }
            ]
            
            created_expenses = []
            for expense_data in expenses_data:
                for building in buildings:
                    expense, created = Expense.objects.get_or_create(
                        building=building,
                        title=expense_data['title'],
                        defaults={
                            'amount': expense_data['amount'],
                            'category': expense_data['category'],
                            'distribution_type': expense_data['distribution_type'],
                            'date': expense_data['date'],
                            'notes': expense_data['notes'],
                            'is_issued': True
                        }
                    )
                    if created:
                        created_expenses.append(expense)
                        print(f"✅ Δημιουργήθηκε δαπάνη: {expense.title} - {expense.amount}€")
            
                # 2. Δημιουργία εικονικών εισπράξεων από ιδιοκτήτες
                print("\n💳 Δημιουργία εικονικών εισπράξεων...")
            
            payment_methods = ['bank_transfer', 'cash', 'check']
            payment_dates = [
                timezone.make_aware(datetime(2024, 1, 5)).date(),
                timezone.make_aware(datetime(2024, 1, 15)).date(),
                timezone.make_aware(datetime(2024, 2, 5)).date(),
                timezone.make_aware(datetime(2024, 2, 15)).date(),
                timezone.make_aware(datetime(2024, 3, 5)).date(),
                timezone.make_aware(datetime(2024, 3, 15)).date(),
                timezone.make_aware(datetime(2024, 4, 5)).date(),
                timezone.make_aware(datetime(2024, 4, 15)).date(),
            ]
            
            created_payments = []
            for apartment in apartments:
                # Δημιουργούμε 2-4 εισπράξεις ανά διαμέρισμα
                num_payments = random.randint(2, 4)
                for i in range(num_payments):
                    payment_date = random.choice(payment_dates)
                    payment_amount = Decimal(random.randint(50, 200))
                    payment_method = random.choice(payment_methods)
                    
                    payment, created = Payment.objects.get_or_create(
                        apartment=apartment,
                        amount=payment_amount,
                        date=payment_date,
                        method=payment_method,
                        defaults={
                            'notes': f'Είσπραξη κοινοχρήστων - {payment_date.strftime("%B %Y")}'
                        }
                    )
                    if created:
                        created_payments.append(payment)
                        print(f"✅ Δημιουργήθηκε είσπραξη: {apartment.number} - {payment_amount}€ ({payment.get_method_display()})")
            
            # 3. Δημιουργία εικονικών συναλλαγών (transactions)
            print("\n📊 Δημιουργία εικονικών συναλλαγών...")
            
            created_transactions = []
            
            # Συναλλαγές για δαπάνες
            for expense in created_expenses:
                # Υπολογίζουμε το ποσό ανά διαμέρισμα (απλοποιημένος υπολογισμός)
                apartments_in_building = Apartment.objects.filter(building=expense.building).count()
                amount_per_apartment = expense.amount / apartments_in_building
                
                for apartment in Apartment.objects.filter(building=expense.building):
                    transaction, created = Transaction.objects.get_or_create(
                        building=expense.building,
                        type='expense_created',
                        amount=amount_per_apartment,
                        date=timezone.make_aware(datetime.combine(expense.date, datetime.min.time())),
                        apartment=apartment,
                        defaults={
                            'status': 'completed',
                            'description': f'Χρέωση: {expense.title}',
                            'balance_before': Decimal('0.00'),
                            'balance_after': -amount_per_apartment,
                            'reference_id': str(expense.id),
                            'reference_type': 'expense',
                            'created_by': 'System'
                        }
                    )
                    if created:
                        created_transactions.append(transaction)
            
            # Συναλλαγές για εισπράξεις
            for payment in created_payments:
                transaction, created = Transaction.objects.get_or_create(
                    building=payment.apartment.building,
                    type='payment_received',
                    amount=payment.amount,
                    date=timezone.make_aware(datetime.combine(payment.date, datetime.min.time())),
                    apartment=payment.apartment,
                    defaults={
                        'status': 'completed',
                        'description': f'Είσπραξη κοινοχρήστων - {payment.get_method_display()}',
                        'balance_before': Decimal('0.00'),
                        'balance_after': payment.amount,
                        'reference_id': str(payment.id),
                        'reference_type': 'payment',
                        'created_by': 'System'
                    }
                )
                if created:
                    created_transactions.append(transaction)
            
            # 4. Ενημέρωση υπολοίπων διαμερισμάτων
            print("\n💾 Ενημέρωση υπολοίπων διαμερισμάτων...")
            
            for apartment in apartments:
                # Υπολογίζουμε το συνολικό υπόλοιπο
                total_charges = Transaction.objects.filter(
                    apartment=apartment,
                    type__in=['expense_created', 'expense_issued']
                ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
                
                total_payments = Transaction.objects.filter(
                    apartment=apartment,
                    type='payment_received'
                ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
                
                current_balance = total_payments - total_charges
                
                apartment.current_balance = current_balance
                apartment.save()
                print(f"✅ Ενημερώθηκε υπόλοιπο διαμερίσματος {apartment.number}: {current_balance}€")
            
            # 5. Στατιστικά
            print("\n📈 ΣΤΑΤΙΣΤΙΚΑ ΔΗΜΙΟΥΡΓΗΜΕΝΩΝ ΔΕΔΟΜΕΝΩΝ:")
            print("=" * 50)
            print(f"💰 Δαπάνες: {len(created_expenses)}")
            print(f"💳 Εισπράξεις: {len(created_payments)}")
            print(f"📊 Συναλλαγές: {len(created_transactions)}")
            print(f"🏠 Διαμερίσματα με οικονομικά δεδομένα: {apartments.count()}")
            
            total_expenses = sum(Decimal(str(expense.amount)) for expense in created_expenses)
            total_payments = sum(Decimal(str(payment.amount)) for payment in created_payments)
            print(f"💶 Συνολικό ποσό δαπανών: {total_expenses}€")
            print(f"💶 Συνολικό ποσό εισπράξεων: {total_payments}€")
            print(f"💶 Διαφορά: {total_payments - total_expenses}€")
            
            print("\n✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΔΗΜΙΟΥΡΓΙΑ ΤΩΝ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ!")
            print("🌐 Μπορείτε να δείτε τα δεδομένα στο: http://demo.localhost:8080/financial")
            
            return True
            
    except Exception as e:
        print(f'❌ Σφάλμα: {e}')
        return False

if __name__ == '__main__':
    success = add_financial_demo_data()
    sys.exit(0 if success else 1) 