from django.db.models import Q
from buildings.models import Building, BuildingMembership
from apartments.models import Apartment

class RBACQuerySetMixin:
    """
    Mixin to filter QuerySets based on User Role and Scope.
    """
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return queryset.none()

        # 1. Ultra Super User: Global access
        if getattr(user, 'is_ultra_super_user', False) or (user.is_superuser and user.is_staff):
            return queryset

        # 2. Admin: Tenant-level access
        # Restricted to current schema by django-tenants
        if getattr(user, 'is_admin', False):
            return queryset

        # 3. Internal Manager: Building-level access
        if getattr(user, 'is_internal_manager', False):
            managed_building_ids = set(
                Building.objects.filter(internal_manager_id=user.id).values_list('id', flat=True)
            )
            membership_building_ids = set(
                BuildingMembership.objects.filter(
                    resident_id=user.id,
                    role='internal_manager'
                ).values_list('building_id', flat=True)
            )
            allowed_building_ids = managed_building_ids | membership_building_ids
            
            if hasattr(queryset.model, 'building'):
                return queryset.filter(building_id__in=allowed_building_ids)
            elif queryset.model == Building:
                return queryset.filter(id__in=allowed_building_ids)
            elif hasattr(queryset.model, 'apartment'):
                return queryset.filter(apartment__building_id__in=allowed_building_ids)
            elif hasattr(queryset.model, 'project'):
                return queryset.filter(project__building_id__in=allowed_building_ids)
            elif hasattr(queryset.model, 'announcement'):
                return queryset.filter(announcement__building_id__in=allowed_building_ids)
            
            # Fallback check if building field exists
            try:
                queryset.model._meta.get_field('building')
                return queryset.filter(building_id__in=allowed_building_ids)
            except:
                pass
                
            return queryset

        # 4. Enikos (Tenant): Unit-level access
        if getattr(user, 'is_enikos', False):
            # Assigned apartments
            owned_apt_ids = set(
                Apartment.objects.filter(owner_user_id=user.id).values_list('id', flat=True)
            )
            rented_apt_ids = set(
                Apartment.objects.filter(tenant_user_id=user.id).values_list('id', flat=True)
            )
            allowed_apt_ids = owned_apt_ids | rented_apt_ids
            
            # Buildings where user has apartments (for public data)
            allowed_building_ids = set(
                Apartment.objects.filter(id__in=allowed_apt_ids).values_list('building_id', flat=True)
            )

            # Filtering logic based on model type
            if queryset.model == Apartment:
                return queryset.filter(id__in=allowed_apt_ids)
            elif queryset.model == Building:
                # Can see buildings where they reside (often for public info)
                return queryset.filter(id__in=allowed_building_ids)
            elif hasattr(queryset.model, 'apartment'):
                return queryset.filter(apartment_id__in=allowed_apt_ids)
            elif hasattr(queryset.model, 'building'):
                # Some models like Announcements might be "public" within a building
                # or global (building=null)
                if queryset.model.__name__ == 'Announcement':
                    return queryset.filter(
                        Q(building_id__in=allowed_building_ids) | 
                        Q(building__isnull=True)
                    )
                return queryset.filter(building_id__in=allowed_building_ids)
            
            # Fallback: check if apartment or building field exists
            try:
                queryset.model._meta.get_field('apartment')
                return queryset.filter(apartment_id__in=allowed_apt_ids)
            except:
                try:
                    queryset.model._meta.get_field('building')
                    return queryset.filter(building_id__in=allowed_building_ids)
                except:
                    pass

        # Default: Return filtered queryset if handled, otherwise might need more specific logic
        return queryset
