#!/usr/bin/env python3
"""
Script για έλεγχο ότι οι χρεώσεις γίνονται την 1η του μήνα
Ελέγχει δόσεις έργων, αποθεματικό και management fees
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense
from projects.models import Project

def format_currency(amount):
    """Format currency with Greek locale"""
    return f"{amount:,.2f} €"

def check_project_installments():
    """Ελέγχει τις δόσεις έργων"""
    print("=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΔΟΣΕΣ ΕΡΓΩΝ - ΗΜΕΡΟΜΗΝΙΕΣ 1Η ΜΗΝΑ")
    print("=" * 80)
    
    with schema_context('demo'):
        # Εύρεση έργων με δόσεις
        projects_with_installments = Project.objects.filter(
            installments__gt=0
        )
        
        print(f"\n📊 Έργα με δόσεις: {projects_with_installments.count()}")
        
        for project in projects_with_installments:
            print(f"\n🏗️ Έργο: {project.title}")
            print(f"   Δόσεις: {project.installments}")
            print(f"   Ημερομηνία deadline: {project.deadline}")
            
            # Εύρεση δόσεων για αυτό το έργο
            installment_expenses = Expense.objects.filter(
                building=project.building,
                title__contains=f"{project.title} - Δόση"
            ).order_by('date')
            
            print(f"   Δόσεις στη βάση: {installment_expenses.count()}")
            
            for expense in installment_expenses:
                is_first_day = expense.date.day == 1
                status = "✅" if is_first_day else "❌"
                print(f"   {status} {expense.title}: {expense.date} (μέρα: {expense.date.day})")
                
                if not is_first_day:
                    print(f"      ⚠️  ΠΡΟΒΛΗΜΑ: Δεν είναι 1η του μήνα!")

def check_reserve_fund():
    """Ελέγχει το αποθεματικό"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ - ΗΜΕΡΟΜΗΝΙΕΣ 1Η ΜΗΝΑ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Εύρεση δαπανών αποθεματικού
        reserve_expenses = Expense.objects.filter(
            building=building,
            category='reserve_fund'
        ).order_by('date')
        
        print(f"\n📊 Δαπάνες αποθεματικού: {reserve_expenses.count()}")
        
        if reserve_expenses.count() == 0:
            print("   ℹ️  Δεν υπάρχουν δαπάνες αποθεματικού")
            return
        
        for expense in reserve_expenses:
            is_first_day = expense.date.day == 1
            status = "✅" if is_first_day else "❌"
            print(f"   {status} {expense.title}: {expense.date} (μέρα: {expense.date.day})")
            
            if not is_first_day:
                print(f"      ⚠️  ΠΡΟΒΛΗΜΑ: Δεν είναι 1η του μήνα!")

def check_management_fees():
    """Ελέγχει τις management fees"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ MANAGEMENT FEES - ΗΜΕΡΟΜΗΝΙΕΣ 1Η ΜΗΝΑ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Εύρεση management fees
        management_expenses = Expense.objects.filter(
            building=building,
            category='management_fees'
        ).order_by('date')
        
        print(f"\n📊 Management fees: {management_expenses.count()}")
        
        if management_expenses.count() == 0:
            print("   ℹ️  Δεν υπάρχουν management fees")
            return
        
        for expense in management_expenses:
            is_first_day = expense.date.day == 1
            status = "✅" if is_first_day else "❌"
            print(f"   {status} {expense.title}: {expense.date} (μέρα: {expense.date.day})")
            
            if not is_first_day:
                print(f"      ⚠️  ΠΡΟΒΛΗΜΑ: Δεν είναι 1η του μήνα!")

def check_validators():
    """Ελέγχει τους validators"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ VALIDATORS - ΗΜΕΡΟΜΗΝΙΕΣ 1Η ΜΗΝΑ")
    print("=" * 80)
    
    from financial.validators import ExpenseValidator
    
    # Test για δόση έργου
    print(f"\n🧪 Test δόσης έργου:")
    test_date_installment = date(2025, 11, 1)  # 1η του μήνα
    test_date_installment_wrong = date(2025, 11, 30)  # Τελευταία του μήνα
    
    try:
        ExpenseValidator.validate_installment_date(test_date_installment, test_date_installment)
        print(f"   ✅ Validator δόσης: 1η του μήνα - ΕΠΙΤΡΕΠΕΤΑΙ")
    except Exception as e:
        print(f"   ❌ Validator δόσης: 1η του μήνα - ΣΦΑΛΜΑ: {e}")
    
    try:
        ExpenseValidator.validate_installment_date(test_date_installment_wrong, test_date_installment_wrong)
        print(f"   ❌ Validator δόσης: τελευταία του μήνα - ΕΠΙΤΡΕΠΕΤΑΙ (ΠΡΟΒΛΗΜΑ!)")
    except Exception as e:
        print(f"   ✅ Validator δόσης: τελευταία του μήνα - ΑΠΑΓΟΡΕΥΕΤΑΙ (ΣΩΣΤΟ!)")
    
    # Test για management fee
    print(f"\n🧪 Test management fee:")
    test_date_mgmt = date(2025, 11, 1)  # 1η του μήνα
    test_date_mgmt_wrong = date(2025, 11, 30)  # Τελευταία του μήνα
    
    try:
        ExpenseValidator.validate_management_fee_date(test_date_mgmt, 'management_fees', 'equal_share')
        print(f"   ✅ Validator management: 1η του μήνα - ΕΠΙΤΡΕΠΕΤΑΙ")
    except Exception as e:
        print(f"   ❌ Validator management: 1η του μήνα - ΣΦΑΛΜΑ: {e}")
    
    try:
        ExpenseValidator.validate_management_fee_date(test_date_mgmt_wrong, 'management_fees', 'equal_share')
        print(f"   ❌ Validator management: τελευταία του μήνα - ΕΠΙΤΡΕΠΕΤΑΙ (ΠΡΟΒΛΗΜΑ!)")
    except Exception as e:
        print(f"   ✅ Validator management: τελευταία του μήνα - ΑΠΑΓΟΡΕΥΕΤΑΙ (ΣΩΣΤΟ!)")

def main():
    """Κύρια λειτουργία"""
    print("🚀 ΕΛΕΓΧΟΣ ΧΡΕΩΣΕΩΝ 1Η ΜΗΝΑ")
    print("=" * 80)
    
    try:
        # Έλεγχος δόσεων έργων
        check_project_installments()
        
        # Έλεγχος αποθεματικού
        check_reserve_fund()
        
        # Έλεγχος management fees
        check_management_fees()
        
        # Έλεγχος validators
        check_validators()
        
        print(f"\n✅ ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ")
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
