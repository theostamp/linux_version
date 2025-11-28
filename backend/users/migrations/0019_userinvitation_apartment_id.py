# Generated migration for adding apartment_id to UserInvitation

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0018_alter_customuser_role_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='userinvitation',
            name='apartment_id',
            field=models.PositiveIntegerField(
                blank=True, 
                help_text='ID του διαμερίσματος στο οποίο θα συνδεθεί ο χρήστης', 
                null=True, 
                verbose_name='Apartment ID'
            ),
        ),
    ]

