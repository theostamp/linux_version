#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε τη νέα λειτουργικότητα του Service Deletion Dialog
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from maintenance.models import ScheduledMaintenance
from financial.models import Expense
from apartments.models import Apartment

def test_service_deletion_scenario():
    """Δοκιμή σενάριου διαγραφής υπηρεσιών"""
    
    with schema_context('demo'):
        print("🧪 ΔΟΚΙΜΗ SERVICE DELETION DIALOG")
        print("=" * 60)
        
        building = Building.objects.get(id=1)
        apartments_count = Apartment.objects.filter(building=building).count()
        
        print(f"\n🏢 ΚΤΙΡΙΟ:")
        print(f"   • ID: {building.id}")
        print(f"   • Όνομα: {building.name}")
        print(f"   • Διαμερίσματα: {apartments_count}")
        
        # Check existing scheduled maintenance
        scheduled_maintenances = ScheduledMaintenance.objects.filter(building=building)
        print(f"\n📋 SCHEDULED MAINTENANCE:")
        print(f"   • Αριθμός έργων: {scheduled_maintenances.count()}")
        
        for maintenance in scheduled_maintenances:
            print(f"   • {maintenance.title} (€{maintenance.estimated_cost})")
        
        # Check related expenses
        all_expenses = Expense.objects.filter(building=building)
        print(f"\n💰 EXPENSES:")
        print(f"   • Συνολικές δαπάνες: {all_expenses.count()}")
        
        # Find expenses that might be related to maintenance
        maintenance_related_expenses = []
        for expense in all_expenses:
            expense_title = (expense.title or '').lower()
            if any(keyword in expense_title for keyword in ['υπηρεσία', 'συντήρηση', 'έργο', 'δόση', 'προκαταβολή']):
                maintenance_related_expenses.append(expense)
        
        print(f"   • Σχετικές με συντήρηση: {len(maintenance_related_expenses)}")
        
        for expense in maintenance_related_expenses:
            print(f"     - {expense.title}: €{expense.amount}")
        
        print(f"\n🎯 ΣΕΝΑΡΙΟ ΔΙΑΓΡΑΦΗΣ:")
        print(f"   • Όταν ο χρήστης πατήσει 'Διαγραφή' σε ένα έργο:")
        print(f"   • Θα εμφανιστεί το νέο ServiceDeletionConfirmDialog")
        print(f"   • Θα δείξει:")
        print(f"     - Τίτλο του έργου")
        print(f"     - Προειδοποίηση για 'μη διανεμημένα ποσά'")
        print(f"     - Αριθμό σχετικών δαπανών")
        print(f"     - Συνολικό ποσό")
        print(f"   • Μετά την επιβεβαίωση:")
        print(f"     - Διαγράφονται οι σχετικές δαπάνες")
        print(f"     - Διαγράφεται το έργο")
        print(f"     - Εμφανίζεται λεπτομερές success message")
        
        print(f"\n✅ ΠΛΕΟΝΕΚΤΗΜΑΤΑ:")
        print(f"   • Ο χρήστης γνωρίζει την επίδραση πριν τη διαγραφή")
        print(f"   • Προειδοποιείται για πιθανά 'ορφανά ποσά'")
        print(f"   • Δείχνει ακριβώς τι θα διαγραφεί")
        print(f"   • Είναι πιο ασφαλές από απλή ειδοποίηση")
        
        print(f"\n🔧 ΤΕΧΝΙΚΑ ΧΑΡΑΚΤΗΡΙΣΤΙΚΑ:")
        print(f"   • Custom React component: ServiceDeletionConfirmDialog")
        print(f"   • Χρησιμοποιεί Lucide icons (AlertTriangle, Trash2, Euro, etc.)")
        print(f"   • Color-coded sections (red για προειδοποίηση, orange για επίδραση)")
        print(f"   • Responsive design με Tailwind CSS")
        print(f"   • Enhanced error handling και success messages")

if __name__ == "__main__":
    test_service_deletion_scenario()
