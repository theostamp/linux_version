# Generated manually for removing is_issued field from Payment model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('financial', '0019_remove_expense_is_issued'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE financial_payment DROP COLUMN IF EXISTS is_issued;",
            reverse_sql="ALTER TABLE financial_payment ADD COLUMN is_issued BOOLEAN DEFAULT TRUE;",
        ),
    ]

