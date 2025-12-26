from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("buildings", "0026_internal_manager_framework"),
        ("financial", "0053_alter_expense_category"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ArchiveDocument",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("assembly_minutes", "Πρακτικά Γενικής Συνέλευσης"),
                            ("building_plans", "Κατόψεις Κτιρίου"),
                            ("expense_receipt", "Παραστατικά Δαπανών"),
                            ("payment_receipt", "Αποδείξεις Πληρωμής"),
                            ("income_receipt", "Αποδείξεις Είσπραξης"),
                            ("regulations", "Εσωτερικός Κανονισμός"),
                            ("maintenance_contract", "Συμβάσεις Συντήρησης"),
                            ("insurance", "Ασφάλεια Κτιρίου"),
                            ("certificate", "Πιστοποιητικά"),
                            ("other", "Λοιπά"),
                        ],
                        max_length=50,
                        verbose_name="Κατηγορία",
                    ),
                ),
                (
                    "document_type",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("invoice", "Τιμολόγιο"),
                            ("receipt", "Απόδειξη"),
                            ("credit_note", "Πιστωτικό"),
                            ("debit_note", "Χρεωστικό"),
                            ("other", "Άλλο"),
                        ],
                        max_length=20,
                        verbose_name="Είδος Παραστατικού",
                    ),
                ),
                (
                    "document_number",
                    models.CharField(
                        blank=True,
                        max_length=100,
                        verbose_name="Αριθμός Παραστατικού",
                    ),
                ),
                (
                    "supplier_name",
                    models.CharField(
                        blank=True,
                        max_length=255,
                        verbose_name="Προμηθευτής",
                    ),
                ),
                (
                    "supplier_vat",
                    models.CharField(
                        blank=True,
                        max_length=20,
                        verbose_name="ΑΦΜ Προμηθευτή",
                    ),
                ),
                (
                    "document_date",
                    models.DateField(
                        blank=True,
                        null=True,
                        verbose_name="Ημερομηνία Παραστατικού",
                    ),
                ),
                (
                    "amount",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=12,
                        null=True,
                        verbose_name="Ποσό",
                    ),
                ),
                (
                    "currency",
                    models.CharField(
                        default="EUR",
                        max_length=10,
                        verbose_name="Νόμισμα",
                    ),
                ),
                (
                    "title",
                    models.CharField(
                        blank=True,
                        max_length=255,
                        verbose_name="Τίτλος",
                    ),
                ),
                (
                    "description",
                    models.TextField(blank=True, verbose_name="Περιγραφή"),
                ),
                (
                    "file",
                    models.FileField(
                        upload_to="archive_documents/%Y/%m/",
                        verbose_name="Αρχείο",
                    ),
                ),
                (
                    "original_filename",
                    models.CharField(
                        max_length=255,
                        verbose_name="Αρχικό Όνομα",
                    ),
                ),
                ("file_size", models.PositiveIntegerField(verbose_name="Μέγεθος")),
                (
                    "mime_type",
                    models.CharField(
                        max_length=100,
                        verbose_name="MIME Type",
                    ),
                ),
                (
                    "metadata",
                    models.JSONField(
                        blank=True,
                        null=True,
                        verbose_name="Μεταδεδομένα",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True,
                        verbose_name="Δημιουργήθηκε",
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(
                        auto_now=True,
                        verbose_name="Ενημερώθηκε",
                    ),
                ),
                (
                    "building",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="archive_documents",
                        to="buildings.building",
                        verbose_name="Κτίριο",
                    ),
                ),
                (
                    "linked_expense",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="archive_documents",
                        to="financial.expense",
                        verbose_name="Σύνδεση με Δαπάνη",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="archive_documents",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Μεταφορτώθηκε από",
                    ),
                ),
            ],
            options={
                "verbose_name": "Archive Document",
                "verbose_name_plural": "Archive Documents",
                "ordering": ["-created_at"],
            },
        ),
    ]
