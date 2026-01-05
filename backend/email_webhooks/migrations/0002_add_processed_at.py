from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("email_webhooks", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="emailwebhookevent",
            name="processed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
