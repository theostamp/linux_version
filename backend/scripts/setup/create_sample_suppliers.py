#!/usr/bin/env python
import os
import django
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model
from buildings.models import Building
from financial.models import Supplier
from django_tenants.utils import tenant_context
from tenants.models import Client

User = get_user_model()

def create_sample_suppliers(tenant_schema):
    """Δημιουργεί sample προμηθευτές για το συγκεκριμένο tenant"""
    
    # Βρίσκω το tenant object
    try:
        tenant = Client.objects.get(schema_name=tenant_schema)
    except Client.DoesNotExist:
        print(f"❌ Το tenant '{tenant_schema}' δεν βρέθηκε!")
        return
    
    with tenant_context(tenant):
        print(f"🎯 Δημιουργία sample προμηθευτών για tenant: {tenant_schema}")
        
        # Βρίσκω τα κτίρια
        buildings = Building.objects.all()
        if not buildings.exists():
            print("❌ Δεν βρέθηκαν κτίρια! Δημιούργησε πρώτα κτίρια με το create_sample_data.py")
            return
        
        # Sample προμηθευτές για κάθε κτίριο
        sample_suppliers = [
            # ΔΕΗ
            {
                'name': 'ΔΕΗ Α.Ε.',
                'category': 'electricity',
                'account_number': '123456789',
                'phone': '2101234567',
                'email': 'info@dei.gr',
                'address': 'Χατζηγιάννη Μέξη 42, Αθήνα 104 34',
                'vat_number': '094180600',
                'contract_number': 'DEI-2024-001',
                'notes': 'Κύριος προμηθευτής ηλεκτρικού ρεύματος'
            },
            # ΕΥΔΑΠ
            {
                'name': 'ΕΥΔΑΠ Α.Ε.',
                'category': 'water',
                'account_number': '987654321',
                'phone': '2109876543',
                'email': 'info@eydap.gr',
                'address': 'Μαραθώνος 150, Αθήνα 104 42',
                'vat_number': '094180601',
                'contract_number': 'EYDAP-2024-001',
                'notes': 'Κύριος προμηθευτής νερού'
            },
            # Καθαρισμός
            {
                'name': 'Καθαρό Κτίριο Α.Ε.',
                'category': 'cleaning',
                'account_number': 'CLEAN001',
                'phone': '2105551234',
                'email': 'info@katharo-ktirio.gr',
                'address': 'Λεωφ. Συγγρού 150, Αθήνα 117 41',
                'vat_number': '123456789',
                'contract_number': 'CLEAN-2024-001',
                'notes': 'Εταιρεία καθαρισμού κοινοχρήστων χώρων'
            },
            # Ανελκυστήρας
            {
                'name': 'Ανελκυστήρες Αθηνών Α.Ε.',
                'category': 'elevator',
                'account_number': 'ELEV001',
                'phone': '2105555678',
                'email': 'info@anelekstires-athinas.gr',
                'address': 'Λεωφ. Κηφισίας 100, Αθήνα 115 26',
                'vat_number': '987654321',
                'contract_number': 'ELEV-2024-001',
                'notes': 'Συντήρηση και επισκευές ανελκυστήρα'
            },
            # Θέρμανση
            {
                'name': 'Θερμική Ενέργεια Α.Ε.',
                'category': 'heating',
                'account_number': 'HEAT001',
                'phone': '2105559012',
                'email': 'info@thermiki-energeia.gr',
                'address': 'Λεωφ. Μεσογείων 200, Αθήνα 115 26',
                'vat_number': '456789123',
                'contract_number': 'HEAT-2024-001',
                'notes': 'Προμήθεια πετρελαίου θέρμανσης'
            },
            # Ασφάλεια
            {
                'name': 'Ασφαλιστική Εταιρεία Α.Ε.',
                'category': 'insurance',
                'account_number': 'INS001',
                'phone': '2105553456',
                'email': 'info@asfalistiki.gr',
                'address': 'Λεωφ. Βασιλίσσης Σοφίας 50, Αθήνα 115 28',
                'vat_number': '789123456',
                'contract_number': 'INS-2024-001',
                'notes': 'Ασφάλεια κτιρίου και ανελκυστήρα'
            },
            # Διοικητικά
            {
                'name': 'Δικηγορικό Γραφείο Παπαδόπουλου',
                'category': 'administrative',
                'account_number': 'ADMIN001',
                'phone': '2105557890',
                'email': 'info@papadopoulos-law.gr',
                'address': 'Σόλωνος 20, Αθήνα 106 82',
                'vat_number': '321654987',
                'contract_number': 'ADMIN-2024-001',
                'notes': 'Νομικές υπηρεσίες και συμβουλές'
            },
            # Επισκευές
            {
                'name': 'Τεχνικές Επισκευές Α.Ε.',
                'category': 'repairs',
                'account_number': 'REPAIR001',
                'phone': '2105552345',
                'email': 'info@technikes-episkeves.gr',
                'address': 'Λεωφ. Αλεξάνδρας 80, Αθήνα 115 28',
                'vat_number': '654321987',
                'contract_number': 'REPAIR-2024-001',
                'notes': 'Γενικές επισκευές και συντήρηση'
            }
        ]
        
        created_suppliers = []
        
        # Δημιουργία προμηθευτών για κάθε κτίριο
        for building in buildings:
            print(f"\n🏢 Δημιουργία προμηθευτών για κτίριο: {building.name}")
            
            for supplier_data in sample_suppliers:
                # Προσθήκη μικρών παραλλαγών για κάθε κτίριο
                supplier_data_copy = supplier_data.copy()
                supplier_data_copy['name'] = f"{supplier_data['name']} - {building.name}"
                supplier_data_copy['account_number'] = f"{supplier_data['account_number']}-{building.id}"
                supplier_data_copy['contract_number'] = f"{supplier_data['contract_number']}-{building.id}"
                
                supplier, created = Supplier.objects.get_or_create(
                    building=building,
                    name=supplier_data_copy['name'],
                    category=supplier_data_copy['category'],
                    defaults=supplier_data_copy
                )
                
                if created:
                    print(f"✅ Δημιουργήθηκε προμηθευτής: {supplier.name} ({supplier.get_category_display()})")
                    created_suppliers.append(supplier)
                else:
                    print(f"ℹ️ Υπάρχει ήδη προμηθευτής: {supplier.name}")
        
        print("\n📊 Σύνοψη:")
        print(f"   🏢 Κτίρια: {buildings.count()}")
        print(f"   👥 Προμηθευτές ανά κτίριο: {len(sample_suppliers)}")
        print(f"   📋 Συνολικοί προμηθευτές: {len(created_suppliers)}")
        
        # Εμφάνιση στατιστικών ανά κατηγορία
        print("\n📈 Προμηθευτές ανά κατηγορία:")
        for category_choice in Supplier.SUPPLIER_CATEGORIES:
            count = Supplier.objects.filter(category=category_choice[0]).count()
            print(f"   {category_choice[1]}: {count}")
        
        return created_suppliers

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("❌ Χρήση: python create_sample_suppliers.py <tenant_schema>")
        print("   Παράδειγμα: python create_sample_suppliers.py demo")
        sys.exit(1)
    
    tenant_schema = sys.argv[1]
    create_sample_suppliers(tenant_schema) 