from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('buildings', '0029_building_trial_ends_at'),
        ('financial', '0056_expense_payment'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CashFunding',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Ποσό Χρηματοδότησης')),
                ('funding_date', models.DateField(verbose_name='Ημερομηνία Χρηματοδότησης')),
                ('method', models.CharField(choices=[('cash', 'Μετρητά'), ('bank_transfer', 'Τραπεζική Μεταφορά'), ('check', 'Επιταγή'), ('card', 'Κάρτα')], max_length=20, verbose_name='Τρόπος Χρηματοδότησης')),
                ('source_type', models.CharField(choices=[('manager', 'Διαχειριστής'), ('office', 'Γραφείο Διαχείρισης'), ('other', 'Άλλο')], max_length=20, verbose_name='Πηγή Χρηματοδότησης')),
                ('source_name', models.CharField(blank=True, max_length=200, verbose_name='Όνομα Πηγής')),
                ('reference_number', models.CharField(blank=True, max_length=100, verbose_name='Αριθμός Αναφοράς')),
                ('notes', models.TextField(blank=True, verbose_name='Σημειώσεις')),
                ('receipt', models.FileField(blank=True, null=True, upload_to='cash_fundings/%Y/%m/', verbose_name='Απόδειξη Χρηματοδότησης')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('building', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cash_fundings', to='buildings.building', verbose_name='Κτίριο')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cash_fundings', to=settings.AUTH_USER_MODEL, verbose_name='Καταχωρήθηκε από')),
            ],
            options={
                'verbose_name': 'Χρηματοδότηση Ταμείου',
                'verbose_name_plural': 'Χρηματοδοτήσεις Ταμείου',
                'ordering': ['-funding_date', '-created_at'],
            },
        ),
    ]
