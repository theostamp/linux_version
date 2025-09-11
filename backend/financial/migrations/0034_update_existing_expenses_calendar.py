# Generated manually to update existing expenses

from django.db import migrations


def update_existing_expenses_calendar(apps, schema_editor):
    """Ενημέρωση υπάρχουσων δαπανών για προσθήκη στο ημερολόγιο"""
    Expense = apps.get_model('financial', 'Expense')
    
    # Ενημέρωση όλων των υπάρχουσων δαπανών που έχουν due_date
    Expense.objects.filter(due_date__isnull=False).update(add_to_calendar=True)
    
    # Ενημέρωση δαπανών με συγκεκριμένες κατηγορίες που πρέπει να είναι στο ημερολόγιο
    calendar_categories = [
        'electricity_common', 'water_common', 'heating_fuel', 'heating_gas',
        'garbage_collection', 'security', 'elevator_maintenance', 'elevator_inspection'
    ]
    Expense.objects.filter(category__in=calendar_categories).update(add_to_calendar=True)


def reverse_update_existing_expenses_calendar(apps, schema_editor):
    """Αντίστροφη λειτουργία - όλες οι δαπάνες γίνονται add_to_calendar=False"""
    Expense = apps.get_model('financial', 'Expense')
    Expense.objects.all().update(add_to_calendar=False)


class Migration(migrations.Migration):

    dependencies = [
        ('financial', '0033_add_other_category'),
    ]

    operations = [
        migrations.RunPython(
            update_existing_expenses_calendar,
            reverse_update_existing_expenses_calendar,
        ),
    ]
