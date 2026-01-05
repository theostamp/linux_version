from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("buildings", "0029_building_trial_ends_at"),
        ("users", "0022_add_tenant_schema_name_to_invitation"),
        ("apartments", "0011_apartment_kiosk_token"),
        ("notifications", "0007_rename_notificatio_user_id_7d2f1b_idx_notificatio_user_id_17bef5_idx_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="EmailBatch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("purpose", models.CharField(choices=[("common_expense", "Common Expense"), ("debt_reminder", "Debt Reminder"), ("general", "General")], db_index=True, max_length=50)),
                ("subject", models.CharField(blank=True, max_length=255)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("building", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="email_batches", to="buildings.building")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="email_batches", to="users.customuser")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="EmailBatchRecipient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("status", models.CharField(choices=[("invalid", "Invalid"), ("sent_to_provider", "Sent to Provider"), ("failed_immediate", "Failed Immediate"), ("delivered", "Delivered"), ("bounced_hard", "Bounced Hard"), ("bounced_soft", "Bounced Soft"), ("blocked", "Blocked"), ("complaint", "Complaint"), ("unknown_final", "Unknown Final")], db_index=True, default="invalid", max_length=30)),
                ("provider_message_id", models.CharField(blank=True, db_index=True, max_length=200)),
                ("provider_request_id", models.CharField(blank=True, max_length=200)),
                ("error_message", models.TextField(blank=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("finalized_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("apartment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="email_batch_recipients", to="apartments.apartment")),
                ("batch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recipients", to="notifications.emailbatch")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="emailbatch",
            index=models.Index(fields=["purpose", "created_at"], name="notificatio_purpose_d4d10a_idx"),
        ),
        migrations.AddIndex(
            model_name="emailbatch",
            index=models.Index(fields=["building", "created_at"], name="notificatio_buildin_7a1e0b_idx"),
        ),
        migrations.AddIndex(
            model_name="emailbatchrecipient",
            index=models.Index(fields=["batch", "status"], name="notificatio_batch_i_9d6046_idx"),
        ),
        migrations.AddIndex(
            model_name="emailbatchrecipient",
            index=models.Index(fields=["email", "status"], name="notificatio_email_s_04c556_idx"),
        ),
    ]
