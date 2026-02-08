from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financial', '0057_cash_funding'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='expense',
            index=models.Index(fields=['building', 'date'], name='fin_exp_bldg_date_idx'),
        ),
        migrations.AddIndex(
            model_name='expense',
            index=models.Index(fields=['building', 'category', 'date'], name='fin_exp_bldg_cat_date_idx'),
        ),
        migrations.AddIndex(
            model_name='expense',
            index=models.Index(fields=['building', 'created_at'], name='fin_exp_bldg_created_idx'),
        ),
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['building', 'date'], name='fin_txn_bldg_date_idx'),
        ),
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(
                fields=['apartment', 'reference_type', 'type', 'reference_id'],
                name='fin_txn_apt_ref_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['apartment', 'date', 'created_at'], name='fin_pay_aptdtcrt_idx'),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['date'], name='fin_pay_date_idx'),
        ),
        migrations.AddIndex(
            model_name='expensepayment',
            index=models.Index(fields=['expense', 'payment_date'], name='fin_exppay_exp_dt_idx'),
        ),
        migrations.AddIndex(
            model_name='expensepayment',
            index=models.Index(fields=['payment_date'], name='fin_exppay_date_idx'),
        ),
        migrations.AddIndex(
            model_name='cashfunding',
            index=models.Index(fields=['building', 'funding_date'], name='fin_cash_bldg_date_idx'),
        ),
        migrations.AddIndex(
            model_name='commonexpenseperiod',
            index=models.Index(fields=['building', 'start_date'], name='fin_period_bldg_start_idx'),
        ),
        migrations.AddIndex(
            model_name='commonexpenseperiod',
            index=models.Index(fields=['building', 'is_active', 'start_date'], name='fin_period_bldg_act_idx'),
        ),
    ]
