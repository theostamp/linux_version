"""
Management command για καθαρισμό orphaned VoteSubmissions.

Για linked votes (votes που είναι συνδεδεμένα με Assembly AgendaItem),
οι ψήφοι πρέπει να είναι στο AssemblyVote (canonical source), όχι στο VoteSubmission.
Αυτό το command βρίσκει και διαγράφει VoteSubmission records για linked votes
που δεν έχουν αντίστοιχο AssemblyVote ή είναι orphaned.
"""
from django.core.management.base import BaseCommand
from django.db.models import Q
from django_tenants.utils import tenant_context, get_tenant_model
from votes.models import VoteSubmission, Vote
from assemblies.models import AgendaItem, AssemblyVote, AssemblyAttendee
from apartments.models import Apartment
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Βρίσκει και διαγράφει orphaned VoteSubmissions για linked votes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Εμφάνιση των VoteSubmissions που θα διαγραφούν χωρίς να γίνει διαγραφή',
        )
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Διαγραφή των orphaned VoteSubmissions',
        )
        parser.add_argument(
            '--tenant',
            type=str,
            help='Έλεγχος μόνο για συγκεκριμένο tenant schema',
        )
        parser.add_argument(
            '--sync-only',
            action='store_true',
            help='Μόνο sync VoteSubmission -> AssemblyVote (όχι διαγραφή)',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        delete = options.get('delete', False)
        sync_only = options.get('sync_only', False)
        specific_tenant = options.get('tenant')

        if not dry_run and not delete and not sync_only:
            self.stdout.write(
                self.style.WARNING(
                    '⚠️  Χρειάζεται να ορίσεις --dry-run για προεπισκόπηση, --delete για διαγραφή, ή --sync-only για sync'
                )
            )
            return

        Tenant = get_tenant_model()
        
        # Get tenants to process
        if specific_tenant:
            tenants = Tenant.objects.filter(schema_name=specific_tenant, is_active=True)
        else:
            tenants = Tenant.objects.filter(is_active=True).exclude(schema_name='public')

        total_orphaned = 0
        total_synced = 0
        total_deleted = 0

        for tenant in tenants:
            self.stdout.write(f'\n📦 Processing tenant: {tenant.schema_name}')
            
            with tenant_context(tenant):
                # Find all VoteSubmissions for linked votes
                try:
                    linked_votes = Vote.objects.filter(
                        agenda_item__isnull=False
                    ).select_related('agenda_item')
                    
                    if not linked_votes.exists():
                        self.stdout.write(self.style.SUCCESS('   ✅ No linked votes found'))
                        continue
                    
                    linked_vote_ids = list(linked_votes.values_list('id', flat=True))
                    submissions = VoteSubmission.objects.filter(vote_id__in=linked_vote_ids)
                    
                    if not submissions.exists():
                        self.stdout.write(self.style.SUCCESS('   ✅ No VoteSubmissions for linked votes'))
                        continue
                    
                    self.stdout.write(f'   📊 Found {submissions.count()} VoteSubmissions for linked votes')
                    
                    orphaned_submissions = []
                    syncable_submissions = []
                    
                    for submission in submissions.select_related('vote', 'user'):
                        vote = submission.vote
                        try:
                            agenda_item = vote.agenda_item
                        except Exception:
                            # Vote claims to be linked but agenda_item doesn't exist
                            orphaned_submissions.append({
                                'submission': submission,
                                'reason': 'Vote claims to be linked but agenda_item does not exist'
                            })
                            continue
                        
                        assembly = agenda_item.assembly
                        
                        # Try to find corresponding AssemblyAttendee
                        attendee = AssemblyAttendee.objects.filter(
                            assembly=assembly,
                            user_id=submission.user_id
                        ).first()
                        
                        # If no attendee by user, try by apartment
                        if not attendee:
                            building = assembly.building
                            apartment = Apartment.objects.filter(
                                building=building
                            ).filter(
                                Q(owner_user_id=submission.user_id) | Q(tenant_user_id=submission.user_id)
                            ).first()
                            
                            if apartment:
                                attendee = AssemblyAttendee.objects.filter(
                                    assembly=assembly,
                                    apartment=apartment
                                ).first()
                        
                        if not attendee:
                            orphaned_submissions.append({
                                'submission': submission,
                                'reason': f'No AssemblyAttendee found for user {submission.user.email} in assembly {assembly.id}'
                            })
                            continue
                        
                        # Check if AssemblyVote exists
                        assembly_vote = AssemblyVote.objects.filter(
                            agenda_item=agenda_item,
                            attendee=attendee
                        ).first()
                        
                        if assembly_vote:
                            # AssemblyVote exists - VoteSubmission is redundant
                            orphaned_submissions.append({
                                'submission': submission,
                                'reason': f'AssemblyVote already exists (ID: {assembly_vote.id})',
                                'assembly_vote': assembly_vote
                            })
                        else:
                            # VoteSubmission exists but no AssemblyVote - can be synced
                            syncable_submissions.append({
                                'submission': submission,
                                'attendee': attendee,
                                'agenda_item': agenda_item
                            })
                    
                    # Display results
                    if syncable_submissions:
                        self.stdout.write(
                            self.style.WARNING(f'\n   🔄 Found {len(syncable_submissions)} VoteSubmissions that can be synced:')
                        )
                        for item in syncable_submissions[:10]:  # Show first 10
                            sub = item['submission']
                            self.stdout.write(
                                f'      - Submission {sub.id}: User {sub.user.email}, Vote {sub.vote.title}'
                            )
                        if len(syncable_submissions) > 10:
                            self.stdout.write(f'      ... and {len(syncable_submissions) - 10} more')
                    
                    if orphaned_submissions:
                        self.stdout.write(
                            self.style.WARNING(f'\n   🗑️  Found {len(orphaned_submissions)} orphaned VoteSubmissions:')
                        )
                        for item in orphaned_submissions[:10]:  # Show first 10
                            sub = item['submission']
                            self.stdout.write(
                                f'      - Submission {sub.id}: User {sub.user.email}, Reason: {item["reason"]}'
                            )
                        if len(orphaned_submissions) > 10:
                            self.stdout.write(f'      ... and {len(orphaned_submissions) - 10} more')
                    
                    # Sync if requested
                    if sync_only and syncable_submissions:
                        self.stdout.write(f'\n   🔄 Syncing {len(syncable_submissions)} VoteSubmissions to AssemblyVote...')
                        from assemblies.services import VoteIntegrationService
                        
                        synced = 0
                        for item in syncable_submissions:
                            try:
                                service = VoteIntegrationService(item['agenda_item'])
                                result = service.sync_vote_results(user_id=item['submission'].user_id)
                                if result > 0:
                                    synced += 1
                                    if not dry_run:
                                        self.stdout.write(
                                            self.style.SUCCESS(
                                                f'      ✅ Synced submission {item["submission"].id}'
                                            )
                                        )
                            except Exception as e:
                                self.stdout.write(
                                    self.style.ERROR(
                                        f'      ✗ Failed to sync submission {item["submission"].id}: {e}'
                                    )
                                )
                        
                        total_synced += synced
                        self.stdout.write(
                            self.style.SUCCESS(f'   ✅ Synced {synced}/{len(syncable_submissions)} submissions')
                        )
                    
                    # Delete if requested
                    if delete and orphaned_submissions:
                        self.stdout.write(f'\n   🗑️  Deleting {len(orphaned_submissions)} orphaned VoteSubmissions...')
                        
                        deleted = 0
                        for item in orphaned_submissions:
                            try:
                                if dry_run:
                                    self.stdout.write(
                                        f'      Would delete submission {item["submission"].id}'
                                    )
                                else:
                                    item['submission'].delete()
                                    deleted += 1
                                    self.stdout.write(
                                        self.style.SUCCESS(
                                            f'      ✅ Deleted submission {item["submission"].id}'
                                        )
                                    )
                            except Exception as e:
                                self.stdout.write(
                                    self.style.ERROR(
                                        f'      ✗ Failed to delete submission {item["submission"].id}: {e}'
                                    )
                                )
                        
                        total_deleted += deleted
                        self.stdout.write(
                            self.style.SUCCESS(f'   ✅ Deleted {deleted}/{len(orphaned_submissions)} submissions')
                        )
                    
                    total_orphaned += len(orphaned_submissions)
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'   ❌ Error processing tenant {tenant.schema_name}: {e}')
                    )
                    logger.exception(f"Error processing tenant {tenant.schema_name}")
        
        # Summary
        self.stdout.write('\n' + '=' * 70)
        if sync_only:
            self.stdout.write(
                self.style.SUCCESS(f'✅ Synced {total_synced} VoteSubmissions to AssemblyVote')
            )
        if delete:
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(f'🔍 DRY RUN: Would delete {total_orphaned} orphaned VoteSubmissions')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Deleted {total_deleted} orphaned VoteSubmissions')
                )
        elif dry_run:
            self.stdout.write(
                self.style.WARNING(f'🔍 DRY RUN: Found {total_orphaned} orphaned VoteSubmissions')
            )
        
        if not sync_only and not delete and not dry_run:
            self.stdout.write(
                self.style.SUCCESS(f'✅ Found {total_orphaned} orphaned VoteSubmissions')
            )

