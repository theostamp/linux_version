#!/usr/bin/env python3

import os
import sys
import django
from datetime import date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def create_july_2025_expenses():
    """Create July 2025 expenses to test the payment cycle properly"""
    
    with schema_context('demo'):
        from apartments.models import Building
        from financial.models import Expense, Supplier
        
        print("🏗️ Δημιουργία Δαπανών Ιουλίου 2025")
        print("=" * 50)
        
        # Get building 1 (should be Αραχώβης based on previous tests)
        try:
            building = Building.objects.get(id=1)
            print(f"🏢 Κτίριο: {building.address}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο με ID 1")
            return
        
        # Check if July 2025 expenses already exist
        existing_expenses = Expense.objects.filter(
            building=building,
            date__month=7,
            date__year=2025
        )
        
        if existing_expenses.exists():
            print(f"⚠️ Υπάρχουν ήδη {existing_expenses.count()} δαπάνες Ιουλίου 2025")
            for expense in existing_expenses:
                print(f"   - {expense.title}: {expense.amount}€")
            
            response = input("\nΘέλετε να διαγράψετε τις υπάρχουσες δαπάνες; (y/N): ")
            if response.lower() == 'y':
                existing_expenses.delete()
                print("✅ Διαγράφηκαν οι υπάρχουσες δαπάνες")
            else:
                print("❌ Ακύρωση - διατήρηση υπαρχουσών δαπανών")
                return
        
        print("\n📋 Δημιουργία νέων δαπανών Ιουλίου 2025:")
        print("-" * 40)
        
        # Create or get suppliers
        suppliers = {}
        supplier_names = ['ΔΕΗ', 'ΕΥΔΑΠ', 'CleanCorp', 'Διαχειριστής', 'Αποθεματικό Ταμείο']
        
        # Map supplier names to categories
        supplier_categories = {
            'ΔΕΗ': 'electricity',
            'ΕΥΔΑΠ': 'water', 
            'CleanCorp': 'cleaning',
            'Διαχειριστής': 'administrative',
            'Αποθεματικό Ταμείο': 'administrative'
        }
        
        for supplier_name in supplier_names:
            supplier, created = Supplier.objects.get_or_create(
                building=building,
                name=supplier_name,
                defaults={
                    'category': supplier_categories.get(supplier_name, 'other'),
                    'contact_person': f'Επαφή: {supplier_name}',
                    'status': 'active'
                }
            )
            suppliers[supplier_name] = supplier
            if created:
                print(f"✅ Δημιουργήθηκε προμηθευτής: {supplier_name}")

        # July 2025 expenses
        july_expenses = [
            {
                'title': 'Ρεύμα Ιουλίου 2025',
                'amount': Decimal('85.50'),
                'category': 'utilities',
                'supplier': suppliers['ΔΕΗ'],
                'description': 'Λογαριασμός ρεύματος κοινόχρηστων χώρων Ιουλίου 2025',
                'distribution_type': 'by_participation_mills'
            },
            {
                'title': 'Νερό Ιουλίου 2025',
                'amount': Decimal('45.30'),
                'category': 'utilities',
                'supplier': suppliers['ΕΥΔΑΠ'],
                'description': 'Λογαριασμός νερού κοινόχρηστων χώρων Ιουλίου 2025',
                'distribution_type': 'by_participation_mills'
            },
            {
                'title': 'Καθαρισμός κλιμακοστασίου Ιουλίου',
                'amount': Decimal('120.00'),
                'category': 'maintenance',
                'supplier': suppliers['CleanCorp'],
                'description': 'Μηνιαίος καθαρισμός κοινόχρηστων χώρων',
                'distribution_type': 'equal_share'
            },
            {
                'title': 'Αμοιβή διαχείρισης Ιουλίου 2025',
                'amount': Decimal('120.00'),
                'category': 'management',
                'supplier': suppliers['Διαχειριστής'],
                'description': 'Μηνιαία αμοιβή διαχείρισης (10 × 12€)',
                'distribution_type': 'equal_share'
            },
            {
                'title': 'Εισφορά αποθεματικού Ιουλίου 2025',
                'amount': Decimal('100.00'),
                'category': 'reserve_fund',
                'supplier': suppliers['Αποθεματικό Ταμείο'],
                'description': 'Μηνιαία εισφορά αποθεματικού (10 × 10€)',
                'distribution_type': 'equal_share'
            }
        ]
        
        created_expenses = []
        total_amount = Decimal('0.00')
        
        for expense_data in july_expenses:
            expense = Expense.objects.create(
                building=building,
                title=expense_data['title'],
                amount=expense_data['amount'],
                category=expense_data['category'],
                supplier=expense_data['supplier'],
                distribution_type=expense_data['distribution_type'],
                date=date(2025, 7, 15),  # Mid-July date
                notes=expense_data['description']
            )
            
            created_expenses.append(expense)
            total_amount += expense.amount
            
            print(f"✅ {expense.title}: {expense.amount}€")
            print(f"   Κατηγορία: {expense.get_category_display()}")
            print(f"   Κατανομή: {expense.get_distribution_type_display()}")
        
        print()
        print("📊 ΣΥΓΚΕΝΤΡΩΤΙΚΑ:")
        print("-" * 20)
        print(f"✅ Δημιουργήθηκαν: {len(created_expenses)} δαπάνες")
        print(f"💰 Συνολικό ποσό: {total_amount}€")
        
        print()
        print("📋 ΑΝΑΛΥΣΗ ΚΑΤΑΝΟΜΗΣ:")
        print("-" * 25)
        
        # Calculate distribution per apartment (simplified)
        apartments_count = 10  # Based on previous analysis
        
        equal_share_total = sum(e.amount for e in created_expenses if e.distribution_type == 'equal_share')
        mills_share_total = sum(e.amount for e in created_expenses if e.distribution_type == 'by_participation_mills')
        
        equal_share_per_apartment = equal_share_total / apartments_count
        # For mills, assuming equal distribution for simplicity (100 mills each)
        mills_share_per_apartment = mills_share_total / apartments_count
        
        total_per_apartment = equal_share_per_apartment + mills_share_per_apartment
        
        print(f"🏠 Ίσα μερίδια: {equal_share_total}€ → {equal_share_per_apartment}€/διαμέρισμα")
        print(f"📊 Κατά χιλιοστά: {mills_share_total}€ → {mills_share_per_apartment}€/διαμέρισμα")
        print(f"💸 Σύνολο ανά διαμέρισμα: ~{total_per_apartment}€")
        
        print()
        print("🎯 ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ:")
        print("-" * 20)
        print("1. Έκδοση κοινοχρήστων Ιουλίου τον Αύγουστο")
        print("2. Σύγκριση πληρωμών Αυγούστου με υποχρεώσεις Ιουλίου")
        print("3. Έλεγχος σωστότητας υπολογισμών υπολοίπων")
        
        return created_expenses

if __name__ == "__main__":
    create_july_2025_expenses()
