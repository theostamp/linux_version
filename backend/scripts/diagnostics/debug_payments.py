import sys
import os
import django
from decimal import Decimal
from datetime import date

# Setup Django path and settings
sys.path.append('/home/theo/project/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

try:
    django.setup()
except Exception as e:
    print(f"Error setting up Django: {e}")
    sys.exit(1)

from financial.services import FinancialDashboardService
from buildings.models import Building

# Find building - try 'Demo' or 'Βουλής' or just get first one
building = Building.objects.filter(name__icontains='Demo').first()
if not building:
    building = Building.objects.filter(name__icontains='Βουλής').first()
if not building:
    building = Building.objects.first()

if not building:
    print("No buildings found in database")
    sys.exit(1)

print(f"Checking building: {building.name} (ID: {building.id})")

try:
    service = FinancialDashboardService(building_id=building.id)
    # Current view (no month specified, uses current date logic)
    print("Fetching apartment balances...")
    balances = service.get_apartment_balances()
    
    total_month_payments = sum(b.get('month_payments', Decimal('0.00')) for b in balances)
    total_obligations = sum(b.get('current_balance', Decimal('0.00')) for b in balances if b.get('current_balance', Decimal('0.00')) > 0)
    
    print(f"Total Month Payments (calculated sum): {total_month_payments}")
    print(f"Total Obligations (calculated sum): {total_obligations}")
    
    if (total_month_payments + total_obligations) > 0:
        coverage = (total_month_payments / (total_month_payments + total_obligations)) * 100
        print(f"Calculated Coverage: {coverage:.2f}%")
    else:
        print("Calculated Coverage: 0.00% (No payments or obligations)")

    print("\n--- Apartment Details (Payments > 0 or Balance > 0) ---")
    count_with_payments = 0
    for b in balances:
        mp = b.get('month_payments', Decimal('0.00'))
        cb = b.get('current_balance', Decimal('0.00'))
        if mp > 0:
            count_with_payments += 1
        
        if mp > 0 or cb > 0:
            print(f"Apt {b['number']}: Month Payments={mp}, Current Balance={cb}")
            
    print(f"\nApartments with payments this month: {count_with_payments}")
    
except Exception as e:
    print(f"Error executing service: {e}")
    import traceback
    traceback.print_exc()






