# backend/financial/permissions.py

from rest_framework import permissions
from core.permissions import IsManager, IsResident, IsRelatedToBuilding


class FinancialPermissionMixin:
    """
    Mixin για έλεγχο δικαιωμάτων οικονομικών λειτουργιών.
    
    Ιεραρχία Ρόλων:
    - Superuser/Staff: Πλήρης πρόσβαση σε όλα
    - Office Manager: Πλήρης πρόσβαση στις πολυκατοικίες του tenant
    - Internal Manager: Read-only + opt-in πληρωμές (μόνο στη δική του πολυκατοικία)
    - Resident: Read-only (μόνο στη δική του πολυκατοικία)
    """
    
    def has_financial_permission(self, user, building=None, write_access=False):
        """
        Έλεγχος αν ο χρήστης έχει δικαιώματα για οικονομικές λειτουργίες
        
        Args:
            user: Ο χρήστης που κάνει το αίτημα
            building: Η πολυκατοικία (optional, για building-specific permissions)
            write_access: Αν απαιτείται write access (default: False = read-only)
        """
        if not user or not user.is_authenticated:
            return False
            
        # Superusers έχουν πλήρη πρόσβαση
        if user.is_superuser:
            return True
            
        # Staff users έχουν πρόσβαση σε όλες τις πολυκατοικίες
        if user.is_staff:
            return True
        
        # Office Manager: Πλήρης πρόσβαση στις πολυκατοικίες του tenant
        if getattr(user, 'is_office_manager', False):
            return True
        
        # Internal Manager: Πρόσβαση μόνο στη δική του πολυκατοικία
        if getattr(user, 'is_internal_manager', False):
            if building:
                return user.is_internal_manager_of(building)
            # Χωρίς building context, επιτρέπουμε read (θα ελεγχθεί σε object level)
            return not write_access
        
        # Resident: Read-only πρόσβαση μόνο στη δική του πολυκατοικία
        if getattr(user, 'is_resident_role', False) or getattr(user, 'role', '') == 'resident':
            if write_access:
                return False  # Residents δεν έχουν write access
            if building:
                return user.is_resident_of(building)
            return True  # Θα ελεγχθεί σε object level
        
        # RBAC Groups fallback
        if user.groups.filter(name='Manager').exists():
            return True
        if user.groups.filter(name='Resident').exists():
            return not write_access
            
        # Legacy: Χρήστες με role 'manager' έχουν πρόσβαση στις πολυκατοικίες που διαχειρίζονται
        if getattr(user, 'role', '') == 'manager':
            if building:
                return hasattr(building, 'manager') and building.manager == user
            return True
            
        # Legacy: Χρήστες με role 'admin' έχουν πρόσβαση
        if getattr(user, 'role', '') == 'admin':
            if building:
                return hasattr(building, 'admin') and building.admin == user
            return True
            
        return False

    def can_user_access_building(self, user, building):
        """
        Έλεγχος αν ο χρήστης έχει πρόσβαση στη συγκεκριμένη πολυκατοικία.
        """
        if not user or not user.is_authenticated or not building:
            return False
        
        # Admin-level users έχουν πρόσβαση παντού
        if user.is_superuser or user.is_staff or getattr(user, 'is_office_manager', False):
            return True
        
        # Internal Manager: Μόνο τη δική του πολυκατοικία
        if getattr(user, 'is_internal_manager', False):
            return user.is_internal_manager_of(building)
        
        # Resident: Μόνο τη δική του πολυκατοικία
        if hasattr(user, 'is_resident_of'):
            return user.is_resident_of(building)
        
        return False


