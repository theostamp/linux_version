from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ("archive", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="archivedocument",
            name="file_hash",
            field=models.CharField(
                blank=True,
                null=True,
                db_index=True,
                help_text="SHA-256 hash για αποφυγή διπλών uploads",
                max_length=64,
                verbose_name="Hash Αρχείου",
            ),
        ),
        migrations.AddConstraint(
            model_name="archivedocument",
            constraint=models.UniqueConstraint(
                fields=("building", "file_hash"),
                condition=Q(file_hash__isnull=False) & ~Q(file_hash=""),
                name="uniq_archive_document_building_file_hash",
            ),
        ),
    ]


