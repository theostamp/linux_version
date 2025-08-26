import os
import sys
import django
from decimal import Decimal
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment, Apartment, Building, Supplier
from django.db.models import Sum

def create_expenses_for_building_6():
    """Δημιουργία δαπανών για το κτίριο 6 (Αύγουστος 2025)"""
    
    with schema_context('demo'):
        building_id = 6
        
        # Ελέγχος αν υπάρχει το κτίριο
        try:
            building = Building.objects.get(id=building_id)
            print(f"🏢 Κτίριο: {building.name}")
            print(f"📍 Διεύθυνση: {building.address}")
        except Building.DoesNotExist:
            print(f"❌ Κτίριο με ID {building_id} δεν βρέθηκε")
            return
        
        # Ελέγχος αν υπάρχουν ήδη δαπάνες
        existing_expenses = Expense.objects.filter(
            building_id=building_id,
            date__year=2025,
            date__month=8
        )
        
        if existing_expenses.exists():
            print(f"✅ Υπάρχουν ήδη {existing_expenses.count()} δαπάνες για τον Αύγουστο 2025")
            total_existing = existing_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            print(f"💰 Συνολικό ποσό: {total_existing}€")
            
            for expense in existing_expenses:
                print(f"  - {expense.title}: {expense.amount}€ ({expense.date})")
            return
        
        # Δημιουργία προμηθευτών αν δεν υπάρχουν
        suppliers = {
            'ΔΕΗ': Supplier.objects.get_or_create(
                name='ΔΕΗ',
                defaults={'contact_info': 'Τηλ: 11770', 'email': 'info@dei.gr'}
            )[0],
            'ΕΥΔΑΠ': Supplier.objects.get_or_create(
                name='ΕΥΔΑΠ',
                defaults={'contact_info': 'Τηλ: 11770', 'email': 'info@eydap.gr'}
            )[0],
            'ΚΑΘΑΡΙΣΤΙΚΗ': Supplier.objects.get_or_create(
                name='Καθαριστική Εταιρεία',
                defaults={'contact_info': 'Τηλ: 2101234567', 'email': 'info@clean.gr'}
            )[0],
            'ΑΣΦΑΛΕΙΑ': Supplier.objects.get_or_create(
                name='Ασφαλιστική Εταιρεία',
                defaults={'contact_info': 'Τηλ: 2101234568', 'email': 'info@insurance.gr'}
            )[0],
            'ΤΕΧΝΙΚΗ': Supplier.objects.get_or_create(
                name='Τεχνική Υπηρεσία',
                defaults={'contact_info': 'Τηλ: 2101234569', 'email': 'info@technical.gr'}
            )[0]
        }
        
        # Δαπάνες για τον Αύγουστο 2025
        expenses_data = [
            {
                'title': 'Ηλεκτρική Ενέργεια - Αύγουστος 2025',
                'amount': Decimal('850.00'),
                'date': date(2025, 8, 15),
                'category': 'electricity',
                'distribution_type': 'by_participation_mills',
                'supplier': suppliers['ΔΕΗ'],
                'notes': 'Ηλεκτρική ενέργεια για κοινοχρηστικούς χώρους'
            },
            {
                'title': 'Νερό - Αύγουστος 2025',
                'amount': Decimal('320.00'),
                'date': date(2025, 8, 10),
                'category': 'water',
                'distribution_type': 'by_participation_mills',
                'supplier': suppliers['ΕΥΔΑΠ'],
                'notes': 'Κατανάλωση νερού κτιρίου'
            },
            {
                'title': 'Καθαρισμός - Αύγουστος 2025',
                'amount': Decimal('450.00'),
                'date': date(2025, 8, 5),
                'category': 'cleaning',
                'distribution_type': 'equal_share',
                'supplier': suppliers['ΚΑΘΑΡΙΣΤΙΚΗ'],
                'notes': 'Καθαρισμός κοινοχρηστικών χώρων'
            },
            {
                'title': 'Ασφάλεια Κτιρίου - Αύγουστος 2025',
                'amount': Decimal('180.00'),
                'date': date(2025, 8, 1),
                'category': 'insurance',
                'distribution_type': 'by_participation_mills',
                'supplier': suppliers['ΑΣΦΑΛΕΙΑ'],
                'notes': 'Ασφάλεια κτιρίου και κοινοχρηστικών χώρων'
            },
            {
                'title': 'Τεχνική Συντήρηση - Αύγουστος 2025',
                'amount': Decimal('290.00'),
                'date': date(2025, 8, 20),
                'category': 'maintenance',
                'distribution_type': 'by_participation_mills',
                'supplier': suppliers['ΤΕΧΝΙΚΗ'],
                'notes': 'Συντήρηση ανελκυστήρα και συστημάτων'
            }
        ]
        
        print("📝 Δημιουργία δαπανών για τον Αύγουστο 2025...")
        
        total_amount = Decimal('0.00')
        created_expenses = []
        
        for expense_data in expenses_data:
            expense = Expense.objects.create(
                building_id=building_id,
                **expense_data
            )
            created_expenses.append(expense)
            total_amount += expense.amount
            print(f"✅ Δημιουργήθηκε: {expense.title} - {expense.amount}€")
        
        print()
        print("💰 ΣΥΝΟΛΙΚΕΣ ΔΑΠΑΝΕΣ ΑΥΓΟΥΣΤΟΥ 2025")
        print("=" * 50)
        print(f"Συνολικό ποσό: {total_amount}€")
        print(f"Αριθμός δαπανών: {len(created_expenses)}")
        print()
        
        # Ενημέρωση διαχειριστικών τελών κτιρίου
        building.management_fee_per_apartment = Decimal('15.00')
        building.reserve_contribution_per_apartment = Decimal('5.00')
        building.save()
        
        print("⚙️ ΕΝΗΜΕΡΩΣΗ ΡΥΘΜΙΣΕΩΝ ΚΤΙΡΙΟΥ")
        print("-" * 40)
        print(f"Διαχειριστικά τέλη ανά διαμέρισμα: {building.management_fee_per_apartment}€")
        print(f"Εισφορά αποθεματικού ανά διαμέρισμα: {building.reserve_contribution_per_apartment}€")
        print()
        
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΔΗΜΙΟΥΡΓΙΑ ΤΩΝ ΔΑΠΑΝΩΝ")
        print("🎯 Τώρα το frontend θα πρέπει να εμφανίζει σωστά τις δαπάνες")

if __name__ == "__main__":
    create_expenses_for_building_6()
