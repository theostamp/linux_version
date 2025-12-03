"""
Management command to create chat rooms for buildings that don't have one.
"""
from django.core.management.base import BaseCommand
from buildings.models import Building
from chat.models import ChatRoom


class Command(BaseCommand):
    help = 'Creates chat rooms for buildings that do not have one'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        
        # Get all buildings without chat rooms
        buildings_without_chat = Building.objects.exclude(
            id__in=ChatRoom.objects.values_list('building_id', flat=True)
        )
        
        count = buildings_without_chat.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('Όλα τα κτίρια έχουν ήδη chat room!'))
            return
        
        self.stdout.write(f'Βρέθηκαν {count} κτίρια χωρίς chat room.')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - Τα παρακάτω chat rooms ΔΕΝ θα δημιουργηθούν:'))
        
        created_count = 0
        for building in buildings_without_chat:
            if dry_run:
                self.stdout.write(f'  - Θα δημιουργούνταν: Chat Room για "{building.name}"')
            else:
                chat_room = ChatRoom.objects.create(
                    building=building,
                    name=f'Chat - {building.name}',
                    is_active=True
                )
                self.stdout.write(f'  ✓ Δημιουργήθηκε: Chat Room για "{building.name}" (ID: {chat_room.id})')
                created_count += 1
        
        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f'\nΔημιουργήθηκαν {created_count} chat rooms επιτυχώς!'))

