import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Building, Apartment
from django.db.models import Q

def check_movements():
    print("🔍 Ελέγχουμε κινήσεις για το κτίριο Αλκμάνος 22...")
    print("=" * 60)
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο Αλκμάνος 22
        try:
            building = Building.objects.get(address__icontains='Αλκμάνος 22')
            print(f"✅ Βρέθηκε κτίριο: {building.name} - {building.address}")
            print(f"   ID: {building.id}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο με διεύθυνση 'Αλκμάνος 22'")
            # Εμφανίζουμε όλα τα κτίρια για debugging
            buildings = Building.objects.all()
            print("\n📋 Διαθέσιμα κτίρια:")
            for b in buildings:
                print(f"   - {b.name}: {b.address} (ID: {b.id})")
            return
        
        # Ελέγχουμε συνολικό αριθμό κινήσεων
        total_transactions = Transaction.objects.count()
        print(f"\n📊 Συνολικές κινήσεις στη βάση: {total_transactions}")
        
        # Ελέγχουμε κινήσεις για αυτό το κτίριο
        building_transactions = Transaction.objects.filter(building=building)
        print(f"📊 Κινήσεις για το κτίριο {building.name}: {building_transactions.count()}")
        
        if building_transactions.exists():
            print("\n📋 Πρώτες 10 κινήσεις:")
            for i, transaction in enumerate(building_transactions.order_by('-date')[:10]):
                print(f"   {i+1}. {transaction.date} - {transaction.description} - {transaction.amount}€")
        else:
            print("❌ Δεν βρέθηκαν κινήσεις για αυτό το κτίριο")
        
        # Ελέγχουμε κινήσεις με διαφορετικά φίλτρα
        print("\n🔍 Ελέγχουμε κινήσεις με διαφορετικά φίλτρα:")
        
        # Όλες οι κινήσεις (χωρίς φίλτρο κτιρίου)
        all_transactions = Transaction.objects.all()
        print(f"   - Όλες οι κινήσεις: {all_transactions.count()}")
        
        # Κινήσεις με ημερομηνία
        recent_transactions = Transaction.objects.filter(
            date__gte=datetime.now().replace(day=1)  # Από αρχή του τρέχοντος μήνα
        )
        print(f"   - Κινήσεις από αρχή μήνα: {recent_transactions.count()}")
        
        # Κινήσεις με description
        transactions_with_desc = Transaction.objects.exclude(description__isnull=True).exclude(description='')
        print(f"   - Κινήσεις με περιγραφή: {transactions_with_desc.count()}")
        
        # Ελέγχουμε αν υπάρχουν κινήσεις χωρίς building
        transactions_without_building = Transaction.objects.filter(building__isnull=True)
        print(f"   - Κινήσεις χωρίς κτίριο: {transactions_without_building.count()}")
        
        if transactions_without_building.exists():
            print("\n⚠️  Βρέθηκαν κινήσεις χωρίς κτίριο:")
            for transaction in transactions_without_building[:5]:
                print(f"   - {transaction.date} - {transaction.description} - {transaction.amount}€")
        
        # Ελέγχουμε τη δομή του μοντέλου Transaction
        print("\n🏗️  Δομή μοντέλου Transaction:")
        transaction_fields = [field.name for field in Transaction._meta.fields]
        print(f"   Πεδία: {', '.join(transaction_fields)}")
        
        # Ελέγχουμε αν υπάρχουν κινήσεις με άλλο building_id
        print("\n🔍 Ελέγχουμε κινήσεις με άλλα building_id:")
        building_ids = Transaction.objects.values_list('building_id', flat=True).distinct()
        for building_id in building_ids:
            if building_id:
                try:
                    b = Building.objects.get(id=building_id)
                    count = Transaction.objects.filter(building_id=building_id).count()
                    print(f"   - Building ID {building_id} ({b.name}): {count} κινήσεις")
                except Building.DoesNotExist:
                    count = Transaction.objects.filter(building_id=building_id).count()
                    print(f"   - Building ID {building_id} (ΔΕΝ ΥΠΑΡΧΕΙ): {count} κινήσεις")

if __name__ == "__main__":
    check_movements()
