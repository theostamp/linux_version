import os
import sys
import django
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Building, Apartment
from decimal import Decimal

def debug_transaction_issue():
    """Debug γιατί δεν εμφανίζονται οι συναλλαγές"""
    
    print("🔍 DEBUG ΣΥΝΑΛΛΑΓΩΝ")
    print("=" * 60)
    
    with schema_context('demo'):
        # Έλεγχος όλων των κτιρίων
        print("🏢 ΕΛΕΓΧΟΣ ΚΤΙΡΙΩΝ:")
        print("-" * 30)
        
        buildings = Building.objects.all()
        print(f"📊 Συνολικά κτίρια: {buildings.count()}")
        
        for building in buildings:
            print(f"\n🔸 Κτίριο {building.id}: {building.name}")
            print(f"   Διεύθυνση: {building.address}")
            
            # Έλεγχος συναλλαγών για κάθε κτίριο
            transactions = Transaction.objects.filter(building=building)
            print(f"   💳 Συναλλαγές: {transactions.count()}")
            
            if transactions.exists():
                print("   📋 Λίστα συναλλαγών:")
                for tx in transactions.order_by('date')[:5]:  # Πρώτες 5
                    print(f"     - {tx.date}: {tx.description} ({tx.amount}€)")
                if transactions.count() > 5:
                    print(f"     ... και {transactions.count() - 5} ακόμα")
        
        # Έλεγχος όλων των συναλλαγών στο tenant
        print("\n💳 ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΣΥΝΑΛΛΑΓΩΝ ΣΤΟ TENANT:")
        print("-" * 50)
        
        all_transactions = Transaction.objects.all()
        print(f"📊 Συνολικές συναλλαγές στο tenant: {all_transactions.count()}")
        
        if all_transactions.exists():
            print("\n📋 Λίστα όλων των συναλλαγών:")
            for i, tx in enumerate(all_transactions.order_by('date'), 1):
                print(f"\n{i:2d}. {tx.date.strftime('%Y-%m-%d %H:%M')}")
                print(f"    🏢 Κτίριο: {tx.building.name if tx.building else 'N/A'}")
                print(f"    🔸 Τύπος: {tx.type}")
                print(f"    📝 Περιγραφή: {tx.description}")
                print(f"    💰 Ποσό: {tx.amount}€")
                print(f"    🏠 Διαμέρισμα: {tx.apartment_number}")
                print(f"    🆔 Reference: {tx.reference_id}")
                
                # Ειδική ένδειξη για συναλλαγές 150€
                if tx.amount == Decimal('150.00'):
                    print(f"    ⚠️  ΑΥΤΗ ΕΙΝΑΙ Η ΣΥΝΑΛΛΑΓΗ 150€!")
        
        # Έλεγχος διαμερισμάτων
        print("\n🏠 ΕΛΕΓΧΟΣ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        print("-" * 30)
        
        apartments = Apartment.objects.all()
        print(f"📊 Συνολικά διαμερίσματα: {apartments.count()}")
        
        for apartment in apartments:
            print(f"\n🔸 Διαμέρισμα {apartment.id}: {apartment.number}")
            print(f"   Κτίριο: {apartment.building.name if apartment.building else 'N/A'}")
            print(f"   Χιλιοστά: {apartment.participation_mills}")
            print(f"   Τρέχον υπόλοιπο: {apartment.current_balance}€")
            
            # Έλεγχος συναλλαγών για το διαμέρισμα
            apt_transactions = Transaction.objects.filter(apartment=apartment)
            print(f"   💳 Συναλλαγές: {apt_transactions.count()}")
        
        # Έλεγχος για συναλλαγές χωρίς κτίριο
        print("\n🔍 ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ ΧΩΡΙΣ ΚΤΙΡΙΟ:")
        print("-" * 40)
        
        transactions_no_building = Transaction.objects.filter(building__isnull=True)
        print(f"📊 Συναλλαγές χωρίς κτίριο: {transactions_no_building.count()}")
        
        if transactions_no_building.exists():
            for tx in transactions_no_building:
                print(f"  🔸 {tx.date}: {tx.description} ({tx.amount}€)")
        
        # Έλεγχος για συναλλαγές με ποσό 150€
        print("\n🔍 ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ 150€:")
        print("-" * 35)
        
        transactions_150 = Transaction.objects.filter(amount=Decimal('150.00'))
        print(f"📊 Συναλλαγές με ποσό 150€: {transactions_150.count()}")
        
        if transactions_150.exists():
            for tx in transactions_150:
                print(f"\n🔸 {tx.date.strftime('%Y-%m-%d %H:%M')}")
                print(f"   🏢 Κτίριο: {tx.building.name if tx.building else 'N/A'}")
                print(f"   🔸 Τύπος: {tx.type}")
                print(f"   📝 Περιγραφή: {tx.description}")
                print(f"   🏠 Διαμέρισμα: {tx.apartment_number}")
                print(f"   🆔 Reference: {tx.reference_id}")
                print(f"   👤 Created by: {tx.created_by}")

if __name__ == "__main__":
    debug_transaction_issue()
