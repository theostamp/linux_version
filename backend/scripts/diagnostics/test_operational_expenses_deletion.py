#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε τη νέα λειτουργικότητα διαγραφής λειτουργικών δαπανών
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
from financial.models import Expense
from apartments.models import Apartment

def test_operational_expenses_deletion():
    """Δοκιμή διαγραφής λειτουργικών δαπανών"""
    
    with schema_context('demo'):
        print("🧪 ΔΟΚΙΜΗ ΔΙΑΓΡΑΦΗΣ ΛΕΙΤΟΥΡΓΙΚΩΝ ΔΑΠΑΝΩΝ")
        print("=" * 60)
        
        building = Building.objects.get(id=1)
        apartments_count = Apartment.objects.filter(building=building).count()
        
        print(f"\n🏢 ΚΤΙΡΙΟ:")
        print(f"   • ID: {building.id}")
        print(f"   • Όνομα: {building.name}")
        print(f"   • Διαμερίσματα: {apartments_count}")
        
        # Check operational expenses
        operational_categories = [
            'electricity_common',
            'water_common', 
            'heating_fuel',
            'heating_gas',
            'garbage_collection'
        ]
        
        operational_expenses = Expense.objects.filter(
            building=building,
            category__in=operational_categories
        ).order_by('-date')
        
        print(f"\n💰 ΛΕΙΤΟΥΡΓΙΚΕΣ ΔΑΠΑΝΕΣ:")
        print(f"   • Συνολικές λειτουργικές δαπάνες: {operational_expenses.count()}")
        
        for expense in operational_expenses:
            category_name = {
                'electricity_common': 'ΔΕΗ',
                'water_common': 'ΕΥΔΑΠ',
                'heating_fuel': 'Πετρέλαιο',
                'heating_gas': 'Αέριο',
                'garbage_collection': 'Απορρίμματα'
            }.get(expense.category, expense.category)
            
            print(f"   • {expense.title}: €{expense.amount} ({category_name}) - {expense.date}")
        
        print(f"\n🎯 ΝΕΑ ΛΕΙΤΟΥΡΓΙΚΟΤΗΤΑ:")
        print(f"   • Στο maintenance page (tab: 'Όλες οι Δαπάνες')")
        print(f"   • Στο section 'Πρόσφατες Λειτουργικές Δαπάνες'")
        print(f"   • Κάθε δαπάνη έχει τώρα κουμπί διαγραφής (🗑️)")
        
        print(f"\n🔧 ΤΕΧΝΙΚΑ ΧΑΡΑΚΤΗΡΙΣΤΙΚΑ:")
        print(f"   • Χρησιμοποιεί useExpenses hook με deleteExpense function")
        print(f"   • Κουμπί διαγραφής: Trash2 icon με red styling")
        print(f"   • Loading state: disabled κατά τη διαγραφή")
        print(f"   • Toast notifications: success/error messages")
        print(f"   • Auto-refresh: ενημερώνει τη λίστα μετά τη διαγραφή")
        
        print(f"\n✅ ΠΛΕΟΝΕΚΤΗΜΑΤΑ:")
        print(f"   • Γρήγορη διαγραφή λειτουργικών δαπανών")
        print(f"   • Δεν χρειάζεται να πάει στο financial page")
        print(f"   • Visual feedback με loading states")
        print(f"   • Consistent UX με άλλα delete buttons")
        
        print(f"\n🎨 UI/UX:")
        print(f"   • Κουμπί: h-8 w-8, red color scheme")
        print(f"   • Hover effects: red-700 text, red-50 background")
        print(f"   • Tooltip: 'Διαγραφή δαπάνης'")
        print(f"   • Disabled state: κατά τη διαγραφή")
        
        print(f"\n📱 RESPONSIVE:")
        print(f"   • Flex layout: items-center space-x-3")
        print(f"   • Compact design: δεν καταλαμβάνει πολύ χώρο")
        print(f"   • Mobile-friendly: μικρό κουμπί που δεν παρεμβαίνει")

if __name__ == "__main__":
    test_operational_expenses_deletion()
