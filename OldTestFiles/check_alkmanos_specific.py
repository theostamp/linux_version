#!/usr/bin/env python3
"""
Script για έλεγχο αθροισμάτων στο κτίριο Αλκμάνος 22, Αθήνα 115 28
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from tenants.models import Client
from django_tenants.utils import tenant_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense
from financial.services import AdvancedCommonExpenseCalculator

def check_alkmanos_building():
    """Ελέγχει το κτίριο Αλκμάνος 22, Αθήνα 115 28"""
    try:
        # Βρίσκουμε το demo client
        client = Client.objects.get(schema_name='demo')
        print(f"✅ Βρέθηκε demo client: {client.name}")
        
        with tenant_context(client):
            # Βρίσκουμε το συγκεκριμένο κτίριο
            building = Building.objects.get(address__icontains='Αλκμάνος 22, Αθήνα 115 28')
            print(f"✅ Βρέθηκε κτίριο: {building.name} - {building.address}")
            
            building_id = building.id
            print(f"   Building ID: {building_id}")
            
            # Ελέγχουμε τα δεδομένα των διαμερισμάτων
            check_apartments_data(building_id)
            
            # Ελέγχουμε τις δαπάνες
            check_expenses(building_id)
            
            # Ελέγχουμε τα αποτελέσματα του calculator
            check_calculator_results(building_id)
            
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

def check_apartments_data(building_id):
    """Ελέγχει τα δεδομένα των διαμερισμάτων"""
    print(f"\n🏠 ΕΛΕΓΧΟΣ ΔΕΔΟΜΕΝΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
    print("=" * 60)
    
    apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
    
    print(f"📋 Βρέθηκαν {apartments.count()} διαμερίσματα:")
    print("-" * 60)
    
    total_mills = Decimal('0.00')
    total_heating_mills = Decimal('0.00')
    total_elevator_mills = Decimal('0.00')
    total_balance = Decimal('0.00')
    
    for apartment in apartments:
        mills = apartment.participation_mills or 0
        heating_mills = apartment.heating_mills or 0
        elevator_mills = apartment.elevator_mills or 0
        balance = apartment.current_balance or Decimal('0.00')
        
        total_mills += mills
        total_heating_mills += heating_mills
        total_elevator_mills += elevator_mills
        total_balance += balance
        
        print(f"   {apartment.number}: {apartment.owner_name}")
        print(f"     Χιλιοστά συμμετοχής: {mills}")
        print(f"     Χιλιοστά θέρμανσης: {heating_mills}")
        print(f"     Χιλιοστά ανελκυστήρα: {elevator_mills}")
        print(f"     Τρέχον υπόλοιπο: {balance}€")
        print()
    
    print(f"💰 ΣΥΝΟΛΙΚΑ:")
    print(f"   Συνολικά χιλιοστά συμμετοχής: {total_mills}")
    print(f"   Συνολικά χιλιοστά θέρμανσης: {total_heating_mills}")
    print(f"   Συνολικά χιλιοστά ανελκυστήρα: {total_elevator_mills}")
    print(f"   Συνολικό υπόλοιπο: {total_balance}€")
    
    # Έλεγχος αν τα χιλιοστά είναι σωστά
    if total_mills != 1000:
        print(f"⚠️ ΠΡΟΣΟΧΗ: Συνολικά χιλιοστά συμμετοχής ({total_mills}) ≠ 1000")
    else:
        print("✅ Συνολικά χιλιοστά συμμετοχής είναι σωστά (1000)")

def check_expenses(building_id):
    """Ελέγχει τις δαπάνες του κτιρίου"""
    print(f"\n📊 ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΚΤΙΡΙΟΥ {building_id}")
    print("=" * 60)
    
    expenses = Expense.objects.filter(
        building_id=building_id,
        is_issued=False
    ).order_by('category', 'title')
    
    if not expenses.exists():
        print("❌ Δεν βρέθηκαν ανέκδοτες δαπάνες")
        return
    
    print(f"📋 Βρέθηκαν {expenses.count()} ανέκδοτες δαπάνες:")
    print("-" * 60)
    
    total_by_category = {}
    total_amount = Decimal('0.00')
    
    for expense in expenses:
        category = expense.category or 'unknown'
        amount = expense.amount
        
        if category not in total_by_category:
            total_by_category[category] = Decimal('0.00')
        
        total_by_category[category] += amount
        total_amount += amount
        
        print(f"   {expense.title}: {amount}€ ({category})")
    
    print("-" * 60)
    print(f"💰 ΣΥΝΟΛΙΚΟ ΠΟΣΟ: {total_amount}€")
    print("\n📈 ΑΝΑΛΥΣΗ ΑΝΑ ΚΑΤΗΓΟΡΙΑ:")
    
    for category, amount in total_by_category.items():
        percentage = (amount / total_amount * 100) if total_amount > 0 else 0
        print(f"   {category}: {amount}€ ({percentage:.1f}%)")

def check_calculator_results(building_id):
    """Ελέγχει τα αποτελέσματα του calculator"""
    print(f"\n🧮 ΕΛΕΓΧΟΣ ΑΠΟΤΕΛΕΣΜΑΤΩΝ CALCULATOR")
    print("=" * 60)
    
    try:
        calculator = AdvancedCommonExpenseCalculator(building_id)
        result = calculator.calculate_advanced_shares()
        
        shares = result['shares']
        expense_totals = result['expense_totals']
        expense_details = result['expense_details']
        
        print("📊 ΣΥΝΟΛΙΚΑ ΔΑΠΑΝΩΝ ΑΝΑ ΚΑΤΗΓΟΡΙΑ:")
        for category, amount in expense_totals.items():
            print(f"   {category}: {amount}€")
        
        print(f"\n📋 ΛΕΠΤΟΜΕΡΕΙΕΣ ΔΑΠΑΝΩΝ:")
        for category, expenses in expense_details.items():
            if expenses:
                print(f"\n   {category.upper()}:")
                for expense in expenses:
                    print(f"     - {expense['title']}: {expense['amount']}€")
        
        print(f"\n🏠 ΑΝΑΛΥΣΗ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
        print("-" * 60)
        
        total_tenant_expenses = Decimal('0.00')
        total_owner_expenses = Decimal('0.00')
        total_payable = Decimal('0.00')
        
        for apartment_id, share_data in shares.items():
            apartment = Apartment.objects.get(id=apartment_id)
            breakdown = share_data['breakdown']
            
            # Υπολογισμός δαπανών ενοικιαστών (κοινόχρηστα)
            tenant_expenses = (
                breakdown['general_expenses'] +
                breakdown['elevator_expenses'] +
                breakdown['heating_expenses']
            )
            
            # Υπολογισμός δαπανών ιδιοκτητών (αποθεματικό + ισόποσες)
            owner_expenses = (
                breakdown['equal_share_expenses'] +
                breakdown['reserve_fund_contribution']
            )
            
            # Συνολικό πληρωτέο
            payable = share_data['total_due']
            
            total_tenant_expenses += tenant_expenses
            total_owner_expenses += owner_expenses
            total_payable += payable
            
            print(f"\n   Διαμέρισμα {apartment.number} ({apartment.owner_name}):")
            print(f"     Δαπάνες ενοικιαστών: {tenant_expenses}€")
            print(f"       - Γενικές: {breakdown['general_expenses']}€")
            print(f"       - Ανελκυστήρας: {breakdown['elevator_expenses']}€")
            print(f"       - Θέρμανση: {breakdown['heating_expenses']}€")
            print(f"     Δαπάνες ιδιοκτητών: {owner_expenses}€")
            print(f"       - Ισόποσες: {breakdown['equal_share_expenses']}€")
            print(f"       - Αποθεματικό: {breakdown['reserve_fund_contribution']}€")
            print(f"     Πληρωτέο: {payable}€")
        
        print(f"\n💰 ΣΥΝΟΛΙΚΑ ΑΘΡΟΙΣΜΑΤΑ:")
        print(f"   Συνολικές δαπάνες ενοικιαστών: {total_tenant_expenses}€")
        print(f"   Συνολικές δαπάνες ιδιοκτητών: {total_owner_expenses}€")
        print(f"   Συνολικό πληρωτέο: {total_payable}€")
        
        # Έλεγχος αν ταιριάζουν τα αθροίσματα
        expected_payable = total_tenant_expenses + total_owner_expenses
        difference = total_payable - expected_payable
        
        print(f"\n🔍 ΕΛΕΓΧΟΣ ΑΘΡΟΙΣΜΑΤΩΝ:")
        print(f"   Αναμενόμενο πληρωτέο: {expected_payable}€")
        print(f"   Πραγματικό πληρωτέο: {total_payable}€")
        print(f"   Διαφορά: {difference}€")
        
        if abs(difference) > Decimal('0.01'):
            print("❌ ΠΡΟΒΛΗΜΑ: Τα αθροίσματα δεν ταιριάζουν!")
            
            # Έλεγχος για προηγούμενα υπόλοιπα
            total_previous_balance = sum(
                share_data['previous_balance'] for share_data in shares.values()
            )
            print(f"   Προηγούμενο υπόλοιπο: {total_previous_balance}€")
            
            # Υπολογισμός χωρίς προηγούμενο υπόλοιπο
            total_without_balance = sum(
                share_data['total_amount'] for share_data in shares.values()
            )
            print(f"   Συνολικό χωρίς υπόλοιπο: {total_without_balance}€")
            
            if abs(total_without_balance - expected_payable) <= Decimal('0.01'):
                print("✅ Το πρόβλημα είναι στο προηγούμενο υπόλοιπο")
            else:
                print("❌ Το πρόβλημα είναι στους υπολογισμούς")
        else:
            print("✅ Τα αθροίσματα ταιριάζουν σωστά!")
        
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον υπολογισμό: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Κύρια συνάρτηση"""
    print("🔍 ΕΛΕΓΧΟΣ ΑΘΡΟΙΣΜΑΤΩΝ ΚΤΙΡΙΟΥ ΑΛΚΜΑΝΟΣ 22, ΑΘΗΝΑ 115 28")
    print("=" * 80)
    
    check_alkmanos_building()
    
    print(f"\n✅ Ο έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    main()
