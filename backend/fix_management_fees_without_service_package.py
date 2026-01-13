import os
import django
import argparse
from decimal import Decimal
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from buildings.models import Building

def fix_management_fees(dry_run=True):
    print(f"🔧 Starting Management Fees Fix (Dry Run: {dry_run})...")

    buildings = Building.objects.all()
    count_fixed = 0

    for building in buildings:
        # Check if building has a service package
        has_service_package = False
        if hasattr(building, 'service_package') and building.service_package:
            has_service_package = True

        # If no service package but has management fee
        if not has_service_package and (building.management_fee_per_apartment or 0) > 0:
            print(f"⚠️  Building '{building.name}' (ID: {building.id}) has no Service Package but Management Fee: €{building.management_fee_per_apartment}")

            if not dry_run:
                building.management_fee_per_apartment = Decimal('0.00')
                building.save(update_fields=['management_fee_per_apartment'])
                print(f"   ✅ Fixed: Set to €0.00")

            count_fixed += 1

    print(f"\n🏁 Finished. Buildings {'would be' if dry_run else ''} fixed: {count_fixed}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Fix management fees for buildings without service package')
    parser.add_argument('--fix', action='store_true', help='Apply fixes')
    parser.add_argument('--dry-run', action='store_true', help='Dry run (default)')

    args = parser.parse_args()

    # If --fix is passed, dry_run is False.
    is_dry_run = not args.fix
    if args.dry_run:
        is_dry_run = True

    fix_management_fees(dry_run=is_dry_run)
