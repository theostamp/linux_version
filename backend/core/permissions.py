# backend/core/permissions.py

from rest_framework.permissions import BasePermission
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class IsInternalService(BasePermission):
    """
    Custom permission class for internal API endpoints.
    
    This permission checks for the presence of a specific HTTP header
    (X-Internal-API-Key) and validates it against a secret key stored
    in environment variables.
    
    Usage:
        Add this permission to any view that should only be accessible
        by internal services (like the Public App):
        
        permission_classes = [IsInternalService]
    """
    
    def has_permission(self, request, view):
        """
        Check if the request has the correct internal API key.
        
        Returns:
            bool: True if the request has valid internal API key, False otherwise
        """
        # Get the internal API key from the request headers
        internal_api_key = request.META.get('HTTP_X_INTERNAL_API_KEY')
        
        # Get the expected secret key from environment variables
        expected_secret_key = getattr(settings, 'INTERNAL_API_SECRET_KEY', None)
        
        # If no secret key is configured, deny access
        if not expected_secret_key:
            logger.error("INTERNAL_API_SECRET_KEY not configured in settings")
            return False
        
        # If no API key is provided in the request, deny access
        if not internal_api_key:
            logger.warning(f"Internal API request without X-Internal-API-Key header from {request.META.get('REMOTE_ADDR', 'unknown')}")
            return False
        
        # Compare the provided key with the expected secret key
        is_valid = internal_api_key == expected_secret_key
        
        if not is_valid:
            logger.warning(f"Invalid internal API key provided from {request.META.get('REMOTE_ADDR', 'unknown')}")
        
        return is_valid
    
    def has_object_permission(self, request, view, obj):
        """
        Object-level permission check.
        
        For internal services, we use the same permission logic
        as the general permission check.
        """
        return self.has_permission(request, view)


class IsManagerOrSuperuser(BasePermission):
    """
    Custom permission class for manager and superuser access.
    
    Allows access only to managers and superusers.
    """
    
    def has_permission(self, request, view):
        """
        Check if the user is a manager or superuser.
        
        Returns:
            bool: True if user is manager or superuser, False otherwise
        """
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'manager' or request.user.is_superuser)
        )
    
    def has_object_permission(self, request, view, obj):
        """
        Object-level permission check.
        
        For managers and superusers, we use the same permission logic
        as the general permission check.
        """
        return self.has_permission(request, view)


class IsBuildingAdmin(BasePermission):
    """
    Custom permission class for building admin access.
    
    Allows access only to building administrators.
    """
    
    def has_permission(self, request, view):
        """
        Check if the user is a building admin.
        
        Returns:
            bool: True if user is building admin, False otherwise
        """
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'building_admin' or request.user.is_superuser)
        )
    
    def has_object_permission(self, request, view, obj):
        """
        Object-level permission check.
        
        For building admins, we use the same permission logic
        as the general permission check.
        """
        return self.has_permission(request, view)


class IsManager(BasePermission):
    """
    Custom permission class for manager access.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'manager'
        )


class IsResident(BasePermission):
    """
    Custom permission class for resident access.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'resident'
        )


class IsRelatedToBuilding(BasePermission):
    """
    Custom permission class for users related to a building.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role in ['manager', 'resident', 'building_admin'] or request.user.is_superuser)
        )


class IsSuperuser(BasePermission):
    """
    Custom permission class for superuser access.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_superuser
        )


# ============================================================
# 🏢 Internal Manager Permissions
# ============================================================

