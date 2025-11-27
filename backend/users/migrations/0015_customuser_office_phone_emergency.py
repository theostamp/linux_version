# Generated manually to add missing office_phone_emergency field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0014_alter_customuser_username_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='office_phone_emergency',
            field=models.CharField(
                blank=True,
                help_text='Τηλέφωνο ανάγκης για επικοινωνία με το γραφείο διαχείρισης',
                max_length=20,
                verbose_name='Τηλέφωνο Ανάγκης Γραφείου Διαχείρισης'
            ),
        ),
    ]

