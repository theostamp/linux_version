from django.db import migrations


def backfill_unified_receipts(apps, schema_editor):
    UnifiedReceipt = apps.get_model('financial', 'UnifiedReceipt')
    Expense = apps.get_model('financial', 'Expense')
    ServiceReceipt = apps.get_model('maintenance', 'ServiceReceipt')

    # 1) Backfill from ServiceReceipt → UnifiedReceipt
    try:
        for sr in ServiceReceipt.objects.all():
            status = 'issued' if sr.linked_expense_id else 'draft'
            payment_status = 'paid' if sr.payment_status == 'paid' else 'unpaid'

            ur = UnifiedReceipt(
                building=sr.building,
                scheduled_maintenance=sr.scheduled_maintenance,
                expense_id=sr.linked_expense_id or None,
                title=(sr.description or '').strip()[:255] or f"Απόδειξη {getattr(sr.contractor, 'name', '')}".strip(),
                description=f"Backfilled from ServiceReceipt #{sr.id}",
                amount=sr.amount,
                service_date=sr.service_date,
                category='miscellaneous',
                distribution_type='by_participation_mills',
                status=status,
                payment_status=payment_status,
                created_by=sr.created_by if hasattr(sr, 'created_by') else None,
            )
            ur.save()
    except Exception:
        # Best-effort backfill; skip on errors to avoid migration failure in edge cases
        pass

    # 2) Backfill for Expenses without a UnifiedReceipt reference
    try:
        linked_expense_ids = set(
            UnifiedReceipt.objects.exclude(expense_id=None).values_list('expense_id', flat=True)
        )
        linked_credit_ids = set(
            UnifiedReceipt.objects.exclude(credit_expense_id=None).values_list('credit_expense_id', flat=True)
        )
        already_linked_ids = linked_expense_ids.union(linked_credit_ids)

        for e in Expense.objects.exclude(id__in=already_linked_ids).all():
            # Determine if this is a credit note (negative amount)
            is_credit = False
            try:
                is_credit = (e.amount is not None and float(e.amount) < 0)
            except Exception:
                is_credit = False

            if is_credit:
                ur = UnifiedReceipt(
                    building=e.building,
                    credit_expense=e,
                    title=f"Πιστωτικό: {e.title}",
                    description=f"Backfilled credit from Expense #{e.id}",
                    amount=abs(e.amount),
                    service_date=e.date,
                    category=e.category,
                    distribution_type=e.distribution_type,
                    status='cancelled',
                    payment_status='unpaid',
                )
            else:
                ur = UnifiedReceipt(
                    building=e.building,
                    expense=e,
                    title=e.title,
                    description=f"Backfilled from Expense #{e.id}",
                    amount=e.amount,
                    service_date=e.date,
                    category=e.category,
                    distribution_type=e.distribution_type,
                    status='issued',
                    payment_status='unpaid',
                )
            ur.save()
    except Exception:
        # Best-effort backfill
        pass


def noop_reverse(apps, schema_editor):
    # Keep data; no reverse operation
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0026_unifiedreceipt_credit_expense'),
        ('maintenance', '0008_servicereceipt_scheduled_maintenance'),
    ]

    operations = [
        migrations.RunPython(backfill_unified_receipts, noop_reverse),
    ]