class FinancialReadPermission(permissions.BasePermission, FinancialPermissionMixin):
    """
    Permission για ανάγνωση οικονομικών δεδομένων
    
    Επιτρέπει πρόσβαση σε:
    - Superusers / Staff users (όλες οι πολυκατοικίες)
    - Office Managers (όλες οι πολυκατοικίες του tenant)
    - Internal Managers (μόνο τη δική τους πολυκατοικία)
    - Residents (μόνο τη δική τους πολυκατοικία)
    """
    
    def has_permission(self, request, view):
        return self.has_financial_permission(request.user, write_access=False)
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        building = getattr(obj, 'building', None)
        
        # Αν δεν υπάρχει building, ελέγξε αν το obj είναι Building
        if building is None and hasattr(obj, 'internal_manager'):
            building = obj
        
        # Αν ακόμα δεν υπάρχει building (π.χ. από apartment)
        if building is None and hasattr(obj, 'apartment'):
            building = getattr(obj.apartment, 'building', None)
        
        return self.can_user_access_building(user, building) if building else self.has_financial_permission(user)


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
    Ειδικό permission για δαπάνες
    
    - Ανάγνωση: Office Managers, Internal Managers, Residents (μόνο τη δική τους πολυκατοικία)
    - Δημιουργία/Επεξεργασία/Διαγραφή: ΜΟΝΟ Office Managers (ή Superuser/Staff)
    
    ΣΗΜΕΙΩΣΗ: Internal Managers και Residents έχουν ΜΟΝΟ read access στις δαπάνες.
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
        
        # Office Manager: Πλήρης πρόσβαση
        if getattr(user, 'is_office_manager', False):
            return True
        
        # Ανάγνωση: Internal Managers και Residents
        if request.method in permissions.SAFE_METHODS:
            # Internal Managers μπορούν να βλέπουν δαπάνες
            if getattr(user, 'is_internal_manager', False):
                return True
            # Residents μπορούν να βλέπουν δαπάνες
            if getattr(user, 'is_resident_role', False) or getattr(user, 'role', '') == 'resident':
                return True
            # RBAC groups fallback
            if user.groups.filter(name='Manager').exists() or user.groups.filter(name='Resident').exists():
                return True
            return self.has_financial_permission(user, write_access=False)
        
        # Δημιουργία/Επεξεργασία/Διαγραφή: ΜΟΝΟ Office Managers
        # Internal Managers ΔΕΝ μπορούν να τροποποιούν δαπάνες
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            # Μόνο RBAC Manager group (παλιό σύστημα) ή legacy manager role
            return (user.groups.filter(name='Manager').exists() or 
                    getattr(user, 'role', '') == 'manager')
        
        return False
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
            
        # Admin-level users έχουν πλήρη πρόσβαση
        if user.is_superuser or user.is_staff or getattr(user, 'is_office_manager', False):
            return True
        
        building = getattr(obj, 'building', None)
        
        # Ανάγνωση: Έλεγχος αν ο χρήστης έχει πρόσβαση στην πολυκατοικία
        if request.method in permissions.SAFE_METHODS:
            # Internal Managers: Μόνο τη δική τους πολυκατοικία
            if getattr(user, 'is_internal_manager', False):
                return building and user.is_internal_manager_of(building)
            
            # Residents: Μόνο τη δική τους πολυκατοικία
            if getattr(user, 'is_resident_role', False) or getattr(user, 'role', '') == 'resident':
                return building and user.is_resident_of(building)
            
            # RBAC fallback
            if user.groups.filter(name='Manager').exists():
                return True
            if user.groups.filter(name='Resident').exists():
                return building and user.is_resident_of(building) if hasattr(user, 'is_resident_of') else False
            
            return self.has_financial_permission(user, building)
        
        # Write: Μόνο Office Managers (ήδη ελέγχθηκε ότι δεν είναι internal manager)
        return (user.groups.filter(name='Manager').exists() or 
                getattr(user, 'role', '') == 'manager')


