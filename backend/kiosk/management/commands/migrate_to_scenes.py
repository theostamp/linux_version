"""
Management command to migrate existing widget configurations to scene-based layout
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django_tenants.utils import schema_context
from kiosk.models import KioskWidget, KioskScene, WidgetPlacement
from buildings.models import Building


class Command(BaseCommand):
    help = 'Migrate existing widget configurations to scene-based layouts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--building-id',
            type=int,
            help='Migrate only for a specific building ID',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force migration even if scenes already exist',
        )

    def handle(self, *args, **options):
        building_id = options.get('building_id')
        force = options.get('force', False)

        with schema_context('demo'):
            # Get all buildings or specific building
            if building_id:
                buildings = Building.objects.filter(id=building_id)
                if not buildings.exists():
                    self.stdout.write(self.style.ERROR(f'Building {building_id} not found'))
                    return
            else:
                buildings = Building.objects.all()

            total_scenes_created = 0
            total_placements_created = 0

            for building in buildings:
                self.stdout.write(f'\nProcessing building: {building.name} (ID: {building.id})')

                # Check if scenes already exist for this building
                existing_scenes = KioskScene.objects.filter(building=building).count()
                if existing_scenes > 0 and not force:
                    self.stdout.write(
                        self.style.WARNING(
                            f'  Skipping - {existing_scenes} scene(s) already exist. Use --force to override.'
                        )
                    )
                    continue

                # Get all enabled widgets for this building
                widgets = KioskWidget.objects.filter(
                    building=building,
                    enabled=True
                ).order_by('category', 'order')

                if not widgets.exists():
                    self.stdout.write(self.style.WARNING('  No enabled widgets found'))
                    continue

                # Group widgets by category
                main_widgets = widgets.filter(category='main_slides')
                sidebar_widgets = widgets.filter(category='sidebar_widgets')
                topbar_widgets = widgets.filter(category='top_bar_widgets')

                # Create default scenes
                with transaction.atomic():
                    scenes_created = 0
                    placements_created = 0

                    # Scene 1: Main content with all main widgets (one per scene for now)
                    for idx, widget in enumerate(main_widgets):
                        scene = KioskScene.objects.create(
                            building=building,
                            name=f'{widget.greek_name}',
                            order=idx,
                            duration_seconds=30,
                            transition='fade',
                            is_enabled=True
                        )
                        scenes_created += 1

                        # Create placement for main widget (full screen)
                        WidgetPlacement.objects.create(
                            scene=scene,
                            widget=widget,
                            grid_row_start=1,
                            grid_col_start=1,
                            grid_row_end=9,  # Full height (8 rows + 1)
                            grid_col_end=13,  # Full width (12 cols + 1)
                            z_index=0
                        )
                        placements_created += 1

                    # If no main widgets, create a default dashboard scene
                    if not main_widgets.exists():
                        scene = KioskScene.objects.create(
                            building=building,
                            name='Αρχική Οθόνη',
                            order=0,
                            duration_seconds=30,
                            transition='fade',
                            is_enabled=True
                        )
                        scenes_created += 1
                        self.stdout.write(self.style.WARNING('  Created default dashboard scene'))

                    total_scenes_created += scenes_created
                    total_placements_created += placements_created

                self.stdout.write(
                    self.style.SUCCESS(
                        f'  Created {scenes_created} scene(s) with {placements_created} placement(s)'
                    )
                )

            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✓ Migration complete! '
                    f'Created {total_scenes_created} scene(s) with {total_placements_created} placement(s)'
                )
            )
            
            if total_scenes_created == 0:
                self.stdout.write(
                    self.style.WARNING(
                        '\nNo new scenes were created. Run with --force to recreate existing scenes.'
                    )
                )

