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
    """
    can_edit: bool = False
    can_delete: bool = False
    can_manage_financials: bool = False
    can_view: bool = True  # Default: όλοι μπορούν να δουν αν έχουν access
    
    def to_dict(self) -> Dict[str, bool]:
        """Serialize permissions to dict"""
        return {
            'can_edit': self.can_edit,
            'can_delete': self.can_delete,
            'can_manage_financials': self.can_manage_financials,
            'can_view': self.can_view,
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
    address: str = ""
    city: str = ""
    postal_code: str = ""
    
    # Management
    manager_id: Optional[int] = None
    internal_manager_name: str = ""
    internal_manager_phone: str = ""
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
        
        # Create DTO
        dto = cls(
            id=building.id,
            name=building.name,
            apartments_count=building.apartments_count,
            address=building.address or "",
            city=building.city or "",
            postal_code=building.postal_code or "",
            manager_id=building.manager_id,
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
        
        Κανόνες:
        - Superusers: Όλα τα permissions
        - Staff: Edit + manage financials (όχι delete)
        - Manager του building: Edit + manage financials (όχι delete)
        - Residents: View only
        - Anonymous: Κανένα permission
        """
        if not user or not user.is_authenticated:
            return BuildingPermissions(can_view=False)
        
        # Superusers: όλα
        if user.is_superuser:
            return BuildingPermissions(
                can_edit=True,
                can_delete=True,
                can_manage_financials=True,
                can_view=True,
            )
        
        # Staff: edit + manage financials
        if user.is_staff:
            return BuildingPermissions(
                can_edit=True,
                can_delete=False,
                can_manage_financials=True,
                can_view=True,
            )
        
        # Manager του building: edit + manage financials
        if hasattr(user, 'is_manager') and user.is_manager:
            if building.manager_id == user.id:
                return BuildingPermissions(
                    can_edit=True,
                    can_delete=False,
                    can_manage_financials=True,
                    can_view=True,
                )
        
        # Residents: view only (θα ελεγχθεί membership στο BuildingService)
        return BuildingPermissions(
            can_edit=False,
            can_delete=False,
            can_manage_financials=False,
            can_view=True,
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
            'address': self.address,
            'city': self.city,
            'postal_code': self.postal_code,
            'manager_id': self.manager_id,
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

