from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ("document_parser", "0002_add_new_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="documentupload",
            name="file_hash",
            field=models.CharField(
                blank=True,
                null=True,
                db_index=True,
                help_text="SHA-256 hash για αποφυγή διπλών uploads",
                max_length=64,
            ),
        ),
        migrations.AddConstraint(
            model_name="documentupload",
            constraint=models.UniqueConstraint(
                fields=("building", "file_hash"),
                condition=Q(file_hash__isnull=False) & ~Q(file_hash=""),
                name="uniq_document_upload_building_file_hash",
            ),
        ),
    ]


