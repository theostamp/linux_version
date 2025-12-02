# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('office_staff', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='officestaffpermissions',
            name='can_access_office_finance',
            field=models.BooleanField(
                default=False,
                help_text='Μπορεί να βλέπει τα οικονομικά του γραφείου διαχείρισης (έσοδα/έξοδα γραφείου)',
                verbose_name='Πρόσβαση σε Οικονομικά Γραφείου'
            ),
        ),
    ]

