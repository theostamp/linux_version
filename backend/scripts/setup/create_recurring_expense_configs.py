import os
import sys
import django
from datetime import date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import RecurringExpenseConfig
from buildings.models import Building

with schema_context('demo'):
    print("=" * 80)
    print("ΔΗΜΙΟΥΡΓΙΑ ΡΥΘΜΙΣΕΩΝ ΕΠΑΝΑΛΑΜΒΑΝΟΜΕΝΩΝ ΔΑΠΑΝΩΝ")
    print("=" * 80)

    building = Building.objects.get(id=1)

    print(f"\n🏠 Κτίριο: {building.name}")
    print(f"📅 Financial System Start: {building.financial_system_start_date}")

    # Δημιουργία ρύθμισης για Δαπάνες Διαχείρισης
    print(f"\n📋 Δημιουργία ρύθμισης: Δαπάνες Διαχείρισης")

    mgmt_config, created = RecurringExpenseConfig.objects.get_or_create(
        building=building,
        expense_type='management_fee',
        effective_from=building.financial_system_start_date or date(2025, 10, 1),
        defaults={
            'calculation_method': 'fixed_per_apartment',
            'amount_per_apartment': Decimal('1.00'),  # €1/διαμέρισμα
            'distribution_type': 'equal_share',
            'is_active': True,
            'notes': 'Αρχική ρύθμιση δαπανών διαχείρισης'
        }
    )

    if created:
        print(f"   ✅ Δημιουργήθηκε: {mgmt_config}")
    else:
        print(f"   ℹ️  Υπάρχει ήδη: {mgmt_config}")

    # Παράδειγμα αλλαγής (σχολιασμένο - uncomment για demo)
    # print(f"\n📋 Παράδειγμα: Αλλαγή σε νέο πακέτο από 01/06/2026")
    # mgmt_config_new = RecurringExpenseConfig.objects.create(
    #     building=building,
    #     expense_type='management_fee',
    #     effective_from=date(2026, 6, 1),
    #     calculation_method='fixed_per_apartment',
    #     amount_per_apartment=Decimal('15.00'),  # Νέο πακέτο: €15/διαμέρισμα
    #     distribution_type='equal_share',
    #     is_active=True,
    #     notes='Αναβάθμιση σε premium πακέτο διαχείρισης'
    # )
    # print(f"   ✅ Νέο πακέτο: {mgmt_config_new}")

    # Δημιουργία ρύθμισης για Αποθεματικό (προαιρετικό)
    print(f"\n📋 Δημιουργία ρύθμισης: Αποθεματικό Ταμείο (προαιρετικό)")
    print(f"   ⏭️  Σχολιασμένο - uncomment αν χρειάζεται")

    # reserve_config, created = RecurringExpenseConfig.objects.get_or_create(
    #     building=building,
    #     expense_type='reserve_fund',
    #     effective_from=building.financial_system_start_date or date(2025, 10, 1),
    #     defaults={
    #         'calculation_method': 'percentage_of_expenses',
    #         'percentage': Decimal('5.00'),  # 5% των δαπανών
    #         'distribution_type': 'by_participation_mills',
    #         'is_active': True,
    #         'notes': 'Αποθεματικό 5% επί των μηνιαίων δαπανών'
    #     }
    # )

    print(f"\n{'='*80}")
    print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ!")
    print(f"{'='*80}")

    # Εμφάνιση όλων των ρυθμίσεων
    all_configs = RecurringExpenseConfig.objects.filter(building=building)
    print(f"\n📊 Συνολικές ρυθμίσεις: {all_configs.count()}")
    for config in all_configs:
        status = "✅ Ενεργή" if config.is_active else "❌ Ανενεργή"
        print(f"   {status} {config}")
