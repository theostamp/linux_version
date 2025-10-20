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
    
    def create_tenant_and_subscription(self, schema_name, user, plan_id, stripe_customer_id, stripe_subscription_id):
        """
        Creates a tenant, domain, and subscription for a user.
        
        Args:
            schema_name (str): The schema name for the tenant
            user (CustomUser): The user who will own the tenant
            plan_id (int): The ID of the subscription plan
            stripe_customer_id (str): Stripe customer ID
            stripe_subscription_id (str): Stripe subscription ID
            
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
                    user, plan, stripe_customer_id, stripe_subscription_id, tenant
                )
                
                # Step 6: Create initial user in tenant schema
                self._create_tenant_user(user, schema_name)
                
                logger.info(f"Successfully created tenant '{schema_name}' and subscription for user {user.email}")
                return tenant, subscription
                
        except Exception as e:
            logger.error(f"Failed to create tenant and subscription: {e}")
            raise
    
    def _create_tenant(self, schema_name, user):
        """Create the tenant (Client) object."""
        # Ensure schema name is unique
        original_schema_name = schema_name
        counter = 1
        while Client.objects.filter(schema_name=schema_name).exists():
            schema_name = f"{original_schema_name}_{counter}"
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
    
    def _create_user_subscription(self, user, plan, stripe_customer_id, stripe_subscription_id, tenant):
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
            price=price,
            currency=currency,
            tenant_domain=f"{tenant.schema_name}.localhost"
        )
        
        logger.info(f"Created subscription for user {user.email}: {subscription.id}")
        return subscription
    
    def _create_tenant_user(self, user, schema_name):
        """Create the user account inside the tenant schema."""
        try:
            with schema_context(schema_name):
                # Check if user already exists in this schema
                if CustomUser.objects.filter(email=user.email).exists():
                    logger.info(f"User {user.email} already exists in schema {schema_name}")
                    return
                
                # Create user in tenant schema
                tenant_user = CustomUser.objects.create_user(
                    email=user.email,
                    password=user.password,  # This will be hashed
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
                
                logger.info(f"Created tenant user: {tenant_user.email} in schema {schema_name}")
                
        except Exception as e:
            logger.error(f"Failed to create tenant user in schema {schema_name}: {e}")
            # Don't raise here - tenant creation can still succeed without this
    
    def generate_unique_schema_name(self, base_name):
        """
        Generate a unique schema name from a base name.
        
        Args:
            base_name (str): The base name to slugify
            
        Returns:
            str: A unique schema name
        """
        # Slugify the base name
        schema_name = slugify(base_name)
        
        # Ensure it's not empty
        if not schema_name:
            schema_name = f"tenant_{int(timezone.now().timestamp())}"
        
        # Ensure it's unique
        original_schema_name = schema_name
        counter = 1
        while Client.objects.filter(schema_name=schema_name).exists():
            schema_name = f"{original_schema_name}_{counter}"
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
