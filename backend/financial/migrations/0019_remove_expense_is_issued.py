# Generated manually for removing is_issued field

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('financial', '0018_add_is_issued_field_back'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='expense',
            name='is_issued',
        ),
    ]

