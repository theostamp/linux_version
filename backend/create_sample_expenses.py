#!/usr/bin/env python
import os
import django
import sys
from datetime import date, timedelta
from decimal import Decimal
import random

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, ExpenseApartment, Supplier
from django_tenants.utils import tenant_context
from tenants.models import Client

User = get_user_model()

def create_sample_expenses(tenant_schema):
    """Δημιουργεί sample δαπάνες για το συγκεκριμένο tenant"""
    
    # Βρίσκω το tenant object
    try:
        tenant = Client.objects.get(schema_name=tenant_schema)
    except Client.DoesNotExist:
        print(f"❌ Το tenant '{tenant_schema}' δεν βρέθηκε!")
        return
    
    with tenant_context(tenant):
        print(f"🎯 Δημιουργία sample δαπανών για tenant: {tenant_schema}")
        
        # Βρίσκω τα κτίρια
        buildings = Building.objects.all()
        if not buildings.exists():
            print("❌ Δεν βρέθηκαν κτίρια! Δημιούργησε πρώτα κτίρια με το create_sample_data.py")
            return
        
        # Sample δαπάνες για κάθε κτίριο
        sample_expenses = [
            # Πάγιες μηνιαίες δαπάνες
            {
                'title': 'Καθαρισμός Κοινοχρήστων Χώρων - Ιανουάριος 2024',
                'amount': 450.00,
                'category': 'cleaning',
                'distribution_type': 'by_participation_mills',
                'notes': 'Μηνιαίος καθαρισμός κοινοχρήστων χώρων, ασανσέρ, κλιμακοστάσια'
            },
            {
                'title': 'ΔΕΗ Κοινοχρήστων - Ιανουάριος 2024',
                'amount': 320.50,
                'category': 'electricity_common',
                'distribution_type': 'by_participation_mills',
                'notes': 'Ηλεκτρικό ρεύμα για κοινοχρήστους χώρους και ασανσέρ'
            },
            {
                'title': 'Νερό Κοινοχρήστων - Ιανουάριος 2024',
                'amount': 180.00,
                'category': 'water_common',
                'distribution_type': 'by_participation_mills',
                'notes': 'Νερό για καθαρισμό και άρδευση κήπου'
            },
            {
                'title': 'Συλλογή Απορριμμάτων - Ιανουάριος 2024',
                'amount': 95.00,
                'category': 'garbage_collection',
                'distribution_type': 'equal_share',
                'notes': 'Μηνιαία χρέωση συλλογής απορριμμάτων'
            },
            
            # Δαπάνες ανελκυστήρα
            {
                'title': 'Ετήσια Συντήρηση Ανελκυστήρα 2024',
                'amount': 1200.00,
                'category': 'elevator_maintenance',
                'distribution_type': 'by_participation_mills',
                'notes': 'Ετήσια συντήρηση και έλεγχος ασφαλείας ανελκυστήρα'
            },
            {
                'title': 'Επισκευή Ανελκυστήρα - Αντικατάσταση Κουμπιών',
                'amount': 350.00,
                'category': 'elevator_repair',
                'distribution_type': 'by_participation_mills',
                'notes': 'Αντικατάσταση κατεστραμμένων κουμπιών ανελκυστήρα'
            },
            
            # Δαπάνες θέρμανσης
            {
                'title': 'Πετρέλαιο Θέρμανσης - Ιανουάριος 2024',
                'amount': 2800.00,
                'category': 'heating_fuel',
                'distribution_type': 'by_meters',
                'notes': 'Πετρέλαιο για κεντρική θέρμανση'
            },
            {
                'title': 'Συντήρηση Καυστήρα Θέρμανσης',
                'amount': 180.00,
                'category': 'heating_maintenance',
                'distribution_type': 'by_participation_mills',
                'notes': 'Ετήσια συντήρηση καυστήρα'
            },
            
            # Δαπάνες ηλεκτρικών
            {
                'title': 'Αντικατάσταση Φωτιστικών Κοινοχρήστων',
                'amount': 420.00,
                'category': 'lighting_common',
                'distribution_type': 'by_participation_mills',
                'notes': 'Αντικατάσταση παλαιών φωτιστικών με LED'
            },
            {
                'title': 'Επισκευή Ηλεκτρικών - Κλιμακοστάσιο',
                'amount': 280.00,
                'category': 'electrical_repair',
                'distribution_type': 'by_participation_mills',
                'notes': 'Επισκευή ηλεκτρικών στο κλιμακοστάσιο'
            },
            
            # Δαπάνες υδραυλικών
            {
                'title': 'Καθαρισμός Δεξαμενής Νερού',
                'amount': 150.00,
                'category': 'water_tank_cleaning',
                'distribution_type': 'by_participation_mills',
                'notes': 'Ετήσιος καθαρισμός δεξαμενής νερού'
            },
            {
                'title': 'Επισκευή Σωλήνα Αποχέτευσης',
                'amount': 320.00,
                'category': 'plumbing_repair',
                'distribution_type': 'specific_apartments',
                'notes': 'Επισκευή σωλήνα αποχέτευσης στο ισόγειο'
            },
            
            # Δαπάνες κτιρίου
            {
                'title': 'Ασφάλεια Κτιρίου 2024',
                'amount': 850.00,
                'category': 'building_insurance',
                'distribution_type': 'by_participation_mills',
                'notes': 'Ετήσια ασφάλεια κτιρίου'
            },
            {
                'title': 'Βαψίματα Εξωτερικών',
                'amount': 2500.00,
                'category': 'painting_exterior',
                'distribution_type': 'by_participation_mills',
                'notes': 'Βαψίματα πρόσοψης και εξωτερικών χώρων'
            },
            {
                'title': 'Συντήρηση Κήπου - Ιανουάριος 2024',
                'amount': 120.00,
                'category': 'garden_maintenance',
                'distribution_type': 'by_participation_mills',
                'notes': 'Μηνιαία συντήρηση κήπου και φύτευση'
            },
            
            # Έκτακτες δαπάνες
            {
                'title': 'Έκτακτη Επισκευή - Σπασμένο Παράθυρο',
                'amount': 180.00,
                'category': 'emergency_repair',
                'distribution_type': 'specific_apartments',
                'notes': 'Αντικατάσταση σπασμένου παραθύρου από βανδαλισμό'
            },
            {
                'title': 'Κλειδαράς - Αντικατάσταση Κλειδαριάς Εισόδου',
                'amount': 95.00,
                'category': 'locksmith',
                'distribution_type': 'by_participation_mills',
                'notes': 'Αντικατάσταση κλειδαριάς κεντρικής εισόδου'
            },
            
            # Δαπάνες ασφάλειας
            {
                'title': 'Σύστημα Πυρασφάλειας - Ετήσιος Έλεγχος',
                'amount': 220.00,
                'category': 'fire_alarm',
                'distribution_type': 'by_participation_mills',
                'notes': 'Ετήσιος έλεγχος και συντήρηση συστήματος πυρασφάλειας'
            },
            {
                'title': 'Αντικατάσταση Πυροσβεστήρων',
                'amount': 180.00,
                'category': 'fire_extinguishers',
                'distribution_type': 'by_participation_mills',
                'notes': 'Αντικατάσταση παλαιών πυροσβεστήρων'
            },
            
            # Διοικητικές δαπάνες
            {
                'title': 'Λογιστικά Έξοδα 2024',
                'amount': 600.00,
                'category': 'accounting_fees',
                'distribution_type': 'by_participation_mills',
                'notes': 'Ετήσια λογιστική υποστήριξη'
            },
            {
                'title': 'Διοικητικά Έξοδα - Ιανουάριος 2024',
                'amount': 150.00,
                'category': 'management_fees',
                'distribution_type': 'by_participation_mills',
                'notes': 'Μηνιαία διοικητικά έξοδα'
            },
            
            # Διάφορες δαπάνες
            {
                'title': 'Έκτακτη Εισφορά - Ανακαίνιση Κλιμακοστασίου',
                'amount': 1500.00,
                'category': 'special_contribution',
                'distribution_type': 'by_participation_mills',
                'notes': 'Έκτακτη εισφορά για ανακαίνιση κλιμακοστασίου'
            },
            {
                'title': 'Αποθεματικό Ταμείο - Ιανουάριος 2024',
                'amount': 800.00,
                'category': 'reserve_fund',
                'distribution_type': 'by_participation_mills',
                'notes': 'Μηνιαία εισφορά στο αποθεματικό ταμείο'
            }
        ]
        
        # Δημιουργία δαπανών για κάθε κτίριο
        for building in buildings:
            print(f"\n🏢 Δημιουργία δαπανών για κτίριο: {building.name}")
            
            # Βρίσκω τους προμηθευτές του κτιρίου
            suppliers = Supplier.objects.filter(building=building, is_active=True)
            
            # Ημερομηνίες για τις δαπάνες (τελευταίους 6 μήνες)
            base_date = date.today()
            dates = [
                base_date - timedelta(days=30*i) for i in range(6)
            ]
            
            for i, expense_data in enumerate(sample_expenses):
                # Επιλογή τυχαίας ημερομηνίας
                expense_date = random.choice(dates)
                
                # Μικρή παραλλαγή στο ποσό (±10%)
                amount_variation = random.uniform(0.9, 1.1)
                adjusted_amount = Decimal(str(expense_data['amount'] * amount_variation)).quantize(Decimal('0.01'))
                
                # Εύρεση κατάλληλου προμηθευτή βάσει κατηγορίας
                supplier = None
                if suppliers.exists():
                    # Αντιστοίχιση κατηγοριών δαπανών με κατηγοριές προμηθευτών
                    category_mapping = {
                        'electricity_common': 'electricity',
                        'water_common': 'water',
                        'cleaning': 'cleaning',
                        'elevator_maintenance': 'elevator',
                        'elevator_repair': 'elevator',
                        'elevator_inspection': 'elevator',
                        'elevator_modernization': 'elevator',
                        'heating_fuel': 'heating',
                        'heating_maintenance': 'heating',
                        'heating_repair': 'heating',
                        'building_insurance': 'insurance',
                        'fire_alarm': 'insurance',
                        'fire_extinguishers': 'insurance',
                        'accounting_fees': 'administrative',
                        'management_fees': 'administrative',
                        'legal_fees': 'administrative',
                        'emergency_repair': 'repairs',
                        'electrical_repair': 'repairs',
                        'plumbing_repair': 'repairs',
                        'locksmith': 'repairs',
                        'glass_repair': 'repairs',
                        'door_repair': 'repairs',
                        'window_repair': 'repairs',
                    }
                    
                    supplier_category = category_mapping.get(expense_data['category'])
                    if supplier_category:
                        matching_suppliers = suppliers.filter(category=supplier_category)
                        if matching_suppliers.exists():
                            supplier = random.choice(matching_suppliers)
                
                # Δημιουργία δαπάνης
                expense = Expense.objects.create(
                    building=building,
                    title=expense_data['title'],
                    amount=adjusted_amount,
                    date=expense_date,
                    category=expense_data['category'],
                    distribution_type=expense_data['distribution_type'],
                    supplier=supplier,
                    notes=expense_data['notes'],
                    is_issued=random.choice([True, False])  # Τυχαία εκδοθείσα ή όχι
                )
                
                supplier_info = f" (Προμηθευτής: {expense.supplier.name})" if expense.supplier else ""
                print(f"  ✅ {expense.title} - €{expense.amount}{supplier_info}")
                
                # Αν η κατανομή είναι για συγκεκριμένα διαμερίσματα, δημιούργησε τις σχέσεις
                if expense.distribution_type == 'specific_apartments':
                    apartments = Apartment.objects.filter(building=building)[:3]  # Πρώτα 3 διαμερίσματα
                    for apartment in apartments:
                        ExpenseApartment.objects.create(
                            expense=expense,
                            apartment=apartment
                        )
        
        print(f"\n🎉 Ολοκληρώθηκε η δημιουργία sample δαπανών για tenant: {tenant_schema}")
        print(f"📊 Συνολικά δημιουργήθηκαν {Expense.objects.count()} δαπάνες")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Χρήση: python create_sample_expenses.py <tenant_schema>")
        print("Παράδειγμα: python create_sample_expenses.py athinon12")
        sys.exit(1)
    
    tenant_schema = sys.argv[1]
    create_sample_expenses(tenant_schema) 