class IsInternalManager(BasePermission):
    """
    Επιτρέπει πρόσβαση σε εσωτερικούς διαχειριστές πολυκατοικιών.
    
    Ο εσωτερικός διαχειριστής έχει πρόσβαση ΜΟΝΟ στη δική του πολυκατοικία.
    """
    
    def has_permission(self, request, view):
        """Έλεγχος αν ο χρήστης είναι εσωτερικός διαχειριστής"""
        return (
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'is_internal_manager', False)
        )
    
    def has_object_permission(self, request, view, obj):
        """
        Έλεγχος πρόσβασης σε συγκεκριμένο αντικείμενο.
        Ο εσωτερικός διαχειριστής έχει πρόσβαση μόνο σε αντικείμενα της δικής του πολυκατοικίας.
        """
        if not self.has_permission(request, view):
            return False
        
        # Βρες το building από το αντικείμενο
        building = getattr(obj, 'building', None)
        if building is None:
            # Αν το αντικείμενο είναι Building
            if hasattr(obj, 'internal_manager'):
                building = obj
        
        if building is None:
            return False
        
        # Έλεγχος αν ο χρήστης είναι ο internal manager αυτού του building
        return request.user.is_internal_manager_of(building)


class IsInternalManagerOfBuilding(BasePermission):
    """
    Επιτρέπει πρόσβαση ΜΟΝΟ στον εσωτερικό διαχειριστή της συγκεκριμένης πολυκατοικίας.
    Χρησιμοποιείται για object-level permissions.
    """
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Superusers και office managers έχουν πάντα πρόσβαση
        if user.is_superuser or user.is_staff or getattr(user, 'is_office_manager', False):
            return True
        
        # Βρες το building
        building = getattr(obj, 'building', None)
        if building is None and hasattr(obj, 'internal_manager'):
            building = obj
        
        if building is None:
            return False
        
        # Έλεγχος αν είναι internal manager αυτού του building
        return user.is_internal_manager_of(building)


class IsInternalManagerWithPaymentRights(BasePermission):
    """
    Επιτρέπει πρόσβαση σε εσωτερικούς διαχειριστές που έχουν 
    παραχωρημένο δικαίωμα καταχώρησης πληρωμών.
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Superusers και office managers έχουν πάντα πρόσβαση
        if user.is_superuser or user.is_staff or getattr(user, 'is_office_manager', False):
            return True
        
        # Έλεγχος αν είναι internal manager
        if not getattr(user, 'is_internal_manager', False):
            return False
        
        return True  # Θα γίνει object-level έλεγχος
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Superusers και office managers έχουν πάντα πρόσβαση
        if user.is_superuser or user.is_staff or getattr(user, 'is_office_manager', False):
            return True
        
        # Βρες το building
        building = getattr(obj, 'building', None)
        if building is None and hasattr(obj, 'apartment'):
            building = getattr(obj.apartment, 'building', None)
        if building is None and hasattr(obj, 'internal_manager'):
            building = obj
        
        if building is None:
            return False
        
        # Έλεγχος αν είναι internal manager ΚΑΙ έχει δικαίωμα πληρωμών
        if not user.is_internal_manager_of(building):
            return False
        
        return building.can_internal_manager_record_payments()


class IsOfficeManagerOrInternalManager(BasePermission):
    """
    Επιτρέπει πρόσβαση σε Office Managers (πλήρης) 
    ή Internal Managers (μόνο για τη δική τους πολυκατοικία).
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Office managers και superusers έχουν πλήρη πρόσβαση
        if user.is_superuser or user.is_staff or getattr(user, 'is_office_manager', False):
            return True
        
        # Internal managers έχουν περιορισμένη πρόσβαση
        if getattr(user, 'is_internal_manager', False):
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Office managers και superusers έχουν πλήρη πρόσβαση
        if user.is_superuser or user.is_staff or getattr(user, 'is_office_manager', False):
            return True
        
        # Internal managers έχουν πρόσβαση μόνο στη δική τους πολυκατοικία
        if getattr(user, 'is_internal_manager', False):
            building = getattr(obj, 'building', None)
            if building is None and hasattr(obj, 'internal_manager'):
                building = obj
            
            if building:
                return user.is_internal_manager_of(building)
        
        return False


# ============================================================
# 📋 Assembly & Offers Permissions
# ============================================================

