"""
Django management command to fix apartment assignments for invited users.

This command finds users who accepted invitations with apartments specified,
but were not properly linked to those apartments due to the bug in the
invitation acceptance code (using non-existent 'residents' field).

Usage:
    python manage.py fix_apartment_assignments
    python manage.py fix_apartment_assignments --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import connection
from users.models_invitation import TenantInvitation
from apartments.models import Apartment
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fix apartment assignments for users who accepted invitations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made\n'))

        # Get current schema name
        schema_name = connection.schema_name
        self.stdout.write(f'Working in schema: {schema_name}\n')

        # Find accepted invitations with apartments
        invitations = TenantInvitation.objects.filter(
            status='accepted',
            apartment__isnull=False
        ).select_related('apartment', 'accepted_by')

        self.stdout.write(f'Found {invitations.count()} accepted invitations with apartments\n')

        fixed_count = 0
        already_fixed_count = 0

        for invitation in invitations:
            user = invitation.accepted_by
            apartment = invitation.apartment
            role = invitation.invited_role.lower() if invitation.invited_role else ''

            if not user:
                self.stdout.write(
                    self.style.WARNING(
                        f'  ⚠ Invitation {invitation.id} has no accepted_by user'
                    )
                )
                continue

            # Check current assignment
            is_already_assigned = (
                (apartment.owner_user_id == user.id) or
                (apartment.tenant_user_id == user.id)
            )

            if is_already_assigned:
                already_fixed_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ {user.email} already assigned to apartment {apartment.number}'
                    )
                )
                continue

            # Determine which field to update
            if role in ['resident', 'ένοικος', 'tenant', 'internal_manager']:
                field_name = 'tenant_user'
                field_value = user
                should_mark_rented = True
            elif role in ['owner', 'ιδιοκτήτης']:
                field_name = 'owner_user'
                field_value = user
                should_mark_rented = False
            else:
                # Default to tenant
                field_name = 'tenant_user'
                field_value = user
                should_mark_rented = True

            self.stdout.write(
                self.style.WARNING(
                    f'  → Fixing: {user.email} (role: {invitation.invited_role}) '
                    f'→ Apartment {apartment.number} ({field_name})'
                )
            )

            if not dry_run:
                setattr(apartment, field_name, field_value)
                if should_mark_rented:
                    apartment.is_rented = True
                apartment.save(update_fields=[field_name, 'is_rented'])

                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ Fixed: {user.email} → Apartment {apartment.number}'
                    )
                )
            else:
                self.stdout.write(
                    self.style.NOTICE(
                        f'  [DRY RUN] Would fix: {user.email} → Apartment {apartment.number}'
                    )
                )

            fixed_count += 1

        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(f'Summary:'))
        self.stdout.write(f'  Already fixed: {already_fixed_count}')
        self.stdout.write(f'  Newly fixed: {fixed_count}')
        self.stdout.write(f'  Total processed: {invitations.count()}')

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    '\nThis was a DRY RUN. Run without --dry-run to apply changes.'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('\nAll apartment assignments have been fixed!')
            )
