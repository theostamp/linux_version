# Generated migration for adding vote_source and mills to VoteSubmission

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('votes', '0004_vote_project'),
    ]

    operations = [
        migrations.AddField(
            model_name='votesubmission',
            name='vote_source',
            field=models.CharField(
                choices=[
                    ('app', 'Εφαρμογή'),
                    ('email', 'Email Link'),
                    ('pre_vote', 'Ηλεκτρονικά (Pre-voting)'),
                    ('live', 'Φυσική Παρουσία'),
                    ('proxy', 'Εξουσιοδότηση'),
                ],
                default='app',
                max_length=20,
                verbose_name='Τρόπος Ψηφοφορίας'
            ),
        ),
        migrations.AddField(
            model_name='votesubmission',
            name='mills',
            field=models.PositiveIntegerField(
                default=0,
                verbose_name='Χιλιοστά',
                help_text='Χιλιοστά συμμετοχής του διαμερίσματος'
            ),
        ),
    ]

