from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financial', '0054_commonexpenseperiod_sheet_attachment'),
    ]

    operations = [
        migrations.AddField(
            model_name='commonexpenseperiod',
            name='notifications_sent_at',
            field=models.DateTimeField(
                blank=True,
                help_text='When common expense notifications were sent for this period',
                null=True
            ),
        ),
    ]
