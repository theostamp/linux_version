from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('financial', '0055_commonexpenseperiod_notifications_sent_at'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ExpensePayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Ποσό Πληρωμής')),
                ('payment_date', models.DateField(verbose_name='Ημερομηνία Εξόφλησης')),
                ('method', models.CharField(choices=[('cash', 'Μετρητά'), ('bank_transfer', 'Τραπεζική Μεταφορά'), ('check', 'Επιταγή'), ('card', 'Κάρτα')], max_length=20, verbose_name='Τρόπος Πληρωμής')),
                ('reference_number', models.CharField(blank=True, max_length=100, verbose_name='Αριθμός Αναφοράς')),
                ('notes', models.TextField(blank=True, verbose_name='Σημειώσεις')),
                ('receipt', models.FileField(blank=True, null=True, upload_to='expense_payments/%Y/%m/', verbose_name='Απόδειξη Πληρωμής')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='expense_payments', to=settings.AUTH_USER_MODEL, verbose_name='Καταχωρήθηκε από')),
                ('expense', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='financial.expense', verbose_name='Δαπάνη')),
            ],
            options={
                'verbose_name': 'Εξόφληση Δαπάνης',
                'verbose_name_plural': 'Εξοφλήσεις Δαπανών',
                'ordering': ['-payment_date', '-created_at'],
            },
        ),
    ]
