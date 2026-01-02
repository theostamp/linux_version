from django.db import migrations, models
import financial.models


class Migration(migrations.Migration):

    dependencies = [
        ('financial', '0053_alter_expense_category'),
    ]

    operations = [
        migrations.AddField(
            model_name='commonexpenseperiod',
            name='sheet_attachment',
            field=models.FileField(
                blank=True,
                help_text='Αρχείο φύλλου κοινοχρήστων (JPG/PDF)',
                null=True,
                upload_to=financial.models.common_expense_sheet_upload_to,
                verbose_name='Φύλλο Κοινοχρήστων',
            ),
        ),
    ]
