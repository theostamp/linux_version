"""
Management command to seed default notification templates.
"""
from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context
from notifications.models import NotificationTemplate
from buildings.models import Building


class Command(BaseCommand):
    help = 'Seed default notification templates'

    def handle(self, *args, **kwargs):
        with schema_context('demo'):
            # Get first building for demo
            building = Building.objects.first()
            
            if not building:
                self.stdout.write(
                    self.style.ERROR('No building found. Please create a building first.')
                )
                return

            templates = [
                {
                    'name': 'Υπενθύμιση Οφειλών',
                    'category': 'payment',
                    'description': 'Υπενθύμιση για ληξιπρόθεσμες οφειλές',
                    'subject': 'Υπενθύμιση Οφειλής - {{building_name}}',
                    'body_template': '''Αγαπητέ/ή {{owner_name}},

Σας υπενθυμίζουμε ότι το διαμέρισμά σας ({{apartment_number}}) έχει οφειλή ύψους {{balance}}.

Παρακαλούμε να προβείτε σε τακτοποίηση έως {{next_payment_date}}.

Για οποιαδήποτε διευκρίνιση, επικοινωνήστε μαζί μας:
Τηλέφωνο: {{manager_phone}}
Email: {{manager_email}}

Με εκτίμηση,
Η Διαχείριση
{{building_name}}''',
                    'sms_template': '{{building_name}}: Υπενθύμιση οφειλής {{balance}} για διαμ. {{apartment_number}}. Πληρωμή έως {{next_payment_date}}. Τηλ: {{manager_phone}}',
                    'is_system': True,
                },
                {
                    'name': 'Πρόσκληση Γενικής Συνέλευσης',
                    'category': 'meeting',
                    'description': 'Πρόσκληση για γενική συνέλευση ιδιοκτητών',
                    'subject': 'Πρόσκληση Γενικής Συνέλευσης - {{building_name}}',
                    'body_template': '''Αγαπητοί Ιδιοκτήτες,

Σας καλούμε στη Γενική Συνέλευση της πολυκατοικίας που θα πραγματοποιηθεί:

📅 Ημερομηνία: {{meeting_date}}
🕐 Ώρα: {{meeting_time}}
📍 Τόπος: {{meeting_location}}

Θέματα Ημερήσιας Διάταξης:
{{agenda_items}}

Η παρουσία σας είναι σημαντική!

Με εκτίμηση,
Η Διαχείριση
{{building_name}}''',
                    'sms_template': 'Γενική Συνέλευση {{building_name}}: {{meeting_date}} στις {{meeting_time}}. Τόπος: {{meeting_location}}',
                    'is_system': True,
                },
                {
                    'name': 'Ειδοποίηση Συντήρησης',
                    'category': 'maintenance',
                    'description': 'Ειδοποίηση για εργασίες συντήρησης',
                    'subject': 'Εργασίες Συντήρησης - {{building_name}}',
                    'body_template': '''Αγαπητοί Ενοικοι,

Σας ενημερώνουμε ότι θα πραγματοποιηθούν εργασίες συντήρησης:

📋 Περιγραφή: {{maintenance_description}}
📅 Ημερομηνία: {{maintenance_date}}
🕐 Διάρκεια: {{maintenance_duration}}
⚠️ Επιπτώσεις: {{maintenance_impact}}

Παρακαλούμε να λάβετε τα απαραίτητα μέτρα.

Ευχαριστούμε για την κατανόησή σας.

Η Διαχείριση
{{building_name}}''',
                    'sms_template': 'Συντήρηση {{building_name}}: {{maintenance_description}} στις {{maintenance_date}}. Διάρκεια: {{maintenance_duration}}',
                    'is_system': True,
                },
                {
                    'name': 'Γενική Ανακοίνωση',
                    'category': 'announcement',
                    'description': 'Γενική ανακοίνωση για ενοικούς',
                    'subject': 'Ανακοίνωση - {{building_name}}',
                    'body_template': '''Αγαπητοί Ένοικοι,

{{announcement_body}}

Για περισσότερες πληροφορίες, επικοινωνήστε:
Τηλέφωνο: {{manager_phone}}
Email: {{manager_email}}

Με εκτίμηση,
Η Διαχείριση
{{building_name}}''',
                    'sms_template': '{{building_name}}: {{announcement_body}}',
                    'is_system': False,
                },
                {
                    'name': 'Έκτακτη Ειδοποίηση',
                    'category': 'emergency',
                    'description': 'Επείγουσα ειδοποίηση για έκτακτα περιστατικά',
                    'subject': '⚠️ ΕΠΕΙΓΟΝ - {{building_name}}',
                    'body_template': '''⚠️ ΕΠΕΙΓΟΥΣΑ ΕΙΔΟΠΟΙΗΣΗ ⚠️

{{emergency_message}}

Παρακαλούμε λάβετε άμεσα μέτρα.

Επικοινωνία: {{manager_phone}}

{{building_name}}''',
                    'sms_template': '⚠️ ΕΠΕΙΓΟΝ {{building_name}}: {{emergency_message}}. Τηλ: {{manager_phone}}',
                    'is_system': True,
                },
            ]

            created_count = 0
            for template_data in templates:
                # Check if template already exists
                existing = NotificationTemplate.objects.filter(
                    building=building,
                    name=template_data['name']
                ).first()

                if existing:
                    self.stdout.write(
                        self.style.WARNING(f'Template "{template_data["name"]}" already exists')
                    )
                    continue

                # Create template
                NotificationTemplate.objects.create(
                    building=building,
                    **template_data
                )
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created template: {template_data["name"]}')
                )

            self.stdout.write(
                self.style.SUCCESS(f'\n✅ Created {created_count} notification templates')
            )
