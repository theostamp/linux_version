from django.core.management.base import BaseCommand, CommandError
from document_parser.services import GoogleDocumentAIService
import os
import mimetypes
from pprint import pprint

class Command(BaseCommand):
    help = 'Δοκιμάζει την υπηρεσία Google Document AI με ένα τοπικό αρχείο.'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Η απόλυτη διαδρομή προς το αρχείο του παραστατικού.')

    def handle(self, *args, **options):
        file_path = options['file_path']

        if not os.path.exists(file_path):
            raise CommandError(f"Το αρχείο δεν βρέθηκε στη διαδρομή: {file_path}")

        self.stdout.write(self.style.SUCCESS(f"🚀 Επεξεργασία εγγράφου: {file_path}"))

        try:
            # Αυτόματη εύρεση του MIME type
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                raise CommandError("Δεν ήταν δυνατός ο προσδιορισμός του MIME type του αρχείου.")
            
            self.stdout.write(f"📄 MIME Type: {mime_type}")

            # Αρχικοποίηση της υπηρεσίας
            self.stdout.write("⚙️ Αρχικοποίηση Google Document AI Service...")
            service = GoogleDocumentAIService()
            self.stdout.write(self.style.SUCCESS("✅ Η υπηρεσία αρχικοποιήθηκε."))

            # Επεξεργασία του εγγράφου
            self.stdout.write("🧠 Αποστολή εγγράφου στο AI για επεξεργασία...")
            extracted_data, raw_text = service.parse_document(file_path, mime_type)
            self.stdout.write(self.style.SUCCESS("🎉 Η επεξεργασία ολοκληρώθηκε!"))

            # Εκτύπωση αποτελεσμάτων
            self.stdout.write("\n" + "="*50)
            self.stdout.write(self.style.HTTP_INFO("🔬 ΕΞΑΓΟΜΕΝΑ ΔΕΔΟΜΕΝΑ:"))
            self.stdout.write("="*50)
            pprint(extracted_data)

            self.stdout.write("\n" + "="*50)
            self.stdout.write(self.style.HTTP_INFO("📝 ΑΚΑΤΕΡΓΑΣΤΟ ΚΕΙΜΕΝΟ (OCR):"))
            self.stdout.write("="*50)
            self.stdout.write(raw_text[:1000] + "..." if len(raw_text) > 1000 else raw_text)
            
            self.stdout.write(self.style.SUCCESS("\n✅ Η δοκιμή ολοκληρώθηκε με επιτυχία."))

        except Exception as e:
            raise CommandError(f"Παρουσιάστηκε σφάλμα: {e}")
