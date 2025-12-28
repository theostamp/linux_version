#!/usr/bin/env python3
"""
Script για έλεγχο δημιουργίας δαπάνης
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from financial.serializers import ExpenseSerializer
from buildings.models import Building
from decimal import Decimal
from datetime import date

def debug_expense_creation():
    """Έλεγχος δημιουργίας δαπάνης"""
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ ΔΗΜΙΟΥΡΓΙΑΣ ΔΑΠΑΝΗΣ")
        print("=" * 60)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Δημιουργία test data
        test_data = {
            'building': building,  # Χρησιμοποιούμε το building instance αντί για building.id
            'title': 'Test Δαπάνη',
            'amount': Decimal('50.00'),
            'date': date(2025, 7, 15),
            'category': 'cleaning',
            'distribution_type': 'by_participation_mills',
            'notes': 'Test δαπάνη για έλεγχο'
        }
        
        print("📝 TEST DATA:")
        for key, value in test_data.items():
            print(f"   • {key}: {value}")
        print()
        
        # Έλεγχος serializer validation
        print("🔍 ΕΛΕΓΧΟΣ SERIALIZER VALIDATION:")
        try:
            serializer = ExpenseSerializer(data=test_data)
            if serializer.is_valid():
                print("   ✅ Serializer validation: OK")
                print("   📊 Validated data:")
                for key, value in serializer.validated_data.items():
                    print(f"     • {key}: {value}")
            else:
                print("   ❌ Serializer validation: FAILED")
                print("   📋 Errors:")
                for field, errors in serializer.errors.items():
                    print(f"     • {field}: {errors}")
        except Exception as e:
            print(f"   ❌ Serializer error: {e}")
        
        print()
        
        # Έλεγχος model validation
        print("🔍 ΕΛΕΓΧΟΣ MODEL VALIDATION:")
        try:
            expense = Expense(**test_data)
            expense.full_clean()
            print("   ✅ Model validation: OK")
        except Exception as e:
            print(f"   ❌ Model validation error: {e}")
        
        print()
        
        # Έλεγχος save
        print("🔍 ΕΛΕΓΧΟΣ SAVE:")
        try:
            expense = Expense.objects.create(**test_data)
            print(f"   ✅ Save successful: ID {expense.id}")
            
            # Έλεγχος αν δημιουργήθηκαν συναλλαγές
            from financial.models import Transaction
            transactions = Transaction.objects.filter(
                reference_id=str(expense.id),
                reference_type='expense'
            )
            print(f"   📊 Transactions created: {transactions.count()}")
            
            # Διαγραφή test δαπάνης
            expense.delete()
            print("   🗑️ Test expense deleted")
            
        except Exception as e:
            print(f"   ❌ Save error: {e}")
            import traceback
            traceback.print_exc()
        
        print("\n" + "=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΕΛΕΓΧΟΣ")

if __name__ == "__main__":
    debug_expense_creation()
