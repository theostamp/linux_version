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
from financial.models import Expense, RecurringExpenseConfig
from financial.validators import RecurringExpenseValidator
from buildings.models import Building
from apartments.models import Apartment

with schema_context('demo'):
    print("=" * 80)
    print("ΤΕΛΙΚΗ ΕΠΑΛΗΘΕΥΣΗ: RECURRING EXPENSES SYSTEM")
    print("=" * 80)

    building = Building.objects.get(id=1)
    num_apartments = Apartment.objects.filter(building=building).count()

    print(f"\n🏠 Κτίριο: {building.name}")
    print(f"📊 Διαμερίσματα: {num_apartments}")

    # 1. Έλεγχος RecurringExpenseConfig
    print(f"\n{'='*80}")
    print("1. RECURRING EXPENSE CONFIGURATIONS")
    print(f"{'='*80}")

    configs = RecurringExpenseConfig.objects.filter(building=building)
    print(f"   Βρέθηκαν {configs.count()} ρυθμίσεις:")

    for config in configs:
        status = "✅ Ενεργή" if config.is_active else "❌ Ανενεργή"
        print(f"\n   {status} {config.get_expense_type_display()}")
        print(f"      Ισχύει από: {config.effective_from}")
        print(f"      Ισχύει έως: {config.effective_until or 'Μέχρι σήμερα'}")
        print(f"      Ποσό: {config.get_amount_display()}")
        print(f"      Μέθοδος: {config.get_calculation_method_display()}")
        print(f"      Κατανομή: {config.get_distribution_type_display()}")

    # 2. Έλεγχος Δαπανών Διαχείρισης
    print(f"\n{'='*80}")
    print("2. ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ")
    print(f"{'='*80}")

    mgmt_expenses = Expense.objects.filter(
        building=building,
        expense_type='management_fee'
    ).order_by('date')

    print(f"   Βρέθηκαν {mgmt_expenses.count()} δαπάνες:")

    for exp in mgmt_expenses:
        # Validation check
        result = RecurringExpenseValidator.validate_recurring_expense_compliant(exp)
        compliance = "✅" if result['compliant'] else "❌"

        print(f"\n   {compliance} {exp.date} - {exp.title}")
        print(f"      Ποσό: €{exp.amount}")
        print(f"      Μερίδιο/διαμ: €{exp.amount / num_apartments:.2f}")
        print(f"      Due Date: {exp.due_date}")
        print(f"      Κατανομή: {exp.distribution_type}")

        if not result['compliant']:
            print(f"      ⚠️ Warnings:")
            for warning in result['warnings']:
                print(f"         {warning}")

    # 3. Έλεγχος Μεταφοράς Υπολοίπων
    print(f"\n{'='*80}")
    print("3. ΕΛΕΓΧΟΣ ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ (Φεβρουάριος → Μάρτιος 2026)")
    print(f"{'='*80}")

    # Δαπάνες Φεβρουαρίου
    feb_mgmt = mgmt_expenses.filter(date__year=2026, date__month=2).first()
    if feb_mgmt:
        print(f"\n   ✅ Φεβρουάριος 2026:")
        print(f"      Date: {feb_mgmt.date} (τελευταία του μήνα)")
        print(f"      Ποσό: €{feb_mgmt.amount}")

    # Έλεγχος historical balance query
    march_start = date(2026, 3, 1)
    year_start = date(2026, 1, 1)

    expenses_before_march = Expense.objects.filter(
        building=building,
        date__gte=year_start,
        date__lt=march_start
    )

    mgmt_before_march = expenses_before_march.filter(expense_type='management_fee')

    print(f"\n   🔍 Historical Balance Query (date__gte={year_start}, date__lt={march_start}):")
    print(f"      Δαπάνες Διαχείρισης: {mgmt_before_march.count()}")

    for exp in mgmt_before_march:
        print(f"         • {exp.date} - €{exp.amount}")

    if feb_mgmt and feb_mgmt in mgmt_before_march:
        print(f"\n   ✅ SUCCESS: Η δαπάνη Φεβρουαρίου συμπεριλαμβάνεται στο previous balance Μαρτίου!")
    else:
        print(f"\n   ❌ ERROR: Η δαπάνη Φεβρουαρίου ΔΕΝ συμπεριλαμβάνεται!")

    # 4. Σύνοψη
    print(f"\n{'='*80}")
    print("4. ΣΥΝΟΨΗ")
    print(f"{'='*80}")

    all_compliant = all(
        RecurringExpenseValidator.validate_recurring_expense_compliant(exp)['compliant']
        for exp in mgmt_expenses
    )

    if all_compliant:
        print(f"\n   ✅ ΟΛΑ ΟΚ! Το σύστημα λειτουργεί σωστά.")
    else:
        print(f"\n   ⚠️ Υπάρχουν warnings (δες παραπάνω)")

    print(f"\n   📊 Στατιστικά:")
    print(f"      Ρυθμίσεις: {configs.count()}")
    print(f"      Δαπάνες Διαχείρισης: {mgmt_expenses.count()}")
    print(f"      Περίοδος: {mgmt_expenses.first().date if mgmt_expenses.exists() else 'N/A'} - {mgmt_expenses.last().date if mgmt_expenses.exists() else 'N/A'}")

    # 5. Οδηγίες Χρήσης
    print(f"\n{'='*80}")
    print("5. ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ")
    print(f"{'='*80}")

    print(f"""
   📖 Documentation: backend/RECURRING_EXPENSES_SYSTEM.md

   ✅ Για δημιουργία νέων μηνών:
      docker exec linux_version-backend-1 python manage.py generate_recurring_expenses \\
          --building_id 1 \\
          --from 2026-04 \\
          --to 2026-12

   ✅ Για αλλαγή ποσού (π.χ. από €1 σε €15 από 01/06/2026):
      1. Κλείστε την παλιά config (effective_until = 2026-05-31)
      2. Δημιουργήστε νέα config (effective_from = 2026-06-01, amount = €15)
      3. Τρέξτε: generate_recurring_expenses --from 2026-06 --to 2026-12

   ✅ Για dry run (δοκιμή):
      docker exec linux_version-backend-1 python manage.py generate_recurring_expenses \\
          --building_id 1 \\
          --from 2026-04 \\
          --dry-run
    """)

    print(f"{'='*80}")
    print("✅ VERIFICATION COMPLETE!")
    print(f"{'='*80}\n")
