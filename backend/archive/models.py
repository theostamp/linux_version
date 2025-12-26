from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from buildings.models import Building

User = get_user_model()


class ArchiveDocument(models.Model):
    """Στοιχεία Ηλεκτρονικού Αρχείου Πολυκατοικίας."""

    class Category(models.TextChoices):
        ASSEMBLY_MINUTES = "assembly_minutes", _("Πρακτικά Γενικής Συνέλευσης")
        BUILDING_PLANS = "building_plans", _("Κατόψεις Κτιρίου")
        EXPENSE_RECEIPT = "expense_receipt", _("Παραστατικά Δαπανών")
        PAYMENT_RECEIPT = "payment_receipt", _("Αποδείξεις Πληρωμής")
        INCOME_RECEIPT = "income_receipt", _("Αποδείξεις Είσπραξης")
        REGULATIONS = "regulations", _("Εσωτερικός Κανονισμός")
        MAINTENANCE_CONTRACT = "maintenance_contract", _("Συμβάσεις Συντήρησης")
        INSURANCE = "insurance", _("Ασφάλεια Κτιρίου")
        CERTIFICATE = "certificate", _("Πιστοποιητικά")
        OTHER = "other", _("Λοιπά")

    class DocumentType(models.TextChoices):
        INVOICE = "invoice", _("Τιμολόγιο")
        RECEIPT = "receipt", _("Απόδειξη")
        CREDIT_NOTE = "credit_note", _("Πιστωτικό")
        DEBIT_NOTE = "debit_note", _("Χρεωστικό")
        OTHER = "other", _("Άλλο")

    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name="archive_documents",
        verbose_name=_("Κτίριο"),
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="archive_documents",
        verbose_name=_("Μεταφορτώθηκε από"),
    )

    category = models.CharField(
        max_length=50,
        choices=Category.choices,
        verbose_name=_("Κατηγορία"),
    )
    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices,
        blank=True,
        verbose_name=_("Είδος Παραστατικού"),
    )
    document_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Αριθμός Παραστατικού"),
    )
    supplier_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("Προμηθευτής"),
    )
    supplier_vat = models.CharField(
        max_length=20,
        blank=True,
        verbose_name=_("ΑΦΜ Προμηθευτή"),
    )
    document_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Ημερομηνία Παραστατικού"),
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Ποσό"),
    )
    currency = models.CharField(
        max_length=10,
        default="EUR",
        verbose_name=_("Νόμισμα"),
    )
    title = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("Τίτλος"),
    )
    description = models.TextField(
        blank=True,
        verbose_name=_("Περιγραφή"),
    )

    file = models.FileField(
        upload_to="archive_documents/%Y/%m/",
        verbose_name=_("Αρχείο"),
    )
    original_filename = models.CharField(max_length=255, verbose_name=_("Αρχικό Όνομα"))
    file_size = models.PositiveIntegerField(verbose_name=_("Μέγεθος"))
    mime_type = models.CharField(max_length=100, verbose_name=_("MIME Type"))

    metadata = models.JSONField(
        null=True,
        blank=True,
        verbose_name=_("Μεταδεδομένα"),
    )

    linked_expense = models.ForeignKey(
        "financial.Expense",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="archive_documents",
        verbose_name=_("Σύνδεση με Δαπάνη"),
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Δημιουργήθηκε"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Ενημερώθηκε"))

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Archive Document"
        verbose_name_plural = "Archive Documents"

    def __str__(self) -> str:
        label = self.title or self.original_filename
        return f"{label} ({self.get_category_display()})"
