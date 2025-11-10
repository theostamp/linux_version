from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from document_parser.models import DocumentUpload
from document_parser.tasks import process_document
from django_tenants.utils import schema_context

class Command(BaseCommand):
    help = 'Reprocesses a failed DocumentUpload by its ID for a specific tenant.'

    def add_arguments(self, parser):
        """
        Προσθέτει τα ορίσματα που δέχεται η εντολή.
        """
        parser.add_argument('document_id', type=int, help='The ID of the DocumentUpload to reprocess.')
        parser.add_argument(
            '--schema',
            type=str,
            help='The schema name of the tenant (e.g., "demo").',
            required=True
        )

    def handle(self, *args, **options):
        """
        Η κύρια λογική της εντολής.
        """
        document_id = options['document_id']
        schema_name = options['schema']

        self.stdout.write(f"Attempting to reprocess document ID: {document_id} for tenant schema: {schema_name}")

        with schema_context(schema_name):
            try:
                document = DocumentUpload.objects.get(pk=document_id)
            except DocumentUpload.DoesNotExist:
                raise CommandError(f'DocumentUpload with ID "{document_id}" does not exist in schema "{schema_name}".')

            if document.status != 'failed':
                self.stdout.write(self.style.WARNING(f'Document {document_id} is not in "failed" status. Its current status is "{document.get_status_display()}".'))

            self.stdout.write(self.style.SUCCESS(f'Found document {document.id} for building "{document.building.name}".'))
            
            # Επαναφορά της κατάστασης και εκκαθάριση του σφάλματος
            document.status = 'pending'
            document.error_message = None
            document.save(update_fields=['status', 'error_message'])

            # Κλήση της ασύγχρονης εργασίας για επανεπεξεργασία
            process_document.delay(document.id)

            self.stdout.write(self.style.SUCCESS(f'Successfully queued document {document.id} for reprocessing.'))