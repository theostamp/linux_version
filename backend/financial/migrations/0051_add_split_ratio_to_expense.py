# Generated manually for Expense Allocation Plan

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financial', '0050_delete_financialauditlog'),
    ]

    operations = [
        migrations.AddField(
            model_name='expense',
            name='split_ratio',
            field=models.DecimalField(
                blank=True,
                decimal_places=4,
                help_text='Ποσοστό που πληρώνει ο ιδιοκτήτης σε περιπτώσεις κοινής ευθύνης (0.0-1.0). Αν είναι null, χρησιμοποιείται 50-50.',
                max_digits=5,
                null=True,
                verbose_name='Ποσοστό Κατανομής'
            ),
        ),
    ]

