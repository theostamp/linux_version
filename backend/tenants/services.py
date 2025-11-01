# backend/tenants/services.py

import logging
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
                self._create_tenant_user(user, schema_name)
                
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
        # Determine the base domain
        base_domain = "localhost"  # Default for development
        # In production, this would be your actual domain
        
        domain_name = f"{schema_name}.{base_domain}"
        
        domain = Domain.objects.create(
            domain=domain_name,
            tenant=tenant,
            is_primary=True
        )
        
        logger.info(f"Created domain: {domain_name}")
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
                tenant_user = CustomUser.objects.create(
                    email=user.email,
                    password=user.password,  # Already hashed - copy directly
                    first_name=user.first_name,
                    last_name=user.last_name,
                    is_staff=True,
                    is_active=True,
                    role='manager',
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
        """Create demo data (Αλκμάνος 22 building) for the new tenant."""
        try:
            with schema_context(schema_name):
                from buildings.models import Building
                from apartments.models import Apartment
                from django.contrib.auth import get_user_model
                
                User = get_user_model()
                
                # Check if demo data already exists
                if Building.objects.filter(name__icontains='Αλκμάνος').exists():
                    logger.info(f"Demo data already exists in schema {schema_name}")
                    return
                
                # Get the tenant user (manager)
                tenant_user = User.objects.filter(is_staff=True).first()
                if not tenant_user:
                    logger.warning(f"No tenant user found in schema {schema_name} for demo data creation")
                    return
                
                # Create Αλκμάνος 22 building
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
                
                # Create apartments (Α1-Α3, Β1-Β3, Γ1-Γ3, Δ1)
                apartments_data = [
                    {'number': 'Α1', 'floor': 1, 'area': 85.5, 'participation_mills': 100, 'heating_mills': 100, 'elevator_mills': 100},
                    {'number': 'Α2', 'floor': 1, 'area': 75.0, 'participation_mills': 88, 'heating_mills': 88, 'elevator_mills': 88},
                    {'number': 'Α3', 'floor': 1, 'area': 90.0, 'participation_mills': 105, 'heating_mills': 105, 'elevator_mills': 105},
                    {'number': 'Β1', 'floor': 2, 'area': 85.5, 'participation_mills': 100, 'heating_mills': 100, 'elevator_mills': 100},
                    {'number': 'Β2', 'floor': 2, 'area': 75.0, 'participation_mills': 88, 'heating_mills': 88, 'elevator_mills': 88},
                    {'number': 'Β3', 'floor': 2, 'area': 90.0, 'participation_mills': 105, 'heating_mills': 105, 'elevator_mills': 105},
                    {'number': 'Γ1', 'floor': 3, 'area': 85.5, 'participation_mills': 100, 'heating_mills': 100, 'elevator_mills': 100},
                    {'number': 'Γ2', 'floor': 3, 'area': 75.0, 'participation_mills': 88, 'heating_mills': 88, 'elevator_mills': 88},
                    {'number': 'Γ3', 'floor': 3, 'area': 90.0, 'participation_mills': 105, 'heating_mills': 105, 'elevator_mills': 105},
                    {'number': 'Δ1', 'floor': 4, 'area': 120.0, 'participation_mills': 140, 'heating_mills': 140, 'elevator_mills': 140},
                ]
                
                for apt_data in apartments_data:
                    Apartment.objects.create(
                        building=building,
                        number=apt_data['number'],
                        floor=apt_data['floor'],
                        square_meters=apt_data.get('square_meters', apt_data.get('area', 85)),
                        participation_mills=apt_data['participation_mills'],
                        heating_mills=apt_data['heating_mills'],
                        elevator_mills=apt_data['elevator_mills']
                    )
                
                logger.info(f"Created demo building 'Αλκμάνος 22' with 10 apartments in schema {schema_name}")
                
        except Exception as e:
            logger.error(f"Failed to create demo data in schema {schema_name}: {e}")
            # Don't raise here - tenant creation can still succeed without demo data

