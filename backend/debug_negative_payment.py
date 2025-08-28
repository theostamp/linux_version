#!/usr/bin/env python
"""
Script για έρευνα αρνητικού ποσού στην εισπράξη
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
from apartments.models import Apartment
from financial.models import Expense, Payment, Transaction
from datetime import datetime

def debug_negative_payment():
    """Ερευνά γιατί εμφανίζεται αρνητικό ποσό"""
    
    with schema_context('demo'):
        print("🔍 ΕΡΕΥΝΑ ΑΡΝΗΤΙΚΟΥ ΠΟΣΟΥ ΣΤΗΝ ΕΙΣΠΡΑΞΗ")
        print("=" * 50)
        
        # 1. Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(name='Αλκμάνος 22')
        print(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
        
        # 2. Βρες το διαμέρισμα 3
        apartment = Apartment.objects.get(building=building, number='3')
        print(f"🏠 Διαμέρισμα: {apartment.number}")
        print(f"   Ιδιοκτήτης: {apartment.owner_name}")
        print(f"   Ενοικιαστής: {apartment.tenant_name}")
        print(f"   Χιλιοστά συμμετοχής: {apartment.participation_mills}")
        
        # 3. Έλεγχος τρέχοντος υπολοίπου
        print(f"\n💰 ΤΡΕΧΟΝ ΥΠΟΛΟΙΠΟ:")
        print(f"   current_balance: {apartment.current_balance}")
        
        # 4. Έλεγχος εσόδων και εξόδων
        expenses = Expense.objects.filter(building=building)
        payments = Payment.objects.filter(apartment=apartment)
        transactions = Transaction.objects.filter(apartment=apartment)
        
        print(f"\n📊 ΟΙΚΟΝΟΜΙΚΑ ΣΤΟΙΧΕΙΑ:")
        print(f"   Εξόδοι (Expenses): {expenses.count()}")
        print(f"   Πληρωμές (Payments): {payments.count()}")
        print(f"   Συναλλαγές (Transactions): {transactions.count()}")
        
        # 5. Έλεγχος αποθεματικού
        print(f"\n🏦 ΑΠΟΘΕΜΑΤΙΚΟ:")
        print(f"   Τρέχον αποθεματικό: {building.current_reserve}")
        print(f"   Διάρκεια μήνες: {building.reserve_fund_duration_months}")
        
        # 6. Έλεγχος βασικών attributes του building
        print(f"\n🔍 BUILDING BASIC ATTRIBUTES:")
        print(f"   name: {building.name}")
        print(f"   address: {building.address}")
        print(f"   current_reserve: {building.current_reserve}")
        print(f"   reserve_fund_duration_months: {building.reserve_fund_duration_months}")
        print(f"   heating_fixed_percentage: {building.heating_fixed_percentage}")
        
        # 7. Έλεγχος βασικών attributes του apartment
        print(f"\n🔍 APARTMENT BASIC ATTRIBUTES:")
        print(f"   number: {apartment.number}")
        print(f"   owner_name: {apartment.owner_name}")
        print(f"   tenant_name: {apartment.tenant_name}")
        print(f"   participation_mills: {apartment.participation_mills}")
        print(f"   heating_mills: {apartment.heating_mills}")
        print(f"   elevator_mills: {apartment.elevator_mills}")
        print(f"   current_balance: {apartment.current_balance}")
        
        # 8. Λεπτομερής έλεγχος transactions
        if transactions.exists():
            print(f"\n📋 ΛΕΠΤΟΜΕΡΕΙΣ ΣΥΝΑΛΛΑΓΕΣ:")
            for tx in transactions.order_by('-created_at')[:5]:
                print(f"   {tx.created_at}: {tx.amount}€ - {tx.transaction_type} - {tx.description}")
        
        # 9. Έλεγχος τρέχοντος μήνα
        current_month = datetime.now().month
        current_year = datetime.now().year
        print(f"\n📅 ΤΡΕΧΟΝ ΜΗΝΑΣ:")
        print(f"   Μήνας: {current_month}")
        print(f"   Έτος: {current_year}")
        
        # 10. Υπολογισμός θεωρητικού μεριδίου
        total_mills = 1000
        apartment_mills = apartment.participation_mills
        apartment_percentage = (apartment_mills / total_mills) * 100
        
        print(f"\n🧮 ΘΕΩΡΗΤΙΚΟ ΜΕΡΙΔΙΟ:")
        print(f"   Χιλιοστά διαμερίσματος: {apartment_mills}")
        print(f"   Συνολικά χιλιοστά: {total_mills}")
        print(f"   Ποσοστό: {apartment_percentage:.2f}%")

if __name__ == "__main__":
    debug_negative_payment()
