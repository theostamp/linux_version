# backend/tenants/internal_views.py

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.core.exceptions import ValidationError

from core.permissions import IsInternalService
from tenants.services import TenantService
from users.models import CustomUser
from billing.models import SubscriptionPlan

logger = logging.getLogger(__name__)


class InternalTenantCreateView(APIView):
    """
    Internal API endpoint for creating tenants.
    
    This endpoint is only accessible by internal services (like the Public App)
    and requires a valid X-Internal-API-Key header.
    
    Expected payload:
    {
        "schema_name": "tenant-subdomain",
        "user_data": {
            "email": "user@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "password": "hashed_password"
        },
        "plan_id": 1,
        "stripe_customer_id": "cus_...",
        "stripe_subscription_id": "sub_..."
    }
    """
    
    permission_classes = [IsInternalService]
    
    def post(self, request):
        """
        Create a new tenant with the provided data.
        """
        try:
            # Extract data from request
            schema_name = request.data.get('schema_name')
            user_data = request.data.get('user_data', {})
            plan_id = request.data.get('plan_id')
            stripe_customer_id = request.data.get('stripe_customer_id')
            stripe_subscription_id = request.data.get('stripe_subscription_id')
            
            # Validate required fields
            if not all([schema_name, user_data, plan_id, stripe_customer_id, stripe_subscription_id]):
                return Response({
                    'error': 'Missing required fields',
                    'required': ['schema_name', 'user_data', 'plan_id', 'stripe_customer_id', 'stripe_subscription_id']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate user_data
            required_user_fields = ['email', 'first_name', 'last_name']
            if not all(field in user_data for field in required_user_fields):
                return Response({
                    'error': 'Missing required user fields',
                    'required': required_user_fields
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                # Check if user already exists
                user_email = user_data['email']
                try:
                    user = CustomUser.objects.get(email=user_email)
                    logger.info(f"User {user_email} already exists, using existing user")
                except CustomUser.DoesNotExist:
                    # Create new user
                    user = CustomUser.objects.create_user(
                        email=user_email,
                        password=user_data.get('password', 'temp_password_123'),
                        first_name=user_data['first_name'],
                        last_name=user_data['last_name'],
                        is_active=True
                    )
                    logger.info(f"Created new user: {user_email}")
                
                # Check if user already has a tenant
                if hasattr(user, 'tenant') and user.tenant:
                    return Response({
                        'error': 'User already has a tenant',
                        'tenant_schema': user.tenant.schema_name
                    }, status=status.HTTP_409_CONFLICT)
                
                # Create tenant and subscription using the service
                tenant_service = TenantService()
                tenant, subscription = tenant_service.create_tenant_and_subscription(
                    schema_name=schema_name,
                    user=user,
                    plan_id=plan_id,
                    stripe_customer_id=stripe_customer_id,
                    stripe_subscription_id=stripe_subscription_id
                )
                
                # Update user's tenant reference
                user.tenant = tenant
                user.is_active = True
                user.save(update_fields=['tenant', 'is_active'])
                
                logger.info(f"Successfully created tenant '{tenant.schema_name}' for user {user.email}")
                
                return Response({
                    'success': True,
                    'tenant': {
                        'id': tenant.id,
                        'schema_name': tenant.schema_name,
                        'name': tenant.name,
                        'domain': f"{tenant.schema_name}.localhost"
                    },
                    'subscription': {
                        'id': subscription.id,
                        'status': subscription.status,
                        'plan_id': subscription.plan.id
                    },
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'name': user.get_full_name()
                    }
                }, status=status.HTTP_201_CREATED)
                
        except ValidationError as e:
            logger.error(f"Validation error in tenant creation: {e}")
            return Response({
                'error': 'Validation error',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except SubscriptionPlan.DoesNotExist:
            logger.error(f"Subscription plan with ID {plan_id} not found")
            return Response({
                'error': 'Invalid subscription plan',
                'plan_id': plan_id
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.critical(f"Critical error in tenant creation: {e}")
            return Response({
                'error': 'Internal server error',
                'details': 'Tenant creation failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