class PaymentPermission(permissions.BasePermission, FinancialPermissionMixin):
    """
    Ειδικό permission για πληρωμές/εισπράξεις
    
    - Ανάγνωση: Office Managers, Internal Managers, Residents (μόνο τη δική τους πολυκατοικία)
    - Δημιουργία: Office Managers ή Internal Managers ΜΕ παραχωρημένο δικαίωμα (can_record_payments)
    - Επεξεργασία: Office Managers ή Internal Managers με δικαίωμα (μόνο τη δική τους πολυκατοικία)
    - Διαγραφή: ΜΟΝΟ Office Managers (για αποφυγή conflicts)
    """
    
    def _get_building_from_request(self, request):
        """Εξάγει το building από το request data"""
        building_id = (request.data.get('building_id') or 
                       request.data.get('building') or 
                       request.query_params.get('building_id') or
                       request.query_params.get('building'))
        
        # Αν υπάρχει apartment, πάρε το building από εκεί
        apartment_id = request.data.get('apartment') or request.query_params.get('apartment')
        
        if building_id:
            from buildings.models import Building
            try:
                return Building.objects.get(id=building_id)
            except Building.DoesNotExist:
                return None
        
        if apartment_id:
            from apartments.models import Apartment
            try:
                apartment = Apartment.objects.select_related('building').get(id=apartment_id)
                return apartment.building
            except:
                return None
        
        return None
    
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
        
        # Office Manager: Πλήρης πρόσβαση
        if getattr(user, 'is_office_manager', False):
            return True
        
        # Ανάγνωση: Επιτρέπεται σε Internal Managers και Residents
        if request.method in permissions.SAFE_METHODS:
            if getattr(user, 'is_internal_manager', False):
                return True
            if getattr(user, 'is_resident_role', False) or getattr(user, 'role', '') == 'resident':
                return True
            # RBAC fallback
            return (user.groups.filter(name='Manager').exists() or 
                   user.groups.filter(name='Resident').exists())
        
        # Δημιουργία/Επεξεργασία: Office Managers ή Internal Managers με δικαίωμα
        if request.method in ['POST', 'PUT', 'PATCH']:
            # Internal Manager: Ελέγχουμε αν έχει δικαίωμα καταχώρησης πληρωμών
            if getattr(user, 'is_internal_manager', False):
                building = self._get_building_from_request(request)
                if building:
                    # Έλεγχος: Είναι ο internal manager αυτού του building ΚΑΙ έχει δικαίωμα;
                    if user.is_internal_manager_of(building) and building.can_internal_manager_record_payments():
                        return True
                return False
            
            # RBAC Manager group (παλιό σύστημα)
            return user.groups.filter(name='Manager').exists()
        
        # Διαγραφή: ΜΟΝΟ Office Managers (για αποφυγή conflicts)
        if request.method == 'DELETE':
            # Internal Managers ΔΕΝ μπορούν να διαγράψουν πληρωμές
            if getattr(user, 'is_internal_manager', False):
                return False
            return user.groups.filter(name='Manager').exists()
        
        return False
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
            
        # Admin-level users έχουν πλήρη πρόσβαση
        if user.is_superuser or user.is_staff or getattr(user, 'is_office_manager', False):
            return True
        
        # Βρες το building
        building = getattr(obj, 'building', None)
        if building is None and hasattr(obj, 'apartment'):
            building = getattr(obj.apartment, 'building', None)
        
        # Ανάγνωση: Έλεγχος πρόσβασης στην πολυκατοικία
        if request.method in permissions.SAFE_METHODS:
            if getattr(user, 'is_internal_manager', False):
                return building and user.is_internal_manager_of(building)
            
            if getattr(user, 'is_resident_role', False) or getattr(user, 'role', '') == 'resident':
                return building and user.is_resident_of(building)
            
            # RBAC fallback
            if user.groups.filter(name='Manager').exists():
                return True
            if user.groups.filter(name='Resident').exists():
                return building and user.is_resident_of(building) if hasattr(user, 'is_resident_of') else False
        
        # Επεξεργασία: Internal Manager με δικαίωμα, μόνο για τη δική του πολυκατοικία
        if request.method in ['PUT', 'PATCH']:
            if getattr(user, 'is_internal_manager', False):
                if building and user.is_internal_manager_of(building):
                    return building.can_internal_manager_record_payments()
                return False
            return user.groups.filter(name='Manager').exists()
        
        # Διαγραφή: ΜΟΝΟ Office Managers
        if request.method == 'DELETE':
            if getattr(user, 'is_internal_manager', False):
                return False
            return user.groups.filter(name='Manager').exists()
        
        return False


class TransactionPermission(permissions.BasePermission, FinancialPermissionMixin):
    """
    Ειδικό permission για κινήσεις ταμείου
    
    - Ανάγνωση: Office Managers, Internal Managers, Residents (μόνο τη δική τους πολυκατοικία)
    - Δημιουργία: Μόνο μέσω συστήματος (αυτόματες κινήσεις) ή Office Managers
    - Επεξεργασία/Διαγραφή: ΜΟΝΟ Office Managers/Admins
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        if request.method in permissions.SAFE_METHODS:
            return self.has_financial_permission(user, write_access=False)
        else:
            # Write access μόνο για admin-level
            return (user.is_superuser or user.is_staff or 
                    getattr(user, 'is_office_manager', False))
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        building = getattr(obj, 'building', None)
        
        if request.method in permissions.SAFE_METHODS:
            return self.can_user_access_building(user, building) if building else self.has_financial_permission(user)
        else:
            return (user.is_superuser or user.is_staff or 
                    getattr(user, 'is_office_manager', False))


class ReportPermission(permissions.BasePermission, FinancialPermissionMixin):
    """
    Permission για αναφορές και exports
    
    Επιτρέπει πρόσβαση σε:
    - Office Managers, Internal Managers, Residents (μόνο τη δική τους πολυκατοικία)
    """
    
    def has_permission(self, request, view):
        return self.has_financial_permission(request.user, write_access=False)
    
    def has_object_permission(self, request, view, obj):
        building = getattr(obj, 'building', None)
        return self.can_user_access_building(request.user, building) if building else self.has_financial_permission(request.user)
