import os
from datetime import timedelta
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from document_parser.models import DocumentUpload
from tenants.models import Client
from django_tenants.utils import schema_context

class Command(BaseCommand):
    help = (
        "Cleans up old, completed DocumentUpload records and their associated files. "
        "Deletes records with 'completed' status older than a specified number of days."
    )

    def add_arguments(self, parser):
        """
        Προσθέτει τα ορίσματα που δέχεται η εντολή.
        """
        parser.add_argument(
            '--days',
            type=int,
            default=180,
            help='Διαγραφή εγγραφών παλαιότερων από τόσες ημέρες. Προεπιλογή: 180.'
        )
        parser.add_argument(
            '--schema',
            type=str,
            help='Εκτέλεση για συγκεκριμένο tenant schema. Αν δεν δοθεί, εκτελείται για όλους.'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Προσομοίωση της εντολής χωρίς πραγματική διαγραφή αρχείων ή εγγραφών."
        )

    def handle(self, *args, **options):
        """
        Η κύρια λογική της εντολής.
        """
        days = options['days']
        schema_name = options['schema']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING("--- ΛΕΙΤΟΥΡΓΙΑ DRY RUN ---"))
            self.stdout.write(self.style.WARNING("Δεν θα διαγραφεί κανένα αρχείο ή εγγραφή."))

        if schema_name:
            tenants = [Client.objects.get(schema_name=schema_name)]
        else:
            tenants = Client.objects.exclude(schema_name='public')
        
        self.stdout.write(f"Έλεγχος για ολοκληρωμένα έγγραφα παλαιότερα από {days} ημέρες...")
        
        total_deleted_count = 0

        for tenant in tenants:
            with schema_context(tenant.schema_name):
                self.stdout.write(self.style.SUCCESS(f"\nΕπεξεργασία tenant: {tenant.name} ({tenant.schema_name})"))
                
                cutoff_date = timezone.now() - timedelta(days=days)
                
                docs_to_delete = DocumentUpload.objects.filter(status='completed', created_at__lt=cutoff_date)
                count = docs_to_delete.count()
                
                if count == 0:
                    self.stdout.write("Δεν βρέθηκαν παλιά έγγραφα για καθαρισμό.")
                    continue
                
                self.stdout.write(f"Βρέθηκαν {count} έγγραφα προς διαγραφή.")

                if dry_run:
                    for doc in docs_to_delete:
                        self.stdout.write(f"  [DRY RUN] Θα διαγραφόταν το αρχείο: {doc.original_file.name} (ID: {doc.id})")
                else:
                    # Πρώτα διαγράφουμε τα φυσικά αρχεία
                    for doc in docs_to_delete:
                        if doc.original_file:
                            doc.original_file.delete(save=False)
                    
                    # Έπειτα διαγράφουμε τις εγγραφές από τη βάση μαζικά
                    deleted_count, _ = docs_to_delete.delete()
                    total_deleted_count += deleted_count
                    self.stdout.write(self.style.SUCCESS(f"  Επιτυχής διαγραφή {deleted_count} εγγραφών από τη βάση."))

        self.stdout.write("\n" + "="*50)
        if dry_run:
            self.stdout.write(self.style.SUCCESS("Η προσομοίωση ολοκληρώθηκε. Δεν έγιναν αλλαγές."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Ο καθαρισμός ολοκληρώθηκε. Συνολικές εγγραφές που διαγράφηκαν: {total_deleted_count}"))