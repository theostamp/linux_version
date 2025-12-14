# backend/votes/management/commands/backfill_vote_mills.py
"""
Management command για να διορθώσει τα mills στις υπάρχουσες VoteSubmission
που έχουν mills=0 επειδή ψηφίστηκαν πριν προστεθεί η στήλη mills.
"""
from django.core.management.base import BaseCommand
from django.db.models import Q
from django_tenants.utils import tenant_context
from tenants.models import Client
from votes.models import VoteSubmission
from apartments.models import Apartment
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Backfill mills in VoteSubmission records that have mills=0'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant',
            type=str,
            help='Specific tenant schema_name to process (default: all tenants)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        specific_tenant = options.get('tenant')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 DRY RUN MODE - No changes will be made'))
        
        # Get tenants to process
        if specific_tenant:
            tenants = Client.objects.filter(schema_name=specific_tenant)
        else:
            tenants = Client.objects.exclude(schema_name='public')
        
        total_updated = 0
        
        for tenant in tenants:
            self.stdout.write(f'\n📦 Processing tenant: {tenant.schema_name}')
            
            with tenant_context(tenant):
                # Find VoteSubmission records with mills=0
                submissions_to_fix = VoteSubmission.objects.filter(mills=0)
                count = submissions_to_fix.count()
                
                if count == 0:
                    self.stdout.write(self.style.SUCCESS(f'   ✅ No submissions with mills=0'))
                    continue
                
                self.stdout.write(f'   📊 Found {count} submissions with mills=0')
                
                updated = 0
                for submission in submissions_to_fix:
                    user = submission.user
                    vote = submission.vote
                    building = vote.building
                    
                    if not building:
                        self.stdout.write(
                            self.style.WARNING(f'   ⚠️  Vote {vote.id} has no building, skipping submission {submission.id}')
                        )
                        continue
                    
                    # Find apartment where user is owner OR tenant (renter)
                    apartment = Apartment.objects.filter(
                        Q(owner_user=user) | Q(tenant_user=user),
                        building=building
                    ).first()
                    
                    if apartment and apartment.participation_mills:
                        mills = apartment.participation_mills
                        
                        if dry_run:
                            self.stdout.write(
                                f'   Would update submission {submission.id} (user: {user.email}) -> mills={mills}'
                            )
                        else:
                            submission.mills = mills
                            submission.save(update_fields=['mills'])
                            self.stdout.write(
                                self.style.SUCCESS(f'   ✅ Updated submission {submission.id} (user: {user.email}) -> mills={mills}')
                            )
                        updated += 1
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f'   ⚠️  No apartment found for user {user.email} in building {building.name}'
                            )
                        )
                
                total_updated += updated
                self.stdout.write(f'   📈 Updated {updated}/{count} submissions in {tenant.schema_name}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING(f'\n🔍 DRY RUN: Would update {total_updated} submissions total'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\n✅ Updated {total_updated} submissions total'))
