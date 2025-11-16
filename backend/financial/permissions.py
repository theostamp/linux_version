# backend/financial/permissions.py

from rest_framework import permissions
from core.permissions import IsManager, IsResident, IsRelatedToBuilding


class FinancialPermissionMixin:
    """Mixin για έλεγχο δικαιωμάτων οικονομικών λειτουργιών"""
    
    def has_financial_permission(self, user, building=None):
        """
        Έλεγχος αν ο χρήστης έχει δικαιώματα για οικονομικές λειτουργίες
        
        Args:
            user: Ο χρήστης που κάνει το αίτημα
            building: Η πολυκατοικία (optional, για building-specific permissions)
        """
        if not user or not user.is_authenticated:
            return False
            
        # Superusers έχουν πλήρη πρόσβαση
        if user.is_superuser:
            return True
            
        # Staff users έχουν πρόσβαση σε όλες τις πολυκατοικίες
        if user.is_staff:
            return True
        
        # RBAC: Έλεγχος αν ο χρήστης είναι Manager
        if user.groups.filter(name='Manager').exists():
            return True
            
        # RBAC: Έλεγχος αν ο χρήστης είναι Resident (περιορισμένα δικαιώματα)
        if user.groups.filter(name='Resident').exists():
            return True
            
        # Legacy: Χρήστες με role 'manager' έχουν πρόσβαση στις πολυκατοικίες που διαχειρίζονται
        if getattr(user, 'role', '') == 'manager':
            if building:
                # Έλεγχος αν ο χρήστης είναι manager της συγκεκριμένης πολυκατοικίας
                return hasattr(building, 'manager') and building.manager == user
            return True
            
        # Legacy: Χρήστες με role 'admin' έχουν πρόσβαση στις πολυκατοικίες που διαχειρίζονται
        if getattr(user, 'role', '') == 'admin':
            if building:
                # Έλεγχος αν ο χρήστης είναι admin της συγκεκριμένης πολυκατοικίας
                return hasattr(building, 'admin') and building.admin == user
            return True
            
        return False


class FinancialReadPermission(permissions.BasePermission, FinancialPermissionMixin):
    """
    Permission για ανάγνωση οικονομικών δεδομένων
    
    Επιτρέπει πρόσβαση σε:
    - Superusers
    - Staff users  
    - Managers των αντίστοιχων πολυκατοικιών
    - Admins των αντίστοιχων πολυκατοικιών
    """
    
    def has_permission(self, request, view):
        return self.has_financial_permission(request.user)
    
    def has_object_permission(self, request, view, obj):
        # Έλεγχος αν το αντικείμενο έχει building
        building = getattr(obj, 'building', None)
        return self.has_financial_permission(request.user, building)


class FinancialWritePermission(permissions.BasePermission, FinancialPermissionMixin):
    """
    Permission για εγγραφή/επεξεργασία οικονομικών δεδομένων
    
    Επιτρέπει πρόσβαση σε:
    - Superusers
    - Staff users
    - Managers των αντίστοιχων πολυκατοικιών
    """
    
    def has_permission(self, request, view):
        # Για POST requests, έλεγχος αν υπάρχει building_id ή building στο request
        if request.method == 'POST':
            building_id = request.data.get('building_id') or request.data.get('building') or request.query_params.get('building_id')
            if building_id:
                from buildings.models import Building
                try:
                    building = Building.objects.get(id=building_id)
                    return self.has_financial_permission(request.user, building)
                except Building.DoesNotExist:
                    return False
        return self.has_financial_permission(request.user)
    
    def has_object_permission(self, request, view, obj):
        building = getattr(obj, 'building', None)
        return self.has_financial_permission(request.user, building)


