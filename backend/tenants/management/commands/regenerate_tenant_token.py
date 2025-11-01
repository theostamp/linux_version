#!/usr/bin/env python
"""
Management command to regenerate tenant workspace access token for users.
This generates a new token for /api/tenants/accept-invite/ endpoint (Stripe webhook workflow).
"""
from django.core.management.base import BaseCommand, CommandError
from users.models import CustomUser
from tenants.models import Client, Domain
from users.services import EmailService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Regenerate tenant workspace access token for a user (Stripe webhook workflow)'

    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            type=str,
            help='Email address of the user to regenerate token for'
        )
        parser.add_argument(
            '--send-email',
            action='store_true',
            help='Send welcome email with new token (default: False)'
        )

    def handle(self, *args, **options):
        email = options['email']
        send_email = options.get('send_email', False)

        self.stdout.write("=" * 80)
        self.stdout.write("REGENERATE TENANT WORKSPACE ACCESS TOKEN")
        self.stdout.write("=" * 80)
        self.stdout.write(f"User email: {email}")
        self.stdout.write("")

        # Step 1: Find user
        try:
            user = CustomUser.objects.get(email=email)
            self.stdout.write(self.style.SUCCESS(f"✅ User found: {user.email} (ID: {user.id})"))
        except CustomUser.DoesNotExist:
            raise CommandError(f"❌ User not found: {email}")

        # Step 2: Check if user has tenant
        if not user.tenant:
            raise CommandError(f"❌ User {email} has no tenant assigned. Cannot generate workspace access token.")

        tenant = user.tenant
        self.stdout.write(self.style.SUCCESS(f"✅ Tenant found: {tenant.name} (ID: {tenant.id}, schema: {tenant.schema_name})"))

        # Step 3: Find tenant domain
        try:
            domain = Domain.objects.filter(tenant=tenant, is_primary=True).first()
            if not domain:
                # Create domain if it doesn't exist
                domain = Domain.objects.create(
                    domain=f"{tenant.schema_name}.localhost",
                    tenant=tenant,
                    is_primary=True
                )
                self.stdout.write(self.style.WARNING(f"⚠️  Created domain: {domain.domain}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"✅ Domain found: {domain.domain}"))
        except Exception as e:
            raise CommandError(f"❌ Failed to get/create domain: {e}")

        # Step 4: Generate token (preview)
        from django.core.signing import TimestampSigner
        signer = TimestampSigner()
        token_data = f"{user.id}:{tenant.id}:{domain.domain}"
        secure_token = signer.sign(token_data)
        
        token_preview = secure_token[:20] + '...' if len(secure_token) > 20 else secure_token
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"✅ Generated new workspace access token:"))
        self.stdout.write(f"   Token (preview): {token_preview}")

        # Step 5: Build access URL
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        access_url = f"{frontend_url}/tenant/accept?token={secure_token}"
        
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"✅ Access URL:"))
        self.stdout.write(f"   {access_url}")

        # Step 6: Send email if requested
        if send_email:
            self.stdout.write("")
            self.stdout.write("📧 Sending welcome email with new token...")
            try:
                success = EmailService.send_tenant_welcome_email(user, tenant, domain)
                if success:
                    self.stdout.write(self.style.SUCCESS(f"✅ Welcome email sent successfully to {user.email}"))
                    logger.info(f"[REGENERATE_TOKEN] Sent welcome email to {user.email}")
                else:
                    self.stdout.write(self.style.WARNING(f"⚠️  Failed to send email (check logs for details)"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Failed to send email: {e}"))
                logger.error(f"[REGENERATE_TOKEN] Failed to send email to {user.email}: {e}", exc_info=True)

        # Step 7: Summary
        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write(self.style.SUCCESS("✅ TOKEN REGENERATION COMPLETE"))
        self.stdout.write("=" * 80)
        self.stdout.write("")
        self.stdout.write("📋 Summary:")
        self.stdout.write(f"   User: {user.email}")
        self.stdout.write(f"   Tenant: {tenant.name} (schema: {tenant.schema_name})")
        self.stdout.write(f"   Domain: {domain.domain}")
        self.stdout.write(f"   Token: {token_preview}")
        self.stdout.write(f"   Access URL: {access_url}")
        if send_email:
            self.stdout.write(f"   Email: Sent to {user.email}")
        else:
            self.stdout.write(f"   Email: Not sent (use --send-email to send)")
        self.stdout.write("")
        self.stdout.write("💡 The user can now use this URL to access their workspace.")
        self.stdout.write("   The token is valid for 24 hours.")
        self.stdout.write("")

