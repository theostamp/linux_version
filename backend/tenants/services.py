# backend/tenants/services.py

import logging
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from django.core.management import call_command
from django_tenants.utils import schema_context
from django.core.exceptions import ValidationError

from .models import Client, Domain
from .utils import generate_schema_name_from_email, generate_unique_schema_name, get_tenant_subdomain
from users.models import CustomUser
from billing.models import SubscriptionPlan, UserSubscription

logger = logging.getLogger(__name__)


class TenantService:
    """
    Service class for managing tenant creation and subscription setup.
    Consolidates logic from signals.py, forms.py, and admin_views.py.
    """
    
    def create_tenant_and_subscription(self, schema_name, user, plan_id, stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id=None):
        """
        Creates a tenant, domain, and subscription for a user.
        
        Args:
            schema_name (str): The schema name for the tenant
            user (CustomUser): The user who will own the tenant
            plan_id (int): The ID of the subscription plan
            stripe_customer_id (str): Stripe customer ID
            stripe_subscription_id (str): Stripe subscription ID
            stripe_checkout_session_id (str): Stripe checkout session ID for idempotency
            
        Returns:
            tuple: (tenant, subscription) objects
            
        Raises:
            ValidationError: If tenant creation fails
            Exception: For other errors
        """
        try:
            with transaction.atomic():
                # Step 1: Get the subscription plan
                try:
                    plan = SubscriptionPlan.objects.get(id=plan_id)
                except SubscriptionPlan.DoesNotExist:
                    raise ValidationError(f"Subscription plan with ID {plan_id} not found")
                
                # Step 2: Create the tenant
                tenant = self._create_tenant(schema_name, user)
                
                # Step 3: Create the domain
                domain = self._create_domain(tenant, schema_name)
                
                # Step 4: Run tenant migrations
                self._run_tenant_migrations(schema_name)
                
                # Step 5: Create the user subscription
                subscription = self._create_user_subscription(
                    user, plan, stripe_customer_id, stripe_subscription_id, tenant, stripe_checkout_session_id
                )
                
                # Step 6: Create initial user in tenant schema
                self._create_tenant_user(user, schema_name)
                
                # Step 7: Create demo data (Αλκμάνος 22 building)
                self._create_demo_data(schema_name)
                
                # Step 8: Send welcome email with secure access link
                try:
                    from users.services import PasswordResetService
                    PasswordResetService.send_tenant_welcome_email(user, tenant, domain)
                    logger.info(f"Sent tenant welcome email to {user.email}")
                except Exception as email_error:
                    logger.error(f"Failed to send welcome email: {email_error}")
                    # Don't fail provisioning if email fails
                
                logger.info(f"Successfully created tenant '{schema_name}' and subscription for user {user.email}")
                return tenant, subscription
                
        except Exception as e:
            logger.error(f"Failed to create tenant and subscription: {e}")
            raise
    
    def _create_tenant(self, schema_name, user):
        """Create the tenant (Client) object."""
        # Ensure schema name is unique and RFC compliant (use hyphens, not underscores)
        original_schema_name = schema_name
        counter = 1
        while Client.objects.filter(schema_name=schema_name).exists():
            schema_name = f"{original_schema_name}-{counter}"
            counter += 1

        tenant = Client.objects.create(
            name=user.get_full_name() or generate_schema_name_from_email(user.email),
            schema_name=schema_name,
            paid_until=timezone.now().date() + timezone.timedelta(days=30),  # 30-day trial
            on_trial=True,
            is_active=True
        )

        logger.info(f"Created tenant: {tenant.name} (schema: {tenant.schema_name})")
        return tenant
    
    def _create_domain(self, tenant, schema_name):
        """
        Create or assign a domain for the tenant.
        
        Production: All tenants share the main domain (Railway doesn't support wildcard DNS)
        Development: Each tenant gets a subdomain (e.g., etherm2021.localhost)
        """
        from django.conf import settings
        import os
        
        # Use production domain if available, otherwise localhost
        is_production = bool(os.getenv('RAILWAY_PUBLIC_DOMAIN')) or not settings.DEBUG
        
        if is_production:
            # Production: use the main shared domain
            base_domain = os.getenv('RAILWAY_PUBLIC_DOMAIN', 'linuxversion-production.up.railway.app')
            
            # Check if this domain already exists for another tenant
            existing_domain = Domain.objects.filter(domain=base_domain, tenant=tenant).first()
            if existing_domain:
                logger.info(f"Domain already assigned to tenant: {base_domain}")
                return existing_domain
            
            # Check if this domain already exists
            existing_domain = Domain.objects.filter(domain=base_domain).first()
            
            if existing_domain:
                # Domain exists - just return it (all tenants share the same domain in production)
                # We'll use session-based routing instead of domain-based routing
                logger.info(f"Reusing existing shared domain for tenant {tenant.schema_name}: {base_domain}")
                domain = existing_domain
            else:
                # First tenant - create the primary domain  
                # This domain will be shared by all future tenants
                domain = Domain.objects.create(
                    domain=base_domain,
                    tenant=tenant,
                    is_primary=True
                )
                logger.info(f"Created primary production domain (will be shared): {base_domain}")
        else:
            # Development: each tenant gets a unique subdomain
            domain_name = f"{schema_name}.localhost"
            
            # Check if domain already exists
            existing_domain = Domain.objects.filter(domain=domain_name).first()
            if existing_domain:
                logger.warning(f"Domain {domain_name} already exists for tenant {existing_domain.tenant.schema_name}")
                # Update to point to new tenant (shouldn't happen, but handle it)
                existing_domain.tenant = tenant
                existing_domain.save()
                return existing_domain
            
            domain = Domain.objects.create(
                domain=domain_name,
                tenant=tenant,
                is_primary=True
            )
            logger.info(f"Created development subdomain: {domain_name}")
        
        return domain
    
    def _run_tenant_migrations(self, schema_name):
        """Run migrations for the new tenant schema."""
        try:
            call_command(
                "migrate_schemas",
                schema_name=schema_name,
                interactive=False,
                verbosity=0
            )
            logger.info(f"Ran migrations for schema: {schema_name}")
        except Exception as e:
            logger.error(f"Failed to run migrations for schema {schema_name}: {e}")
            raise
    
    def _create_user_subscription(self, user, plan, stripe_customer_id, stripe_subscription_id, tenant, stripe_checkout_session_id=None):
        """Create the UserSubscription object."""
        # Calculate pricing based on plan
        price = plan.monthly_price  # Default to monthly
        currency = 'EUR'
        
        # Set trial dates
        trial_start = timezone.now()
        trial_end = trial_start + timezone.timedelta(days=plan.trial_days)
        
        # Set billing period
        current_period_start = timezone.now()
        current_period_end = current_period_start + timezone.timedelta(days=30)  # Monthly
        
        # Create subscription
        subscription = UserSubscription.objects.create(
            user=user,
            plan=plan,
            status='trial',
            billing_interval='month',
            trial_start=trial_start,
            trial_end=trial_end,
            current_period_start=current_period_start,
            current_period_end=current_period_end,
            stripe_subscription_id=stripe_subscription_id,
            stripe_customer_id=stripe_customer_id,
            stripe_checkout_session_id=stripe_checkout_session_id,
            price=price,
            currency=currency,
            tenant_domain=f"{tenant.schema_name}.localhost"
        )
        
        logger.info(f"Created subscription for user {user.email}: {subscription.id}")
        return subscription
    
    def _create_tenant_user(self, user, schema_name):
        """
        Create the user account inside the tenant schema with SAME credentials as public schema.

        CRITICAL: The password in user.password is ALREADY HASHED in the public schema.
        We need to copy the hashed password directly to avoid double-hashing.
        """
        try:
            with schema_context(schema_name):
                # Check if user already exists in this schema
                if CustomUser.objects.filter(email=user.email).exists():
                    logger.info(f"User {user.email} already exists in schema {schema_name}")
                    return

                # Create user in tenant schema with SAME hashed password
                # Use create() instead of create_user() to avoid re-hashing the password
                # User is created as TENANT ADMIN (superuser within their tenant)
                tenant_user = CustomUser.objects.create(
                    email=user.email,
                    password=user.password,  # Already hashed - copy directly
                    first_name=user.first_name,
                    last_name=user.last_name,
                    is_staff=True,
                    is_superuser=True,  # Full admin rights within this tenant
                    is_active=True,
                    role='manager',  # Tenant owner/admin role
                    office_name=user.office_name or f"{user.get_full_name()}'s Office",
                    office_phone=user.office_phone,
                    office_address=user.office_address,
                    email_verified=True  # Auto-verify since they paid
                )

                logger.info(f"Created tenant user: {tenant_user.email} in schema {schema_name} with synced credentials")

        except Exception as e:
            logger.error(f"Failed to create tenant user in schema {schema_name}: {e}")
            # Don't raise here - tenant creation can still succeed without this
    
    def generate_unique_schema_name(self, base_name):
        """
        Generate a unique schema name from a base name.
        
        If base_name looks like an email, extracts only the prefix (before @).
        Otherwise, uses the full base_name.

        Args:
            base_name (str): The base name (can be email or any string)

        Returns:
            str: A unique schema name (RFC 1034/1035 compliant - uses hyphens, not underscores)
            
        Examples:
            etherm2021@gmail.com     → etherm2021 (or etherm2021-1 if taken)
            john.doe@company.com     → john-doe
            MyCompany Building       → mycompany-building
        """
        # If it looks like an email, extract only the prefix
        if '@' in base_name:
            base_schema = generate_schema_name_from_email(base_name)
        else:
            # Not an email, just slugify it
            base_schema = slugify(base_name)
            if not base_schema:
                base_schema = f"tenant-{int(timezone.now().timestamp())}"
        
        # Ensure uniqueness by checking database
        schema_name = base_schema
        counter = 1
        while Client.objects.filter(schema_name=schema_name).exists():
            schema_name = f"{base_schema}-{counter}"
            counter += 1
        
        logger.info(f"Generated unique schema name: {schema_name} (from: {base_name})")
        return schema_name
    
    def get_tenant_by_schema(self, schema_name):
        """Get a tenant by its schema name."""
        try:
            return Client.objects.get(schema_name=schema_name)
        except Client.DoesNotExist:
            return None
    
    def is_schema_available(self, schema_name):
        """Check if a schema name is available."""
        return not Client.objects.filter(schema_name=schema_name).exists()

    def create_tenant_infrastructure(self, schema_name, user, paid_until=None, on_trial=True):
        """
        Creates tenant infrastructure ONLY (tenant, domain, migrations, demo data).
        Does NOT create UserSubscription - that's handled by BillingService.

        This method maintains proper separation of concerns:
        - TenantService: Manages tenant infrastructure (this method)
        - BillingService: Manages Stripe + subscriptions

        Args:
            schema_name (str): The schema name for the tenant
            user (CustomUser): The user who will own the tenant
            paid_until (datetime.date): Date until which tenant is paid (default: 30 days)
            on_trial (bool): Whether tenant is on trial (default: True)

        Returns:
            tuple: (tenant, domain) objects

        Raises:
            Exception: If tenant infrastructure creation fails
        """
        try:
            with transaction.atomic():
                # Step 1: Create the tenant
                if paid_until is None:
                    paid_until = timezone.now().date() + timezone.timedelta(days=30)

                tenant = self._create_tenant_with_params(schema_name, user, paid_until, on_trial)

                # Step 2: Create the domain
                domain = self._create_domain(tenant, schema_name)

                # Step 3: Run tenant migrations
                self._run_tenant_migrations(schema_name)

                # Step 4: Create initial user in tenant schema
                self._create_tenant_user(user, schema_name)

                # Step 5: Create demo data (Αλκμάνος 22 building)
                self._create_demo_data(schema_name)

                # Step 6: Tenant infrastructure ready (email will be sent after payment confirmation)
                logger.info(f"Tenant infrastructure ready for {user.email} - email will be sent after payment confirmation")

                logger.info(f"Successfully created tenant infrastructure '{schema_name}' for user {user.email}")
                return tenant, domain

        except Exception as e:
            logger.error(f"Failed to create tenant infrastructure: {e}")
            raise

    def _create_tenant_with_params(self, schema_name, user, paid_until, on_trial):
        """Create the tenant (Client) object with specific parameters."""
        # Ensure schema name is unique and RFC compliant (use hyphens, not underscores)
        original_schema_name = schema_name
        counter = 1
        while Client.objects.filter(schema_name=schema_name).exists():
            schema_name = f"{original_schema_name}-{counter}"
            counter += 1

        tenant = Client.objects.create(
            name=user.get_full_name() or generate_schema_name_from_email(user.email),
            schema_name=schema_name,
            paid_until=paid_until,
            on_trial=on_trial,
            is_active=True
        )

        logger.info(f"Created tenant: {tenant.name} (schema: {tenant.schema_name})")
        return tenant

    def _create_demo_data(self, schema_name):
        """Create demo data (Αλκμάνος 22 building + demo users) for the new tenant."""
        try:
            with schema_context(schema_name):
                from datetime import timedelta
                from buildings.models import Building, BuildingMembership
                from apartments.models import Apartment
                from announcements.models import Announcement
                from votes.models import Vote, VoteSubmission
                from user_requests.models import UserRequest
                from residents.models import Resident
                from django.contrib.auth import get_user_model
                from django.utils import timezone
                
                User = get_user_model()
                
                # Check if demo data already exists
                if Building.objects.filter(name__icontains='Αλκμάνος').exists():
                    logger.info(f"Demo data already exists in schema {schema_name}")
                    return
                
                # Get the tenant user (manager/owner)
                tenant_user = User.objects.filter(is_staff=True).first()
                if not tenant_user:
                    logger.warning(f"No tenant user found in schema {schema_name} for demo data creation")
                    return
                
                # Create Αλκμάνος 22 building (we'll create users after apartments based on apartment data)
                building = Building.objects.create(
                    name='🎓 Demo Building - Αλκμάνος 22',
                    address='Αλκμάνος 22, Αθήνα 115 28, Ελλάδα',
                    city='Αθήνα',
                    postal_code='115 28',
                    apartments_count=10,
                    latitude=37.9838,
                    longitude=23.7275,
                    internal_manager_name='Γραμματεία'
                )
                
                # Create apartments (Α1-Α3, Β1-Β3, Γ1-Γ3, Δ1) with owners/tenants data - Total mills: 1000
                apartments_data = [
                    {'number': 'Α1', 'floor': 0, 'owner_name': 'Θεοδώρος Σταματιάδης', 'owner_phone': '2101234567', 'owner_email': f'demo.owner1@{schema_name}.demo', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 85, 'bedrooms': 2, 'participation_mills': 100, 'heating_mills': 100, 'elevator_mills': 100},
                    {'number': 'Α2', 'floor': 0, 'owner_name': 'Ελένη Δημητρίου', 'owner_phone': '2103456789', 'owner_email': f'eleni.d@{schema_name}.demo', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 90, 'bedrooms': 2, 'participation_mills': 97, 'heating_mills': 105, 'elevator_mills': 97},
                    {'number': 'Α3', 'floor': 0, 'owner_name': 'Νικόλαος Αλεξίου', 'owner_phone': '2104567890', 'owner_email': f'nikos.alex@{schema_name}.demo', 'tenant_name': 'Ανδρέας Παπαγεωργίου', 'tenant_phone': '2105678901', 'tenant_email': f'andreas.p@{schema_name}.demo', 'is_rented': True, 'square_meters': 75, 'bedrooms': 1, 'participation_mills': 88, 'heating_mills': 92, 'elevator_mills': 88},
                    {'number': 'Β1', 'floor': 1, 'owner_name': 'Αικατερίνη Σταματίου', 'owner_phone': '2106789012', 'owner_email': f'katerina.s@{schema_name}.demo', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 95, 'bedrooms': 3, 'participation_mills': 110, 'heating_mills': 115, 'elevator_mills': 110},
                    {'number': 'Β2', 'floor': 1, 'owner_name': 'Δημήτριος Κωνσταντίνου', 'owner_phone': '2107890123', 'owner_email': f'dimitris.k@{schema_name}.demo', 'tenant_name': 'Σοφία Παπαδοπούλου', 'tenant_phone': '2108901234', 'tenant_email': f'sofia.pap@{schema_name}.demo', 'is_rented': True, 'square_meters': 92, 'bedrooms': 2, 'participation_mills': 105, 'heating_mills': 108, 'elevator_mills': 105},
                    {'number': 'Β3', 'floor': 1, 'owner_name': 'Ιωάννης Μιχαηλίδης', 'owner_phone': '2109012345', 'owner_email': f'giannis.m@{schema_name}.demo', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 88, 'bedrooms': 2, 'participation_mills': 98, 'heating_mills': 102, 'elevator_mills': 98},
                    {'number': 'Γ1', 'floor': 2, 'owner_name': 'Αννα Παπαδοπούλου', 'owner_phone': '2100123456', 'owner_email': f'anna.pap@{schema_name}.demo', 'tenant_name': 'Χρήστος Γεωργίου', 'tenant_phone': '2101234567', 'tenant_email': f'christos.g@{schema_name}.demo', 'is_rented': True, 'square_meters': 82, 'bedrooms': 2, 'participation_mills': 92, 'heating_mills': 95, 'elevator_mills': 92},
                    {'number': 'Γ2', 'floor': 2, 'owner_name': 'Παναγιώτης Αντωνίου', 'owner_phone': '2102345678', 'owner_email': f'panagiotis.a@{schema_name}.demo', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 100, 'bedrooms': 3, 'participation_mills': 115, 'heating_mills': 100, 'elevator_mills': 115},
                    {'number': 'Γ3', 'floor': 3, 'owner_name': 'Ευαγγελία Κωνσταντίνου', 'owner_phone': '2103456789', 'owner_email': f'evangelia.k@{schema_name}.demo', 'tenant_name': 'Δημήτριος Παπαδόπουλος', 'tenant_phone': '2104567890', 'tenant_email': f'dimitris.pap@{schema_name}.demo', 'is_rented': True, 'square_meters': 96, 'bedrooms': 3, 'participation_mills': 108, 'heating_mills': 100, 'elevator_mills': 108},
                    {'number': 'Δ1', 'floor': 3, 'owner_name': 'Μιχαήλ Γεωργίου', 'owner_phone': '2105678901', 'owner_email': f'michalis.g@{schema_name}.demo', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 78, 'bedrooms': 1, 'participation_mills': 87, 'heating_mills': 83, 'elevator_mills': 87}
                ]
                
                created_apartments = []
                created_resident_users = []  # Store all created resident users
                
                for apt_data in apartments_data:
                    # Create apartment with owner/tenant data
                    apt = Apartment.objects.create(
                        building=building,
                        number=apt_data['number'],
                        floor=apt_data['floor'],
                        square_meters=apt_data['square_meters'],
                        bedrooms=apt_data.get('bedrooms', 2),
                        participation_mills=apt_data['participation_mills'],
                        heating_mills=apt_data['heating_mills'],
                        elevator_mills=apt_data['elevator_mills'],
                        owner_name=apt_data['owner_name'],
                        owner_phone=apt_data['owner_phone'],
                        owner_email=apt_data['owner_email'],
                        tenant_name=apt_data.get('tenant_name', ''),
                        tenant_phone=apt_data.get('tenant_phone', ''),
                        tenant_email=apt_data.get('tenant_email', ''),
                        is_rented=apt_data.get('is_rented', False)
                    )
                    created_apartments.append(apt)
                    
                    # Create CustomUser for owner (if email exists and user doesn't exist)
                    if apt_data['owner_email']:
                        owner_user, created = User.objects.get_or_create(
                            email=apt_data['owner_email'],
                            defaults={
                                'first_name': apt_data['owner_name'].split()[0] if apt_data['owner_name'] else 'Owner',
                                'last_name': ' '.join(apt_data['owner_name'].split()[1:]) if len(apt_data['owner_name'].split()) > 1 else '',
                                'password': 'demo123456',  # Demo password for all
                                'is_active': True,
                                'email_verified': True,
                                'role': None  # Residents don't have system role
                            }
                        )
                        if created:
                            owner_user.set_password('demo123456')
                            owner_user.save()
                            created_resident_users.append((owner_user, apt, 'owner'))
                            logger.info(f"Created demo owner user: {owner_user.email} -> Apartment {apt.number}")
                    
                    # Create CustomUser for tenant (if email exists and user doesn't exist)
                    if apt_data.get('tenant_email'):
                        tenant_user, created = User.objects.get_or_create(
                            email=apt_data['tenant_email'],
                            defaults={
                                'first_name': apt_data['tenant_name'].split()[0] if apt_data['tenant_name'] else 'Tenant',
                                'last_name': ' '.join(apt_data['tenant_name'].split()[1:]) if len(apt_data['tenant_name'].split()) > 1 else '',
                                'password': 'demo123456',  # Demo password for all
                                'is_active': True,
                                'email_verified': True,
                                'role': None  # Residents don't have system role
                            }
                        )
                        if created:
                            tenant_user.set_password('demo123456')
                            tenant_user.save()
                            created_resident_users.append((tenant_user, apt, 'tenant'))
                            logger.info(f"Created demo tenant user: {tenant_user.email} -> Apartment {apt.number}")
                
                logger.info(f"Created demo building 'Αλκμάνος 22' with 10 apartments in schema {schema_name}")
                
                # Create Resident entries and BuildingMembership for all created users
                for user, apartment, resident_role in created_resident_users:
                    # Create Resident entry
                    resident_profile, created = Resident.objects.get_or_create(
                        user=user,
                        building=building,
                        defaults={
                            'apartment': apartment.number,
                            'role': resident_role,  # 'owner' or 'tenant'
                            'phone': apartment.owner_phone if resident_role == 'owner' else apartment.tenant_phone
                        }
                    )
                    if created:
                        logger.info(f"Created Resident entry: {user.email} ({resident_role}) -> Apartment {apartment.number}")
                    
                    # Create BuildingMembership
                    BuildingMembership.objects.get_or_create(
                        building=building,
                        resident=user,
                        defaults={'role': resident_role}  # BuildingMembership.role
                    )
                
                logger.info(f"Created {len(created_resident_users)} demo resident users with Resident profiles and BuildingMembership entries")

                today = timezone.now().date()

                # Create welcome announcements
                Announcement.objects.create(
                    building=building,
                    author=tenant_user,
                    title='Καλωσορίσατε στην πλατφόρμα!',
                    description=f'Η ομάδα του Concierge έχει ήδη δημιουργήσει το demo κτίριο "Αλκμάνος 22" με 10 διαμερίσματα και {len(created_resident_users)} εικονικούς κατοίκους (owners και tenants). Όλοι οι demo users έχουν password: demo123456. Εξερευνήστε το dashboard για να δείτε όλα τα διαθέσιμα modules. Μπορείτε να διαγράψετε αυτά τα δεδομένα όποτε θέλετε.',
                    start_date=today,
                    end_date=today + timedelta(days=30),
                    published=True,
                    is_active=True,
                    is_urgent=False,
                    priority=10
                )
                
                Announcement.objects.create(
                    building=building,
                    author=tenant_user,
                    title='Συντήρηση ανελκυστήρα',
                    description='Ενημερώνουμε ότι θα πραγματοποιηθεί προγραμματισμένη συντήρηση του ανελκυστήρα την Παρασκευή. Παρακαλούμε για την κατανόηση σας.',
                    start_date=today,
                    end_date=today + timedelta(days=7),
                    published=True,
                    is_active=True,
                    is_urgent=True,
                    priority=20
                )
                logger.info(f"Created demo announcements in schema {schema_name}")

                # Create sample votes
                vote1 = Vote.objects.create(
                    building=building,
                    creator=tenant_user,
                    title='Εγκατάσταση Φωτοβολταϊκών',
                    description='Προτείνουμε την εγκατάσταση φωτοβολταϊκών στο δώμα του κτιρίου για μείωση του κόστους ενέργειας. Η ψήφος θα παραμείνει ανοιχτή για 14 ημέρες.',
                    start_date=today - timedelta(days=1),
                    end_date=today + timedelta(days=14),
                    is_active=True,
                    is_urgent=False,
                    min_participation=40
                )
                
                # Vote submissions from demo users (manager + some residents)
                VoteSubmission.objects.create(vote=vote1, user=tenant_user, choice="ΝΑΙ")
                # Add submissions from a few demo residents if available
                for idx, (user, _, _) in enumerate(created_resident_users[:3]):  # First 3 residents
                    choice = "ΝΑΙ" if idx % 2 == 0 else "ΟΧΙ"
                    VoteSubmission.objects.create(vote=vote1, user=user, choice=choice)
                
                vote2 = Vote.objects.create(
                    building=building,
                    creator=tenant_user,
                    title='Αλλαγή διαχειριστή κτιρίου',
                    description='Πρόταση αλλαγής της εταιρείας διαχείρισης του κτιρίου.',
                    start_date=today - timedelta(days=7),
                    end_date=today + timedelta(days=7),
                    is_active=True,
                    is_urgent=True,
                    min_participation=50
                )
                VoteSubmission.objects.create(vote=vote2, user=tenant_user, choice="ΝΑΙ")
                logger.info(f"Created demo votes with submissions in schema {schema_name}")

                # Create sample user requests
                UserRequest.objects.create(
                    building=building,
                    title='Έλεγχος συστήματος θέρμανσης',
                    description='Παρακαλώ προγραμματίστε έναν έλεγχο στο λεβητοστάσιο πριν την έναρξη της χειμερινής περιόδου.',
                    status='in_progress',
                    type='maintenance',
                    priority='high',
                    estimated_completion=today + timedelta(days=7),
                    created_by=tenant_user,
                    assigned_to=tenant_user,
                    location='Λεβητοστάσιο',
                    apartment_number='Υπόγειο'
                )
                
                # Create user requests from demo residents if available
                if created_resident_users:
                    first_resident_user = created_resident_users[0][0]  # Get first user from tuple
                    UserRequest.objects.create(
                        building=building,
                        title='Βλάβη στον φωτισμό κλιμακοστασίου',
                        description='Δεν λειτουργούν 2 λάμπες στον 2ο όροφο.',
                        status='pending',
                        type='repair',
                        priority='medium',
                        estimated_completion=today + timedelta(days=3),
                        created_by=first_resident_user,
                        assigned_to=tenant_user,
                        location='2ος όροφος - κλιμακοστάσιο',
                        apartment_number=created_resident_users[0][1].number  # Use apartment number from first resident
                    )

                logger.info(f"Created demo announcements, votes, and user requests in schema {schema_name}")
                logger.info(f"Demo users created: {len(created_resident_users)} total (owners + tenants) - Password: demo123456")
                
        except Exception as e:
            logger.error(f"Failed to create demo data in schema {schema_name}: {e}")
            # Don't raise here - tenant creation can still succeed without demo data

επί