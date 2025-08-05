#!/usr/bin/env python
import os
import django
import sys
from datetime import date, timedelta, datetime
from decimal import Decimal
import random

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Transaction, Payment, Expense
from django_tenants.utils import tenant_context
from tenants.models import Client

User = get_user_model()

def create_sample_transactions(tenant_schema):
    """Δημιουργεί sample κινήσεις ταμείου και εισπράξεις για το συγκεκριμένο tenant"""
    
    # Βρίσκω το tenant object
    try:
        tenant = Client.objects.get(schema_name=tenant_schema)
    except Client.DoesNotExist:
        print(f"❌ Το tenant '{tenant_schema}' δεν βρέθηκε!")
        return
    
    with tenant_context(tenant):
        print(f"🎯 Δημιουργία sample κινήσεων για tenant: {tenant_schema}")
        
        # Βρίσκω τα κτίρια
        buildings = Building.objects.all()
        if not buildings.exists():
            print("❌ Δεν βρέθηκαν κτίρια!")
            return
        
        # Βρίσκω τις δαπάνες
        expenses = Expense.objects.all()
        if not expenses.exists():
            print("❌ Δεν βρέθηκαν δαπάνες! Δημιούργησε πρώτα δαπάνες με το create_sample_expenses.py")
            return
        
        # Βρίσκω τα διαμερίσματα
        apartments = Apartment.objects.all()
        if not apartments.exists():
            print("❌ Δεν βρέθηκαν διαμερίσματα!")
            return
        
            # Δημιουργία sample εισπράξεων
    print("\n💰 Δημιουργία sample εισπράξεων...")
        
        payment_methods = ['cash', 'bank_transfer', 'check', 'card']
        payment_notes = [
                    'Είσπραξη κοινοχρήστων',
        'Είσπραξη δαπάνης',
            'Μηνιαία εισφορά',
            'Έκτακτη εισφορά',
                    'Είσπραξη μετά από υπενθύμιση',
        'Είσπραξη με έκπτωση',
        'Είσπραξη μετά από συμφωνητικό'
        ]
        
        # Δημιουργία εισπράξεων για κάθε διαμέρισμα
        for apartment in apartments:
            # 3-8 εισπράξεις ανά διαμέρισμα
            num_payments = random.randint(3, 8)
            
            for i in range(num_payments):
                # Τυχαία ημερομηνία τα τελευταία 6 μήνες
                payment_date = date.today() - timedelta(days=random.randint(0, 180))
                
                # Τυχαίο ποσό 50-500€
                amount = Decimal(str(random.uniform(50, 500))).quantize(Decimal('0.01'))
                
                payment = Payment.objects.create(
                    apartment=apartment,
                    amount=amount,
                    date=payment_date,
                    method=random.choice(payment_methods),
                    notes=random.choice(payment_notes)
                )
                
                print(f"  ✅ Είσπραξη €{amount} για διαμέρισμα {apartment.number}")
        
        # Δημιουργία κινήσεων ταμείου
        print("\n📊 Δημιουργία κινήσεων ταμείου...")
        
        transaction_types = [
            'payment_received',
            'expense_created',
            'expense_issued',
            'common_expense_charge',
            'refund',
            'balance_adjustment'
        ]
        
        transaction_descriptions = {
            'payment_received': [
                'Είσπραξη ληφθείσα από ιδιοκτήτη',
                'Εισπράκτηση κοινοχρήστων',
                'Είσπραξη δαπάνης',
                'Εισπράκτηση έκτακτης εισφοράς'
            ],
            'expense_created': [
                'Δημιουργία νέας δαπάνης',
                'Καταχώρηση δαπάνης',
                'Εγγραφή έξοδου'
            ],
            'expense_issued': [
                'Εκδοθείσα δαπάνη',
                'Επιβεβαιωμένη δαπάνη',
                'Εξοφλημένη δαπάνη'
            ],
            'common_expense_charge': [
                'Χρέωση κοινοχρήστων',
                'Μηνιαία χρέωση',
                'Χρέωση για δαπάνη'
            ],
            'refund': [
                'Επιστροφή ποσού',
                'Επιστροφή λάθος χρέωσης',
                'Επιστροφή προκαταβολής'
            ],
            'balance_adjustment': [
                'Προσαρμογή υπολοίπου',
                'Διόρθωση λάθους',
                'Αναπροσαρμογή λογαριασμού'
            ]
        }
        
        # Δημιουργία κινήσεων για κάθε κτίριο
        for building in buildings:
            building_apartments = Apartment.objects.filter(building=building)
            building_expenses = Expense.objects.filter(building=building)
            
            # 10-20 κινήσεις ανά κτίριο
            num_transactions = random.randint(10, 20)
            
            for i in range(num_transactions):
                # Τυχαία ημερομηνία
                transaction_date = datetime.now() - timedelta(
                    days=random.randint(0, 180),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59)
                )
                
                # Τυχαίος τύπος κίνησης
                transaction_type = random.choice(transaction_types)
                
                # Τυχαίο ποσό
                amount = Decimal(str(random.uniform(20, 1000))).quantize(Decimal('0.01'))
                
                # Τυχαία περιγραφή
                description = random.choice(transaction_descriptions[transaction_type])
                
                # Τυχαίο διαμέρισμα (αν χρειάζεται)
                apartment = random.choice(building_apartments) if building_apartments.exists() else None
                
                # Υπόλοιπο πριν και μετά
                balance_before = Decimal(str(random.uniform(0, 5000))).quantize(Decimal('0.01'))
                balance_after = balance_before + amount
                
                # Δημιουργία κίνησης
                transaction = Transaction.objects.create(
                    building=building,
                    date=transaction_date,
                    type=transaction_type,
                    status='completed',
                    description=description,
                    apartment_number=apartment.number if apartment else None,
                    apartment=apartment,
                    amount=amount,
                    balance_before=balance_before,
                    balance_after=balance_after,
                    created_by='System'
                )
                
                print(f"  ✅ {transaction.get_type_display()} - €{amount} - {description}")
        
        # Δημιουργία κινήσεων για τις δαπάνες
        print("\n📋 Δημιουργία κινήσεων για δαπάνες...")
        
        for expense in expenses:
            # Κίνηση δημιουργίας δαπάνης
            creation_date = expense.date
            creation_transaction = Transaction.objects.create(
                building=expense.building,
                date=datetime.combine(creation_date, datetime.min.time()),
                type='expense_created',
                status='completed',
                description=f'Δημιουργία δαπάνης: {expense.title}',
                amount=-expense.amount,  # Αρνητικό ποσό (έξοδος)
                balance_before=Decimal('0.00'),
                balance_after=-expense.amount,
                reference_id=str(expense.id),
                reference_type='expense',
                created_by='System'
            )
            
            # Αν η δαπάνη είναι εκδοθείσα, δημιούργησε και την κίνηση εκδόσεως
            if expense.is_issued:
                issue_date = expense.date + timedelta(days=random.randint(1, 30))
                issue_transaction = Transaction.objects.create(
                    building=expense.building,
                    date=datetime.combine(issue_date, datetime.min.time()),
                    type='expense_issued',
                    status='completed',
                    description=f'Εκδοθείσα δαπάνη: {expense.title}',
                    amount=Decimal('0.00'),  # Δεν αλλάζει το ποσό, αλλάζει μόνο η κατάσταση
                    balance_before=-expense.amount,
                    balance_after=-expense.amount,
                    reference_id=str(expense.id),
                    reference_type='expense',
                    created_by='System'
                )
        
        print(f"\n🎉 Ολοκληρώθηκε η δημιουργία sample κινήσεων για tenant: {tenant_schema}")
        print(f"📊 Συνολικά δημιουργήθηκαν:")
        print(f"   💰 {Payment.objects.count()} εισπράξεις")
        print(f"   📋 {Transaction.objects.count()} κινήσεις ταμείου")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Χρήση: python create_sample_transactions.py <tenant_schema>")
        print("Παράδειγμα: python create_sample_transactions.py athinon12")
        sys.exit(1)
    
    tenant_schema = sys.argv[1]
    create_sample_transactions(tenant_schema) 