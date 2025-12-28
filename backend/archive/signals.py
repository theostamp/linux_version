import logging

from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import ArchiveDocument

logger = logging.getLogger(__name__)


@receiver(post_delete, sender=ArchiveDocument)
def delete_archive_document_file(sender, instance: ArchiveDocument, **kwargs):
    """
    Ensure the uploaded file is removed from storage when an ArchiveDocument is deleted.

    Django does not delete FileField files by default on model deletion.
    """
    try:
        if instance.file:
            instance.file.delete(save=False)
    except Exception as exc:
        # Do not break the delete flow if storage deletion fails.
        logger.warning(
            "Failed to delete file for ArchiveDocument %s: %s",
            getattr(instance, "id", None),
            exc,
            exc_info=True,
        )


