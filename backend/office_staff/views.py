# backend/office_staff/views.py

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta

from .models import OfficeStaffPermissions, ActivityLog
from .serializers import (
    OfficeStaffUserSerializer,
    OfficeStaffPermissionsSerializer,
    CreateOfficeStaffSerializer,
    UpdateOfficeStaffSerializer,
    ActivityLogSerializer,
)

User = get_user_model()


class IsOfficeManager(permissions.BasePermission):
    """Permission class που επιτρέπει πρόσβαση μόνο σε Office Managers"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser or 
            request.user.is_staff or 
            request.user.is_office_manager
        )


class OfficeStaffViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση υπαλλήλων γραφείου.
    Μόνο Office Managers μπορούν να διαχειρίζονται υπαλλήλους.
    """
    
    permission_classes = [permissions.IsAuthenticated, IsOfficeManager]
    
    def get_queryset(self):
        """Επιστρέφει μόνο τους υπαλλήλους του ίδιου tenant"""
        if not self.request.user.tenant:
            return User.objects.none()
        
        return User.objects.filter(
            tenant=self.request.user.tenant,
            role=User.SystemRole.OFFICE_STAFF
        ).select_related('staff_permissions').order_by('last_name', 'first_name')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateOfficeStaffSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateOfficeStaffSerializer
        return OfficeStaffUserSerializer
    
    def perform_create(self, serializer):
        user = serializer.save()
        
        # Log the action
        ActivityLog.log(
            user=self.request.user,
            action=ActivityLog.ActionType.STAFF_CREATE,
            description=f"Δημιουργία υπαλλήλου: {user.get_full_name()} ({user.email})",
            target_model='CustomUser',
            target_id=user.id,
            target_description=user.email,
            ip_address=self.get_client_ip(),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )
    
    def perform_update(self, serializer):
        instance = self.get_object()
        old_data = {
            'first_name': instance.first_name,
            'last_name': instance.last_name,
            'is_active': instance.is_active,
        }
        
        serializer.save()
        
        # Log the action
        ActivityLog.log(
            user=self.request.user,
            action=ActivityLog.ActionType.STAFF_EDIT,
            description=f"Επεξεργασία υπαλλήλου: {instance.get_full_name()}",
            target_model='CustomUser',
            target_id=instance.id,
            target_description=instance.email,
            extra_data={'old_data': old_data},
            ip_address=self.get_client_ip(),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )
    
    def perform_destroy(self, instance):
        # Αντί να διαγράψουμε, απενεργοποιούμε τον υπάλληλο
        instance.is_active = False
        instance.save()
        
        if hasattr(instance, 'staff_permissions'):
            instance.staff_permissions.is_active = False
            instance.staff_permissions.save()
        
        # Log the action
        ActivityLog.log(
            user=self.request.user,
            action=ActivityLog.ActionType.STAFF_DELETE,
            description=f"Απενεργοποίηση υπαλλήλου: {instance.get_full_name()}",
            target_model='CustomUser',
            target_id=instance.id,
            target_description=instance.email,
            ip_address=self.get_client_ip(),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            severity=ActivityLog.Severity.WARNING,
        )
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Ενεργοποίηση/απενεργοποίηση υπαλλήλου"""
        instance = self.get_object()
        instance.is_active = not instance.is_active
        instance.save()
        
        if hasattr(instance, 'staff_permissions'):
            instance.staff_permissions.is_active = instance.is_active
            instance.staff_permissions.save()
        
        action_type = 'Ενεργοποίηση' if instance.is_active else 'Απενεργοποίηση'
        
        ActivityLog.log(
            user=request.user,
            action=ActivityLog.ActionType.STAFF_EDIT,
            description=f"{action_type} υπαλλήλου: {instance.get_full_name()}",
            target_model='CustomUser',
            target_id=instance.id,
            target_description=instance.email,
            ip_address=self.get_client_ip(),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        
        return Response({
            'status': 'success',
            'is_active': instance.is_active,
            'message': f'Ο υπάλληλος {"ενεργοποιήθηκε" if instance.is_active else "απενεργοποιήθηκε"}'
        })
    
    @action(detail=True, methods=['patch'])
    def update_permissions(self, request, pk=None):
        """Ενημέρωση μόνο των permissions"""
        instance = self.get_object()
        
        permissions, created = OfficeStaffPermissions.objects.get_or_create(
            user=instance,
            defaults={'created_by': request.user}
        )
        
        serializer = OfficeStaffPermissionsSerializer(
            permissions, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            old_permissions = {
                field: getattr(permissions, field) 
                for field in serializer.validated_data.keys()
            }
            
            serializer.save()
            
            ActivityLog.log(
                user=request.user,
                action=ActivityLog.ActionType.STAFF_PERMISSIONS_CHANGE,
                description=f"Αλλαγή δικαιωμάτων υπαλλήλου: {instance.get_full_name()}",
                target_model='OfficeStaffPermissions',
                target_id=permissions.id,
                target_description=instance.email,
                extra_data={
                    'old_permissions': old_permissions,
                    'new_permissions': serializer.validated_data
                },
                ip_address=self.get_client_ip(),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
            
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset password για υπάλληλο"""
        instance = self.get_object()
        new_password = request.data.get('password')
        
        if not new_password or len(new_password) < 8:
            return Response(
                {'error': 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance.set_password(new_password)
        instance.save()
        
        ActivityLog.log(
            user=request.user,
            action=ActivityLog.ActionType.STAFF_EDIT,
            description=f"Reset κωδικού υπαλλήλου: {instance.get_full_name()}",
            target_model='CustomUser',
            target_id=instance.id,
            target_description=instance.email,
            ip_address=self.get_client_ip(),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            severity=ActivityLog.Severity.WARNING,
        )
        
        return Response({
            'status': 'success',
            'message': 'Ο κωδικός ενημερώθηκε επιτυχώς'
        })
    
    def get_client_ip(self):
        """Εξαγωγή IP από το request"""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return self.request.META.get('REMOTE_ADDR')


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet για προβολή Activity Logs (read-only).
    Μόνο Office Managers μπορούν να βλέπουν τα logs.
    """
    
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsOfficeManager]
    
    def get_queryset(self):
        """Επιστρέφει τα logs με filtering"""
        if not self.request.user.tenant:
            return ActivityLog.objects.none()
        
        # Βρες όλους τους χρήστες του tenant
        tenant_users = User.objects.filter(
            tenant=self.request.user.tenant
        ).values_list('id', flat=True)
        
        queryset = ActivityLog.objects.filter(
            Q(user_id__in=tenant_users) | Q(user__isnull=True)
        )
        
        # Apply filters
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        building_id = self.request.query_params.get('building_id')
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)
        
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Σύνοψη δραστηριοτήτων"""
        queryset = self.get_queryset()
        
        # Τελευταίες 24 ώρες
        last_24h = timezone.now() - timedelta(hours=24)
        
        # Τελευταίες 7 ημέρες
        last_7d = timezone.now() - timedelta(days=7)
        
        summary = {
            'total_logs': queryset.count(),
            'last_24h': queryset.filter(created_at__gte=last_24h).count(),
            'last_7d': queryset.filter(created_at__gte=last_7d).count(),
            'by_severity': {
                'info': queryset.filter(severity='info').count(),
                'warning': queryset.filter(severity='warning').count(),
                'error': queryset.filter(severity='error').count(),
                'critical': queryset.filter(severity='critical').count(),
            },
            'recent_critical': ActivityLogSerializer(
                queryset.filter(severity__in=['error', 'critical'])[:5],
                many=True
            ).data,
        }
        
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def staff_activity(self, request):
        """Δραστηριότητα υπαλλήλων"""
        if not request.user.tenant:
            return Response([])
        
        staff_users = User.objects.filter(
            tenant=request.user.tenant,
            role=User.SystemRole.OFFICE_STAFF
        )
        
        result = []
        for staff in staff_users:
            logs = ActivityLog.objects.filter(user=staff)
            last_24h = timezone.now() - timedelta(hours=24)
            
            result.append({
                'user_id': staff.id,
                'user_email': staff.email,
                'user_name': staff.get_full_name(),
                'total_actions': logs.count(),
                'actions_today': logs.filter(created_at__gte=last_24h).count(),
                'last_action': ActivityLogSerializer(logs.first()).data if logs.exists() else None,
            })
        
        return Response(result)
