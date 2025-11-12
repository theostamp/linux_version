from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0012_add_stripe_and_tenant_fields'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='customuser',
                    name='username',
                    field=models.CharField(
                        max_length=150,
                        blank=True,
                        default='',
                        db_column='username',
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]

