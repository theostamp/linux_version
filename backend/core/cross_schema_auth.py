# backend/core/cross_schema_auth.py

import logging
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django_tenants.utils import schema_context, get_public_schema_name
from django.db import connection
from django.core.exceptions import PermissionDenied

logger = logging.getLogger(__name__)

User = get_user_model()


class CrossSchemaAuthBackend(ModelBackend):
    """
    Custom authentication backend that allows users to authenticate
    in tenant schemas using their credentials from the public schema.
    
    This enables users to login directly to tenant domains (e.g., tenant.localhost)
    using the same credentials they use in the public domain.
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Authenticate user by checking credentials in public schema
        and verifying they have access to the current tenant.
        """
        # Get email from kwargs or username
        email = kwargs.get('email') or username
        if email is None or password is None:
            return None
        
        # Get current schema
        current_schema = connection.schema_name
        public_schema = get_public_schema_name()
        
        # If we're already in public schema, use default authentication
        if current_schema == public_schema:
            return super().authenticate(request, username, password, **kwargs)
        
        # We're in a tenant schema - check credentials in public schema
        try:
            with schema_context(public_schema):
                # Find user in public schema
                user = User.objects.get(email__iexact=email)
                
                # Check password
                if not user.check_password(password):
                    logger.warning(f"Invalid password for user {email} in tenant {current_schema}")
                    return None
                
                # Check if user can authenticate (not locked, etc.)
                if not self.user_can_authenticate(user):
                    logger.warning(f"User {email} cannot authenticate (locked/inactive)")
                    return None
                
                # Check if user has access to this tenant
                if not self.user_has_tenant_access(user, current_schema):
                    logger.warning(f"User {email} does not have access to tenant {current_schema}")
                    return None
                
                # Create a pseudo-user object for the tenant context
                # This user object will be used in the tenant schema
                tenant_user = self.create_tenant_user_object(user, current_schema)
                
                logger.info(f"Cross-schema authentication successful for {email} in tenant {current_schema}")
                return tenant_user
                
        except User.DoesNotExist:
            logger.warning(f"User {email} not found in public schema")
            return None
        except Exception as e:
            logger.error(f"Cross-schema authentication error for {email}: {e}")
            return None
    
    def user_has_tenant_access(self, user, tenant_schema):
        """
        Check if user has access to the specified tenant schema.
        This includes checking:
        1. User has a tenant_id (has subscription)
        2. User's tenant matches the current schema
        3. User has active subscription
        """
        try:
            # Check if user has a tenant
            if not user.tenant_id:
                logger.info(f"User {user.email} has no tenant_id")
                return False
            
            # Get user's tenant
            from tenants.models import Client
            user_tenant = Client.objects.get(id=user.tenant_id)
            
            # Check if user's tenant matches current schema
            if user_tenant.schema_name != tenant_schema:
                logger.info(f"User {user.email} tenant {user_tenant.schema_name} != current {tenant_schema}")
                return False
            
            # Check if user has active subscription
            from billing.models import UserSubscription
            subscription = UserSubscription.objects.filter(
                user=user,
                status__in=['active', 'trial', 'trialing']
            ).first()
            
            if not subscription:
                logger.info(f"User {user.email} has no active subscription")
                return False
            
            logger.info(f"User {user.email} has access to tenant {tenant_schema}")
            return True
            
        except Exception as e:
            logger.error(f"Error checking tenant access for {user.email}: {e}")
            return False
    
    def create_tenant_user_object(self, public_user, tenant_schema):
        """
        Create a user object that can be used in the tenant context.
        This is a pseudo-user object that represents the user in the tenant schema.
        """
        # Create a new user object with the same data as the public user
        # but adapted for the tenant context
        tenant_user = User(
            id=public_user.id,
            email=public_user.email,
            first_name=public_user.first_name,
            last_name=public_user.last_name,
            is_staff=True,  # Tenant users are staff by default
            is_active=True,
            is_superuser=False,  # Never superuser in tenant context
            role='manager',  # Default role for tenant users
            office_name=public_user.office_name or f"{public_user.get_full_name()}'s Office",
            office_phone=public_user.office_phone,
            office_address=public_user.office_address,
            email_verified=True,  # Auto-verify since they have subscription
            password=public_user.password,  # Copy the hashed password
            date_joined=public_user.date_joined,
            last_login=public_user.last_login,
        )
        
        # Set the _state to indicate this is not a database object
        tenant_user._state.adding = False
        tenant_user._state.db = None
        
        return tenant_user
    
    def get_user(self, user_id):
        """
        Get user by ID. This is called by Django's authentication system.
        Since we're using cross-schema authentication, we need to handle this carefully.
        """
        # For cross-schema auth, we don't store users in tenant schemas
        # So we return None to let Django handle this
        return None


class TenantAccessMiddleware:
    """
    Middleware to ensure users can only access their own tenant domains.
    This runs after authentication and checks if the authenticated user
    has access to the current tenant.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Skip middleware for public schema
        if connection.schema_name == get_public_schema_name():
            return self.get_response(request)
        
        # Skip middleware for unauthenticated users (they'll be handled by auth)
        if not request.user.is_authenticated:
            return self.get_response(request)
        
        # Check if user has access to current tenant
        if not self.user_has_tenant_access(request.user, connection.schema_name):
            logger.warning(f"User {request.user.email} attempted unauthorized access to tenant {connection.schema_name}")
            raise PermissionDenied("You don't have access to this tenant.")
        
        return self.get_response(request)
    
    def user_has_tenant_access(self, user, tenant_schema):
        """
        Check if user has access to the specified tenant schema.
        """
        try:
            # Check if user has a tenant
            if not hasattr(user, 'tenant_id') or not user.tenant_id:
                return False
            
            # Get user's tenant from public schema
            with schema_context(get_public_schema_name()):
                from tenants.models import Client
                user_tenant = Client.objects.get(id=user.tenant_id)
                
                # Check if user's tenant matches current schema
                if user_tenant.schema_name != tenant_schema:
                    return False
                
                # Check if user has active subscription
                from billing.models import UserSubscription
                subscription = UserSubscription.objects.filter(
                    user_id=user.id,  # Use user_id since we're in public schema
                    status__in=['active', 'trial', 'trialing']
                ).first()
                
                return subscription is not None
                
        except Exception as e:
            logger.error(f"Error checking tenant access: {e}")
            return False
