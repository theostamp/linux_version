from django.db import migrations
from django.db.models import Q


def set_project_expenses_to_owner(apps, schema_editor):
    Expense = apps.get_model('financial', 'Expense')
    db_alias = schema_editor.connection.alias

    project_filters = Q(project__isnull=False) | Q(category__in=['project', 'maintenance_project'])
    (
        Expense.objects.using(db_alias)
        .filter(project_filters)
        .exclude(payer_responsibility='owner')
        .update(payer_responsibility='owner')
    )


class Migration(migrations.Migration):

    dependencies = [
        ('financial', '0051_add_split_ratio_to_expense'),
    ]

    operations = [
        migrations.RunPython(set_project_expenses_to_owner, migrations.RunPython.noop),
    ]

