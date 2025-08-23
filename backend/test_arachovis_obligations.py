#!/usr/bin/env python3
"""
Test script για να δούμε πως υπολογίζεται το current_obligations για Αραχώβης 12
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.db.models import Sum

def test_arachovis_obligations():
    """Test obligations calculation for Αραχώβης 12"""
    
    with schema_context('demo'):
        print("=" * 60)
        print(" 🔍 ΑΝΑΛΥΣΗ CURRENT_OBLIGATIONS ΓΙΑ ΑΡΑΧΩΒΗΣ 12 ")
        print("=" * 60)
        
        try:
            from apartments.models import Apartment
            from financial.models import Expense
            from buildings.models import Building
            
            # Find Αραχώβης 12
            building = Building.objects.get(address__icontains="Αραχώβης 12")
            print(f"✅ Κτίριο: {building.name}")
            print(f"📍 Διεύθυνση: {building.address}")
            print(f"🆔 Building ID: {building.id}")
            
            # Get apartments
            apartments = Apartment.objects.filter(building=building)
            print(f"🏠 Διαμερίσματα: {apartments.count()}")
            
            # 1. APARTMENT OBLIGATIONS (current_balance < 0)
            print(f"\n1️⃣ ΟΦΕΙΛΕΣ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
            print("-" * 40)
            
            apartment_obligations = Decimal('0.00')
            for apt in apartments:
                balance = apt.current_balance or Decimal('0.00')
                if balance < 0:
                    apartment_obligations += abs(balance)
                    print(f"   🏠 Διαμ. {apt.number}: {balance} → Οφειλή: {abs(balance)}")
                else:
                    print(f"   🏠 Διαμ. {apt.number}: {balance} (ΟΚ)")
            
            print(f"💰 Συνολικές οφειλές διαμερισμάτων: {apartment_obligations} €")
            
            # 2. ALL EXPENSES
            print(f"\n2️⃣ ΣΥΝΟΛΙΚΕΣ ΔΑΠΑΝΕΣ:")
            print("-" * 40)
            
            all_expenses = Expense.objects.filter(building=building)
            expenses_total = all_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            print(f"📊 Συνολικές δαπάνες κτιρίου: {all_expenses.count()}")
            print(f"💰 Συνολικό ποσό δαπανών: {expenses_total} €")
            
            # 3. MANAGEMENT FEES
            print(f"\n3️⃣ ΔΙΑΧΕΙΡΙΣΤΙΚΑ ΤΕΛΗ:")
            print("-" * 40)
            
            management_fee_per_apartment = getattr(building, 'management_fee_per_apartment', Decimal('0.00')) or Decimal('0.00')
            total_management_cost = management_fee_per_apartment * apartments.count()
            
            print(f"💼 Τέλος ανά διαμέρισμα: {management_fee_per_apartment} €")
            print(f"🏠 Αριθμός διαμερισμάτων: {apartments.count()}")
            print(f"💰 Συνολικό κόστος διαχείρισης: {total_management_cost} €")
            
            # 4. TOTAL CALCULATION
            print(f"\n4️⃣ ΣΥΝΟΛΙΚΟΣ ΥΠΟΛΟΓΙΣΜΟΣ:")
            print("-" * 40)
            
            total_obligations = apartment_obligations + expenses_total + total_management_cost
            
            print(f"🔸 Οφειλές διαμερισμάτων: {apartment_obligations} €")
            print(f"🔸 Συνολικές δαπάνες: {expenses_total} €")
            print(f"🔸 Διαχειριστικά τέλη: {total_management_cost} €")
            print(f"=" * 40)
            print(f"💰 ΣΥΝΟΛΟ (current_obligations): {total_obligations} €")
            
            # 5. COMPARISON WITH TARGET
            print(f"\n5️⃣ ΣΥΓΚΡΙΣΗ ΜΕ ΣΤΟΧΟ:")
            print("-" * 40)
            
            target = Decimal('334.85')
            difference = total_obligations - target
            
            print(f"🎯 Στόχος: {target} €")
            print(f"🧮 Υπολογισμένο: {total_obligations} €")
            print(f"📊 Διαφορά: {difference} €")
            
            if abs(difference) < Decimal('0.01'):
                print("✅ ΤΑΙΡΙΑΖΕΙ ΑΚΡΙΒΩΣ!")
            elif abs(difference) < Decimal('5.00'):
                print("✅ ΤΑΙΡΙΑΖΕΙ ΣΧΕΔΟΝ!")
            else:
                print("❌ ΔΕΝ ΤΑΙΡΙΑΖΕΙ")
            
            # 6. ANALYSIS
            print(f"\n6️⃣ ΑΝΑΛΥΣΗ:")
            print("-" * 40)
            
            if total_obligations == 0:
                print("🔍 Το current_obligations είναι 0 επειδή:")
                print("   • Δεν υπάρχουν οφειλές διαμερισμάτων")
                print("   • Δεν υπάρχουν δαπάνες")
                print("   • Δεν υπάρχουν διαχειριστικά τέλη")
                print(f"\n💡 ΤΟ ΠΟΣΟ 334,85 € ΠΡΟΕΡΧΕΤΑΙ ΑΠΟ:")
                print("   1. Frontend calculation logic")
                print("   2. Template/default values")
                print("   3. Service package estimates")
                print("   4. Hardcoded UI values")
                
                # Let's check if there's a service package
                try:
                    from buildings.models import ServicePackage
                    service_packages = ServicePackage.objects.filter(building=building)
                    if service_packages.exists():
                        print(f"\n📦 SERVICE PACKAGES:")
                        for pkg in service_packages:
                            monthly_cost = getattr(pkg, 'monthly_cost', 0) or 0
                            print(f"   • {pkg.name}: {monthly_cost} €/μήνα")
                            if abs(monthly_cost - float(target)) < 5:
                                print("   🎯 ΑΥΤΟ ΜΠΟΡΕΙ ΝΑ ΕΙΝΑΙ Η ΠΗΓΗ!")
                except Exception as e:
                    print(f"⚠️ Couldn't check service packages: {e}")
            else:
                # Check which component contributes most
                max_component = max(
                    ('Οφειλές', apartment_obligations),
                    ('Δαπάνες', expenses_total),
                    ('Διαχείριση', total_management_cost),
                    key=lambda x: x[1]
                )
                print(f"🎯 Μεγαλύτερη συνεισφορά: {max_component[0]} ({max_component[1]} €)")
            
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_arachovis_obligations()
