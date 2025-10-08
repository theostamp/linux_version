# Generated manually on 2025-10-08

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0006_alter_projectvote_offer_alter_projectvote_project'),
        ('financial', '0041_recurringexpenseconfig'),
    ]

    operations = [
        migrations.AddField(
            model_name='expense',
            name='project',
            field=models.ForeignKey(
                blank=True,
                help_text='Αν η δαπάνη δημιουργήθηκε από έγκριση προσφοράς έργου',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='project_expenses',
                to='projects.project',
                verbose_name='Συνδεδεμένο Έργο'
            ),
        ),
        migrations.AddField(
            model_name='expense',
            name='audit_trail',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Καταγραφή δημιουργίας και τροποποιήσεων: offer_id, project_id, created_by, etc.',
                verbose_name='Ιστορικό Αλλαγών'
            ),
        ),
    ]