class FinancialAdminPermission(permissions.BasePermission, FinancialPermissionMixin):
    """
    Permission για διαχειριστικές οικονομικές λειτουργίες
    
    Επιτρέπει πρόσβαση σε:
    - Superusers
    - Staff users
    - Admins των αντίστοιχων πολυκατοικιών
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
            
        if user.is_superuser or user.is_staff:
            return True
            
        # Μόνο admins μπορούν να κάνουν διαχειριστικές λειτουργίες
        return getattr(user, 'role', '') == 'admin'
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
            
        if user.is_superuser or user.is_staff:
            return True
            
        # Έλεγχος αν ο χρήστης είναι admin της πολυκατοικίας
        if getattr(user, 'role', '') == 'admin':
            building = getattr(obj, 'building', None)
            if building:
                return hasattr(building, 'admin') and building.admin == user
            return True
            
        return False


class ExpensePermission(permissions.BasePermission, FinancialPermissionMixin):
    """
    Ειδικό permission για δαπάνες με RBAC integration
    
    - Ανάγνωση: Managers, Residents (μόνο για τα κτίριά τους)
    - Δημιουργία/Επεξεργασία: Μόνο Managers
    - Διαγραφή: Μόνο Managers και admins
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
            
        # Superusers έχουν πλήρη πρόσβαση
        if user.is_superuser:
            return True
            
        # Staff users έχουν πλήρη πρόσβαση
        if user.is_staff:
            return True
        
        # RBAC: Ανάγνωση - Managers και Residents
        if request.method in permissions.SAFE_METHODS:
            if user.groups.filter(name='Manager').exists() or user.groups.filter(name='Resident').exists():
                return True
            # Επιτρέπουμε και legacy ρόλους (role=manager/admin κ.λπ.)
            return self.has_financial_permission(user)
        
        # RBAC: Δημιουργία/Επεξεργασία - Μόνο Managers
        elif request.method in ['POST', 'PUT', 'PATCH']:
            return user.groups.filter(name='Manager').exists()
        
        # RBAC: Διαγραφή - Μόνο Managers
        elif request.method == 'DELETE':
            return user.groups.filter(name='Manager').exists()
        
        # Legacy fallback
        return self.has_financial_permission(user)
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
            
        # Superusers έχουν πλήρη πρόσβαση
        if user.is_superuser:
            return True
            
        # Staff users έχουν πλήρη πρόσβαση
        if user.is_staff:
            return True
        
        # RBAC: Ανάγνωση - Managers και Residents (μόνο για τα κτίριά τους)
        if request.method in permissions.SAFE_METHODS:
            is_manager = user.groups.filter(name='Manager').exists()
            is_resident = user.groups.filter(name='Resident').exists()
            building = getattr(obj, 'building', None)
            
            if is_manager:
                return True  # Managers βλέπουν όλα
            elif is_resident:
                # Residents βλέπουν μόνο τα κτίριά τους
                return IsRelatedToBuilding().has_object_permission(request, view, obj)
            else:
                return self.has_financial_permission(user, building)
        
        # RBAC: Δημιουργία/Επεξεργασία/Διαγραφή - Μόνο Managers
        else:
            return user.groups.filter(name='Manager').exists()
        
        return False


class PaymentPermission(permissions.BasePermission, FinancialPermissionMixin):
    """
    Ειδικό permission για εισπράξεις με RBAC integration
    
    - Ανάγνωση: Managers, Residents (μόνο για τα κτίριά τους)
    - Δημιουργία/Επεξεργασία: Μόνο Managers
    - Διαγραφή: Μόνο Managers και admins
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
            
        # Superusers έχουν πλήρη πρόσβαση
        if user.is_superuser:
            return True
            
        # Staff users έχουν πλήρη πρόσβαση
        if user.is_staff:
            return True
        
        # RBAC: Ανάγνωση - Managers και Residents
        if request.method in permissions.SAFE_METHODS:
            return (user.groups.filter(name='Manager').exists() or 
                   user.groups.filter(name='Resident').exists())
        
        # RBAC: Δημιουργία/Επεξεργασία - Μόνο Managers
        elif request.method in ['POST', 'PUT', 'PATCH']:
            return user.groups.filter(name='Manager').exists()
        
        # RBAC: Διαγραφή - Μόνο Managers
        elif request.method == 'DELETE':
            return user.groups.filter(name='Manager').exists()
        
        # Legacy fallback
        return self.has_financial_permission(user)
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
            
        # Superusers έχουν πλήρη πρόσβαση
        if user.is_superuser:
            return True
            
        # Staff users έχουν πλήρη πρόσβαση
        if user.is_staff:
            return True
        
        # RBAC: Ανάγνωση - Managers και Residents (μόνο για τα κτίριά τους)
        if request.method in permissions.SAFE_METHODS:
            is_manager = user.groups.filter(name='Manager').exists()
            is_resident = user.groups.filter(name='Resident').exists()
            
            if is_manager:
                return True  # Managers βλέπουν όλα
            elif is_resident:
                # Residents βλέπουν μόνο τα κτίριά τους
                return IsRelatedToBuilding().has_object_permission(request, view, obj)
        
        # RBAC: Δημιουργία/Επεξεργασία/Διαγραφή - Μόνο Managers
        else:
            return user.groups.filter(name='Manager').exists()
        
        return False


class TransactionPermission(permissions.BasePermission, FinancialPermissionMixin):
    """
    Ειδικό permission για κινήσεις ταμείου
    
    - Ανάγνωση: Όλοι οι εξουσιοδοτημένοι χρήστες
    - Δημιουργία: Μόνο μέσω συστήματος (αυτόματες κινήσεις)
    - Επεξεργασία/Διαγραφή: Μόνο admins
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return self.has_financial_permission(request.user)
        else:
            return FinancialAdminPermission().has_permission(request, view)
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return FinancialReadPermission().has_object_permission(request, view, obj)
        else:
            return FinancialAdminPermission().has_object_permission(request, view, obj)


class ReportPermission(permissions.BasePermission, FinancialPermissionMixin):
    """
    Permission για αναφορές και exports
    
    Επιτρέπει πρόσβαση σε:
    - Superusers
    - Staff users
    - Managers των αντίστοιχων πολυκατοικιών
    """
    
    def has_permission(self, request, view):
        return self.has_financial_permission(request.user)
    
    def has_object_permission(self, request, view, obj):
        building = getattr(obj, 'building', None)
        return self.has_financial_permission(request.user, building) 
