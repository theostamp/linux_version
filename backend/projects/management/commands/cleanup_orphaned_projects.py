"""
Management command για καθαρισμό orphaned projects.

Όταν διαγράφεται ένα tenant, τα projects που ανήκουν σε αυτόν
μπορεί να μείνουν orphaned αν το schema δεν διαγραφεί σωστά.
Αυτό το command βρίσκει και διαγράφει τέτοια projects.
"""

from django.core.management.base import BaseCommand
from django.db import connection
from django_tenants.utils import schema_context, get_tenant_model
from projects.models import Project
from buildings.models import Building
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Βρίσκει και διαγράφει orphaned projects που ανήκουν σε διαγραμμένους tenants'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Εμφάνιση των projects που θα διαγραφούν χωρίς να γίνει διαγραφή',
        )
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Διαγραφή των orphaned projects',
        )
        parser.add_argument(
            '--schema',
            type=str,
            help='Έλεγχος μόνο για συγκεκριμένο schema',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        delete = options['delete']
        schema_name = options.get('schema')

        if not dry_run and not delete:
            self.stdout.write(
                self.style.WARNING(
                    '⚠️  Χρειάζεται να ορίσεις --dry-run για προεπισκόπηση ή --delete για διαγραφή'
                )
            )
            return

        Tenant = get_tenant_model()
        
        # Λίστα με όλα τα ενεργά tenant schemas
        active_schemas = set()
        for tenant in Tenant.objects.filter(is_active=True):
            active_schemas.add(tenant.schema_name)
        
        self.stdout.write(f'📊 Βρέθηκαν {len(active_schemas)} ενεργά tenant schemas')
        
        orphaned_projects = []
        orphaned_buildings = []
        
        # Έλεγχος κάθε ενεργού schema
        for schema in active_schemas:
            if schema_name and schema != schema_name:
                continue
                
            try:
                with schema_context(schema):
                    # Έλεγχος για orphaned buildings (buildings που δεν έχουν manager_id ή έχουν invalid manager_id)
                    buildings = Building.objects.all()
                    
                    for building in buildings:
                        # Έλεγχος αν το building έχει valid manager
                        if building.manager_id:
                            try:
                                # Έλεγχος αν ο manager υπάρχει στο public schema
                                with connection.cursor() as cursor:
                                    cursor.execute(
                                        "SELECT id FROM public.users_customuser WHERE id = %s",
                                        [building.manager_id]
                                    )
                                    if not cursor.fetchone():
                                        # Orphaned building - ο manager δεν υπάρχει
                                        orphaned_buildings.append({
                                            'schema': schema,
                                            'building': building,
                                            'reason': f'Manager ID {building.manager_id} δεν υπάρχει'
                                        })
                            except Exception as e:
                                self.stdout.write(
                                    self.style.WARNING(f'⚠️  Σφάλμα κατά τον έλεγχο building {building.id} στο schema {schema}: {e}')
                                )
                        
                        # Έλεγχος για orphaned projects (projects με invalid building references)
                        try:
                            projects = Project.objects.filter(building=building)
                            for project in projects:
                                # Αν το building είναι orphaned, τότε και τα projects είναι orphaned
                                if any(b['building'].id == building.id for b in orphaned_buildings):
                                    orphaned_projects.append({
                                        'schema': schema,
                                        'project': project,
                                        'building': building,
                                        'reason': 'Building έχει invalid manager'
                                    })
                        except Exception as e:
                            self.stdout.write(
                                self.style.WARNING(f'⚠️  Σφάλμα κατά τον έλεγχο projects για building {building.id}: {e}')
                            )
            
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Σφάλμα κατά την πρόσβαση στο schema {schema}: {e}')
                )
        
        # Έλεγχος για projects σε schemas που δεν υπάρχουν πλέον
        # Αυτό γίνεται με direct database query για να βρούμε schemas που έχουν projects αλλά δεν υπάρχουν ως tenants
        try:
            with connection.cursor() as cursor:
                # Βρες όλα τα schemas που έχουν projects αλλά δεν είναι στο public.tenants_client
                cursor.execute("""
                    SELECT DISTINCT table_schema 
                    FROM information_schema.tables 
                    WHERE table_schema NOT IN ('public', 'pg_catalog', 'information_schema', 'pg_toast')
                    AND table_name = 'projects_project'
                    AND table_schema NOT IN (SELECT schema_name FROM public.tenants_client WHERE is_active = true)
                """)
                orphaned_schemas = [row[0] for row in cursor.fetchall()]
                
                if orphaned_schemas:
                    self.stdout.write(
                        self.style.WARNING(f'\n⚠️  Βρέθηκαν {len(orphaned_schemas)} schemas με projects αλλά χωρίς ενεργό tenant:')
                    )
                    for orphan_schema in orphaned_schemas:
                        self.stdout.write(f'  - Schema: {orphan_schema}')
                        # Προσπάθησε να βρεις τα projects σε αυτό το schema
                        try:
                            with schema_context(orphan_schema):
                                projects_count = Project.objects.count()
                                buildings_count = Building.objects.count()
                                self.stdout.write(
                                    f'    → Projects: {projects_count}, Buildings: {buildings_count}'
                                )
                                if delete:
                                    self.stdout.write(
                                        self.style.WARNING(
                                            f'    ⚠️  Αυτό το schema δεν μπορεί να διαγραφεί αυτόματα. '
                                            f'Χρειάζεται manual cleanup.'
                                        )
                                    )
                        except Exception as e:
                            self.stdout.write(
                                self.style.ERROR(f'    ✗ Σφάλμα πρόσβασης: {e}')
                            )
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'⚠️  Δεν ήταν δυνατός ο έλεγχος για orphaned schemas: {e}')
            )
        
        # Εμφάνιση αποτελεσμάτων
        if orphaned_buildings:
            self.stdout.write(self.style.WARNING(f'\n🏢 Βρέθηκαν {len(orphaned_buildings)} orphaned buildings:'))
            for item in orphaned_buildings:
                self.stdout.write(
                    f"  - Schema: {item['schema']}, Building: {item['building'].name} (ID: {item['building'].id}), "
                    f"Reason: {item['reason']}"
                )
        
        if orphaned_projects:
            self.stdout.write(self.style.WARNING(f'\n📋 Βρέθηκαν {len(orphaned_projects)} orphaned projects:'))
            for item in orphaned_projects:
                self.stdout.write(
                    f"  - Schema: {item['schema']}, Project: {item['project'].title} (ID: {item['project'].id}), "
                    f"Building: {item['building'].name}, Reason: {item['reason']}"
                )
        
        if not orphaned_projects and not orphaned_buildings:
            self.stdout.write(self.style.SUCCESS('\n✅ Δεν βρέθηκαν orphaned projects ή buildings'))
            return
        
        # Διαγραφή αν ζητήθηκε
        if delete:
            self.stdout.write(self.style.WARNING('\n🗑️  Αρχίζει η διαγραφή...'))
            
            deleted_projects = 0
            deleted_buildings = 0
            
            # Ομαδοποίηση ανά schema
            schemas_to_process = set(item['schema'] for item in orphaned_projects + orphaned_buildings)
            
            for schema in schemas_to_process:
                try:
                    with schema_context(schema):
                        # Διαγραφή orphaned projects
                        schema_projects = [item for item in orphaned_projects if item['schema'] == schema]
                        for item in schema_projects:
                            try:
                                item['project'].delete()
                                deleted_projects += 1
                                self.stdout.write(
                                    f"  ✓ Διαγράφηκε project: {item['project'].title} (ID: {item['project'].id})"
                                )
                            except Exception as e:
                                self.stdout.write(
                                    self.style.ERROR(f"  ✗ Σφάλμα διαγραφής project {item['project'].id}: {e}")
                                )
                        
                        # Διαγραφή orphaned buildings (μόνο αν δεν έχουν projects)
                        schema_buildings = [item for item in orphaned_buildings if item['schema'] == schema]
                        for item in schema_buildings:
                            try:
                                # Έλεγχος αν έχει projects
                                remaining_projects = Project.objects.filter(building=item['building']).count()
                                if remaining_projects == 0:
                                    item['building'].delete()
                                    deleted_buildings += 1
                                    self.stdout.write(
                                        f"  ✓ Διαγράφηκε building: {item['building'].name} (ID: {item['building'].id})"
                                    )
                                else:
                                    self.stdout.write(
                                        self.style.WARNING(
                                            f"  ⚠️  Building {item['building'].name} δεν διαγράφηκε - έχει {remaining_projects} projects"
                                        )
                                    )
                            except Exception as e:
                                self.stdout.write(
                                    self.style.ERROR(f"  ✗ Σφάλμα διαγραφής building {item['building'].id}: {e}")
                                )
                
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'❌ Σφάλμα κατά την πρόσβαση στο schema {schema}: {e}')
                    )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Ολοκληρώθηκε η διαγραφή: {deleted_projects} projects, {deleted_buildings} buildings'
                )
            )
        
        elif dry_run:
            self.stdout.write(
                self.style.WARNING(
                    '\n💡 Αυτή είναι μια dry-run. Για πραγματική διαγραφή, χρησιμοποίησε --delete'
                )
            )

