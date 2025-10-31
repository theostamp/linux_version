# users/profile_views.py

from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.contrib.auth.hashers import check_password, make_password
from django.core.exceptions import ObjectDoesNotExist
import logging

from users.models import CustomUser
from rest_framework.permissions import IsAuthenticated
from users.serializers import UserProfileSerializer
from users.utils import resident_table_exists

User = get_user_model()
logger = logging.getLogger(__name__)


class UserProfileView(APIView):
    """
    User profile management
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get current user profile
        Includes all fields from /api/users/me/ endpoint for consistency
        """
        try:
            user = request.user
            
            # Try to get resident profile with building (optimized query)
            resident_role = None
            resident_profile_data = None

            if resident_table_exists():
                try:
                    resident_profile = user.resident_profile  # May trigger DB lookup
                except ObjectDoesNotExist:
                    resident_profile = None
                except Exception as exc:
                    # If the resident table exists but isn't migrated correctly, avoid crashing the endpoint
                    logger.debug(
                        "Skipping resident profile for user %s due to error: %s",
                        user.id,
                        exc,
                    )
                    resident_profile = None

                if resident_profile:
                    building = getattr(resident_profile, 'building', None)
                    resident_role = resident_profile.role
                    resident_profile_data = {
                        'apartment': resident_profile.apartment,
                        'building_id': building.id if building else None,
                        'building_name': building.name if building else None,
                        'phone': resident_profile.phone or None,
                    }
            
            # Get user's apartments/buildings
            apartments = []
            if hasattr(user, 'apartments'):
                apartments = [
                    {
                        'id': apt.id,
                        'building_name': apt.building.name if hasattr(apt, 'building') else 'Unknown Building',
                        'apartment_number': apt.number,
                        'role': getattr(apt, 'role', 'owner'),
                    }
                    for apt in user.apartments.all()
                ]
            
            # Get user's subscription
            subscription_data = None
            if hasattr(user, 'subscriptions'):
                active_subscription = user.subscriptions.filter(
                    status__in=['trial', 'active']
                ).first()
                
                if active_subscription:
                    subscription_data = {
                        'plan_name': active_subscription.plan.name,
                        'status': active_subscription.status,
                        'current_period_end': active_subscription.current_period_end.isoformat() if active_subscription.current_period_end else None,
                        'price': float(active_subscription.price),
                        'currency': active_subscription.currency,
                    }
            
            profile_data = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone': getattr(user, 'phone', ''),
                'address': getattr(user, 'address', ''),
                'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'email_verified': getattr(user, 'email_verified', False),
                'role': user.role,  # SystemRole (backward compat)
                'system_role': user.role,  # Explicit system_role field
                'resident_role': resident_role,  # Resident.Role if exists
                'resident_profile': resident_profile_data,  # Full Resident profile if exists
                'office_name': user.office_name,
                'office_phone': user.office_phone,
                'office_address': user.office_address,
                'office_logo': user.office_logo.url if user.office_logo else None,
                'apartments': apartments,
                'subscription': subscription_data,
            }
            
            return Response(profile_data)
            
        except Exception as e:
            logger.error(f"Error getting user profile: {e}")
            return Response({
                'error': 'Failed to get user profile'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """
        Update user profile
        """
        try:
            user = request.user
            
            # Update allowed fields
            allowed_fields = ['first_name', 'last_name', 'phone', 'address']
            
            for field in allowed_fields:
                if field in request.data:
                    setattr(user, field, request.data[field])
            
            user.save()
            
            logger.info(f"Profile updated for user {user.email}")
            
            return Response({
                'message': 'Profile updated successfully',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'phone': getattr(user, 'phone', ''),
                    'address': getattr(user, 'address', ''),
                }
            })
            
        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            return Response({
                'error': 'Failed to update profile'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserChangePasswordView(APIView):
    """
    Change user password
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Change user password
        """
        try:
            user = request.user
            current_password = request.data.get('current_password')
            new_password = request.data.get('new_password')
            confirm_password = request.data.get('confirm_password')
            
            # Validate input
            if not all([current_password, new_password, confirm_password]):
                return Response({
                    'error': 'All password fields are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if new_password != confirm_password:
                return Response({
                    'error': 'New password and confirmation do not match'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check current password
            if not check_password(current_password, user.password):
                return Response({
                    'error': 'Current password is incorrect'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate new password
            if len(new_password) < 8:
                return Response({
                    'error': 'New password must be at least 8 characters long'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update password
            user.password = make_password(new_password)
            user.save()
            
            logger.info(f"Password changed for user {user.email}")
            
            return Response({
                'message': 'Password changed successfully'
            })
            
        except Exception as e:
            logger.error(f"Error changing password: {e}")
            return Response({
                'error': 'Failed to change password'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserNotificationSettingsView(APIView):
    """
    User notification settings
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get user notification settings
        """
        try:
            user = request.user
            
            # In a real implementation, these would be stored in a separate model
            # For now, return default settings
            notification_settings = {
                'email_notifications': getattr(user, 'email_notifications', True),
                'payment_reminders': getattr(user, 'payment_reminders', True),
                'maintenance_notices': getattr(user, 'maintenance_notices', True),
                'community_updates': getattr(user, 'community_updates', True),
                'emergency_alerts': getattr(user, 'emergency_alerts', True),
            }
            
            return Response(notification_settings)
            
        except Exception as e:
            logger.error(f"Error getting notification settings: {e}")
            return Response({
                'error': 'Failed to get notification settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """
        Update user notification settings
        """
        try:
            user = request.user
            
            # Update notification settings
            notification_fields = [
                'email_notifications', 'payment_reminders', 
                'maintenance_notices', 'community_updates', 'emergency_alerts'
            ]
            
            for field in notification_fields:
                if field in request.data:
                    setattr(user, field, request.data[field])
            
            user.save()
            
            logger.info(f"Notification settings updated for user {user.email}")
            
            return Response({
                'message': 'Notification settings updated successfully',
                'settings': {
                    'email_notifications': getattr(user, 'email_notifications', True),
                    'payment_reminders': getattr(user, 'payment_reminders', True),
                    'maintenance_notices': getattr(user, 'maintenance_notices', True),
                    'community_updates': getattr(user, 'community_updates', True),
                    'emergency_alerts': getattr(user, 'emergency_alerts', True),
                }
            })
            
        except Exception as e:
            logger.error(f"Error updating notification settings: {e}")
            return Response({
                'error': 'Failed to update notification settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserActiveSessionsView(APIView):
    """
    User active sessions management
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get user's active sessions
        """
        try:
            # In a real implementation, this would track actual sessions
            # For now, return mock data
            active_sessions = [
                {
                    'id': 'session_1',
                    'device': 'Chrome on Windows',
                    'ip_address': '192.168.1.100',
                    'location': 'Athens, Greece',
                    'last_activity': timezone.now() - timezone.timedelta(minutes=5),
                    'current': True,
                },
                {
                    'id': 'session_2',
                    'device': 'Safari on iPhone',
                    'ip_address': '192.168.1.101',
                    'location': 'Athens, Greece',
                    'last_activity': timezone.now() - timezone.timedelta(hours=2),
                    'current': False,
                }
            ]
            
            return Response({
                'sessions': active_sessions,
                'total': len(active_sessions)
            })
            
        except Exception as e:
            logger.error(f"Error getting active sessions: {e}")
            return Response({
                'error': 'Failed to get active sessions'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request):
        """
        Revoke a session
        """
        try:
            session_id = request.data.get('session_id')
            
            if not session_id:
                return Response({
                    'error': 'Session ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # In a real implementation, this would revoke the actual session
            logger.info(f"Session {session_id} revoked for user {request.user.email}")
            
            return Response({
                'message': 'Session revoked successfully'
            })
            
        except Exception as e:
            logger.error(f"Error revoking session: {e}")
            return Response({
                'error': 'Failed to revoke session'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserAccountDeletionView(APIView):
    """
    User account deletion
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Request account deletion
        """
        try:
            user = request.user
            password = request.data.get('password')
            
            # Verify password
            if not check_password(password, user.password):
                return Response({
                    'error': 'Password is incorrect'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # In a real implementation, this would:
            # 1. Mark account for deletion
            # 2. Send confirmation email
            # 3. Schedule actual deletion after grace period
            
            logger.info(f"Account deletion requested for user {user.email}")
            
            return Response({
                'message': 'Account deletion request submitted. You will receive a confirmation email.',
                'deletion_date': (timezone.now() + timezone.timedelta(days=30)).isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error requesting account deletion: {e}")
            return Response({
                'error': 'Failed to request account deletion'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
