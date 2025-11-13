# backend/tenants/services.py

import logging
import os
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from django.core.management import call_command
from django_tenants.utils import schema_context
from django.core.exceptions import ValidationError

from .models import Client, Domain
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
                self._create_tenant_user(user, schema_name, stripe_checkout_session_id)
                
                # Step 7: Create demo data (Αλκμάνος 22 building)
                self._create_demo_data(schema_name)
                
                # Step 8: Send welcome email with secure access link
                try:
                    from users.services import EmailService
                    EmailService.send_tenant_welcome_email(user, tenant, domain)
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
            name=user.get_full_name() or user.email.split('@')[0],
            schema_name=schema_name,
            paid_until=timezone.now().date() + timezone.timedelta(days=30),  # 30-day trial
            on_trial=True,
            is_active=True
        )

        logger.info(f"Created tenant: {tenant.name} (schema: {tenant.schema_name})")
        return tenant
    
    def _create_domain(self, tenant, schema_name):
        """Create the domain for the tenant."""
        # Determine the base domain from environment variable
        # Default to localhost for development, newconcierge.app for production
        base_domain = os.getenv("TENANT_BASE_DOMAIN", "localhost")
        
        domain_name = f"{schema_name}.{base_domain}"
        
        domain = Domain.objects.create(
            domain=domain_name,
            tenant=tenant,
            is_primary=True
        )
        
        logger.info(f"Created domain: {domain_name} (base_domain: {base_domain})")
        return domain
    
    def _run_tenant_migrations(self, schema_name):
        """Run migrations for the new tenant schema."""
        try:
            logger.info(f"Running migrations for schema: {schema_name}")
            call_command(
                "migrate_schemas",
                schema_name=schema_name,
                interactive=False,
                verbosity=1  # Increased verbosity to see migration output
            )
            logger.info(f"✓ Successfully ran migrations for schema: {schema_name}")
            
            # Verify that buildings table exists after migrations
            with schema_context(schema_name):
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = current_schema()
                            AND table_name = 'buildings_building'
                        );
                    """)
                    table_exists = cursor.fetchone()[0]
                    if not table_exists:
                        raise Exception(f"buildings_building table does not exist in schema {schema_name} after migrations")
                    logger.info(f"✓ Verified buildings_building table exists in schema {schema_name}")
        except Exception as e:
            logger.error(f"Failed to run migrations for schema {schema_name}: {e}", exc_info=True)
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
    
    def _create_tenant_user(self, user, schema_name, stripe_checkout_session_id=None):
        """
        Create the user account inside the tenant schema with SAME credentials as public schema.
        
        Uses plain password from temporary storage if available, otherwise falls back to
        copying the hashed password from public schema user.
        """
        try:
            with schema_context(schema_name):
                # Check if user already exists in this schema
                if CustomUser.objects.filter(email=user.email).exists():
                    logger.info(f"User {user.email} already exists in schema {schema_name}")
                    return

                # Try to retrieve plain password from temporary storage
                plain_password = None
                if stripe_checkout_session_id:
                    try:
                        from users.password_storage import retrieve_password
                        plain_password = retrieve_password(
                            user_email=user.email,
                            session_id=stripe_checkout_session_id
                        )
                        if plain_password:
                            logger.info(f"Retrieved plain password for tenant user creation: {user.email}")
                    except Exception as e:
                        logger.warning(f"Failed to retrieve plain password for {user.email}: {e}")

                # Create user in tenant schema
                # If we have plain password, use create_user() to hash it properly
                # Otherwise, copy the hashed password directly
                if plain_password:
                    # Use create_user() to hash the plain password
                    tenant_user = CustomUser.objects.create_user(
                        email=user.email,
                        password=plain_password,
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
                    logger.info(f"Created tenant user with plain password: {tenant_user.email} in schema {schema_name}")
                else:
                    # Fallback: copy hashed password directly
                    # Use create() instead of create_user() to avoid re-hashing
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
                    logger.info(f"Created tenant user with copied hashed password: {tenant_user.email} in schema {schema_name}")

        except Exception as e:
            logger.error(f"Failed to create tenant user in schema {schema_name}: {e}")
            # Don't raise here - tenant creation can still succeed without this
    
    def generate_unique_schema_name(self, base_name):
        """
        Generate a unique schema name from a base name.

        Args:
            base_name (str): The base name to slugify

        Returns:
            str: A unique schema name (RFC 1034/1035 compliant - uses hyphens, not underscores)
        """
        # Slugify the base name (this already converts underscores to hyphens)
        schema_name = slugify(base_name)

        # Ensure it's not empty
        if not schema_name:
            schema_name = f"tenant-{int(timezone.now().timestamp())}"

        # Ensure it's unique (use hyphens for RFC compliance)
        original_schema_name = schema_name
        counter = 1
        while Client.objects.filter(schema_name=schema_name).exists():
            schema_name = f"{original_schema_name}-{counter}"
            counter += 1

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

                # Step 6: Send welcome email with workspace link
                try:
                    from users.services import EmailService
                    EmailService.send_workspace_welcome_email(user, domain.domain)
                    logger.info(f"Sent workspace welcome email to {user.email}")
                except Exception as email_error:
                    # Don't fail tenant creation if email fails
                    logger.error(f"Failed to send welcome email: {email_error}")

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
            name=user.get_full_name() or user.email.split('@')[0],
            schema_name=schema_name,
            paid_until=paid_until,
            on_trial=on_trial,
            is_active=True
        )

        logger.info(f"Created tenant: {tenant.name} (schema: {tenant.schema_name})")
        return tenant

    def _create_demo_data(self, schema_name):
        """Create demo data (Αλκμάνος 22 building) for the new tenant with full data from auto_initialization.py."""
        try:
            with schema_context(schema_name):
                from buildings.models import Building, BuildingMembership
                from apartments.models import Apartment
                from django.contrib.auth import get_user_model
                
                User = get_user_model()
                
                # Check if demo data already exists
                if Building.objects.filter(name__icontains='Αλκμάνος').exists():
                    logger.info(f"Demo data already exists in schema {schema_name}")
                    return
                
                # Get the tenant user (manager) - try multiple methods
                tenant_user = User.objects.filter(is_staff=True).first()
                if not tenant_user:
                    # Try to get any user in the schema
                    tenant_user = User.objects.first()
                if not tenant_user:
                    logger.error(f"CRITICAL: No user found in schema {schema_name} for demo data creation. Cannot create demo building.")
                    # Don't return - try to create building anyway, BuildingMembership will be skipped
                    tenant_user = None
                
                # Create Αλκμάνος 22 building with full data matching auto_initialization.py
                building = Building.objects.create(
                    name='Αλκμάνος 22',
                    address='Αλκμάνος 22, Αθήνα 115 28, Ελλάδα',
                    city='Αθήνα',
                    postal_code='11528',
                    apartments_count=10,
                    internal_manager_name='Μαρία Κωνσταντίνου',
                    internal_manager_phone='2101234567',
                    heating_fixed_percentage=30.0,
                    latitude=37.9838,
                    longitude=23.7275
                )
                
                # Create building membership for tenant user (if user exists)
                if tenant_user:
                    BuildingMembership.objects.get_or_create(
                        building=building,
                        resident=tenant_user,
                        defaults={'role': 'manager'}
                    )
                    logger.info(f"Created BuildingMembership for user {tenant_user.email} in schema {schema_name}")
                else:
                    logger.warning(f"No user available to create BuildingMembership in schema {schema_name}")
                
                # Create apartments with full data from auto_initialization.py - Total mills: 1000
                apartments_data = [
                    {'number': 'Α1', 'floor': 0, 'owner_name': 'Θεοδώρος Σταματιάδης', 'owner_phone': '2101234567', 'owner_email': 'theostam1966@gmail.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 85, 'bedrooms': 2, 'participation_mills': 100, 'heating_mills': 100, 'elevator_mills': 100},
                    {'number': 'Α2', 'floor': 0, 'owner_name': 'Ελένη Δημητρίου', 'owner_phone': '2103456789', 'owner_email': 'eleni.d@email.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 90, 'bedrooms': 2, 'participation_mills': 97, 'heating_mills': 105, 'elevator_mills': 97},
                    {'number': 'Α3', 'floor': 0, 'owner_name': 'Νικόλαος Αλεξίου', 'owner_phone': '2104567890', 'owner_email': 'nikos.alex@email.com', 'tenant_name': 'Ανδρέας Παπαγεωργίου', 'tenant_phone': '2105678901', 'tenant_email': 'andreas.p@email.com', 'is_rented': True, 'square_meters': 75, 'bedrooms': 1, 'participation_mills': 88, 'heating_mills': 92, 'elevator_mills': 88},
                    {'number': 'Β1', 'floor': 1, 'owner_name': 'Αικατερίνη Σταματίου', 'owner_phone': '2106789012', 'owner_email': 'katerina.s@email.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 95, 'bedrooms': 3, 'participation_mills': 110, 'heating_mills': 115, 'elevator_mills': 110},
                    {'number': 'Β2', 'floor': 1, 'owner_name': 'Δημήτριος Κωνσταντίνου', 'owner_phone': '2107890123', 'owner_email': 'dimitris.k@email.com', 'tenant_name': 'Σοφία Παπαδοπούλου', 'tenant_phone': '2108901234', 'tenant_email': 'sofia.pap@email.com', 'is_rented': True, 'square_meters': 92, 'bedrooms': 2, 'participation_mills': 105, 'heating_mills': 108, 'elevator_mills': 105},
                    {'number': 'Β3', 'floor': 1, 'owner_name': 'Ιωάννης Μιχαηλίδης', 'owner_phone': '2109012345', 'owner_email': 'giannis.m@email.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 88, 'bedrooms': 2, 'participation_mills': 98, 'heating_mills': 102, 'elevator_mills': 98},
                    {'number': 'Γ1', 'floor': 2, 'owner_name': 'Αννα Παπαδοπούλου', 'owner_phone': '2100123456', 'owner_email': 'anna.pap@email.com', 'tenant_name': 'Χρήστος Γεωργίου', 'tenant_phone': '2101234567', 'tenant_email': 'christos.g@email.com', 'is_rented': True, 'square_meters': 82, 'bedrooms': 2, 'participation_mills': 92, 'heating_mills': 95, 'elevator_mills': 92},
                    {'number': 'Γ2', 'floor': 2, 'owner_name': 'Παναγιώτης Αντωνίου', 'owner_phone': '2102345678', 'owner_email': 'panagiotis.a@email.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 100, 'bedrooms': 3, 'participation_mills': 115, 'heating_mills': 100, 'elevator_mills': 115},
                    {'number': 'Γ3', 'floor': 3, 'owner_name': 'Ευαγγελία Κωνσταντίνου', 'owner_phone': '2103456789', 'owner_email': 'evangelia.k@email.com', 'tenant_name': 'Δημήτριος Παπαδόπουλος', 'tenant_phone': '2104567890', 'tenant_email': 'dimitris.pap@email.com', 'is_rented': True, 'square_meters': 96, 'bedrooms': 3, 'participation_mills': 108, 'heating_mills': 100, 'elevator_mills': 108},
                    {'number': 'Δ1', 'floor': 3, 'owner_name': 'Μιχαήλ Γεωργίου', 'owner_phone': '2105678901', 'owner_email': 'michalis.g@email.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 78, 'bedrooms': 1, 'participation_mills': 87, 'heating_mills': 83, 'elevator_mills': 87}
                ]
                
                for apt_data in apartments_data:
                    Apartment.objects.create(
                        building=building,
                        number=apt_data['number'],
                        identifier=apt_data['number'],
                        floor=apt_data['floor'],
                        owner_name=apt_data['owner_name'],
                        owner_phone=apt_data['owner_phone'],
                        owner_email=apt_data['owner_email'],
                        tenant_name=apt_data['tenant_name'],
                        tenant_phone=apt_data['tenant_phone'],
                        tenant_email=apt_data['tenant_email'],
                        is_rented=apt_data['is_rented'],
                        square_meters=apt_data['square_meters'],
                        bedrooms=apt_data['bedrooms'],
                        participation_mills=apt_data['participation_mills'],
                        heating_mills=apt_data['heating_mills'],
                        elevator_mills=apt_data['elevator_mills'],
                        notes=f"Διαμέρισμα {apt_data['number']} στο κτίριο {building.name} - Όροφος {apt_data['floor']}"
                    )
                
                logger.info(f"Created demo building 'Αλκμάνος 22' with 10 apartments and full data in schema {schema_name}")
                
        except Exception as e:
            logger.error(f"Failed to create demo data in schema {schema_name}: {e}", exc_info=True)
            # Check if it's a table missing error - if so, migrations didn't run properly
            error_str = str(e)
            if 'does not exist' in error_str.lower() or 'relation' in error_str.lower():
                logger.error(f"CRITICAL: Database tables missing in schema {schema_name}. Migrations may have failed.")
                # Re-raise for critical errors so tenant creation fails
                raise Exception(f"Migrations incomplete for schema {schema_name}: {e}") from e
            # For other errors, log but don't raise - tenant creation can still succeed without demo data
            # However, we should try to create the building anyway if possible
            logger.warning(f"Demo data creation failed but continuing tenant creation: {e}")
            # Try to create at least the building without apartments if building creation failed
            try:
                with schema_context(schema_name):
                    from buildings.models import Building
                    if not Building.objects.filter(name__icontains='Αλκμάνος').exists():
                        logger.info(f"Attempting to create minimal demo building in schema {schema_name}")
                        Building.objects.create(
                            name='Αλκμάνος 22',
                            address='Αλκμάνος 22, Αθήνα 115 28, Ελλάδα',
                            city='Αθήνα',
                            postal_code='11528',
                            apartments_count=10
                        )
                        logger.info(f"Created minimal demo building 'Αλκμάνος 22' in schema {schema_name}")
            except Exception as fallback_error:
                logger.error(f"Failed to create minimal demo building in schema {schema_name}: {fallback_error}")

