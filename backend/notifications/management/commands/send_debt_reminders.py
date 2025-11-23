"""
Management command για αυτόματη αποστολή υπενθυμίσεων οφειλών

Usage:
    # Αποστολή υπενθυμίσεων για όλα τα κτίρια
    python manage.py send_debt_reminders

    # Αποστολή για συγκεκριμένο κτίριο
    python manage.py send_debt_reminders --building-id 1

    # Test mode (χωρίς πραγματική αποστολή)
    python manage.py send_debt_reminders --test

    # Αποστολή μόνο σε διαμερίσματα με οφειλή >100€
    python manage.py send_debt_reminders --min-debt 100

    # Test αποστολή σε συγκεκριμένο email
    python manage.py send_debt_reminders --test-email test@example.com
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context
from decimal import Decimal
from datetime import datetime

from buildings.models import Building
from notifications.models import NotificationTemplate
from notifications.debt_reminder_service import DebtReminderService


class Command(BaseCommand):
    help = 'Αποστολή αυτόματων υπενθυμίσεων οφειλών με εξατομικευμένα δεδομένα'

    def add_arguments(self, parser):
        parser.add_argument(
            '--building-id',
            type=int,
            help='ID συγκεκριμένου κτιρίου (αλλιώς όλα)'
        )
        parser.add_argument(
            '--min-debt',
            type=float,
            default=0.01,
            help='Ελάχιστο ποσό οφειλής για αποστολή (default: 0.01€)'
        )
        parser.add_argument(
            '--test',
            action='store_true',
            help='Test mode - δεν στέλνει πραγματικά emails'
        )
        parser.add_argument(
            '--test-email',
            type=str,
            help='Email για test αποστολή'
        )
        parser.add_argument(
            '--template-id',
            type=int,
            help='ID συγκεκριμένου template (αλλιώς χρησιμοποιεί το default)'
        )
        parser.add_argument(
            '--month',
            type=str,
            help='Μήνας αναφοράς σε μορφή YYYY-MM (default: τρέχων μήνας)'
        )
        parser.add_argument(
            '--send-to-all',
            action='store_true',
            help='Αποστολή σε όλα τα διαμερίσματα (όχι μόνο με οφειλές)'
        )
        parser.add_argument(
            '--schema',
            type=str,
            default='demo',
            help='Tenant schema (default: demo)'
        )
        parser.add_argument(
            '--create-template',
            action='store_true',
            help='Δημιουργία default template αν δεν υπάρχει'
        )

    def handle(self, *args, **options):
        schema_name = options['schema']
        
        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}'))
        self.stdout.write(self.style.SUCCESS('📧 DEBT REMINDER CAMPAIGN'))
        self.stdout.write(self.style.SUCCESS(f'{"="*60}\n'))

        with schema_context(schema_name):
            # Get system user
            User = get_user_model()
            system_user = (
                User.objects.filter(is_superuser=True).first()
                or User.objects.filter(is_staff=True).first()
                or User.objects.first()
            )

            if not system_user:
                raise CommandError('❌ No system user found')

            # Parse target month
            target_month = None
            if options['month']:
                try:
                    target_month = datetime.strptime(options['month'], '%Y-%m').date()
                except ValueError:
                    raise CommandError('❌ Invalid month format. Use YYYY-MM')

            # Get buildings
            if options['building_id']:
                buildings = Building.objects.filter(id=options['building_id'])
                if not buildings.exists():
                    raise CommandError(f'❌ Building with ID {options["building_id"]} not found')
            else:
                buildings = Building.objects.all()

            self.stdout.write(f'🏢 Processing {buildings.count()} building(s)...\n')

            total_sent = 0
            total_failed = 0
            total_debt = Decimal('0.00')

            for building in buildings:
                self.stdout.write(f'\n📍 Building: {building.name or building.street}')
                
                # Get or create template
                if options['template_id']:
                    try:
                        template = NotificationTemplate.objects.get(
                            id=options['template_id'],
                            building=building
                        )
                    except NotificationTemplate.DoesNotExist:
                        raise CommandError(f'❌ Template {options["template_id"]} not found')
                else:
                    # Find existing debt reminder template
                    template = NotificationTemplate.objects.filter(
                        building=building,
                        category='reminder',
                        is_active=True,
                        name__icontains='οφειλ'
                    ).first()

                    if not template:
                        if options['create_template']:
                            self.stdout.write('   📝 Creating default debt reminder template...')
                            template = DebtReminderService.create_default_debt_reminder_template(building)
                        else:
                            self.stdout.write(self.style.WARNING(
                                f'   ⚠️ No debt reminder template found. Use --create-template to create one'
                            ))
                            continue

                self.stdout.write(f'   📋 Template: {template.name}')

                # Send reminders
                if options['test']:
                    self.stdout.write(self.style.WARNING('   🧪 TEST MODE - No emails will be sent'))

                results = DebtReminderService.send_personalized_reminders(
                    building=building,
                    template=template,
                    created_by=system_user,
                    min_debt_amount=Decimal(str(options['min_debt'])),
                    target_month=target_month,
                    send_to_all=options['send_to_all'],
                    test_mode=options['test'],
                    test_email=options['test_email']
                )

                # Display results
                self.stdout.write(f'\n   📊 RESULTS:')
                self.stdout.write(f'   Total Apartments: {results["total_apartments"]}')
                self.stdout.write(self.style.SUCCESS(
                    f'   ✅ Emails Sent: {results["emails_sent"]}'
                ))
                if results['emails_failed'] > 0:
                    self.stdout.write(self.style.ERROR(
                        f'   ❌ Emails Failed: {results["emails_failed"]}'
                    ))
                self.stdout.write(f'   💰 Total Debt Notified: {results["total_debt_notified"]:.2f}€')

                # Show failed apartments if any
                if results['failed_apartments']:
                    self.stdout.write(f'\n   ⚠️ Failed Apartments:')
                    for failed in results['failed_apartments'][:5]:  # Show first 5
                        self.stdout.write(f'      - {failed["apartment"]}: {failed["reason"]}')

                # Show sent apartments in verbose mode
                if options['verbosity'] >= 2 and results['sent_apartments']:
                    self.stdout.write(f'\n   ✅ Sent Apartments:')
                    for sent in results['sent_apartments'][:10]:  # Show first 10
                        self.stdout.write(
                            f'      - {sent["apartment"]}: {sent["email"]} (Debt: {sent["debt"]})'
                        )

                total_sent += results['emails_sent']
                total_failed += results['emails_failed']
                total_debt += results['total_debt_notified']

            # Final summary
            self.stdout.write(f'\n{"-"*60}')
            self.stdout.write(self.style.SUCCESS(f'🎉 CAMPAIGN SUMMARY:'))
            self.stdout.write(f'   Buildings Processed: {buildings.count()}')
            self.stdout.write(self.style.SUCCESS(f'   Total Emails Sent: {total_sent}'))
            if total_failed > 0:
                self.stdout.write(self.style.ERROR(f'   Total Failed: {total_failed}'))
            self.stdout.write(f'   💰 Total Debt Notified: {total_debt:.2f}€')
            self.stdout.write(f'{"-"*60}\n')

            if options['test']:
                self.stdout.write(self.style.WARNING(
                    '⚠️ This was a TEST run. No actual emails were sent.'
                ))
                self.stdout.write(self.style.WARNING(
                    '   Remove --test flag to send real emails.\n'
                ))

