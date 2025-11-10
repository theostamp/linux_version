"""
Django management command για testing Google Calendar integration

Usage:
    docker exec -it backend python manage.py test_google_calendar
    docker exec -it backend python manage.py test_google_calendar --setup
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from django_tenants.utils import schema_context
from integrations.google_calendar import get_admin_calendar_service
from buildings.models import Building


class Command(BaseCommand):
    help = 'Test Google Calendar API integration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--setup',
            action='store_true',
            help='Setup Google Calendar for demo building',
        )
        parser.add_argument(
            '--building-id',
            type=int,
            default=1,
            help='Building ID to test with (default: 1)',
        )

    def handle(self, *args, **options):
        if not settings.GOOGLE_CALENDAR_ENABLED:
            self.stdout.write(
                self.style.WARNING('Google Calendar integration is disabled. Set GOOGLE_CALENDAR_ENABLED=True')
            )
            return

        building_id = options['building_id']
        
        with schema_context('demo'):
            try:
                building = Building.objects.get(id=building_id)
            except Building.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Building with ID {building_id} not found')
                )
                return

            if options['setup']:
                self._setup_calendar(building)
            else:
                self._test_connection(building)

    def _test_connection(self, building):
        """Test basic Google Calendar API connection"""
        self.stdout.write('🔍 Testing Google Calendar API connection...')
        
        try:
            service = get_admin_calendar_service()
            if not service:
                self.stdout.write(
                    self.style.ERROR('❌ Failed to initialize Google Calendar service')
                )
                return

            # Test API connection
            if service.test_connection():
                self.stdout.write(
                    self.style.SUCCESS('✅ Google Calendar API connection successful')
                )
                
                # Show building calendar status
                if building.google_calendar_id:
                    self.stdout.write(f'📅 Building has Google Calendar: {building.google_calendar_id}')
                    embed_url = service.get_calendar_embed_url(building.google_calendar_id)
                    self.stdout.write(f'🔗 Embed URL: {embed_url}')
                else:
                    self.stdout.write('⚠️  Building does not have Google Calendar configured')
                    self.stdout.write('   Run with --setup to create one')
            else:
                self.stdout.write(
                    self.style.ERROR('❌ Google Calendar API connection failed')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error testing connection: {e}')
            )

    def _setup_calendar(self, building):
        """Setup Google Calendar for building"""
        self.stdout.write(f'🏗️  Setting up Google Calendar for {building.name}...')
        
        try:
            service = get_admin_calendar_service()
            if not service:
                self.stdout.write(
                    self.style.ERROR('❌ Failed to initialize Google Calendar service')
                )
                return

            if building.google_calendar_id:
                self.stdout.write(
                    self.style.WARNING(f'⚠️  Building already has Google Calendar: {building.google_calendar_id}')
                )
                return

            # Create calendar
            calendar_result = service.create_building_calendar(building.name, building.id)
            
            # Update building record
            building.google_calendar_id = calendar_result['id']
            building.google_calendar_enabled = True
            building.save()

            self.stdout.write(
                self.style.SUCCESS(f'✅ Created Google Calendar for {building.name}')
            )
            self.stdout.write(f'📅 Calendar ID: {calendar_result["id"]}')
            
            embed_url = service.get_calendar_embed_url(calendar_result['id'])
            public_url = service.get_calendar_public_url(calendar_result['id'])
            
            self.stdout.write(f'🔗 Embed URL: {embed_url}')
            self.stdout.write(f'🌐 Public URL: {public_url}')
            
            # Test sharing (optional)
            if settings.GOOGLE_ADMIN_EMAIL:
                self.stdout.write(f'📧 Testing calendar sharing with {settings.GOOGLE_ADMIN_EMAIL}...')
                if service.share_calendar_with_user(calendar_result['id'], settings.GOOGLE_ADMIN_EMAIL):
                    self.stdout.write(
                        self.style.SUCCESS('✅ Calendar sharing test successful')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING('⚠️  Calendar sharing test failed')
                    )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error setting up calendar: {e}')
            )
            # Cleanup on error
            if hasattr(building, 'google_calendar_id') and building.google_calendar_id:
                building.google_calendar_id = None
                building.google_calendar_enabled = False
                building.save()