class CanCreateAssembly(BasePermission):
    """
    Επιτρέπει τη δημιουργία συνελεύσεων σε:
    - Office Managers (πλήρης πρόσβαση)
    - Internal Managers (μόνο για τη δική τους πολυκατοικία)
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Office managers και superusers
        if user.is_superuser or user.is_staff or getattr(user, 'is_office_manager', False):
            return True
        
        # Internal managers
        if getattr(user, 'is_internal_manager', False):
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        return IsOfficeManagerOrInternalManager().has_object_permission(request, view, obj)


class CanManageOffers(BasePermission):
    """
    Επιτρέπει τη διαχείριση προσφορών σε:
    - Office Managers (πλήρης πρόσβαση)
    - Internal Managers (δημιουργία/επεξεργασία για τη δική τους πολυκατοικία)
    
    Οι Residents μπορούν μόνο να βλέπουν (read-only).
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Read access για όλους τους authenticated
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        # Write access για office managers και internal managers
        if user.is_superuser or user.is_staff or getattr(user, 'is_office_manager', False):
            return True
        
        if getattr(user, 'is_internal_manager', False):
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Read access
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            # Office managers βλέπουν τα πάντα
            if user.is_superuser or user.is_staff or getattr(user, 'is_office_manager', False):
                return True
            
            # Internal managers και residents βλέπουν μόνο τη δική τους πολυκατοικία
            building = getattr(obj, 'building', None)
            if building:
                return user.can_access_building(building)
            return False
        
        # Write access
        return IsOfficeManagerOrInternalManager().has_object_permission(request, view, obj)


# ============================================================
# 🔒 Admin-Only Permissions (Dashboard, Buildings, etc.)
# ============================================================

class IsAdminLevel(BasePermission):
    """
    Επιτρέπει πρόσβαση ΜΟΝΟ σε admin-level χρήστες:
    - Superusers
    - Staff users
    - Office Managers
    
    Χρησιμοποιείται για: Dashboard, Κτίρια, Διαμερίσματα, Χάρτης, Μετανάστευση
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        return (
            user.is_superuser or 
            user.is_staff or 
            getattr(user, 'is_office_manager', False)
        )
    
    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class CanAccessBuilding(BasePermission):
    """
    Ελέγχει αν ο χρήστης έχει πρόσβαση σε συγκεκριμένη πολυκατοικία.
    
    - Office Managers: Πρόσβαση σε όλες
    - Internal Managers: Μόνο στη δική τους
    - Residents: Μόνο στη δική τους
    """
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Office managers έχουν πρόσβαση σε όλα
        if user.is_superuser or user.is_staff or getattr(user, 'is_office_manager', False):
            return True
        
        # Βρες το building
        building = obj if hasattr(obj, 'internal_manager') else getattr(obj, 'building', None)
        
        if building is None:
            return False
        
        return user.can_access_building(building)
class IsUltraSuperUser(BasePermission):
    """
    Global access (All Tenants).
    Restricted to users with role 'ultra_super_user' or superuser+staff.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (getattr(request.user, 'is_ultra_super_user', False) or (request.user.is_superuser and request.user.is_staff))
        )

class IsAdmin(BasePermission):
    """
    Tenant-level access.
    Restricted to the assigned Tenant ID (enforced by django-tenants and role check).
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (getattr(request.user, 'is_admin', False) or request.user.is_superuser)
        )

class IsInternalManager(BasePermission):
    """
    Building-level access.
    Restricted to assigned Building IDs within the Tenant.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (getattr(request.user, 'is_internal_manager', False) or getattr(request.user, 'is_admin', False) or request.user.is_superuser)
        )

class IsEnikos(BasePermission):
    """
    Unit-level access.
    Restricted to assigned Unit ID and public data for their building.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (getattr(request.user, 'is_enikos', False) or getattr(request.user, 'is_internal_manager', False) or getattr(request.user, 'is_admin', False) or request.user.is_superuser)
        )
