import os
import sys
import django
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, RecurringExpenseConfig
from buildings.models import Building

with schema_context('demo'):
    print("=" * 80)
    print("ΔΟΚΙΜΗ ΣΥΣΤΗΜΑΤΟΣ ΕΠΑΝΑΛΑΜΒΑΝΟΜΕΝΩΝ ΔΑΠΑΝΩΝ")
    print("=" * 80)

    building = Building.objects.get(id=1)

    # Διαγραφή παλιών δαπανών διαχείρισης (για clean test)
    print(f"\n🗑️  Διαγραφή παλιών δαπανών διαχείρισης...")
    old_mgmt = Expense.objects.filter(
        building=building,
        expense_type='management_fee'
    )
    count = old_mgmt.count()
    old_mgmt.delete()
    print(f"   ✅ Διαγράφηκαν {count} δαπάνες")

    # Έλεγχος ρυθμίσεων
    print(f"\n📋 ΡΥΘΜΙΣΕΙΣ:")
    configs = RecurringExpenseConfig.objects.filter(building=building, is_active=True)
    for config in configs:
        print(f"   {config}")

    # Δοκιμή: Βρες ρύθμιση για συγκεκριμένη ημερομηνία
    print(f"\n🔍 ΔΟΚΙΜΗ get_active_config:")

    test_dates = [
        date(2025, 10, 31),
        date(2025, 11, 30),
        date(2026, 2, 28),
        date(2026, 3, 31),
    ]

    for test_date in test_dates:
        config = RecurringExpenseConfig.get_active_config(
            building_id=building.id,
            expense_type='management_fee',
            target_date=test_date
        )
        if config:
            print(f"   {test_date}: {config.get_amount_display()}")
        else:
            print(f"   {test_date}: ❌ Δεν βρέθηκε ρύθμιση")

    print(f"\n{'='*80}")
    print("Τώρα τρέξε:")
    print("docker exec linux_version-backend-1 python manage.py generate_recurring_expenses --building_id 1 --from 2025-10 --to 2026-03")
    print(f"{'='*80}")
