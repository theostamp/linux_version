"""
Building Data Transfer Object (DTO)

Canonical representation του Building για χρήση σε όλο το backend.
Περιέχει μόνο τα πεδία που χρειάζονται για business logic και permissions.

Usage:
    from buildings.dto import BuildingDTO

    # From model
    building_dto = BuildingDTO.from_model(building, user=request.user)

    # Access data
    print(building_dto.name)
    print(building_dto.permissions.can_edit)

    # Serialize for API
    data = building_dto.to_dict()
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from decimal import Decimal


@dataclass
class BuildingPermissions:
    """
    Permissions για ένα συγκεκριμένο building και user.

    Ιεραρχία Ρόλων:
    - Superuser/Staff/Office Manager: Πλήρης πρόσβαση
    - Internal Manager: Read + opt-in πληρωμές + συνελεύσεις + προσφορές
    - Resident: Read-only + αιτήματα
    """
    # Basic permissions
    can_view: bool = True  # Default: όλοι μπορούν να δουν αν έχουν access
    can_edit: bool = False
    can_delete: bool = False

    # Financial permissions
    can_manage_financials: bool = False  # Πλήρης διαχείριση (Office Manager only)
    can_view_financials: bool = True     # Προβολή οικονομικών (όλοι)
    can_record_payments: bool = False    # Καταχώρηση πληρωμών (opt-in για internal manager)

    # Assembly/Meeting permissions
    can_create_assembly: bool = False

    # Offers/Projects permissions
    can_manage_offers: bool = False

    # Role indicators
    is_admin_level: bool = False         # Superuser/Staff/Office Manager
    is_internal_manager: bool = False    # Εσωτερικός διαχειριστής αυτού του building
    is_resident: bool = False            # Ένοικος αυτού του building

    def to_dict(self) -> Dict[str, bool]:
        """Serialize permissions to dict"""
        return {
            'can_view': self.can_view,
            'can_edit': self.can_edit,
            'can_delete': self.can_delete,
            'can_manage_financials': self.can_manage_financials,
            'can_view_financials': self.can_view_financials,
            'can_record_payments': self.can_record_payments,
            'can_create_assembly': self.can_create_assembly,
            'can_manage_offers': self.can_manage_offers,
            'is_admin_level': self.is_admin_level,
            'is_internal_manager': self.is_internal_manager,
            'is_resident': self.is_resident,
        }


@dataclass
class BuildingDTO:
    """
    Canonical representation του Building για χρήση σε όλο το backend.

    Αυτό το DTO:
    - Περιέχει όλα τα απαραίτητα πεδία για business logic
    - Υπολογίζει permissions αυτόματα
    - Είναι immutable (frozen=False για να επιτρέπει updates αν χρειαστεί)
    - Παρέχει clean serialization για API responses
    """
    # Core identification
    id: int
    name: str

    # Building details
    apartments_count: int
    premium_enabled: bool = False
    address: str = ""
    city: str = ""
    postal_code: str = ""

    # Management
    manager_id: Optional[int] = None

    # Internal Manager - νέα πεδία
    internal_manager_id: Optional[int] = None
    internal_manager_can_record_payments: bool = False
    internal_manager_display_name: str = ""  # Computed field

    # Legacy internal manager fields (για backward compatibility)
    internal_manager_name: str = ""
    internal_manager_phone: str = ""

    # Office Management
    management_office_name: str = ""
    management_office_phone: str = ""

    # Financial settings
    current_reserve: Decimal = Decimal('0.00')
    management_fee_per_apartment: Decimal = Decimal('0.00')
    reserve_contribution_per_apartment: Decimal = Decimal('0.00')

    # Heating system configuration
    heating_system: str = 'none'
    heating_fixed_percentage: int = 30

    # Reserve fund goal settings
    reserve_fund_goal: Optional[Decimal] = None
    reserve_fund_duration_months: Optional[int] = None

    # Grace period for payments
    grace_day_of_month: int = 1

    # Permissions (calculated based on user)
    permissions: BuildingPermissions = field(default_factory=BuildingPermissions)

    @classmethod
    def from_model(cls, building, user=None) -> 'BuildingDTO':
        """
        Δημιουργεί DTO από Building model με auto-calculation των permissions.

        Args:
            building: Building model instance
            user: CustomUser instance (optional) - για υπολογισμό permissions

        Returns:
            BuildingDTO instance με populated permissions
        """
        # Calculate permissions
        permissions = cls._calculate_permissions(building, user)

        # Get internal manager info
        internal_manager_id = None
        if hasattr(building, 'internal_manager') and building.internal_manager:
            internal_manager_id = building.internal_manager.id

        # Create DTO
        dto = cls(
            id=building.id,
            name=building.name,
            apartments_count=building.apartments_count,
            premium_enabled=getattr(building, 'premium_enabled', False),
            address=building.address or "",
            city=building.city or "",
            postal_code=building.postal_code or "",
            manager_id=building.manager_id,
            # Internal Manager - νέα πεδία
            internal_manager_id=internal_manager_id,
            internal_manager_can_record_payments=getattr(building, 'internal_manager_can_record_payments', False),
            internal_manager_display_name=building.get_internal_manager_display_name() if hasattr(building, 'get_internal_manager_display_name') else "",
            # Legacy fields
            internal_manager_name=building.internal_manager_name or "",
            internal_manager_phone=building.internal_manager_phone or "",
            management_office_name=building.management_office_name or "",
            management_office_phone=building.management_office_phone or "",
            current_reserve=building.current_reserve,
            management_fee_per_apartment=building.management_fee_per_apartment,
            reserve_contribution_per_apartment=building.reserve_contribution_per_apartment,
            heating_system=building.heating_system,
            heating_fixed_percentage=building.heating_fixed_percentage,
            reserve_fund_goal=building.reserve_fund_goal,
            reserve_fund_duration_months=building.reserve_fund_duration_months,
            grace_day_of_month=building.grace_day_of_month,
            permissions=permissions,
        )

        return dto

    @staticmethod
    def _calculate_permissions(building, user) -> BuildingPermissions:
        """
        Υπολογίζει τα permissions για το συγκεκριμένο building και user.

        Ιεραρχία Ρόλων:
        - Superusers: Πλήρης πρόσβαση σε όλα
        - Staff / Office Manager: Edit + manage financials + assemblies + offers
        - Internal Manager: View + opt-in payments + assemblies + offers (μόνο το δικό του building)
        - Residents: View only + αιτήματα
        - Anonymous: Κανένα permission
        """
        if not user or not user.is_authenticated:
            return BuildingPermissions(can_view=False, can_view_financials=False)

        # Superusers: πλήρης πρόσβαση
        if user.is_superuser:
            return BuildingPermissions(
                can_view=True,
                can_edit=True,
                can_delete=True,
                can_manage_financials=True,
                can_view_financials=True,
                can_record_payments=True,
                can_create_assembly=True,
                can_manage_offers=True,
                is_admin_level=True,
                is_internal_manager=False,
                is_resident=False,
            )

        # Staff: edit + manage financials (όχι delete)
        if user.is_staff:
            return BuildingPermissions(
                can_view=True,
                can_edit=True,
                can_delete=False,
                can_manage_financials=True,
                can_view_financials=True,
                can_record_payments=True,
                can_create_assembly=True,
                can_manage_offers=True,
                is_admin_level=True,
                is_internal_manager=False,
                is_resident=False,
            )

        # Office Manager: πλήρης πρόσβαση (σε όλες τις πολυκατοικίες του tenant)
        if getattr(user, 'is_office_manager', False):
            return BuildingPermissions(
                can_view=True,
                can_edit=True,
                can_delete=False,
                can_manage_financials=True,
                can_view_financials=True,
                can_record_payments=True,
                can_create_assembly=True,
                can_manage_offers=True,
                is_admin_level=True,
                is_internal_manager=False,
                is_resident=False,
            )

        # Internal Manager: Περιορισμένη πρόσβαση (μόνο στο δικό του building)
        if getattr(user, 'is_internal_manager', False):
            is_this_building_manager = (
                hasattr(user, 'is_internal_manager_of') and
                user.is_internal_manager_of(building)
            )

            if is_this_building_manager:
                # Έλεγχος αν έχει δικαίωμα καταχώρησης πληρωμών
                can_record = (
                    hasattr(building, 'can_internal_manager_record_payments') and
                    building.can_internal_manager_record_payments()
                )

                return BuildingPermissions(
                    can_view=True,
                    can_edit=False,  # Δεν μπορεί να επεξεργαστεί το building
                    can_delete=False,
                    can_manage_financials=False,  # Δεν μπορεί να διαχειριστεί πλήρως τα οικονομικά
                    can_view_financials=True,     # Μπορεί να βλέπει τα πάντα
                    can_record_payments=can_record,  # Opt-in
                    can_create_assembly=True,     # Μπορεί να δημιουργεί συνελεύσεις
                    can_manage_offers=True,       # Μπορεί να διαχειρίζεται προσφορές
                    is_admin_level=False,
                    is_internal_manager=True,
                    is_resident=False,
                )

        # Resident: View only
        is_resident = (
            hasattr(user, 'is_resident_of') and
            user.is_resident_of(building)
        )

        if is_resident or getattr(user, 'is_resident_role', False):
            return BuildingPermissions(
                can_view=True,
                can_edit=False,
                can_delete=False,
                can_manage_financials=False,
                can_view_financials=True,   # Μπορεί να βλέπει τα οικονομικά
                can_record_payments=False,
                can_create_assembly=False,   # Δεν μπορεί να δημιουργεί συνελεύσεις
                can_manage_offers=False,     # Μπορεί μόνο να βλέπει προσφορές
                is_admin_level=False,
                is_internal_manager=False,
                is_resident=True,
            )

        # Default: Χωρίς πρόσβαση
        return BuildingPermissions(
            can_view=False,
            can_edit=False,
            can_delete=False,
            can_manage_financials=False,
            can_view_financials=False,
            can_record_payments=False,
            can_create_assembly=False,
            can_manage_offers=False,
            is_admin_level=False,
            is_internal_manager=False,
            is_resident=False,
        )

    def to_dict(self) -> Dict[str, Any]:
        """
        Serialization για JSON responses.

        Returns:
            Dictionary με όλα τα πεδία του DTO σε JSON-friendly format
        """
        return {
            'id': self.id,
            'name': self.name,
            'apartments_count': self.apartments_count,
            'premium_enabled': self.premium_enabled,
            'address': self.address,
            'city': self.city,
            'postal_code': self.postal_code,
            'manager_id': self.manager_id,
            # Internal Manager - νέα πεδία
            'internal_manager_id': self.internal_manager_id,
            'internal_manager_can_record_payments': self.internal_manager_can_record_payments,
            'internal_manager_display_name': self.internal_manager_display_name,
            # Legacy fields
            'internal_manager_name': self.internal_manager_name,
            'internal_manager_phone': self.internal_manager_phone,
            'management_office_name': self.management_office_name,
            'management_office_phone': self.management_office_phone,
            'current_reserve': float(self.current_reserve),
            'management_fee_per_apartment': float(self.management_fee_per_apartment),
            'reserve_contribution_per_apartment': float(self.reserve_contribution_per_apartment),
            'heating_system': self.heating_system,
            'heating_fixed_percentage': self.heating_fixed_percentage,
            'reserve_fund_goal': float(self.reserve_fund_goal) if self.reserve_fund_goal else None,
            'reserve_fund_duration_months': self.reserve_fund_duration_months,
            'grace_day_of_month': self.grace_day_of_month,
            'permissions': self.permissions.to_dict(),
        }

    def __str__(self) -> str:
        """String representation for debugging"""
        return f"BuildingDTO(id={self.id}, name='{self.name}', apartments={self.apartments_count})"

    def __repr__(self) -> str:
        """Detailed representation for debugging"""
        return (
            f"BuildingDTO(id={self.id}, name='{self.name}', "
            f"apartments={self.apartments_count}, manager_id={self.manager_id}, "
            f"permissions={self.permissions})"
        )

