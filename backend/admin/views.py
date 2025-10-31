# admin/views.py

from rest_framework import status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import logging

from users.models import CustomUser
from users.serializers import UserSerializer
from users.utils import resident_table_exists
from billing.models import UserSubscription
from core.permissions import IsSuperuser

User = get_user_model()
logger = logging.getLogger(__name__)


class AdminUsersViewSet(ModelViewSet):
    """
    Admin ViewSet για διαχείριση χρηστών
    """
    permission_classes = [IsSuperuser]
    serializer_class = UserSerializer
    
    def get_queryset(self):
        """
        Όλοι οι χρήστες για admin (συμπεριλαμβανομένων των superusers)
        Optimize queries with select_related for resident_profile
        """
        queryset = User.objects.all().order_by('-date_joined')

        if resident_table_exists():
            try:
                queryset = queryset.select_related('resident_profile__building')
            except Exception as exc:  # pragma: no cover - defensive guard
                logger.debug("Skipping resident_profile select_related: %s", exc)

        return queryset
    
    def list(self, request, *args, **kwargs):
        """
        Λίστα όλων των χρηστών με φίλτρα
        """
        queryset = self.get_queryset()
        
        # Apply filters
        search = request.query_params.get('search', '')
        status_filter = request.query_params.get('status', '')
        role_filter = request.query_params.get('role', '')
        
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        if status_filter == 'active':
            queryset = queryset.filter(is_active=True, email_verified=True)
        elif status_filter == 'inactive':
            queryset = queryset.filter(is_active=False)
        elif status_filter == 'unverified':
            queryset = queryset.filter(email_verified=False)
        
        if role_filter:
            if role_filter == 'superuser':
                queryset = queryset.filter(is_superuser=True)
            elif role_filter == 'staff':
                queryset = queryset.filter(is_staff=True, is_superuser=False)
            elif role_filter == 'manager':
                queryset = queryset.filter(role='manager')
            elif role_filter == 'resident':
                # Filter for users without SystemRole (they have Resident.Role instead)
                queryset = queryset.filter(
                    is_staff=False, 
                    is_superuser=False, 
                    role__isnull=True
                )
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'users': serializer.data,
            'total': queryset.count()
        })
    
    def retrieve(self, request, *args, **kwargs):
        """
        Λεπτομέρειες χρήστη
        """
        user = self.get_object()
        
        # Get additional data
        subscription_data = None
        if hasattr(user, 'subscriptions'):
            active_subscription = user.subscriptions.filter(
                status__in=['trial', 'active']
            ).first()
            if active_subscription:
                subscription_data = {
                    'id': str(active_subscription.id),
                    'plan_name': active_subscription.plan.name,
                    'status': active_subscription.status,
                    'current_period_end': active_subscription.current_period_end,
                }
        
        # Get user's buildings count
        buildings_count = 0
        if hasattr(user, 'buildings'):
            buildings_count = user.buildings.count()
        
        # Use serializer to get standard fields including system_role and resident_profile
        serializer = self.get_serializer(user)
        user_data = serializer.data
        
        # Add additional data
        user_data['buildings_count'] = buildings_count
        user_data['subscription'] = subscription_data
        
        return Response(user_data)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Ενεργοποίηση χρήστη
        """
        user = self.get_object()
        user.is_active = True
        user.save()
        
        logger.info(f"User {user.email} activated by admin {request.user.email}")
        
        return Response({
            'message': f'User {user.email} activated successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'is_active': user.is_active
            }
        })
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """
        Απενεργοποίηση χρήστη
        """
        user = self.get_object()
        user.is_active = False
        user.save()
        
        logger.info(f"User {user.email} deactivated by admin {request.user.email}")
        
        return Response({
            'message': f'User {user.email} deactivated successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'is_active': user.is_active
            }
        })
    
    @action(detail=True, methods=['post'])
    def verify_email(self, request, pk=None):
        """
        Επιβεβαίωση email χρήστη
        """
        user = self.get_object()
        user.email_verified = True
        user.save()
        
        logger.info(f"Email verified for user {user.email} by admin {request.user.email}")
        
        return Response({
            'message': f'Email verified for {user.email}',
            'user': {
                'id': user.id,
                'email': user.email,
                'email_verified': user.email_verified
            }
        })
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """
        Reset password χρήστη (στέλνει email)
        """
        user = self.get_object()
        
        # TODO: Implement password reset email sending
        # For now, just log the action
        
        logger.info(f"Password reset requested for user {user.email} by admin {request.user.email}")
        
        return Response({
            'message': f'Password reset email sent to {user.email}',
            'user': {
                'id': user.id,
                'email': user.email
            }
        })


class AdminUsersStatsView(APIView):
    """
    Admin users statistics
    """
    permission_classes = [IsSuperuser]
    
    def get(self, request):
        """
        Get user statistics για admin dashboard
        """
        try:
            # Basic user counts
            total_users = User.objects.count()
            active_users = User.objects.filter(is_active=True).count()
            verified_users = User.objects.filter(email_verified=True).count()
            staff_users = User.objects.filter(is_staff=True).count()
            superusers = User.objects.filter(is_superuser=True).count()
            managers = User.objects.filter(role='manager').count()
            residents = User.objects.filter(
                is_staff=False, 
                is_superuser=False, 
                role__isnull=True
            ).count()
            
            # Recent registrations (last 30 days)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            recent_registrations = User.objects.filter(
                date_joined__gte=thirty_days_ago
            ).count()
            
            # Users with subscriptions
            users_with_subscriptions = User.objects.filter(
                subscriptions__isnull=False
            ).distinct().count()
            
            # Users by status
            users_by_status = {
                'active_verified': User.objects.filter(
                    is_active=True, 
                    email_verified=True
                ).count(),
                'active_unverified': User.objects.filter(
                    is_active=True, 
                    email_verified=False
                ).count(),
                'inactive': User.objects.filter(is_active=False).count(),
            }
            
            return Response({
                'total_users': total_users,
                'active_users': active_users,
                'verified_users': verified_users,
                'staff_users': staff_users,
                'superusers': superusers,
                'managers': managers,
                'residents': residents,
                'recent_registrations': recent_registrations,
                'users_with_subscriptions': users_with_subscriptions,
                'users_by_status': users_by_status,
            })
            
        except Exception as e:
            logger.error(f"Error getting user stats: {e}")
            return Response({
                'error': 'Failed to get user statistics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminUsersExportView(APIView):
    """
    Export users data
    """
    permission_classes = [IsSuperuser]
    
    def get(self, request):
        """
        Export users data σε CSV format
        """
        try:
            import csv
            from django.http import HttpResponse
            
            # Create HttpResponse object with CSV header
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="users_export.csv"'
            
            writer = csv.writer(response)
            
            # Write CSV header
            writer.writerow([
                'ID', 'Email', 'First Name', 'Last Name', 'Role', 
                'Is Active', 'Email Verified', 'Is Staff', 'Is Superuser',
                'Office Name', 'Date Joined', 'Last Login'
            ])
            
            # Write user data
            users = User.objects.all().order_by('-date_joined')
            for user in users:
                writer.writerow([
                    user.id,
                    user.email,
                    user.first_name,
                    user.last_name,
                    user.role or 'resident',
                    user.is_active,
                    user.email_verified,
                    user.is_staff,
                    user.is_superuser,
                    user.office_name or '',
                    user.date_joined.strftime('%Y-%m-%d %H:%M:%S') if user.date_joined else '',
                    user.last_login.strftime('%Y-%m-%d %H:%M:%S') if user.last_login else '',
                ])
            
            return response
            
        except Exception as e:
            logger.error(f"Error exporting users: {e}")
            return Response({
                'error': 'Failed to export users data'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
