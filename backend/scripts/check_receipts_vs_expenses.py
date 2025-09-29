import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.db.models import Sum

from maintenance.models import ServiceReceipt
from financial.models import Expense


def main(building_id: int = 1, year: int = 2025, month: int = 9, schema: str = 'demo') -> None:
    with schema_context(schema):
        receipts = ServiceReceipt.objects.filter(
            building_id=building_id,
            service_date__year=year,
            service_date__month=month,
        )
        expenses = Expense.objects.filter(
            building_id=building_id,
            date__year=year,
            date__month=month,
        )

        r_total = receipts.aggregate(total=Sum('amount'))['total'] or 0
        e_total = expenses.aggregate(total=Sum('amount'))['total'] or 0

        print(f"Building: {building_id}, Period: {year}-{str(month).zfill(2)}, Schema: {schema}")
        print(f"ServiceReceipts count: {receipts.count()} | sum: {r_total}")
        print(f"Expenses count: {expenses.count()} | sum: {e_total}")

        sample = list(
            receipts.values('id', 'amount', 'service_date', 'linked_expense_id')[:10]
        )
        print("Receipts sample (id, amount, date, linked_expense_id):", sample)
        linked_ids = [x['linked_expense_id'] for x in sample if x['linked_expense_id']]
        if linked_ids:
            linked = list(
                Expense.objects.filter(id__in=linked_ids).values('id', 'amount', 'date', 'category')
            )
            print("Linked expenses sample:", linked)
        else:
            print("No linked expenses in sample.")

        # Extra diagnostics: show recent receipts and expenses for this building
        recent_receipts = list(
            ServiceReceipt.objects.filter(building_id=building_id)
            .order_by('-service_date', '-id')
            .values('id', 'service_date', 'amount', 'linked_expense_id')[:10]
        )
        print("Recent receipts (any month):", recent_receipts)
        recent_expenses = list(
            Expense.objects.filter(building_id=building_id)
            .order_by('-date', '-id')
            .values('id', 'date', 'amount', 'category')[:10]
        )
        print("Recent expenses (any month):", recent_expenses)


if __name__ == '__main__':
    main()


